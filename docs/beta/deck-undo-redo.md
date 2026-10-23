# Hoàn tác và làm lại khi xây deck

Thêm Hoàn tác / Làm lại cho bản nháp deck của mỗi lần mở màn xây deck. Hỗ trợ
thêm/bớt bản sao, thay bằng deck mẫu và nhập file thành công. Mỗi lần nhập hoặc
khôi phục là một bước; phục hồi nguyên mảng ID theo đúng thứ tự, kể cả bản nháp
chưa đủ 40 lá. Lịch sử chỉ ở bộ nhớ, tối đa 50 bước hoàn tác, xóa khi đóng hoặc
lưu thành công. Mở lại/đổi seat bắt đầu lịch sử mới, không dùng lịch sử của người
khác. Đây không phải hoàn tác hành động trong trận.

Chỉnh sửa mới sau hoàn tác xóa nhánh Làm lại. Thao tác không làm đổi mảng bài,
lọc/sắp xếp và preview không tạo bước hoặc xóa nhánh đó. Nhập lỗi/lưu lỗi giữ
bản nháp và lịch sử. Nút khóa khi không có bước tương ứng hoặc đang gửi yêu cầu.
Khi hoàn tác/làm lại hết bước, focus chuyển sang nút chiều ngược lại còn dùng được.
Thanh nút tự xuống dòng trên mọi chiều rộng để chứa thêm hai thao tác mới.

Mọi thay đổi chỉ áp dụng bản nháp; Lưu deck vẫn kiểm tra giới hạn rồi gửi seat,
revision và cards theo API cũ. Lịch sử không nằm trong file xuất hoặc dữ liệu
lưu. Không đổi engine, dữ liệu/review/artwork, starter, catalog 108 hoặc 13 hiệu
ứng trong scope hiện hành; trận đang chơi giữ nguyên.

## Kiểm chứng

Mở rộng browser --deck-overview: trạng thái nút ban đầu; add → undo → redo;
chỉnh sửa mới xóa redo; default không đổi và bộ lọc không xóa redo; default có
thay đổi có thể undo/redo; 52 lần sửa giữ tối đa 50 bước; mở lại xóa lịch sử;
focus khi hết bước; deck đã lưu/trận giữ nguyên. Giữ kiểm tra bàn phím, thống kê,
sắp xếp và hai chiều rộng 1440/390 của ca trước.

Mở rộng browser --deck-builder với tải/nhập file thật: nhập hợp lệ undo/redo được;
file lỗi và lưu offline không sửa lịch sử; file xuất chỉ có cards/format/kind/
schemaVersion như cũ. Giữ ca lưu deck A/B và áp dụng đúng ở trận mới.

Linux đạt typecheck, 726/726 test trong 33 file; 31/31 bước validation,
21 browser report với Chromium 154.0.8037.57, tổng runtimeExceptions=0.
Windows và Ubuntu CI [run 39959852093](https://github.com/xuanthao260604-sys/idc/actions/runs/39959852093)
đạt trên source commit 9a4e51039b61ebfa54077b2db51e30b1fe831641. Đã tải và đọc
artifact windows-validation-39959852093-1: win32 x64, OS 10.0.26100,
Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62. Windows đạt 726/726 test
trong 33 file, 31/31 bước, 21 browser report; tổng runtimeExceptions=0.
Ca deck-overview xác nhận undoRedo, historyLimit=50, defaultUndoable,
historyResetOnReopen; deck-builder xác nhận importedDeckUndoRedo và
invalidImportPreservesHistory. Report ghi windows11DesktopVerified=false.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
