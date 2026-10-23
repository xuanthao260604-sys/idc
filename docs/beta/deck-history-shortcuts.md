# Phím tắt Hoàn tác/Làm lại deck trên Windows

Màn xây deck hỗ trợ Ctrl+Z để hoàn tác, Ctrl+Y hoặc Ctrl+Shift+Z để làm lại.
Tooltip và aria-keyshortcuts trên hai nút cho biết các tổ hợp. Dùng chung lịch
sử bản nháp tối đa 50 bước đã có; không tạo lịch sử khác hoặc sửa dữ liệu đã lưu.

Chỉ xử lý khi hộp xây deck mở, không đang gửi yêu cầu và có bước tương ứng.
Khi đang gõ trong input/textarea, chọn select hoặc vùng contenteditable, giữ
hành vi gốc của trình duyệt. Không xử lý Alt/Meta, sự kiện đang composition hoặc
sự kiện đã được thành phần khác xử lý. Phím tắt không được gắn toàn trang nên
không áp dụng cho bàn đấu hoặc hộp lựa chọn khác.

Giữ nguyên các bộ lọc, sắp xếp, focus sau thao tác, quota deck và luồng Lưu.
Không đổi catalog 108, engine, dữ liệu/review, artwork, starter hoặc deck đã lưu.
Đây là phím tắt sửa bản nháp, không phải quay lại hành động trong trận.

## Kiểm chứng

Mở rộng browser --deck-overview bằng Input.dispatchKeyEvent thật với modifier
Control/Shift: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z phục hồi đúng nguyên mảng ID; khi hết
bước, focus tới nút ngược chiều như khi bấm chuột. Gõ Blue vào tìm kiếm bằng
Input.insertText, Ctrl+Z xóa văn bản và Ctrl+Y khôi phục Blue mà deck không đổi.
Tab sang select loại bài rồi Ctrl+Z cũng không sửa deck. Giữ toàn bộ ca thống
kê/lọc/sắp xếp/50 bước/focus/deck riêng A/B và các ca nhập/xuất/lỗi mạng trước đó.

Ca riêng Chromium đã đạt, runtimeExceptions=0. Đang xác nhận bộ tổng hợp Linux
và Windows CI; kết quả sẽ ghi sau khi đọc report.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
