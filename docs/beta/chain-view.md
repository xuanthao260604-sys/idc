# Bảng Chain đang chờ xử lý

> Cập nhật 28/10/2026: đã mở [Magic Jammer trong phạm vi hai liên kết](../engine/magic-jammer.md) và [danh sách phản hồi hợp lệ](response-guide.md). Phạm vi và số liệu bên dưới giữ mốc bảng Chain ban đầu.

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

Linux đạt typecheck, 726/726 test trong 33 file; 32/32 bước validation,
22 browser report với Chromium 154.0.8037.57, tổng runtimeExceptions=0.
Windows và Ubuntu CI [run 39966377745](https://github.com/xuanthao260604-sys/idc/actions/runs/39966377745)
đạt trên source commit cc16ac8a1128ec5e5962be8eaf579a7666c99eda. Đã tải và đọc
artifact windows-validation-39966377745-1: win32 x64, OS 10.0.26100,
Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62. Windows đạt 726/726 test
trong 33 file, 32/32 bước, 22 browser report; tổng runtimeExceptions=0.
Ca chain-view xác nhận hai Trap, thứ tự xử lý, nguồn/target công khai, Phép một
link và dọn bảng; Tribute to The Doomed xác nhận chainTargetPrivacy=true.
Report ghi windows11DesktopVerified=false.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
