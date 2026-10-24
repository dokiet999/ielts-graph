# Speaking set v1 — dataset card

Bộ audio IELTS Speaking dùng để (1) đo WER của Whisper so với transcript chuẩn và (2) thử prompt chấm Speaking. Audio và transcript **không nằm trong Git** (thư mục `audio/` đã có trong `.gitignore`); chia sẻ qua Drive và đối chiếu bằng `sha256` trong `manifest.csv` và `references.json`.

## Nội dung
- 21 mẫu lấy từ **7 bài thi thử** công khai trên YouTube; mỗi bài cắt thành 3 file theo Part (`sp_<bài>_p<Part>`).
- Mỗi mẫu là **toàn bộ phần trả lời của thí sinh trong một Part**. Audio chỉ có giọng thí sinh, không có giọng giám khảo. Part 1 và Part 3 gồm nhiều câu hỏi liên tiếp (4–14 câu); Part 2 là lượt nói dài theo cue card, có thể kèm 1 câu hỏi phụ.
- `question` ghi các câu hỏi của Part theo thứ tự, ngăn bằng ` | `; Part 2 ghi cả cue card.
- `reference_band` là band tổng của **cả bài thi** do nguồn công bố; `reference_criteria` (trong `references.json`) là band từng tiêu chí của cả bài thi. Nhóm dùng làm nhãn tham chiếu; đây không phải band của riêng Part đó.

## Phân bố
| Part | Số mẫu | Tự thu | Nguồn ngoài | Thời lượng |
|---|---|---|---|---|
| 1 | 7 | 0 | 7 | 111,0–279,9 s |
| 2 | 7 | 0 | 7 | 89,9–129,3 s |
| 3 | 7 | 0 | 7 | 95,5–275,3 s |
| **Tổng** | **21** | **0** | **21** | **3 276,7 s (≈ 54,6 phút), 8 428 từ** |

- Số người nói: 7, mỗi bài thi một người (`spk_01`…`spk_07`, theo số thứ tự bài; không ghi tên thật).
- Band tham chiếu theo bài: 6 (1 bài), 7 (2 bài), 8 (2 bài), 9 (2 bài). Bộ lệch về band cao; band 9 nằm ngoài vùng hiệu chuẩn 4–8.
- Môi trường: 21 mẫu trích từ video (WAV 48 kHz, mono), âm thanh rõ; 0 mẫu có tiếng ồn hoặc micro điện thoại; 0 mẫu thu bằng trình duyệt (webm).
- Có từ đệm hoặc tự sửa: không xác định được, vì transcript nguồn đã được làm sạch (0 từ đệm trong cả 21 mẫu). Mẫu biên (`edge`): 0.
- 6 mẫu dài hơn 180 s (tag `over_180s`: `sp_02_p1`, `sp_02_p3`, `sp_05_p1`, `sp_05_p3`, `sp_07_p1`, `sp_07_p3`).

## Chia tập
Chia theo người nói, để một người không nằm ở cả hai tập.
- `dev` (15 mẫu): bài 1–5. Dùng để chạy prompt, so kết quả, sửa prompt.
- `test` (6 mẫu): bài 6–7. Chỉ dùng đánh giá cuối; không dùng để chỉnh prompt.

## Quy ước transcript chuẩn
- Lấy từ transcript của nguồn, nhóm coi là đúng; chỉ giữ phần `[Answer]` (lời thí sinh), bỏ câu hỏi của giám khảo vì audio không có giọng giám khảo.
- Mỗi câu trả lời một dòng, theo thứ tự trong audio.
- Transcript nguồn không có "um", "uh" và có thể đã bỏ bớt chỗ lặp từ, tự sửa. Khi tính WER, hạ chữ thường, bỏ dấu câu và bỏ từ đệm ở cả hai phía (như `ai/asr_service/eval_wer.py`).

## File
- `manifest.csv`: `id, part, question, audio_file, sha256, source, license, duration_sec, split, speaker_id, tags, reference_band`. `audio_file` nằm trong `audio/`.
- `references.json`: mảng `{id, part, question, question_count, reference_file, reference_sha256, word_count, reference_band, reference_criteria}`. Không chứa lời nói; `reference_file` trỏ tới transcript chuẩn.
- `audio/<id>.wav` và `audio/refs/<id>.txt`: audio và transcript chuẩn, **không commit**.

## Nguồn và license
- Nguồn: video bài thi thử của các kênh YouTube *IELTS Advantage* (bài 1, 4, 7), *IELTS English Academy l edm IELTS* (bài 2, 5), *Ross IELTS Academy* (bài 3, 6); transcript và band lấy từ `IELTS_Transcript_data.csv` (dòng ID 1–7). Cột `source` ghi tên file gốc của từng mẫu.
- License: `unknown; internal research use only (not redistributed)`. Nguồn không ghi license nên chỉ dùng nội bộ cho nghiên cứu và học tập; không đưa audio hay transcript lên repo public (SRS 5.2).
- Tự thu: chưa có mẫu nào.

## Cách dùng
Đo WER (service ASR phải đang chạy; nâng giới hạn thời lượng để không bị từ chối 6 mẫu dài):
```powershell
$env:ASR_MAX_DURATION_SEC="300"; python ai/asr_service/app.py
python ai/asr_service/eval_wer.py --audio-dir data/speaking_v1/audio --ref-dir data/speaking_v1/audio/refs --out-prefix ai/asr_service/results/wer_speaking_v1
```

## Lưu ý
- Mỗi mẫu là cả một Part gồm nhiều câu trả lời, trong khi hệ thống chấm **một câu trả lời cho một câu hỏi**. Khi dùng để thử grader, cắt riêng từng câu trả lời, hoặc ghi rõ là đã chấm cả Part.
- Video công khai có thể đã được biên tập (cắt khoảng lặng): tốc độ nói tính trên các mẫu là 130–240 từ/phút, cao hơn lời nói thường. Các đặc trưng ngắt nghỉ (`pause_count`, `longest_pause_sec`) trên bộ này có thể không phản ánh người nói thật.
- Mẫu nhỏ (7 người nói), phần lớn band 7–9, nên số WER và kết quả thử chấm chỉ có độ tin cậy hạn chế và không đại diện cho người học band thấp.
- Audio là dữ liệu cá nhân của người nói: không đưa vào Git, không ghi transcript ở mức log thường.
