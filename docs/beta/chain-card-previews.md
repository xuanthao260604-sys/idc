# Đọc lá nguồn và mục tiêu trong Chain

Mỗi liên kết trong bảng Chain có nút Đọc lá nguồn và các nút Đọc mục tiêu.
Mở cửa sổ riêng ghi rõ số liên kết, vai trò, người chơi/vị trí; hiển thị tên,
khung, chỉ số và nguyên văn nội dung từ catalog cho bài được phép đọc.
Bài úp đối thủ chỉ có thông báo giữ kín danh tính, không có hình mặt trước.
Chủ bài vẫn đọc được bài úp của mình khi đổi góc nhìn như trước.

Cửa sổ chỉ đọc, không có nút kích hoạt/chọn target/Pass, không sửa lựa chọn
hoặc stateVersion. Quay lại Chain hoặc Escape đóng và xóa nội dung/vị trí đã
xem. Render mới hoặc chuyển máy đóng/xóa cửa sổ để không giữ preview của góc
nhìn trước. Close event cũ không xóa một preview mới vừa mở ngay sau đó.

Nút đọc dùng visibleCard và PlayerView hiện tại; không lấy định nghĩa bài úp từ
nguồn khác. Không đổi API/protocol/engine, scope Chain, catalog 108, dữ liệu/
review/artwork, starter hoặc deck đã lưu. Không mở general mixed Chain/negate.

## Kiểm chứng

Mở rộng ca --chain-view bằng Chromium thật: đọc Trap Hole tại link 2, Battle Ox
là target và Pot of Greed ở Chain sau; đúng text catalog, không nút thao tác;
đóng/Escape xóa preview, mở liên tiếp giữ nội dung mới; toàn PlayerView trước/sau
đọc giống nhau. Giữ ca hai Trap, thứ tự 2→1, một Phép không target và dọn Chain.

Ca Tribute to The Doomed đọc target úp: A chỉ thấy Bài úp, không tên Man-Eater
Bug hoặc card-preview; B đọc đúng tên/text lá của mình; đổi lại A tiếp tục che.
Đã chụp và xem hộp thoại Chromium ở 1440×1000 và 390×844, không tràn ngang,
chiều cao nằm trong viewport và cuộn được khi nội dung dài.

Linux đạt typecheck, 726/726 test trong 33 file; 32/32 bước validation,
22 browser report với Chromium 154.0.8037.57, tổng runtimeExceptions=0.
Windows và Ubuntu CI [run 39969387989](https://github.com/xuanthao260604-sys/idc/actions/runs/39969387989)
đạt trên source commit 66304e01cf92c7db7009679d7197578b3ad28759. Đã tải và đọc
artifact windows-validation-39969387989-1: win32 x64, OS 10.0.26100,
Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62. Windows đạt 726/726 test
trong 33 file, 32/32 bước, 22 browser report; tổng runtimeExceptions=0.
Ca chain-view xác nhận readOnlySourceAndTargetPreviews, escapeClearsPreview,
previewPreservesState; Tribute to The Doomed xác nhận chainPreviewPrivacy=true.
Report ghi windows11DesktopVerified=false.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
