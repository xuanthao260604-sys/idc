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
Validation Linux và Windows CI đang được hoàn tất. Windows 11 desktop chưa chạy.
