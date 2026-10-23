# Hiển thị đòn tấn công đang xử lý

Bàn đấu thêm dòng Đang giao chiến với người chơi, quái tấn công, mục tiêu và số
ô; tấn công trực tiếp ghi rõ thay vì đánh dấu một ô mục tiêu. Quái tấn công có
viền cam, quái bị tấn công có viền xanh; aria-label cũng ghi vai trò để thông tin
không phụ thuộc riêng vào màu. Không thêm nút hoặc thay đổi trình tự Pass.

Hiển thị trong lúc trận chiến còn đang xử lý, gồm lúc chờ lựa chọn FLIP; xóa khi
không còn đòn tấn công đang xử lý hoặc trận kết thúc. Dòng trạng thái mô tả đòn
hiện tại, không tự tính hay dự đoán sát thương. Nếu quái đã rời sân trong xử lý,
chỉ ghi Quái đã rời sân, không tra lại dữ liệu ngoài góc nhìn.

Nguồn duy nhất là battle handles và VisibleCard của PlayerView. Bài úp đối thủ
vẫn là Bài úp, không thêm tên/chỉ số hoặc nội dung bài. Chủ bài vẫn được đọc bài
úp của mình như trước khi đổi seat; không gửi hành động hoặc đổi state khi đổi
cách hiển thị. Thông tin nằm trong arena, tiếp tục bị che ở màn chuyển máy.
Không đổi protocol/API, engine, luật chiến đấu, catalog 108, dữ liệu/review,
artwork, starter hoặc deck đã lưu.

## Kiểm chứng

Mở rộng ca browser effects: La Jinn/Celtic Guardian tấn công Hane-Hane/Man-Eater
Bug đang úp; đúng một attacker/target, aria-label đúng và không có card-name của
bài úp ở góc nhìn đối thủ; banner không có tên lá đó. Đổi seat sang chủ bài đọc
đúng tên mà stateVersion không đổi; xử lý FLIP xong xóa banner/viền.

Hai trận tự nhiên pilot 20 và expanded 108 kiểm tra banner/viền trên từng lần
tuyên bố tấn công, trực tiếp không có viền mục tiêu; trận kết thúc ẩn banner.
Đã chụp và xem Chromium 1440×1000 và 390×844, banner không tràn ngang và viền
hiển thị đúng cả trên mặt sau chung do người dùng cung cấp.

Ca riêng Chromium đạt, runtimeExceptions=0. Đang xác nhận bộ tổng hợp Linux và
Windows CI; kết quả sẽ ghi sau khi đọc report.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
