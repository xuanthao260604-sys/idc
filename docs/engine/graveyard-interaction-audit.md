# Rà soát tương tác Mộ — 22/10/2026

Rà soát sau Monster Reincarnation, không thêm lá hoặc thay đổi engine, dữ liệu nhập,
review, artwork hay bộ bài. Catalog vẫn 106: 95 quái thường và 11 lá hiệu ứng trong
scope đã duyệt. Snapshot nhập và khả năng runtime tiếp tục được ghi riêng.

10 test mới trong tools/graveyard-interactions.test.ts chạy đối xứng cho A và B:

| Chuỗi hành động | Điều được kiểm chứng |
| --- | --- |
| Lấy Battle Ox từ Mộ, sau đó Normal Summon, đối thủ dùng Trap Hole | Recovery không tạo cửa sổ triệu hồi; Trap chờ người triệu hồi nhường priority, phá đúng instance, không nhân bản bài |
| Tribute phá Man-Eater Bug/Hane-Hane đang úp → Reincarnation lấy lại → Set → qua lượt đối thủ → Flip Summon | Phá bài úp và trả tay không kích hoạt FLIP; không Flip Summon ngay lượt Set; sau đó chọn mục tiêu và phá/trả tay đúng hiệu ứng |
| Reincarnation lấy Man-Eater Bug/Hane-Hane → dùng làm chi phí Tribute | Chi phí trả ngay, không kích hoạt FLIP, không dùng quota Normal; Tribute chỉ phá mục tiêu khi resolve |

Nguồn luật và phạm vi giữ theo [Monster Reincarnation](monster-reincarnation.md),
[Tribute](tribute-doomed.md), [FLIP](reviewed-flips.md) và hồ sơ Trap Hole hiện có.
Không thêm cách diễn giải luật, Chain hỗn hợp, discard Trigger, SEGOC, Special Summon
hoặc replacement/negation ngoài phạm vi đã hỗ trợ.

Test dùng catalog/review thật và fixture dựng trước hành động. Sau bước khởi tạo,
mọi chuyển trạng thái, kể cả qua hai lượt để Flip Summon, đều qua applyAction;
kiểm tra bất biến sau mỗi lệnh hợp lệ, lệnh bị từ chối giữ nguyên state và lệnh hợp lệ
không sửa state đầu vào. Đây là kiểm thử tình huống, không phải trận tự nhiên.

## Kiểm chứng

Linux: typecheck và 630/630 test trong 30 file đạt, gồm 10 tình huống mới.
CI Windows/Ubuntu đang chờ chạy; chưa ghi nhận kết quả trước khi đọc artifact.
Windows 11 desktop chưa được kiểm thử trực tiếp; không xuất bản beta.
