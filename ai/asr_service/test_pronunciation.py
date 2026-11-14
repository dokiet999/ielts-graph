"""Unit tests of the pronunciation scoring, with Gemini, Azure and Whisper replaced by fakes (no key, no model).

Run from ai/asr_service:  python -m unittest test_pronunciation -v
"""
import base64
import io
import json
import unittest
import wave
from pathlib import Path
from types import SimpleNamespace

import httpx
import numpy as np
from jsonschema import Draft202012Validator

import pronunciation as pron
from pronunciation import (PronConfig, PronunciationError, PronunciationScorer, UtteranceScore, aggregate,
                           gemini_assess, parse_gemini_scores, to_pcm16, to_wav)

SCHEMA = json.loads((Path(__file__).parents[1] / "schema" / "speaking_asr.schema.json").read_text(encoding="utf-8"))
VALIDATOR = Draft202012Validator(SCHEMA)
GEMINI = PronConfig(enabled=True, provider="gemini", gemini_key="test-key", gemini_model="gemini-test")
AZURE = PronConfig(enabled=True, provider="azure", azure_key="test-key", azure_region="southeastasia")
ONE_SECOND = np.zeros(16000, dtype=np.float32)


def response_with(pronunciation):
    """A full /transcribe response around the given pronunciation object."""
    return {
        "schema_version": "1.0", "asr_model": "whisper-small", "language": "en", "transcript": "hello there",
        "features": {"duration_sec": 3.0, "word_count": 2, "speech_rate_wpm": 40.0,
                     "pause_count": 0, "total_pause_sec": 0, "longest_pause_sec": 0},
        "pronunciation": pronunciation,
    }


def schema_errors(pronunciation):
    return [e.message for e in VALIDATOR.iter_errors(response_with(pronunciation))]


# ---------------------------------------------------------------- configuration

class ConfigTest(unittest.TestCase):
    def test_disabled_by_default_and_gemini_is_the_default_provider(self):
        config = PronConfig.from_env({})
        self.assertEqual(config.status(sdk_installed=True), pron.STATUS_DISABLED)
        self.assertEqual(config.provider, "gemini")
        self.assertEqual(config.gemini_model, pron.DEFAULT_GEMINI_MODEL)

    def test_gemini_needs_only_its_key(self):
        config = PronConfig.from_env({"PRON_ENABLED": "true", "GEMINI_API_KEY": " k ",
                                      "PRON_GEMINI_MODEL": "gemini-4-carbon", "PRON_TIMEOUT_SEC": "90"})
        self.assertEqual(config.status(), pron.STATUS_ENABLED)
        self.assertEqual((config.gemini_key, config.gemini_model, config.timeout_sec), ("k", "gemini-4-carbon", 90.0))
        self.assertEqual(PronConfig.from_env({"PRON_ENABLED": "true"}).status(), pron.STATUS_MISCONFIGURED)

    def test_azure_needs_key_region_and_sdk(self):
        env = {"PRON_ENABLED": "true", "PRON_PROVIDER": "Azure", "AZURE_SPEECH_KEY": "k"}
        self.assertEqual(PronConfig.from_env(env).status(sdk_installed=True), pron.STATUS_MISCONFIGURED)
        env["AZURE_SPEECH_REGION"] = "eastus"
        self.assertEqual(PronConfig.from_env(env).status(sdk_installed=True), pron.STATUS_ENABLED)
        self.assertEqual(PronConfig.from_env(env).status(sdk_installed=False), pron.STATUS_SDK_MISSING)

    def test_unknown_provider_is_misconfigured(self):
        config = PronConfig.from_env({"PRON_ENABLED": "true", "PRON_PROVIDER": "whisper", "GEMINI_API_KEY": "k"})
        self.assertEqual(config.status(), pron.STATUS_MISCONFIGURED)
        self.assertFalse(PronunciationScorer(config).active)


# ---------------------------------------------------------------- audio helpers

class AudioTest(unittest.TestCase):
    def test_float_samples_become_16_bit_little_endian_pcm(self):
        pcm = to_pcm16(np.array([0.0, 1.0, -1.0, 2.0, -2.0], dtype=np.float32))
        self.assertEqual(np.frombuffer(pcm, dtype="<i2").tolist(), [0, 32767, -32767, 32767, -32767])

    def test_wav_is_16_khz_mono_16_bit(self):
        with wave.open(io.BytesIO(to_wav(ONE_SECOND))) as w:
            self.assertEqual((w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()),
                             (16000, 1, 2, 16000))

    def test_longest_accepted_audio_fits_the_gemini_inline_limit(self):
        # ASR_MAX_DURATION_SEC defaults to 300 s; Gemini accepts 20 MB per request, base64 included
        size = len(base64.b64encode(to_wav(np.zeros(16000 * 300, dtype=np.float32))))
        self.assertLess(size, 20 * 1024 * 1024 - 64 * 1024)


# ---------------------------------------------------------------- gemini

def gemini_reply(text, status=200, finish="STOP"):
    if status != 200:
        return httpx.Response(status, json={"error": {"code": status, "message": text}})
    return httpx.Response(200, json={"candidates": [
        {"content": {"parts": [{"text": text}]}, "finishReason": finish}]})


class FakeGemini:
    """httpx transport that records the request and answers with a canned response."""

    def __init__(self, response):
        self.response, self.request = response, None
        self.transport = httpx.MockTransport(self.handle)

    def handle(self, request):
        self.request = request
        if isinstance(self.response, Exception):
            raise self.response
        return self.response


class ParseGeminiTest(unittest.TestCase):
    def test_scores_are_rounded_clamped_and_marked_as_gemini(self):
        scores = parse_gemini_scores('{"accuracy": 81.26, "fluency": 104, "prosody": -3}')
        self.assertEqual(scores, {"accuracy": 81.3, "fluency": 100.0, "completeness": None,
                                  "prosody": 0.0, "source": "gemini"})
        self.assertEqual(schema_errors(scores), [])

    def test_code_fence_is_accepted(self):
        self.assertEqual(parse_gemini_scores('```json\n{"accuracy": 70, "fluency": 60, "prosody": null}\n```')
                         ["prosody"], None)

    def test_no_speech_gives_null(self):
        self.assertIsNone(parse_gemini_scores('{"accuracy": null, "fluency": null, "prosody": null}'))

    def test_invalid_answers_raise(self):
        for text in ("not json", "[1, 2]", '{"accuracy": "high", "fluency": 70, "prosody": 60}',
                     '{"accuracy": true, "fluency": 70, "prosody": 60}'):
            with self.subTest(text=text), self.assertRaises(PronunciationError):
                parse_gemini_scores(text)


class GeminiAssessTest(unittest.TestCase):
    def test_sends_wav_audio_with_the_key_in_a_header_and_reads_the_scores(self):
        fake = FakeGemini(gemini_reply('{"accuracy": 82, "fluency": 75, "prosody": 70}'))
        scores = gemini_assess(GEMINI, ONE_SECOND, transport=fake.transport)

        self.assertEqual(scores, {"accuracy": 82.0, "fluency": 75.0, "completeness": None,
                                  "prosody": 70.0, "source": "gemini"})
        request = fake.request
        self.assertEqual(request.url.path, "/v1beta/models/gemini-test:generateContent")
        self.assertNotIn("test-key", str(request.url))
        self.assertEqual(request.headers["x-goog-api-key"], "test-key")
        body = json.loads(request.content)
        audio = body["contents"][0]["parts"][1]["inlineData"]
        self.assertEqual(audio["mimeType"], "audio/wav")
        self.assertTrue(base64.b64decode(audio["data"]).startswith(b"RIFF"))
        self.assertEqual(body["generationConfig"]["temperature"], 0)
        self.assertEqual(body["generationConfig"]["responseMimeType"], "application/json")
        self.assertIn("accent is not an error", body["systemInstruction"]["parts"][0]["text"])

    def test_thought_parts_are_ignored(self):
        reply = httpx.Response(200, json={"candidates": [{"content": {"parts": [
            {"text": "thinking about it", "thought": True},
            {"text": '{"accuracy": 60, "fluency": 55, "prosody": 50}'}]}}]})
        self.assertEqual(gemini_assess(GEMINI, ONE_SECOND, transport=FakeGemini(reply).transport)["accuracy"], 60.0)

    def test_raw_text_is_given_to_the_sink(self):
        raw = []
        gemini_assess(GEMINI, ONE_SECOND, transport=FakeGemini(
            gemini_reply('{"accuracy": 60, "fluency": 55, "prosody": 50}')).transport, raw_sink=raw)
        self.assertEqual(raw, ['{"accuracy": 60, "fluency": 55, "prosody": 50}'])

    def test_failures_raise_without_leaking_the_key(self):
        cases = {
            "http error": gemini_reply("API key not valid", status=400),
            "no candidate": httpx.Response(200, json={"promptFeedback": {"blockReason": "OTHER"}}),
            "empty text": gemini_reply("", finish="MAX_TOKENS"),
            "timeout": httpx.ReadTimeout("timed out"),
            "network": httpx.ConnectError("connection refused"),
        }
        for name, response in cases.items():
            with self.subTest(name), self.assertRaises(PronunciationError) as ctx:
                gemini_assess(GEMINI, ONE_SECOND, transport=FakeGemini(response).transport)
            self.assertNotIn("test-key", str(ctx.exception))


# ---------------------------------------------------------------- azure aggregation

class AggregateTest(unittest.TestCase):
    def test_weights_each_utterance_by_its_word_count(self):
        scores = aggregate([UtteranceScore(30, 90.0, 80.0, 70.0), UtteranceScore(10, 50.0, 40.0, 30.0)])
        self.assertEqual(scores, {"accuracy": 80.0, "fluency": 70.0, "completeness": None,
                                  "prosody": 60.0, "source": "azure"})

    def test_prosody_uses_only_the_utterances_that_have_it(self):
        scores = aggregate([UtteranceScore(10, 80.0, 80.0, None), UtteranceScore(10, 60.0, 60.0, 50.0)])
        self.assertEqual((scores["accuracy"], scores["prosody"]), (70.0, 50.0))
        self.assertIsNone(aggregate([UtteranceScore(10, 80.0, 80.0, None)])["prosody"])

    def test_no_scored_word_gives_null(self):
        self.assertIsNone(aggregate([]))
        self.assertIsNone(aggregate([UtteranceScore(0, 80.0, 80.0, 80.0)]))

    def test_result_is_valid_against_the_schema(self):
        scores = aggregate([UtteranceScore(12, 101.0, 72.0, 68.0), UtteranceScore(4, 60.0, 55.5, None)])
        self.assertEqual(schema_errors(scores), [])


# ---------------------------------------------------------------- scorer

class ScorerTest(unittest.TestCase):
    def test_disabled_scorer_never_calls_the_provider(self):
        def assess(_config, _samples):
            raise AssertionError("the provider must not be called")
        scorer = PronunciationScorer(PronConfig(enabled=False), assess)
        self.assertEqual(scorer.score(ONE_SECOND), (None, 0.0))

    def test_uses_the_provider_of_the_configuration(self):
        self.assertIs(PronunciationScorer(GEMINI)._assess, pron.gemini_assess)
        self.assertIs(PronunciationScorer(AZURE, sdk_installed=True)._assess, pron.azure_assess)

    def test_returns_the_provider_scores(self):
        expected = {"accuracy": 82.0, "fluency": 75.0, "completeness": None, "prosody": 70.0, "source": "gemini"}
        scores, elapsed = PronunciationScorer(GEMINI, lambda _c, _s: expected).score(ONE_SECOND)
        self.assertEqual(scores, expected)
        self.assertGreaterEqual(elapsed, 0.0)

    def test_provider_failure_gives_null_instead_of_an_error(self):
        def failing(_config, _samples):
            raise PronunciationError("Gemini HTTP 429: quota exceeded")
        with self.assertLogs("asr_service.pronunciation", level="WARNING"):
            scores, _ = PronunciationScorer(GEMINI, failing).score(ONE_SECOND)
        self.assertIsNone(scores)


# ---------------------------------------------------------------- /transcribe endpoint

def wav_bytes(seconds=1.0):
    """A short 16 kHz mono tone, readable by faster-whisper's decoder."""
    t = np.arange(int(16000 * seconds)) / 16000
    return to_wav((0.3 * np.sin(2 * np.pi * 220 * t)).astype(np.float32))


class FakeWhisper:
    def transcribe(self, _samples, **_kwargs):
        words = [SimpleNamespace(start=0.0, end=0.3), SimpleNamespace(start=0.4, end=0.8)]
        return [SimpleNamespace(text=" Hello there", words=words)], None


class TranscribeEndpointTest(unittest.TestCase):
    """POST /transcribe with a fake Whisper model and a fake provider: checks the wiring and the contract."""

    @classmethod
    def setUpClass(cls):
        import app as service  # imports faster_whisper, but no model is loaded until startup
        from fastapi.testclient import TestClient
        cls.service = service
        cls.client = TestClient(service.app)  # used without "with": the real Whisper model is never loaded

    def setUp(self):
        self.saved = (self.service.state["model"], self.service.pron_scorer)
        self.service.state["model"] = FakeWhisper()

    def tearDown(self):
        self.service.state["model"], self.service.pron_scorer = self.saved

    def post(self):
        return self.client.post("/transcribe", files={"audio": ("a.wav", wav_bytes(), "audio/wav")})

    def test_gemini_scores_are_returned_and_valid(self):
        fake = FakeGemini(gemini_reply('{"accuracy": 81, "fluency": 74, "prosody": 66}'))
        self.service.pron_scorer = PronunciationScorer(
            GEMINI, lambda config, samples: gemini_assess(config, samples, transport=fake.transport))
        r = self.post()
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["pronunciation"], {"accuracy": 81.0, "fluency": 74.0, "completeness": None,
                                                 "prosody": 66.0, "source": "gemini"})
        self.assertEqual(body["transcript"], "Hello there")
        self.assertIn("x-pronunciation-sec", r.headers)
        self.assertEqual(list(VALIDATOR.iter_errors(body)), [])

    def test_provider_failure_keeps_the_transcript_and_sends_null(self):
        fake = FakeGemini(gemini_reply("quota exceeded", status=429))
        self.service.pron_scorer = PronunciationScorer(
            GEMINI, lambda config, samples: gemini_assess(config, samples, transport=fake.transport))
        with self.assertLogs("asr_service.pronunciation", level="WARNING"):
            r = self.post()
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()["pronunciation"])
        self.assertEqual(r.json()["transcript"], "Hello there")

    def test_disabled_sends_null(self):
        self.service.pron_scorer = PronunciationScorer(PronConfig(enabled=False))
        r = self.post()
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()["pronunciation"])

    def test_health_reports_the_pronunciation_status(self):
        self.service.pron_scorer = PronunciationScorer(PronConfig(enabled=True, provider="gemini"))
        self.assertEqual(self.client.get("/health").json()["pronunciation"], pron.STATUS_MISCONFIGURED)


if __name__ == "__main__":
    unittest.main()
