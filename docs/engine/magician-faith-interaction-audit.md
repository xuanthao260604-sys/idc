# Rà soát tương tác Magician of Faith — 24/10/2026

Sau mốc [Magician of Faith](magician-of-faith.md), thêm 14 test đối xứng A/B
trong tools/magician-faith.test.ts, nâng file từ 28 lên 42 test. Không đổi engine,
catalog 109, dữ liệu nhập, review, artwork, starter hoặc deck đã lưu. Trạng thái
văn bản lịch sử và khả năng runtime tiếp tục tách riêng.

| Chuỗi hành động | Điều được kiểm chứng |
| --- | --- |
| Faith → lấy Tribute to The Doomed → kích hoạt | Bỏ Hinotama ngay khi kích hoạt; quái đối thủ chỉ bị phá khi xử lý; không tiêu quota Normal |
| Faith → lấy Monster Reincarnation → kích hoạt | FLIP chọn Phép trong Mộ, rồi Reincarnation chọn quái trong Mộ; trả đúng chi phí và không trộn hai loại mục tiêu |
| Faith → lấy Earthquake → kích hoạt | Faith vừa Flip Summon chuyển sang DEF; không tạo FLIP mới hoặc xóa hạn chế đổi tư thế thủ công |
| Faith → dùng Pot lấy lại → Hane-Hane đưa Faith về tay → Set → lượt sau Flip | Set dùng quota Normal, không được Flip ngay lượt Set; qua lượt thật có thể dùng FLIP lại để lấy Pot trong Mộ |
| Bị đánh lật Faith ở Battle đối thủ → lấy Fissure → đến Main mình | Không thể dùng Phép ngay ở Battle đối thủ; giữ Phép trên tay và chỉ dùng khi đến open Main hợp lệ |
| Faith lấy Pot → dùng Pot làm chi phí cho Tribute to The Doomed | Pot xuống Mộ ngay khi trả cost; FLIP đã xử lý không tự kích hoạt lại hoặc tự lấy Pot về |
| Faith lấy Fissure → kích hoạt với quái úp đối thủ | Fissure bỏ qua Faith ATK 300 của mình và quái úp; chỉ phá quái ngửa hợp lệ của đối thủ |

Fixture chỉ dựng trước hành động. Sau đó mọi thay đổi qua applyAction, kiểm
invariant sau từng lệnh hợp lệ và kiểm tra state đầu vào không bị sửa. Từ chối
thao tác sai giữ nguyên state. Mỗi Chain xử lý xong rồi đóng cửa sổ phản hồi
trước hành động tiếp theo; không coi đây là Chain nhiều link hoặc SEGOC.

Phạm vi/nguồn giữ tại Magician of Faith, [Tribute to The Doomed](tribute-doomed.md),
[Monster Reincarnation](monster-reincarnation.md), [Earthquake](earthquake.md),
[Phép pilot](reviewed-spells.md) và [FLIP pilot](reviewed-flips.md). Không thêm
ruling lịch sử hoặc mở general mixed Chain/negate/immunity/replacement.

## Kiểm chứng

Linux đạt typecheck, 784/784 test trong 35 file; riêng Magician of Faith đạt
42/42 test. Không chạy lại browser Linux vì không đổi
logic sản phẩm/UI; bằng chứng triển khai giữ ở tài liệu mốc Magician of Faith.
Windows và Ubuntu CI [run 40056955363](https://github.com/xuanthao260604-sys/idc/actions/runs/40056955363)
đạt trên source commit a4d168d344d6c87fa317c61f35ea5db797094c00. Đã tải và đọc
artifact windows-validation-40056955363-1: win32 x64, OS 10.0.26100,
Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62. Windows đạt 784/784 test
trong 35 file, 33/33 bước validation, 23 browser report; tổng runtimeExceptions=0.
Đây là hồi quy CI; report ghi windows11DesktopVerified=false.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
