# Giữ vị trí bàn phím khi thêm/bớt bài

Sửa lỗi màn xây deck dựng lại danh sách sau mỗi thay đổi rồi làm mất focus của
nút vừa dùng. Sau thêm/bớt, giữ focus ở cùng nút của cùng lá nếu còn thao tác được.
Nếu nút bị khóa (đạt giới hạn bản sao hoặc số bản bằng 0), chuyển về tên lá để đọc
preview bằng Enter và tiếp tục Tab tới thao tác khác.

Khi lọc Có trong deck và bỏ bản sao cuối, chuyển focus sang thao tác tương ứng
ở hàng kế tiếp tại vị trí cũ; nếu vừa bỏ hàng cuối, dùng hàng trước. Khi không
còn hàng phù hợp, chuyển về ô tìm kiếm. Giữ vị trí cuộn danh sách khi dựng lại,
sau đó đưa nút được chọn vào vùng nhìn thấy nếu cần. Nếu focus đang ở bộ lọc
hoặc điều khiển ngoài danh sách, không kéo nó về hàng bài.

Không đổi nội dung/thứ tự deck, giới hạn bản sao, API/store, engine, catalog 108,
review, dữ liệu hoặc artwork. Phạm vi sửa là danh sách bài trong màn xây deck,
không tuyên bố đã rà soát khả năng truy cập của toàn ứng dụng.

## Kiểm chứng

Mở rộng ca browser --deck-overview dùng Input.dispatchKeyEvent thật qua CDP:
Enter thêm bản thứ hai giữ nút; Space thêm tới giới hạn chuyển về tên;
Enter mở preview không thêm bài; Tab tới nút bớt; Space bớt liên tục tới khi
hàng biến mất và chuyển sang hàng kế tiếp; bỏ hàng duy nhất trả focus về tìm
kiếm. Khôi phục deck mẫu rồi kiểm tra nguyên mảng nháp ban đầu, giữ ca hủy/lưu,
lọc/sắp xếp, seat A/B và view trận của bài kiểm tra trước.

Cùng ca này đã chạy với app.js trước sửa và thất bại ngay sau lần Enter đầu:
focus không còn card ID/nút add. Với bản sửa, ca riêng đạt và runtimeExceptions=0.
Không thêm unit test giả DOM; kiểm chứng bằng Chromium thực trên Linux.

Đang xác nhận bộ tổng hợp Linux và Windows CI; kết quả sẽ ghi sau khi đọc report.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
