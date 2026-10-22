# Đọc bài trong lựa chọn bắt buộc

Mỗi lựa chọn trong bảng quyết định có nút **Xem bài** riêng, dùng cho chọn mục tiêu
FLIP, chọn quái đồng hạng khi xử lý hiệu ứng hoặc bỏ bài cuối lượt. Nút mở hộp đọc
nội dung; nó không tích/bỏ ô chọn và không gửi quyết định xuống engine.

Phần đọc hiển thị vị trí, tên, khung/sao/chỉ số và text từ PlayerView hiện tại.
Không suy đoán danh tính bài úp, không đọc tay/deck đối thủ từ trạng thái server.
Ảnh minh họa tiếp tục là placeholder; khung gốc và dữ liệu nhập không đổi.

**Quay lại lựa chọn** hoặc Escape đóng hộp, giữ các ô đã chọn và số lượng đã chọn.
Chỉ nút **Xác nhận lựa chọn** hiện có gửi quyết định. Khi gửi lệnh, nút đọc bị khóa;
khi cập nhật góc nhìn/trạng thái, hộp đọc đóng và nội dung cũ được xóa. Góc nhìn
không có quyền trả lời không được render các nút đọc cho quyết định riêng.
Đây không phải tính năng hoàn tác, hủy quyết định bắt buộc hoặc lưu trận.

## Kiểm chứng

Linux Chromium 154.0.8037.57: ca bỏ bài đọc trước khi chọn và khi đã chọn đủ 2 lá,
đóng bằng nút hoặc Escape giữ nguyên PlayerView/ô chọn; sau đó bỏ đúng 2 lá và qua
lượt. Góc nhìn B không có danh sách/nút đọc khi A đang chọn bỏ bài.
Ca FLIP đọc mục tiêu trước khi chọn rồi resolve Hane-Hane/Man-Eater Bug đúng như cũ.
Phần đọc không có nút hành động phụ; đóng xóa nội dung. Đã xem ảnh 390px, kiểm tra
hộp đọc không tràn ngang và cuộn trong màn hình tại 390px/1440px.

Bộ validation đầy đủ Linux và Windows CI đang chờ kiểm chứng.
Catalog giữ 106 loại, chưa mở thêm hiệu ứng hoặc thay dữ liệu/deck đã lưu.
Windows 11 desktop chưa kiểm thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
