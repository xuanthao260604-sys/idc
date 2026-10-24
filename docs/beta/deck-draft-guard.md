# Bảo vệ bản nháp deck khi đóng — 24/10/2026

Màn xây deck hiển thị trạng thái bản nháp và hỏi trước khi Đóng hoặc Escape
nếu danh sách bài khác bản đã tải lúc mở. Hủy xác nhận giữ nguyên cửa sổ,
bài, lịch sử Hoàn tác/Làm lại, bộ lọc và preview. Đồng ý chỉ bỏ bản sửa trong
bộ nhớ rồi đóng; không ghi đè deck đã lưu hoặc sửa trận đang chơi.

So sánh nguyên mảng ID, gồm thứ tự và bản sao, với baseline riêng của lần mở
và người chơi hiện tại. Thêm/bớt bài, nhập file hoặc dùng deck mẫu đều được
tính theo kết quả thực tế. Hoàn tác về đúng baseline thì đóng không hỏi dù
còn lịch sử Làm lại; Làm lại khiến khác baseline thì lại cần xác nhận. Tìm
kiếm, lọc, sắp xếp và xem nội dung không tạo thay đổi deck.

Lưu thành công vẫn đóng ngay, không hỏi bỏ bản sửa vừa lưu. Lưu lỗi giữ
baseline, bản nháp và lịch sử để thử lại; không tự báo đã lưu khi chưa xác
nhận thành công. Khi đang gửi yêu cầu thì Đóng/Escape bị chặn như trước.
Mở lại lấy baseline mới từ API. Baseline chỉ ở UI, không thêm vào file deck,
schema lưu hoặc command. Bản nháp chưa hợp lệ cũng được bảo vệ.

Phạm vi là nút Đóng và Escape của màn xây deck; chưa lưu bản nháp qua reload,
đóng tab hoặc dừng ứng dụng. Lịch sử vẫn tối đa 50 bước trong lần mở, theo
[Hoàn tác/Làm lại](deck-undo-redo.md). Thay đổi này cập nhật hành vi đóng của
các tài liệu xây deck trước đó; khả năng nhập file/lưu deck giữ nguyên.

## Kiểm thử

Ca riêng `--deck-draft-guard`, chạy bằng `npm run beta:browser-deck-draft-guard`,
dùng catalog 109 và server tạm; sau khởi tạo chỉ thao tác qua UI/API hiện có:

- Deck chưa sửa hoặc chỉ tìm/đọc bài: Đóng/Escape không mở confirm.
- Thêm bài rồi hủy cả Đóng và Escape: nguyên deckDraft, gồm baseline và
  undo/redo, giữ nguyên; deck đã lưu không đổi.
- Undo về baseline đóng yên lặng; redo khôi phục thay đổi thì lại hỏi. Đồng
  ý bỏ bằng cả nút và Escape: mở lại đúng deck đã lưu, lịch sử mới rỗng.
- Bản nháp 39 lá không lưu được vẫn được giữ khi hủy đóng.
- Lưu offline lỗi rồi hủy đóng: bản nháp/lịch sử còn nguyên; kết nối lại đọc
  deck cũ, lưu thành công không có confirm và mở lại đúng bản mới.
- Sau khi đã lưu deck khác mẫu, dùng deck mẫu là thay đổi; undo về bản đã
  lưu thì đóng không hỏi. Baseline A/B riêng, bỏ bản nháp B không đổi deck B.
- Toàn bộ view trận đang chơi giữ nguyên, runtimeExceptions=0.

Các ca cũ dùng hành vi xác nhận bỏ bản sửa rõ ràng khi cần đóng. Hồi quy
deck-builder tiếp tục kiểm tra nhập/xuất file thật và lỗi lưu; deck-overview
giữ thống kê, bộ lọc, bàn phím và lịch sử.

Ca riêng đạt Linux/Chromium 154.0.8037.57. Bộ tổng hợp thêm một bước, từ 39
lên 40 bước và từ 29 lên 30 browser report. Linux đạt typecheck, 784/784 test
trong 35 file, 40/40 bước và 30 browser report, tổng runtimeExceptions=0.
Report tại artifacts/platform-validation/2026-10-24T06-46-51-085Z-234081/report.json.
Windows và Ubuntu CI [run 40071557099](https://github.com/xuanthao260604-sys/idc/actions/runs/40071557099)
đạt trên source commit 3dc1912375466b1b3f0e4cedae78239a02a6e9ef. Đã tải và đọc
artifact windows-validation-40071557099-1: win32 x64, OS 10.0.26100,
Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62. Windows đạt 784/784 test
trong 35 file, 40/40 bước và 30 browser report, tổng runtimeExceptions=0.
Ca bảo vệ bản nháp khớp Linux; các ca nhập/xuất, lịch sử và trận tự nhiên
tiếp tục đạt. Report ghi windows11DesktopVerified=false.

Không đổi engine, dữ liệu/review, catalog 109, artwork, starter hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
