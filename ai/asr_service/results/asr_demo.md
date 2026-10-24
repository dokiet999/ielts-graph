# ASR demo

Cách chạy: gửi file audio tới `POST http://127.0.0.1:8000/transcribe` (trường `audio`), dịch vụ `whisper-small` trả JSON theo `ai/schema/speaking_asr.schema.json`.
Audio mẫu: một bài IELTS Speaking, 3 Part (`1_IELTS_Advantage_8_Part1/2/3.wav`, không đưa vào Git).

| Part | Thời lượng (giây) | Xử lý (giây) | Số từ | Tốc độ (từ/phút) | Số lần ngừng ≥0,5 giây | Tổng ngừng (giây) | Ngừng dài nhất (giây) |
|---|---|---|---|---|---|---|---|
| 1 | 127.62 | 26.70 | 424 | 199.3 | 3 | 1.82 | 0.66 |
| 2 | 104.62 | 23.79 | 325 | 186.4 | 2 | 1.1 | 0.56 |
| 3 | 137.54 | 29.90 | 439 | 191.5 | 2 | 1.82 | 1.3 |

## Transcript (đoạn đầu mỗi Part)

**Part 1:** Oh, I'm a student. I'm studying MSc marketing because analytics is big now. Big data is everywhere and I had a previous experience in SQL, so I decided to come here and study analytics. Oh, I hope to work as a data scientist in the future. Like I said, big data is everywhere and I really like SQL and data. I like everything about data. so this …

**Part 2:** The type of clothing that I like to wear is mostly generally casual but I wear different types of clothes on different occasions like everyone else I suppose. So like regardless of the weather in India we have a lot of festivals. So usually I do like to wear casual clothes but like just jeans and a T-shirt. But like on occasions, on festive …

**Part 3:** Oh, yes, I think so. They're quite popular. It depends on the person actually. Designate clothes are usually very expensive, so only a certain socioeconomic class can buy those clothes. So they are popular in certain segments of the society, yes. Oh, I think because it has a social status attached to it. So when you're buying, when you're wearing …

`pronunciation` là `null` (chưa tích hợp chấm phát âm).