"""AI service for IELTS Speaking: Whisper transcript + speech features + pronunciation scores.

Response of POST /transcribe follows ai/schema/speaking_asr.schema.json.
Pronunciation scores come from pronunciation.py (Gemini estimate by default, or Azure) when PRON_ENABLED=true;
they run in parallel with Whisper and are null when disabled or when the provider fails.
The service has no authentication: it must listen on 127.0.0.1 only.
"""
import logging
import os
import tempfile
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel, decode_audio

from pronunciation import STATUS_DISABLED, PronConfig, PronunciationScorer

MODEL_SIZE = os.getenv("ASR_MODEL_SIZE", "small")
DEVICE = os.getenv("ASR_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("ASR_COMPUTE_TYPE", "int8")
LANGUAGE = os.getenv("ASR_LANGUAGE", "en")
MAX_BYTES = int(os.getenv("ASR_MAX_BYTES", str(35 * 1024 * 1024)))
MAX_DURATION_SEC = float(os.getenv("ASR_MAX_DURATION_SEC", "300"))
INITIAL_PROMPT = os.getenv("ASR_INITIAL_PROMPT") or None
PAUSE_MIN_SEC = 0.5
SAMPLE_RATE = 16000
CHUNK = 1024 * 1024

log = logging.getLogger("asr_service")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

state = {"model": None}
infer_lock = threading.Lock()
pron_scorer = PronunciationScorer(PronConfig.from_env())
# Provider calls are network-bound: a small pool lets them overlap with Whisper (and with each other)
pron_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="pron")


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status, self.code, self.message = status, code, message


@asynccontextmanager
async def lifespan(_: FastAPI):
    t0 = time.time()
    state["model"] = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    log.info("model whisper-%s loaded in %.1fs", MODEL_SIZE, time.time() - t0)
    if pron_scorer.active:
        log.info("pronunciation: %s", pron_scorer.config.describe())
    elif pron_scorer.status == STATUS_DISABLED:
        log.info("pronunciation: disabled (set PRON_ENABLED=true)")
    else:
        log.warning("pronunciation: %s for provider '%s', scores will be null (see ai/asr_service/README.md)",
                    pron_scorer.status, pron_scorer.config.provider)
    yield
    pron_executor.shutdown(wait=False, cancel_futures=True)


app = FastAPI(title="IELTS ASR service", lifespan=lifespan)


@app.exception_handler(ApiError)
async def api_error_handler(_: Request, exc: ApiError):
    return JSONResponse({"code": exc.code, "message": exc.message}, status_code=exc.status)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    return JSONResponse({"code": "BAD_REQUEST", "message": "Multipart field 'audio' is required."}, status_code=400)


@app.get("/health")
def health():
    ready = state["model"] is not None
    return JSONResponse(
        {"status": "ok" if ready else "loading", "asr_model": f"whisper-{MODEL_SIZE}", "language": LANGUAGE,
         "pronunciation": pron_scorer.status},
        status_code=200 if ready else 503,
    )


def compute_features(words, duration_sec: float, transcript: str) -> dict:
    word_count = len(transcript.split())
    pauses = []
    for prev, nxt in zip(words, words[1:]):
        gap = nxt.start - prev.end
        if gap >= PAUSE_MIN_SEC:
            pauses.append(gap)
    return {
        "duration_sec": round(duration_sec, 2),
        "word_count": word_count,
        "speech_rate_wpm": round(word_count / duration_sec * 60, 1) if duration_sec > 0 else 0,
        "pause_count": len(pauses),
        "total_pause_sec": round(sum(pauses), 2),
        "longest_pause_sec": round(max(pauses), 2) if pauses else 0,
    }


async def save_upload(upload: UploadFile, path: Path) -> None:
    size = 0
    with open(path, "wb") as f:
        while chunk := await upload.read(CHUNK):
            size += len(chunk)
            if size > MAX_BYTES:
                raise ApiError(413, "FILE_TOO_LARGE", f"Audio file is larger than {MAX_BYTES // (1024 * 1024)} MB.")
            f.write(chunk)
    if size == 0:
        raise ApiError(400, "EMPTY_FILE", "Audio file is empty.")


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    model = state["model"]
    if model is None:
        raise ApiError(503, "MODEL_NOT_READY", "ASR model is still loading.")
    # Random temp name: the client's file name is never trusted or used.
    path = Path(tempfile.gettempdir()) / f"asr_{uuid.uuid4().hex}.bin"
    try:
        await save_upload(audio, path)
        try:
            samples = decode_audio(str(path), sampling_rate=SAMPLE_RATE)
        except Exception:
            raise ApiError(400, "BAD_AUDIO", "File is not a readable audio file.")
        duration = len(samples) / SAMPLE_RATE
        if duration <= 0:
            raise ApiError(400, "BAD_AUDIO", "Audio contains no samples.")
        if duration > MAX_DURATION_SEC:
            raise ApiError(413, "AUDIO_TOO_LONG", f"Audio is longer than {MAX_DURATION_SEC:.0f} s.")
        # Azure runs while Whisper transcribes; its result is collected after Whisper is done
        pron_future = pron_executor.submit(pron_scorer.score, samples) if pron_scorer.active else None
        try:
            t0 = time.time()
            with infer_lock:
                segments, _info = model.transcribe(
                    samples,
                    language=LANGUAGE,
                    word_timestamps=True,
                    vad_filter=True,
                    condition_on_previous_text=False,
                    initial_prompt=INITIAL_PROMPT,
                )
                segments = list(segments)
            elapsed = time.time() - t0
        except Exception:
            log.exception("whisper failed")
            if pron_future is not None:
                pron_future.cancel()
            raise ApiError(500, "ASR_FAILED", "Speech recognition failed.")
        words = [w for s in segments for w in (s.words or [])]
        transcript = " ".join(s.text.strip() for s in segments).strip()
        log.info("transcribed %.1fs audio in %.1fs (%d words)", duration, elapsed, len(transcript.split()))
        pronunciation, pron_elapsed = collect_pronunciation(pron_future)
        return JSONResponse(
            {
                "schema_version": "1.0",
                "asr_model": f"whisper-{MODEL_SIZE}",
                "language": LANGUAGE,
                "transcript": transcript,
                "features": compute_features(words, duration, transcript),
                "pronunciation": pronunciation,
            },
            headers={"X-Processing-Sec": f"{elapsed:.2f}", "X-Pronunciation-Sec": f"{pron_elapsed:.2f}"},
        )
    finally:
        path.unlink(missing_ok=True)


def collect_pronunciation(future) -> tuple:
    """Pronunciation scores of a running assessment, or (None, 0) when it is off, failed or too slow."""
    if future is None:
        return None, 0.0
    try:
        # score() has its own timeout; the margin only guards against a stuck SDK call
        return future.result(timeout=pron_scorer.config.timeout_sec + 15)
    except FutureTimeout:
        future.cancel()
        log.warning("pronunciation assessment did not finish in time, scores are null")
        return None, 0.0
    except Exception as exc:  # score() never raises, but the request must not fail because of it
        log.warning("pronunciation assessment crashed (%s)", type(exc).__name__)
        return None, 0.0


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("ASR_PORT", "8000")))
