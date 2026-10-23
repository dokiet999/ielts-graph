# Speaking set v1 — dataset card

> Bản khung: chưa có mẫu nào. Điền các mục `<...>` khi bộ audio đã đủ. Audio không nằm trong Git (xem `.gitignore`); chia sẻ qua Drive và đối chiếu bằng `sha256` trong `manifest.csv`.

Bộ audio IELTS Speaking dùng để (1) đo WER của Whisper so với transcript chuẩn gõ tay và (2) thử prompt chấm Speaking.

## Nội dung
- Mỗi mẫu là **một câu trả lời của một người nói** cho **một câu hỏi** (Part 1, 2 hoặc 3).
- Mỗi mẫu có: đề (`question`, Part 2 gồm cả cue card), Part (`QT_S_PART1|2|3`), file audio, transcript chuẩn, nguồn, license, thời lượng.
- `reference_band` chỉ điền khi nguồn có; nếu có thì là band của cả bài thi theo cộng đồng, không phải của giám khảo IELTS và không phải band của riêng câu trả lời này.

## Phân bố
| Part | Số mẫu | Tự thu | Nguồn ngoài |
|---|---|---|---|
| 1 | <n> | <n> | <n> |
| 2 | <n> | <n> | <n> |
| 3 | <n> | <n> | <n> |
| **Tổng** | **<n>** | **<n>** | **<n>** |

- Số người nói: <n> (mã giả `spk_01`...; không ghi tên thật).
- Môi trường: <n> mẫu yên tĩnh, <n> mẫu có tiếng ồn hoặc micro điện thoại; <n> mẫu thu bằng trình duyệt (webm).
- Có từ đệm hoặc tự sửa: <n> mẫu. Mẫu biên (`edge`): <n> (câu rất ngắn, im lặng, có lời chỉ dẫn lẫn trong bài nói, lạc đề).

## Quy ước transcript chuẩn
- Gõ **đúng những gì người nói đã nói**, kể cả "um", "uh", lặp từ và chỗ tự sửa.
- Chỉ một người nói; không có lời của giám khảo hay người khác.
- Không dùng ký hiệu `[inaudible]`: đoạn nào không nghe rõ thì không đưa mẫu vào.
- Dấu câu và chữ hoa ghi tự nhiên; khi tính WER, hạ chữ thường và bỏ dấu câu (thống nhất với người đo WER).

## File
- `manifest.csv`: `id, part, question, audio_file, sha256, source, license, duration_sec, split, speaker_id, tags, reference_band`.
- `references.json`: mảng `{id, part, question, reference_transcript, reference_band}`.
- `audio/`: file audio, **không commit**.

## Nguồn và license
- Tự thu: người nói trong nhóm nói theo đề, **đã đồng ý** cho dùng giọng nói trong dự án học tập này. License: <ghi quyền sử dụng>.
- Nguồn ngoài (nếu có): ghi tên bộ dữ liệu, bản (revision), vị trí và mốc thời gian đã cắt, license đúng như nguồn công bố. Nếu nguồn không ghi license thì ghi `unknown` và chỉ dùng nội bộ cho nghiên cứu và học tập.

## Cách dùng
- `dev`: chạy prompt, so kết quả, sửa prompt.
- `test`: chỉ dùng đánh giá cuối; không dùng để chỉnh prompt.

## Lưu ý
- Transcript do máy sinh (kể cả bộ có sẵn trên mạng) **chưa phải transcript chuẩn**; chỉ dùng để đo WER sau khi đã nghe lại và sửa tay.
- Mẫu nhỏ nên số WER chỉ có độ tin cậy hạn chế; mẫu tự thu do thành viên nhóm nói theo đề nên không đại diện hoàn toàn cho người dùng thật.
- Audio là dữ liệu cá nhân: không đưa vào Git, không ghi transcript ở mức log thường.
