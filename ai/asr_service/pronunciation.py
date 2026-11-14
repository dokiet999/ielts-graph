"""Pronunciation scores for one IELTS Speaking answer.

Fills the "pronunciation" object of ai/schema/speaking_asr.schema.json:
    {"accuracy": 0-100, "fluency": 0-100, "completeness": null, "prosody": 0-100 | null, "source": "gemini" | "azure"}

Two providers (PRON_PROVIDER):

- gemini (default): a Gemini model listens to the audio and ESTIMATES the three scores against a fixed scale.
  This is an AI judgement, not an acoustic measurement: published studies find that audio LLMs agree only weakly
  to moderately with human raters and give stereotyped phoneme feedback, so the scores are labelled as an AI
  estimate downstream ("source": "gemini") and must be checked with eval_pron.py before they are relied on.
- azure: Azure Pronunciation Assessment measures the scores with an acoustic model (needs an Azure Speech key).

Common rules:
- Unscripted: IELTS answers are free speech, so there is no reference text and completeness is always null.
  The Whisper transcript is not used as a reference, because Whisper tends to write the intended word even when
  it was mispronounced.
- The audio is the 16 kHz mono signal that faster-whisper already decoded, so every format the service accepts
  (webm, ogg, m4a, mp3, wav) works the same way.
- Never fails the request: when scoring is disabled, not configured or fails, the result is None and the grader
  falls back to an indirect estimate.

Environment:
    PRON_ENABLED          "true" to score pronunciation (default: false)
    PRON_PROVIDER         gemini (default) or azure
    PRON_TIMEOUT_SEC      default 150 (the backend waits 180 s for the whole /transcribe call)
  gemini:
    GEMINI_API_KEY        same key as the backend (never logged)
    PRON_GEMINI_MODEL     default gemini-4-argon (must accept audio input)
  azure:
    AZURE_SPEECH_KEY      key of the Azure AI Speech resource (never logged)
    AZURE_SPEECH_REGION   region of that resource, e.g. southeastasia
    PRON_LOCALE           default en-US (Azure scores prosody only for en-US)
"""
import base64
import importlib.util
import io
import json
import logging
import os
import re
import threading
import time
import wave
from dataclasses import dataclass
from typing import Callable, Optional, Sequence

import httpx
import numpy as np

log = logging.getLogger("asr_service.pronunciation")

SAMPLE_RATE = 16000
AZURE_SDK_MODULE = "azure.cognitiveservices.speech"
AZURE_PROSODY_LOCALES = {"en-US"}
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_GEMINI_MODEL = "gemini-4-argon"

STATUS_ENABLED = "enabled"
STATUS_DISABLED = "disabled"
STATUS_MISCONFIGURED = "misconfigured"
STATUS_SDK_MISSING = "sdk_missing"

GEMINI_SYSTEM_PROMPT = """You rate the PRONUNCIATION of one spoken answer by a learner of English (IELTS Speaking practice).
Listen to the audio and give three scores from 0 to 100:
- accuracy: how clearly and correctly the individual sounds and words are pronounced.
- fluency: smoothness of delivery: rhythm, pace, and unnatural pauses or hesitations between words.
- prosody: word stress, sentence stress, intonation and rhythm.

Use the same scale for the three scores:
- 90-100: native-like or near native-like control; effortless to understand.
- 75-89: clear, with occasional errors that never block understanding.
- 60-74: generally intelligible, but errors are noticeable and sometimes need effort from the listener.
- 40-59: frequent errors; understanding often needs effort.
- 0-39: hard to understand for most of the answer.

Rules:
- Judge only what you actually hear in this recording.
- A foreign accent is not an error by itself: lower a score only when the accent reduces clarity.
- Do not assume errors from the speaker's likely first language or background.
- Do not judge grammar, vocabulary or the content of the answer.
- If there is no intelligible English speech, return null for all three scores.
Return only the JSON object."""

GEMINI_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "accuracy": {"type": "NUMBER", "nullable": True},
        "fluency": {"type": "NUMBER", "nullable": True},
        "prosody": {"type": "NUMBER", "nullable": True},
    },
    "required": ["accuracy", "fluency", "prosody"],
}


class PronunciationError(Exception):
    """The provider could not score the audio. The message never contains a key."""


@dataclass(frozen=True)
class PronConfig:
    enabled: bool
    provider: str = "gemini"
    gemini_key: Optional[str] = None
    gemini_model: str = DEFAULT_GEMINI_MODEL
    azure_key: Optional[str] = None
    azure_region: Optional[str] = None
    locale: str = "en-US"
    timeout_sec: float = 150.0

    @staticmethod
    def from_env(env=None) -> "PronConfig":
        env = os.environ if env is None else env
        clean = lambda name: (env.get(name) or "").strip() or None
        return PronConfig(
            enabled=env.get("PRON_ENABLED", "false").strip().lower() in {"1", "true", "yes"},
            provider=(clean("PRON_PROVIDER") or "gemini").lower(),
            gemini_key=clean("GEMINI_API_KEY"),
            gemini_model=clean("PRON_GEMINI_MODEL") or DEFAULT_GEMINI_MODEL,
            azure_key=clean("AZURE_SPEECH_KEY"),
            azure_region=clean("AZURE_SPEECH_REGION"),
            locale=clean("PRON_LOCALE") or "en-US",
            timeout_sec=float(clean("PRON_TIMEOUT_SEC") or 150),
        )

    def status(self, sdk_installed: Optional[bool] = None) -> str:
        if not self.enabled:
            return STATUS_DISABLED
        if self.provider == "gemini":
            return STATUS_ENABLED if self.gemini_key else STATUS_MISCONFIGURED
        if self.provider == "azure":
            if not self.azure_key or not self.azure_region:
                return STATUS_MISCONFIGURED
            if sdk_installed is None:
                sdk_installed = importlib.util.find_spec(AZURE_SDK_MODULE) is not None
            return STATUS_ENABLED if sdk_installed else STATUS_SDK_MISSING
        return STATUS_MISCONFIGURED  # unknown provider

    def describe(self) -> str:
        if self.provider == "azure":
            return f"azure ({self.azure_region}, {self.locale})"
        return f"{self.provider} ({self.gemini_model})"


# ---------------------------------------------------------------- shared helpers

def _clamp_round(value: float) -> float:
    return round(min(100.0, max(0.0, float(value))), 1)


def to_pcm16(samples: np.ndarray) -> bytes:
    """Float samples in [-1, 1] (faster-whisper decode_audio) to little-endian 16-bit PCM."""
    clipped = np.clip(np.asarray(samples, dtype=np.float32), -1.0, 1.0)
    return (clipped * 32767.0).astype("<i2").tobytes()


def to_wav(samples: np.ndarray) -> bytes:
    """16 kHz mono 16-bit WAV: about 32 KB per second, so 300 s fit in Gemini's 20 MB inline limit after base64."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(to_pcm16(samples))
    return buf.getvalue()


# ---------------------------------------------------------------- gemini

def parse_gemini_scores(text: str) -> Optional[dict]:
    """Scores from the model's JSON answer; None when the model found no speech to rate."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", (text or "").strip())
    try:
        data = json.loads(cleaned)
    except ValueError:
        raise PronunciationError("Gemini answer is not valid JSON")
    if not isinstance(data, dict):
        raise PronunciationError("Gemini answer is not a JSON object")

    def score(name):
        value = data.get(name)
        if value is None:
            return None
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise PronunciationError(f"Gemini score '{name}' is not a number")
        return _clamp_round(value)

    accuracy, fluency, prosody = score("accuracy"), score("fluency"), score("prosody")
    if accuracy is None or fluency is None:  # no intelligible speech, or an incomplete answer
        return None
    return {"accuracy": accuracy, "fluency": fluency, "completeness": None, "prosody": prosody, "source": "gemini"}


def gemini_assess(config: PronConfig, samples: np.ndarray, transport: Optional[httpx.BaseTransport] = None,
                  raw_sink: Optional[list] = None) -> Optional[dict]:
    """Asks a Gemini model to rate the pronunciation of the audio. transport is replaced in tests."""
    payload = {
        "systemInstruction": {"parts": [{"text": GEMINI_SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [
            {"text": "Rate the pronunciation of this answer."},
            {"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(to_wav(samples)).decode("ascii")}},
        ]}],
        "generationConfig": {
            "temperature": 0,
            "responseMimeType": "application/json",
            "responseSchema": GEMINI_RESPONSE_SCHEMA,
        },
    }
    try:
        with httpx.Client(transport=transport, timeout=config.timeout_sec) as client:
            # The key goes in a header, never in the URL, so it cannot appear in an error message
            response = client.post(GEMINI_URL.format(model=config.gemini_model),
                                   headers={"x-goog-api-key": config.gemini_key}, json=payload)
    except httpx.TimeoutException:
        raise PronunciationError(f"Gemini timed out after {config.timeout_sec:.0f} s")
    except httpx.HTTPError as exc:
        raise PronunciationError(f"cannot reach Gemini ({type(exc).__name__})")

    if response.status_code != 200:
        if raw_sink is not None:  # the full error body says which quota or field failed (no key in it)
            raw_sink.append(response.text)
        try:
            message = response.json().get("error", {}).get("message", "")
        except ValueError:
            message = ""
        raise PronunciationError(f"Gemini HTTP {response.status_code}: {message[:200]}")

    try:
        body = response.json()
        candidate = body["candidates"][0]
        parts = candidate.get("content", {}).get("parts", [])
    except (ValueError, KeyError, IndexError, TypeError):
        raise PronunciationError("Gemini response has no candidate")
    text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
    if raw_sink is not None:
        raw_sink.append(text)
    if not text:
        raise PronunciationError(f"Gemini returned no text (finishReason={candidate.get('finishReason')})")
    return parse_gemini_scores(text)


# ---------------------------------------------------------------- azure

@dataclass(frozen=True)
class UtteranceScore:
    """Azure scores of one recognised utterance (0-100). prosody is None when Azure did not score it."""
    word_count: int
    accuracy: float
    fluency: float
    prosody: Optional[float]


def _weighted_mean(pairs) -> Optional[float]:
    pairs = [(w, v) for w, v in pairs if v is not None and w > 0]
    total = sum(w for w, _ in pairs)
    if total == 0:
        return None
    return _clamp_round(sum(w * v for w, v in pairs) / total)


def aggregate(utterances: Sequence[UtteranceScore]) -> Optional[dict]:
    """Answer-level Azure scores from utterance scores, weighted by word count. None when no word was scored."""
    scored = [u for u in utterances if u.word_count > 0]
    if not scored:
        return None
    return {
        "accuracy": _weighted_mean((u.word_count, u.accuracy) for u in scored),
        "fluency": _weighted_mean((u.word_count, u.fluency) for u in scored),
        "completeness": None,
        "prosody": _weighted_mean((u.word_count, u.prosody) for u in scored),
        "source": "azure",
    }


def azure_recognize(config: PronConfig, pcm: bytes, raw_sink: Optional[list] = None) -> list:
    """Runs Azure continuous recognition with unscripted pronunciation assessment on 16 kHz mono PCM.

    raw_sink, when given, receives the raw JSON of every recognised utterance (used by eval_pron.py --raw).
    """
    import azure.cognitiveservices.speech as speechsdk  # optional dependency, imported only when used

    speech_config = speechsdk.SpeechConfig(subscription=config.azure_key, region=config.azure_region)
    speech_config.speech_recognition_language = config.locale
    stream_format = speechsdk.audio.AudioStreamFormat(samples_per_second=SAMPLE_RATE, bits_per_sample=16, channels=1)
    stream = speechsdk.audio.PushAudioInputStream(stream_format=stream_format)
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config, audio_config=speechsdk.audio.AudioConfig(stream=stream))

    assessment = speechsdk.PronunciationAssessmentConfig(
        reference_text="",  # unscripted
        grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,  # the SDK default is FivePoint
        granularity=speechsdk.PronunciationAssessmentGranularity.Word,
        enable_miscue=False,
    )
    if config.locale in AZURE_PROSODY_LOCALES:
        assessment.enable_prosody_assessment()
    assessment.apply_to(recognizer)

    utterances: list = []
    errors: list = []
    done = threading.Event()

    def on_recognized(evt):
        if evt.result.reason != speechsdk.ResultReason.RecognizedSpeech:
            return
        if raw_sink is not None:
            raw_sink.append(evt.result.properties.get(speechsdk.PropertyId.SpeechServiceResponse_JsonResult))
        result = speechsdk.PronunciationAssessmentResult(evt.result)
        if result.accuracy_score is None or result.fluency_score is None:
            return
        utterances.append(UtteranceScore(
            word_count=len(result.words or []),
            accuracy=result.accuracy_score,
            fluency=result.fluency_score,
            prosody=result.prosody_score,
        ))

    def on_canceled(evt):
        details = evt.cancellation_details
        # EndOfStream is the normal end of a push stream; only Error is a failure
        if details.reason == speechsdk.CancellationReason.Error:
            errors.append(f"{details.code}: {(details.error_details or '')[:200]}")
        done.set()

    recognizer.recognized.connect(on_recognized)
    recognizer.canceled.connect(on_canceled)
    recognizer.session_stopped.connect(lambda _evt: done.set())

    recognizer.start_continuous_recognition()
    try:
        chunk = SAMPLE_RATE * 2  # one second of 16-bit audio
        for start in range(0, len(pcm), chunk):
            stream.write(pcm[start:start + chunk])
        stream.close()
        finished = done.wait(config.timeout_sec)
    finally:
        recognizer.stop_continuous_recognition()

    if errors:
        raise PronunciationError(errors[0])
    if not finished:
        raise PronunciationError(f"timed out after {config.timeout_sec:.0f} s")
    return utterances


def azure_assess(config: PronConfig, samples: np.ndarray) -> Optional[dict]:
    return aggregate(azure_recognize(config, to_pcm16(samples)))


# ---------------------------------------------------------------- scorer

PROVIDERS: dict = {"gemini": gemini_assess, "azure": azure_assess}


class PronunciationScorer:
    """Scores one answer with the configured provider. `assess` can be replaced in tests (no network call)."""

    def __init__(self, config: PronConfig,
                 assess: Optional[Callable[[PronConfig, np.ndarray], Optional[dict]]] = None,
                 sdk_installed: Optional[bool] = None):
        self.config = config
        self._assess = assess or PROVIDERS.get(config.provider)
        self.status = config.status(sdk_installed)

    @property
    def active(self) -> bool:
        return self.status == STATUS_ENABLED and self._assess is not None

    def score(self, samples: np.ndarray) -> tuple:
        """Returns (scores or None, seconds spent). Never raises."""
        if not self.active:
            return None, 0.0
        t0 = time.time()
        try:
            scores = self._assess(self.config, samples)
            if scores is None:
                log.info("pronunciation: no speech scored")
            return scores, time.time() - t0
        except Exception as exc:  # any failure falls back to "not available"
            log.warning("pronunciation assessment failed (%s): %s", type(exc).__name__, exc)
            return None, time.time() - t0
