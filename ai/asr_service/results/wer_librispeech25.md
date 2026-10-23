# WER của Whisper trên LibriSpeech test-clean (W4, #27)

Kết quả từng mẫu: [wer_librispeech25.csv](wer_librispeech25.csv). Script: [../eval_wer.py](../eval_wer.py).

**Mục đích:** kiểm tra dịch vụ Whisper có chép đúng lời nói không.

**Dữ liệu:** [LibriSpeech](https://www.openslr.org/12) `test-clean` (CC BY 4.0), 25 đoạn từ 25 người đọc khác nhau, mỗi đoạn 8–30 giây, tổng 890 từ. Bản chuẩn là transcript đi kèm bộ dữ liệu. Audio không đưa vào Git.

**Mô hình:** `whisper-small` (faster-whisper, CPU, int8), tiếng Anh, gọi qua `POST /transcribe`.

**Chuẩn hóa (hai phía như nhau):** chữ thường, bỏ dấu câu, số thành chữ, bỏ từ đệm `um/uh/…`; không gộp biến thể chính tả Anh/Mỹ.

| Chỉ số | Giá trị |
|---|---|
| WER trung bình các mẫu | **4,1 %** |
| WER theo tổng lỗi / tổng từ | **4,3 %** (38 / 890) |
| Thay sai / Thiếu / Thừa | 30 / 4 / 4 |
| Số mẫu WER = 0 / dưới 5 % | 8 / 15 (trên 25) |
| WER cao nhất | 10,5 % |
| Thời gian xử lý trung bình | 3,4 giây cho 13,7 giây audio (≈ 0,25×) |

**Lỗi chủ yếu** là thay từ chứ không phải bỏ từ: tên riêng (*Silvia → Sylvia*, *Phronsie → fronze*, *Holmes → homes*), từ hiếm (*uncharitableness*, *doctress*), cách viết (*neighbour → neighbor*, *missus → mrs*), mạo từ (*a ↔ the*). Ít lỗi thiếu và thừa.

**Giới hạn:** chỉ 25 đoạn; giọng đọc sách rõ ràng, phần lớn là người bản ngữ, nên WER thấp hơn nhiều so với lời nói tự nhiên của người học. Kết quả cho thấy Whisper chép đúng trong điều kiện sạch, không đại diện cho giọng thi IELTS.
