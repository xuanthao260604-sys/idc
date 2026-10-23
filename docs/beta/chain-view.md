# Bảng Chain đang chờ xử lý

Bàn đấu hiển thị bảng Chain khi có liên kết đang chờ, với số liên kết, người
kích hoạt, tên lá nguồn, tốc độ và mục tiêu. Số lớn nhất nằm đầu danh sách theo
thứ tự engine xử lý. Phép không target ghi Không chọn mục tiêu khi kích hoạt;
không tự tạo mục tiêu cho hiệu ứng chọn ứng viên lúc resolution.

Bảng chỉ đọc, không đổi quyền phản hồi hoặc tự gửi Pass. Xóa nội dung và ẩn khi
Chain trống hoặc trận kết thúc, không giữ tên/target của Chain cũ. Mô tả dùng
chain/sourceHandle/targetHandles và VisibleCard trong PlayerView; không đọc state
hoặc event thô. Bài úp đối thủ vẫn là Bài úp. Chủ bài có thể đọc bài úp của mình
khi đổi góc nhìn như trước; không chia sẻ phần thông tin riêng đó giữa hai seat.
Bảng nằm trong arena và tiếp tục bị che ở màn chuyển máy.

Không đổi engine/protocol/API, dữ liệu/review/artwork, catalog 108, starter hoặc
deck đã lưu. Scope Chain vẫn như cũ: Phép thường một link/pass-only và nhiều
Trap Hole đáp lại cùng lần triệu hồi; chưa mở general mixed Chain/negate/SEGOC.

## Kiểm chứng

Ca mới --chain-view dựng fixture trước server rồi thao tác hoàn toàn qua UI:
Normal Summon Battle Ox → hai Trap Hole của B cùng Chain; hủy chọn không đổi
state; bảng từ một lên hai link, thứ tự 2→1, cùng mục tiêu công khai. Đổi A/B
không đổi stateVersion và giữ đúng nội dung công khai, không lộ Man-Eater Bug
đang úp khác trên sân. Sau một pass Chain vẫn hai link; xử lý xong Ox vào Mộ một
lần, hai Trap vào Mộ, bảng trống. Tiếp đó Pot of Greed một link không target,
bốc hai lá và xóa bảng; LP giữ nguyên. Không sửa state sau setup.

Ca Tribute to The Doomed kiểm tra target úp trong bảng Chain: A chỉ thấy Bài úp,
B thấy Man-Eater Bug của mình; quay lại A không còn tên đó, version không đổi.
Đã chụp và xem Chromium 1440×1000 và 390×844, bảng không tràn ngang.
Thêm ca vào validate:platform, nâng thành 32 bước/22 browser run.

Ca riêng Chromium đạt, runtimeExceptions=0. Đang xác nhận bộ tổng hợp Linux và
Windows CI; kết quả sẽ ghi sau khi đọc report.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
