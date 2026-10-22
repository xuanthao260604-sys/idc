# Gợi ý lá có thao tác hợp lệ

Trên tay và sân của người đang cầm máy, lá có thể thao tác được đánh viền xanh
và nhãn **✓ Có thao tác**. Chọn lá để xem và xác nhận hành động như trước.
Dòng dưới tiêu đề tay bài đếm số lá có thao tác, không đếm số tổ hợp ô/mục tiêu.
Viền vàng vẫn biểu thị lá đang chọn. Nhãn và aria-label giúp nhận biết ngoài màu sắc.

Gợi ý chỉ lấy cardHandle/attackerHandle từ availableActions của PlayerView hiện tại,
lọc theo bài trên tay/sân của chính viewer. Không đọc text để đoán hiệu ứng,
không đánh dấu mục tiêu của đối thủ, bài trong Mộ hay bài trong editor/preview.
Một lá có thể chỉ được Set hoặc đổi tư thế; nhãn không hứa rằng mọi hành động của
lá đó đều hợp lệ hoặc là nước đi tốt. Các nút chi tiết và server vẫn kiểm tra lệnh.

Sau thao tác/đổi góc nhìn/cập nhật, gợi ý được tính lại. Khi đang gửi lệnh, có lựa
chọn bắt buộc hoặc trận đã kết thúc, nhãn tạm không hiển thị; hướng dẫn tương ứng
hiện bằng chữ. Bàn đấu vẫn được che trong lúc chuyển máy. Lỗi kết nối không biến
hint cũ thành xác nhận đã thực hiện; cần cập nhật bàn đấu khi trạng thái thay đổi.

Không đổi engine, dữ liệu 106 lá, review, deck đã lưu, định dạng xuất/nhập hoặc ảnh khung.
Đây là gợi ý thao tác trong scope hiện có, chưa có AI chọn nước đi hoặc luật mới.

## Kiểm chứng

Linux: typecheck, build và 644/644 test trong 31 file đạt. Browser Chromium
154.0.8037.57 xác nhận dấu gợi ý cho Pot of Greed/Battle Ox ở Main, không có dấu
trong Chain Phép chỉ pass, Trap Hole có dấu khi đúng cửa sổ nhưng Fissure không có,
quái có thể tấn công trong Battle, không có dấu khi chọn mục tiêu FLIP hoặc kết thúc
vì bốc thiếu bài. Nhãn/aria-label đồng nhất; bài đối thủ không mang dấu.
Các chuỗi này dùng lệnh thật sau fixture khởi tạo, runtimeExceptions=0.
Đã xem ảnh 1440px/390px; dấu nằm trong vùng minh họa, không che tên/sao/chỉ số.

Bộ validation đầy đủ Linux và Windows CI đang chờ kiểm chứng.
Windows 11 desktop chưa được thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
