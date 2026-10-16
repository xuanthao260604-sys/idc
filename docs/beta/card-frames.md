# Bộ khung người dùng và mặt sau chung

Người dùng cung cấp `Khung_Bai.zip` và xác nhận mặt sau dùng chung cho quái thú, Phép và Bẫy.
Ảnh được sao chép nguyên byte, không chỉnh sửa, không tải artwork chính thức.

| File upload | Asset lưu | Kích thước | SHA-256 |
| --- | --- | --- | --- |
| 159ab18d-eada-43b3-a269-25e8302bd61e.png | `spell-and-trap.png` | 1470 × 1070 | `1e8429787c8f22428a2aa3eb169888d6bd1d7c417fe83971585df1de1ccaf5c7` |
| d9750320-b9ae-4283-be66-95862e36b702.png | `monster-and-back.png` | 1470 × 1070 | `9e97343fd051a07fad7c944eb4cd0ffeb4e7ab45d28885fb190436a46e8a02cc` |

## Phạm vi hiện tại

- Ảnh thứ nhất chứa mặt trước Phép (trái, xanh) và Bẫy (phải, tím).
- Ảnh thứ hai chứa mặt trước quái (trái) và mặt sau chung (phải).
- Chỉ mặt sau đã gắn vào UI. CSS dùng vùng x=756, y=40, rộng=672, cao=972 của ảnh thứ hai.
  Không tạo bản crop hoặc biến đổi ảnh nguồn; cùng một ảnh nền được dùng cho mọi bài chưa lộ danh tính.
- Không đặt tên, sao, thuộc tính hay class Phép/Bẫy trên bài đối thủ chưa lộ. Nhãn truy cập vẫn là “Bài úp”.
  Người sở hữu vẫn xem được bài mình theo PlayerView hiện có; không đổi luật che thông tin.
- Các mặt trước được lưu để tích hợp sau. Khung quái có sẵn 8 sao trong ảnh;
  cần tách/che hàng sao nền và hiển thị sao theo level dữ liệu trước khi dùng cho mọi quái.
- Ảnh minh họa riêng từng lá tiếp tục để trống/placeholder, sẽ bổ sung sau. Dữ liệu bài và effect không đổi.

## Kiểm tra

HTTP chỉ mở hai URL asset cụ thể, trả image/png và giữ nguyên byte. Không mở truy cập tùy ý vào repository.
Startup kiểm tra tải cả hai ảnh từ CLI, kể cả đường dẫn làm việc Unicode.
Browser fixture có bài úp thuộc cả ba loại; xác nhận chung một nền, không lộ loại/tên, ảnh tải đúng kích thước.
Đã xem screenshot Chromium ở 1440 × 1000 và 390 × 844; chỉ là bằng chứng UI, không phải bản beta phát hành.
Bộ test so sánh byte bằng Buffer.equals thay vì deep-compare mảng byte lớn gây timeout; không bỏ kiểm tra nội dung ảnh.

Validation Linux và Windows CI đang được hoàn tất. Windows 11 desktop chưa chạy.
