# Magician of Faith bị đánh lật — kiểm thử hotseat 24/10/2026

Bổ sung bốn ca trình duyệt cho controller A/B, mỗi phía có 0 hoặc 2 Phép
trong Mộ. Đây là hồi quy giao diện bổ sung cho [triển khai Faith](../engine/magician-of-faith.md)
và [rà soát tương tác](../engine/magician-faith-interaction-audit.md).
Không đổi engine, UI sản phẩm, catalog 109, hồ sơ review, dữ liệu nhập, artwork,
starter 40 hoặc deck đã lưu. Không thêm dữ liệu hay ruling mới; nguồn và giới
hạn lịch sử giữ tại hồ sơ triển khai.

| Chặng | Điều kiểm tra qua trình duyệt |
| --- | --- |
| Trước khi xử lý đòn đánh | Đối thủ chỉ thấy bài úp, không nhận definition; mô tả trận đánh giữ kín tên Faith |
| Sau tính toán sát thương | Faith đã ngửa và còn trên sân trong Damage Step; chưa xuống Mộ hoặc lấy Phép |
| Có hai Phép trong Mộ mình | Chỉ Pot/Fissure là lựa chọn; bỏ qua quái, Bẫy và Phép của đối thủ; đổi ghế không đổi stateVersion và chỉ controller thấy decision |
| Xem bài/chọn mục tiêu | Preview chỉ đọc; đóng bằng nút hoặc Escape không đổi state/lựa chọn; Chain có Faith và đúng một mục tiêu |
| Không có Phép trong Mộ mình | Hiệu ứng bắt buộc vẫn thành Chain một link, không target, không mở decision rỗng hoặc làm kẹt bàn đấu |
| Một pass rồi xử lý | Chưa lấy bài sau một pass; sau pass thứ hai mới lấy đúng Pot, rồi Faith xuống Mộ cuối Damage Step |
| Sau xử lý chiến đấu | Chain/decision và dấu attacker/target được xóa; LP, quota Normal và Mộ đối thủ giữ đúng; có thể tiếp tục Battle Step |
| Dùng Phép lấy lại | Nút kích hoạt Pot bị khóa trong Battle đối thủ; chuyển phase/lượt thật tới Main mình, dùng Pot và bốc đúng hai lá |

Fixture chỉ dựng trước khi khởi động server. Sau đó dùng các nút, hộp thoại,
chuyển ghế và lệnh qua UI; không sửa DuelState, không gọi API để vượt thao tác.
Hai ca không có Phép dừng sau khi trở lại Battle Step; hai ca có Phép đi tiếp
đến Main lượt sau. Không coi đây là Chain hỗn hợp/negate/SEGOC hoặc mọi ruling.

Chạy riêng bằng `npm run beta:browser-faith-battle` trên Windows/Linux có
Edge/Chrome/Chromium. Bốn ca được ghi độc lập trong `validate:platform`,
nâng bộ tổng hợp từ 33 lên 37 bước và từ 23 lên 27 browser report. Số unit và
integration test Vitest vẫn là 784 trong 35 file; không cộng browser vào đó.

## Kiểm chứng

Bốn ca riêng đã đạt trên Linux với Chromium 154.0.8037.57, runtimeExceptions=0.
Bộ tổng hợp Linux và Windows CI đang chờ kiểm chứng cho mốc này.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
