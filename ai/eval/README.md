# Baseline chấm Writing Task 2 (W3)

So sánh band do LLM chấm với band tham chiếu của Writing set v1 (`data/writing_v1/`). Mô hình `gemini-3.5-flash-lite`, prompt `writing-v1.2`.

- `dev` (16 bài) dùng để chỉnh prompt; `test` (24 bài) chạy đúng một lần với prompt đã chốt.
- Band tổng = trung bình 4 band tiêu chí (số nguyên), làm tròn đến 0,5.
- Band tham chiếu là điểm cộng đồng, không phải của giám khảo IELTS.

## Kết quả

| | `dev` v1.1 (mốc) | `dev` v1.2 (sau chỉnh) | **`test` v1.2** |
|---|---|---|---|
| Số bài | 16 | 15 | 24 |
| Sai số trung bình band tổng (MAE) | 0,81 | 0,70 | **1,13** |
| Lệch không quá 0,5 band | 10/16 | 9/15 | **11/24 (46%)** |
| Lệch không quá 1 band | 12/16 | 11/15 | **15/24 (63%)** |
| Tương quan với nhãn | 0,39 | 0,69 | **0,43** |

Chất lượng bằng chứng trên `test` (105 mục): 93% `quote` khớp nguyên văn bài viết, 98% mã lỗi `ERR_*` đúng tiêu chí.

## Kết quả từng bài (`test`)

| Bài | Dạng đề | Nhãn | LLM |
|---|---|---|---|
| w2_001 | PROBLEM_SOLUTION | 4,0 | 4,5 |
| w2_002 | DISCUSSION | 4,0 | 3,5 |
| w2_004 | ADV_DISADV | 4,0 | 5,5 |
| w2_006 | ADV_DISADV | 5,0 | 4,0 |
| w2_007 | OPINION | 5,0 | 5,0 |
| w2_010 | DISCUSSION | 5,0 | 5,5 |
| w2_011 | OPINION | 5,0 | 5,5 |
| w2_012 | OPINION | 5,0 | 6,0 |
| w2_015 | OPINION | 5,5 | 4,0 |
| w2_016 | OPINION | 6,0 | 6,0 |
| w2_020 | OPINION | 6,0 | 5,5 |
| w2_021 | PROBLEM_SOLUTION | 6,0 | 4,0 |
| w2_023 | ADV_DISADV | 6,5 | 6,0 |
| w2_024 | DISCUSSION | 6,5 | 4,5 |
| w2_025 | OPINION | 6,5 | 6,0 |
| w2_026 | ADV_DISADV | 6,5 | 6,0 |
| w2_028 | OPINION | 7,0 | 5,0 |
| w2_030 | OPINION | 7,0 | 6,0 |
| w2_032 | PROBLEM_SOLUTION | 7,0 | 7,0 |
| w2_033 | PROBLEM_SOLUTION | 7,5 | 4,5 |
| w2_034 | DISCUSSION | 7,5 | 6,0 |
| w2_036 | PROBLEM_SOLUTION | 8,0 | 5,0 |
| w2_037 | OPINION | 8,0 | 7,0 |
| w2_038 | ADV_DISADV | 8,0 | 5,5 |

## Nhận xét và giới hạn
- LLM nhìn chung chấm thấp hơn nhãn, nhất là bài điểm cao, và chưa phân biệt ổn định bài tốt/kém.
- Kết quả `test` kém hơn `dev` vì prompt được chỉnh trên `dev`; `test` là số đáng tin hơn.
- Đã thử nới prompt (v1.3) trên `dev` nhưng độ phân biệt giảm, nên giữ v1.2.
- Mẫu nhỏ (`test` 24 bài), nhãn cộng đồng nhiễu (đặc biệt ở hai đầu band); đây là band ước lượng phục vụ học tập, không phải điểm thi chính thức.
- Hướng tiếp theo: hiệu chuẩn bằng dữ liệu chấm của người (W9).
