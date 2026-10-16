# Kiểm tra khởi động CLI — điểm dừng giữa phần chuẩn bị Windows

`npm run beta:startup-smoke` build rồi chạy beta thật bằng process Node con,
không qua shell, với cwd tạm chứa khoảng trắng/tiếng Việt. Không cần Bash/WSL,
không thay port mặc định, dữ liệu bài hoặc logic game của ứng dụng.

Kiểm tra 7 tình huống qua 4 lần khởi chạy:

1. YGO_BETA_PORT=0: process thoát lỗi, thông báo đúng giới hạn port.
2. Port loopback đã bị chiếm: process thoát lỗi EADDRINUSE, không báo thành công giả.
3. Khởi chạy từ cwd có khoảng trắng/Unicode: đọc đúng dữ liệu và static assets.
4. HTML/JS/CSS trả 200, đúng content type, có nội dung.
5. Chưa chọn seat: view trả 401; chọn A nhận tay 6/5 và version 0.
6. Pass được chấp nhận; gửi lại đúng command không tăng version lần hai.
7. Dừng process, khởi động lại cùng port: trận mới có duelId khác, version trở về 0.

Process được dọn trong finally; chờ dừng có timeout và kill dự phòng, thư mục tạm
được xóa. Không gọi việc kill process là kiểm chứng graceful Ctrl+C trên Windows.
Kiểm tra thư mục nguồn thực sự đặt trong đường dẫn Unicode trên Windows vẫn là ca desktop riêng;
cwd Unicode ở đây không chứng minh mọi đường dẫn nguồn đã được kiểm tra trên Windows.

## Kết quả

Đã chạy thành công trên Linux/x64 Node 24.19.0: 4 process, 7 tình huống.
Build, syntax của hai công cụ và 4 unit test cơ chế report đạt.
Đã nối startup check sau bước build trong validate:platform (nay cấu hình 18 bước),
Windows CI sử dụng cùng lệnh. Chưa chạy lại toàn bộ 18 bước sau thay đổi này;
report 17 bước của lần trước vẫn giữ nguyên bằng chứng lịch sử.
Không chạy lại browser vì đợt này không sửa UI/engine/browser harness.
Chưa có kết quả Windows, không nâng trạng thái Windows đã xác minh.

## Điểm dừng đã thống nhất

Phần chuẩn bị được chia 4 đầu việc để theo dõi, không phải thước đo phần trăm tương thích:

| Đầu việc | Trạng thái |
| --- | --- |
| Lệnh kiểm tra/report và cấu hình CI | Đã chuẩn bị; report chạy thử trên Linux |
| Kiểm tra vòng đời CLI và lỗi khởi động | Đã bổ sung, chạy thử trên Linux |
| Chạy và đọc bằng chứng Windows CI | Chưa chạy |
| Kiểm chứng Windows 11 desktop | Chưa chạy |

Dừng sau hai đầu việc chuẩn bị theo yêu cầu người dùng. Không tự chuyển sang phát hành,
đóng gói, deck builder hoặc tải artwork ở điểm dừng này. Người dùng chưa cần tự test beta.

Cập nhật sau yêu cầu tiếp tục: đã chạy bộ tổng hợp mới 18/18 bước đạt trên Linux;
điểm dừng giữa phần chuẩn bị đã kết thúc. Trạng thái Windows vẫn chưa xác minh,
chi tiết tại windows-verification-next.md.
