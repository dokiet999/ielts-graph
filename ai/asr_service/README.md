# ASR service (Speaking)

Dịch vụ Python nhận một file audio trả lời IELTS Speaking và trả về JSON theo
[`ai/schema/speaking_asr.schema.json`](../schema/speaking_asr.schema.json):

- `transcript`, `features`: Whisper (faster-whisper, mặc định `whisper-small`, CPU).
- `pronunciation`: điểm phát âm (tùy chọn, xem dưới). Tắt, chưa cấu hình hoặc lỗi thì là `null`, và backend vẫn chấm được
  (band Pronunciation khi đó chỉ là ước lượng gián tiếp).

Không có xác thực: chỉ chạy trên `127.0.0.1`. Backend gọi `POST http://127.0.0.1:8000/transcribe` (trường `audio`).

## Chạy

```powershell
cd ai/asr_service
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python app.py          # GET /health để xem trạng thái
```

## Bật chấm phát âm

Điểm phát âm do một model Gemini **nghe** bản ghi âm và **ước lượng** theo thang cố định (`PRON_PROVIDER=gemini`, nguồn duy nhất).
Đây là ước lượng của AI, không phải phép đo âm học. Key là `GEMINI_API_KEY` (cùng key với backend), `source` trong JSON là `"gemini"`.

Giao diện ghi rõ "Điểm do AI (Gemini) nghe bản ghi âm và ước lượng", và bộ chấm không trích dẫn từ cụ thể
làm bằng chứng lỗi phát âm. Lý do: các nghiên cứu 2026 về audio LLM (kể cả Gemini 3.0 Flash) cho thấy mức khớp với giám khảo
chỉ yếu đến trung bình, và nhận xét lỗi âm vị hay bị rập khuôn. Phải đo bằng `eval_pron.py` trước khi tin con số.

```powershell
$env:PRON_ENABLED="true"
$env:GEMINI_API_KEY="<key>"                  # không ghi vào file trong Git
# $env:PRON_GEMINI_MODEL="gemini-3.5-flash-lite"    # mặc định; model phải nhận được audio
.venv\Scripts\python app.py
```

Kiểm tra: `GET http://127.0.0.1:8000/health` phải có `"pronunciation": "enabled"`.
Các giá trị khác: `disabled` (chưa bật), `misconfigured` (thiếu key hoặc provider sai).

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PRON_ENABLED` | `false` | `true` để chấm phát âm |
| `PRON_PROVIDER` | `gemini` | Chỉ có `gemini` |
| `PRON_TIMEOUT_SEC` | `150` | Thời gian tối đa cho provider; backend chờ cả request tối đa 180 s |
| `GEMINI_API_KEY` | | Key Gemini (không bao giờ ghi ra log, gửi trong header) |
| `PRON_GEMINI_MODEL` | `gemini-3.5-flash-lite` | Model Gemini nhận audio |

### Cách tính điểm

- **Unscripted**: câu trả lời IELTS là nói tự do nên không có câu mẫu; `completeness` cần câu mẫu nên **luôn là `null`**.
- Gửi audio WAV 16 kHz mono trong request (bài 300 s khoảng 13 MB sau base64, dưới giới hạn 20 MB),
  `temperature` 0, trả JSON theo schema cố định (`accuracy`, `fluency`, `prosody`, 0-100). Prompt yêu cầu không coi giọng
  địa phương là lỗi, không đoán lỗi theo tiếng mẹ đẻ, không chấm ngữ pháp hay nội dung.
- Việc chấm chạy song song với Whisper (header `X-Pronunciation-Sec` cho biết thời gian).
- Audio được gửi sang Google (Gemini): cần ghi rõ trong báo cáo và với người học.

## Test và đánh giá

```powershell
.venv\Scripts\python -m unittest test_pronunciation -v      # không cần key: Gemini và Whisper được giả lập
.venv\Scripts\python test_service.py                       # smoke test dịch vụ đang chạy

# Xem provider trả gì (câu trả lời gốc) trên 1 file, không cần chạy dịch vụ
.venv\Scripts\python eval_pron.py --raw ..\..\data\speaking_v1\audio\sp_01_p2.wav

# So điểm với band Pronunciation tham chiếu của speaking_v1 (dịch vụ phải đang chạy với PRON_ENABLED=true).
# --repeat 3 chấm mỗi file 3 lần để đo độ ổn định của ước lượng AI.
.venv\Scripts\python eval_pron.py --repeat 3 --out-prefix results\pron_speaking_v1
```

Band tham chiếu của `speaking_v1` là band của cả bài thi (3 Part chung một nhãn), chỉ có 7 người nói và band 6-9:
kết quả `eval_pron.py` chỉ cho thấy xu hướng, chưa đủ để đặt ngưỡng đổi điểm sang band.
