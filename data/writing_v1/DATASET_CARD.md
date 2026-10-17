# Writing set v1 — dataset card

40 bài IELTS Writing Task 2 dùng để chỉnh prompt chấm Writing (`dev`) và đo baseline (`test`).

## Nội dung
- Mỗi bài gồm: đề (`prompt`), bài viết (`essay`), dạng đề (`task`, ID `QT_W2_*`), band tham chiếu 4 tiêu chí (`CRIT_W_TR/CC/LR/GRA`, số nguyên) và band tổng (`overall`, bội của 0,5).
- `reference_feedback` để `null`.

## Phân bố
| Band | dev | test | Tổng |
|---|---|---|---|
| 4 | 2 | 3 | 5 |
| 5 | 4 | 6 | 10 |
| 6 | 5 | 7 | 12 |
| 7 | 3 | 5 | 8 |
| 8 | 2 | 3 | 5 |
| **Tổng** | **16** | **24** | **40** |

- Dạng đề: Opinion 16, Discussion 9, Problem and Solution 8, Advantages and Disadvantages 7.
- Số từ: 250–450.

## File
- `essays.json`: mảng 40 bản ghi `{id, source_id, task, prompt, essay, word_count, source, license, reference_bands, reference_feedback, split}`.
- `manifest.csv`: `id, source_id, source, license, sha256, split, task, word_count, overall_band`.

## Cách dùng
- `dev`: chạy prompt, so band, sửa prompt.
- `test`: chỉ dùng đánh giá baseline cuối. Không dùng để chỉnh prompt.

## Lưu ý
- Band tham chiếu là điểm cộng đồng, không phải của giám khảo IELTS; band tổng đáng tin hơn band từng tiêu chí.
- Mẫu nhỏ (`test` 24 bài) nên MAE/QWK có độ tin cậy hạn chế.
- License nguồn là `unknown` chỉ dùng nội bộ cho nghiên cứu và học tập.
