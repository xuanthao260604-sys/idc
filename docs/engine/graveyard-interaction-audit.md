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
[Tribute](tribute-doomed.md), [FLIP](reviewed-flips.md) và [Trap Hole](reviewed-trap.md) hiện có.
Không thêm cách diễn giải luật, Chain hỗn hợp, discard Trigger, SEGOC, Special Summon
hoặc replacement/negation ngoài phạm vi đã hỗ trợ.

Test dùng catalog/review thật và fixture dựng trước hành động. Sau bước khởi tạo,
mọi chuyển trạng thái, kể cả qua hai lượt để Flip Summon, đều qua applyAction;
kiểm tra bất biến sau mỗi lệnh hợp lệ, lệnh bị từ chối giữ nguyên state và lệnh hợp lệ
không sửa state đầu vào. Đây là kiểm thử tình huống, không phải trận tự nhiên.

## Kiểm chứng

Linux: typecheck và 630/630 test trong 30 file đạt, gồm 10 tình huống mới.
Windows và Ubuntu CI đều đạt trên source commit dfe09fe3d84355004483f56a501d4e40418293e0:
[run 39784037637](https://github.com/xuanthao260604-sys/idc/actions/runs/39784037637).
Đã tải và đọc artifact windows-validation-39784037637-1: Windows win32 x64,
OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 154.0.4258.62.
630/630 test trong 30 file; 28/28 bước validation; 18 browser report, runtimeExceptions=0.
Trận tự nhiên catalog 106 giữ 17 lượt/336 lệnh/13 tấn công/2 quyết định;
A thắng LP 6400/0, không sửa state trong trận. Kiểm tra nhập lại lỗi vẫn bảo toàn
13 bundle hợp lệ, không thay đổi snapshot hay review để làm test đạt.
Windows 11 desktop chưa được kiểm thử trực tiếp; không xuất bản beta.
