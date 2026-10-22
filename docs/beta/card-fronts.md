# Ghép ba khung mặt trước

Dùng bộ khung người dùng đã cung cấp trong Khung_Bai.zip, giữ nguyên byte hai ảnh gốc.
Mặt sau chung tiếp tục dùng cho mọi bài chưa lộ danh tính; không thêm thông tin loại bài vào bài úp.

## Hiển thị

`frontContent` dùng chung cho bài trên sân, tay, Mộ và preview trong cửa sổ xây deck/chi tiết.
Khung quái lấy bên trái monster-and-back.png; Phép bên trái và Bẫy bên phải spell-and-trap.png.
CSS hiển thị vùng ảnh tương ứng; không tạo hoặc sửa ảnh nguồn.
Hàng 8 sao và nhãn ATK/DEF in sẵn được che bằng lớp nền trong lúc hiển thị.
Số sao lấy trực tiếp từ level; tên, thuộc tính, chủng tộc, mô tả và ATK/DEF lấy từ catalog.
Phép/Bẫy không hiển thị sao hoặc chỉ số quái. Quái thường và quái hiệu ứng dùng cùng khung quái đã nhận.

Ảnh minh họa từng lá chưa được thêm; ký hiệu ở ô ảnh chỉ là placeholder và có nhãn “Chưa có ảnh minh họa”.
Các lớp khung, nội dung và placeholder tách riêng để bổ sung ảnh sau.
Tên dài dùng chữ nhỏ hơn; nội dung đầy đủ vẫn có dưới preview để đọc khi chữ trong khung nhỏ hoặc bị cắt.
Đây là lớp giao diện, không sửa nội dung nguồn, luật, handler, 50 định nghĩa hay deck đã lưu.

## Kiểm tra

Browser expanded kiểm tra cả 50 preview: đúng khung theo loại, số sao bằng level (0 với Phép/Bẫy),
tên/mô tả khớp và ATK/DEF đúng với quái. Hồi quy Gaia hiến tế hai lá/đánh Armored Lizard giữ nguyên.
Đã chụp và xem khung quái cấp 1/cấp 8, Phép, Bẫy ở 1440×1000 và 390×844.
Screenshot nằm trong artifacts/card-fronts, được Git bỏ qua; không phải gói beta.
Linux ngày 22/10/2026: 321/321 test (22 file), 21/21 bước validation, 11 browser report, runtimeExceptions 0.
Browser expanded xác nhận 50 preview và dataDrivenLevels=true. Hai trận tự nhiên giữ kết quả cũ:
pilot 20: 16 lượt/339 lệnh, expanded 50: 9 lượt/181 lệnh; không chỉnh state trong lúc chơi.
Windows và Ubuntu CI đã đạt trên commit `93e1191c9740489df35107a5bcb6de1e7084332e`, [run 39737883662](https://github.com/xuanthao260604-sys/idc/actions/runs/39737883662).
Đã tải và đối chiếu artifact Windows: win32/x64, OS release 10.0.26100, Node 24.19.0, npm 11.17.0;
Edge 154.0.4258.62, 321/321 test, 21/21 bước, 11 browser report, runtimeExceptions 0.
Report expanded xác nhận reviewedCardPreviews=50 và dataDrivenLevels=true.

Môi trường cloud mới đã được phục hồi từ origin/work, npm ci theo lockfile, preflight/build/startup/validation đều đạt.
Đã lưu install_script và start_skill dạng nháp để tái sử dụng; cần Review/Save và Publish trong Environment settings
để áp dụng cho phiên sau. Lưu nháp không tự áp dụng hoặc xuất bản môi trường; chưa xác minh một phiên phục hồi mới từ nháp này.
Windows 11 desktop chưa chạy. Không đóng gói hoặc bàn giao beta.
