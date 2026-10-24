# Kiểm tra kết quả lưu deck — 24/10/2026

Thêm nút “Kiểm tra deck đã lưu” trong màn xây deck. Nút chỉ đọc bản lưu từ
API, không gửi lại lệnh lưu. Dùng khi chưa biết lần bấm Lưu đã thành công
hay chưa, chẳng hạn server đã nhận nhưng trình duyệt mất phản hồi.

Nếu danh sách ID khớp nguyên mảng bản nháp, gồm thứ tự và số bản sao, cập
nhật revision và baseline đã xác nhận. Giữ bài, undo/redo, bộ lọc, sắp xếp,
preview và cửa sổ hiện tại. Đóng sau đó không hỏi bỏ bản sửa đã được xác
nhận; undo vẫn hoạt động và được so với baseline vừa xác nhận.

Nếu bản lưu khác, giữ nguyên toàn bộ bản nháp, baseline, revision và lịch
sử. Không tự lấy revision mới để ghi đè deck do phiên khác vừa sửa. Lưu
tiếp vẫn chịu kiểm tra xung đột cũ của server. Người chơi có thể xuất bản
nháp hợp lệ trước khi đóng/mở lại để đọc bản lưu khác; việc bỏ bản sửa vẫn
chịu [xác nhận khi đóng](deck-draft-guard.md).

Kiểm tra lỗi hoặc trả về ghế khác cũng giữ bản nháp nguyên vẹn, không báo
đã lưu. Nút bị khóa khi đang gửi yêu cầu, đồng thời giữ chặn Đóng/Escape
như các thao tác deck khác. Kiểm tra không tự lưu, tải đè bản nháp hoặc
đóng cửa sổ. Baseline chỉ ở UI; file deck và schema lưu không thay đổi.

Trạng thái “Bản nháp khớp bản lưu đã xác nhận” nói về lần đọc đã hoàn tất,
không phải đồng bộ liên tục giữa các phiên. Cập nhật quy tắc baseline của
mốc bảo vệ bản nháp: baseline có thể được xác nhận lại bằng nút mới sau
khi kiểm tra trùng toàn bộ danh sách, ngoài lần mở ban đầu.

## Kiểm thử

Ca `--deck-save-check`, chạy riêng bằng `npm run beta:browser-deck-save-check`,
dùng catalog 109 và server tạm:

- Bản chưa sửa kiểm tra trùng; thêm bài thì báo khác và giữ nguyên deckDraft.
- Offline kiểm tra thất bại: giữ nguyên bài/baseline/revision/lịch sử.
- Lưu qua HTTP thật, chỉ làm mất phản hồi sau server xử lý; UI chưa tự báo
  thành công. Kiểm tra xác nhận đúng revision và danh sách đã lưu, CDP xác
  nhận không có POST lưu thứ hai. Không sửa DuelState trong ca.
- Lịch sử, bộ lọc, sắp xếp và preview giữ nguyên khi xác nhận; undo tạo bản
  khác baseline mới, redo trở lại thì không còn thay đổi chưa lưu. Đóng
  không hỏi; mở lại đọc đúng deck đã xác nhận.
- Phiên HTTP thứ hai cùng ghế A lưu danh sách khác: lệnh lưu cũ bị 409;
  kiểm tra chỉ báo khác, không đổi draft/revision hoặc ghi đè bản thắng.
- Mô phỏng cửa sổ khác đổi cookie sang ghế B qua API seat thật: kiểm tra
  từ draft A từ chối dữ liệu B. Sau khi trả ghế đúng, có thể mở lại bản A.
- Kiểm tra riêng ghế B dùng baseline B và không thay deck B. View trận
  trong trình duyệt giữ nguyên; không có lệnh đấu hoặc tự động thử lưu lại.

Ca riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0. Thêm một
bước tổng hợp, từ 40 lên 41 bước và từ 30 lên 31 browser report. Linux đạt
typecheck, 784/784 test trong 35 file, 41/41 bước và 31 browser report,
tổng runtimeExceptions=0. Report tại
artifacts/platform-validation/2026-10-24T13-41-26-427Z-3280/report.json.
Windows và Ubuntu CI [run 40099228529](https://github.com/xuanthao260604-sys/idc/actions/runs/40099228529)
đạt trên source commit 6202db1e9f4f87acf9e0026f56ab18da5aa8669b. Đã tải và đọc
artifact windows-validation-40099228529-1: win32 x64, OS 10.0.26100,
Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62. Windows đạt 784/784 test
trong 35 file, 41/41 bước và 31 browser report, tổng runtimeExceptions=0.
Ca xác nhận lưu khớp Linux, gồm mất phản hồi, không lưu lại tự động, giữ
bản nháp khi xung đột/đổi ghế, undo theo baseline xác nhận và deck B độc lập.
Report ghi windows11DesktopVerified=false.

Không đổi engine, dữ liệu/review, catalog 109, artwork, starter hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
