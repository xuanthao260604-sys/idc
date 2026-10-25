# Tổng kết trận — 25/10/2026

Khi engine trả result, bàn đấu hiện bảng Kết quả trận với người thắng/lý do
kết thúc, số lượt và phase cuối cùng, người đang có lượt lúc kết thúc.
Bảng luôn đặt A rồi B, gồm LP và số bài trên tay, trong Deck, trong Mộ.
Chuyển góc nhìn không đảo hai cột hoặc đổi số liệu.

Chỉ đọc các trường công khai đã có trong PlayerView; số bài tay mình lấy
selfHand.length, tay đối thủ lấy opponentHandCount. Không đưa tên bài tay,
Deck hoặc danh tính bài úp vào bảng tổng kết. Các số là trạng thái cuối
trận, không suy diễn tổng sát thương/số lần bốc bài từ lịch sử giới hạn
60 thao tác. Không đổi điều kiện thắng/thua hoặc hiệu ứng bài.

Nút Chơi trận mới dùng cùng hộp chọn người đi trước với nút Trận mới hiện
có. Mở hộp chưa tạo trận; Hủy/Escape giữ nguyên kết quả cũ. Xác nhận mới
tạo trận theo deck đã lưu của A/B. Trận mới xóa nội dung bảng cũ và ẩn bảng;
trong lúc gửi lệnh nút tổng kết bị khóa. Có thể tiếp tục đọc thông tin
công khai trên bàn đấu sau khi trận kết thúc theo hành vi cũ.

Nhãn lý do được dùng chung với hướng dẫn lượt để tránh hai nơi mô tả khác
nhau. Chỉ hiển thị result do engine cấp, không tự kết luận từ LP hoặc Deck
rỗng. Chưa có lưu lịch sử trận qua restart hoặc bảng thành tích nhiều trận.

## Kiểm chứng

Bổ sung assertion vào các ca trình duyệt sẵn có, giữ 46 bước/36 report:

- Concede: xác nhận/hủy đầu hàng thật qua dialog native; bảng đúng ở A/B,
  cập nhật bàn đấu giữ nguyên kết quả/version và các số A/B.
- Chơi trận mới từ bảng: Hủy và Escape giữ nguyên toàn view, không gửi POST.
  Xác nhận B đi trước tạo duelId mới, LP 8000/8000, xóa toàn bộ nội dung tổng
  kết cũ. Deck A/B đọc trước/sau giống nhau.
- Pot với Deck 0/1: bảng ghi không thể bốc đủ bài và đúng số bài cuối trận
  của cả hai ghế. Deck 2 bốc đủ, trận còn chơi thì bảng ẩn và nội dung rỗng.
- Hinotama lethal: LP về 0, bảng đúng ở A/B; ca hồi LP/sát thương chưa kết
  thúc không hiện bảng. Không kết luận thắng chỉ vì Deck đã trống.
- Hai trận tự nhiên pilot 20 và catalog 109: bảng khớp LP, turn và các số
  công khai khi chiến đấu kết thúc trận; hai ghế cho cùng nội dung tổng kết.
- Mọi ca khởi tạo kiểm bảng đang ẩn, nội dung rỗng và nút khóa. Helper so
  sánh toàn view trước/sau khi đọc, kiểm bảng không chứa tên lá/catalog hoặc
  nút bài. Không sửa state khi đang chơi.
- Đã chụp/xem ca đầu hàng tại 1440×1000 và 390×844: bảng/nút không tràn ngang.

Ca đầu hàng riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0.
Đang chạy bộ tổng hợp Linux; Windows CI chưa xác minh source mới.

Không đổi catalog 109, dữ liệu/review, engine, artwork, starter hay deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
