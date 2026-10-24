# Xem thay đổi của bản nháp deck — 24/10/2026

Màn xây deck có bảng “Thay đổi so với bản lưu đã xác nhận”, mở/thu gọn bằng
details native. Mỗi hàng nêu tên lá, số bản sao trong baseline và số đang
có trong bản nháp. Chỉ hiện những loại thay đổi, xếp tên A–Z; vẫn có hàng
khi số bản sao về 0. Tìm/lọc/sắp xếp catalog không ẩn hàng trong bảng này.

Nếu mảng bài chỉ khác thứ tự nhưng số bản sao giống nhau, có thông báo
riêng. Khi bản nháp khớp nguyên mảng baseline, bảng được ẩn và hàng cũ được
xóa. Hiển thị đúng cả bản nháp chưa đủ 40 lá, không cần hợp lệ mới xem.
Bảng chỉ đọc, không có nút sửa bài và không gửi API/command.

Baseline là bản lưu đã xác nhận gần nhất khi mở hoặc dùng [kiểm tra kết quả
lưu](deck-save-check.md) và trùng toàn bộ danh sách. Đây không phải so sánh
liên tục với bản trên server. Khi kiểm tra gặp bản khác, xung đột, lỗi mạng
hoặc ghế khác, giữ baseline và bảng hiện tại. Không lấy dữ liệu của phiên
khác để tự thay bản nháp.

Thêm/bớt, nhập file, deck mẫu, undo/redo đều dùng kết quả render bản nháp
hiện có. Xác nhận lần lưu mất phản hồi cập nhật baseline rồi ẩn bảng; undo
sau đó thể hiện thay đổi so với baseline mới. Đổi ghế/mở lại dùng baseline
của lần mở mới và không giữ hàng của người trước. Không thêm dữ liệu vào
file deck, schema lưu hoặc lịch sử. Trận đang chơi giữ nguyên.

## Kiểm chứng

Mở rộng ca `--deck-save-check`, chạy bằng `npm run beta:browser-deck-save-check`:

- Bản ban đầu không có bảng. Bớt một lá xuống 39 vẫn có hàng; bỏ rồi thêm
  lại lá đầu chỉ đổi thứ tự có thông báo riêng. Undo về nguyên mảng ẩn bảng.
- Thêm Uraby từ 1 lên 2 và bớt Trap Hole từ 1 về 0: hiện đủ hai hàng. Tìm
  riêng Uraby trong catalog vẫn giữ hàng Trap Hole trong bảng thay đổi.
- Mở bảng không sửa deckDraft; không có control gửi/sửa bài. Undo/redo đổi
  đúng hàng theo từng bản nháp, không đổi view trận hoặc tự lưu.
- Ca mất phản hồi lưu giữ bảng trước khi kiểm tra; sau xác nhận baseline
  mới bảng ẩn. Undo lúc này hiển thị số bản sao theo baseline mới.
- Xung đột phiên khác và ghế khác không đổi hàng/baseline. Mở deck B sạch
  xóa mọi hàng của A. Hồi quy lưu/kiểm tra và deck A/B vẫn chạy trong ca cũ.
- Chụp và xem bố cục 1440×1000 và 390×844: bảng nằm trong dialog, không tràn
  ngang. Trên màn hình hẹp dialog vẫn cuộn để xem bảng và các nút.

Ca riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0. Không thêm
step hoặc browser mode mới: bộ tổng hợp vẫn 41 bước và 31 browser report.
Linux đạt typecheck, 784/784 test trong 35 file, 41/41 bước và 31 browser
report, tổng runtimeExceptions=0. Report tại
artifacts/platform-validation/2026-10-24T13-52-55-966Z-9075/report.json.
Windows và Ubuntu CI [run 40100096853](https://github.com/xuanthao260604-sys/idc/actions/runs/40100096853)
đạt trên source commit 7f11dfa4e9ef6ad5da6e3954dbb34c5b3cda59d0. Đã tải và đọc
artifact windows-validation-40100096853-1: win32 x64, OS 10.0.26100,
Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62. Windows đạt 784/784 test
trong 35 file, 41/41 bước và 31 browser report, tổng runtimeExceptions=0.
Ca deck-save-check có draftChangeTable, orderOnlyChanges, invalidDraftChanges,
comparisonIgnoresCatalogFilters và comparisonResponsive đều đạt; hồi quy
lưu deck và các ca còn lại tiếp tục đạt. Report ghi windows11DesktopVerified=false.

Không đổi engine, dữ liệu/review, catalog 109, artwork, starter hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
