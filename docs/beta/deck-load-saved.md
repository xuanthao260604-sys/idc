# Tải bản lưu vào bản nháp deck — 24/10/2026

Thêm nút “Tải bản lưu vào nháp” để đọc deck mới nhất của người chơi đang
sửa, đặc biệt sau xung đột với phiên khác. Sau khi đọc thành công và kiểm
tra đúng ghế, thay danh sách trong editor, cập nhật revision và baseline
đã xác nhận. Không ghi deck đã lưu, đóng cửa sổ hoặc sửa trận đang chơi.

Nếu danh sách khác, thao tác dùng lịch sử hiện hành: bản đang sửa được
giữ thành một bước Hoàn tác, kể cả bản nháp chưa đủ 40 lá. Undo lấy lại
nguyên mảng bài trước tải; redo trở về bản vừa đọc. Baseline/revision vẫn
là bản đã đọc, nên bảng thay đổi thể hiện đúng khác biệt khi lấy lại bản
cũ. Sau đó muốn lưu phải chủ động bấm Lưu và vẫn chịu kiểm tra revision
của server nếu có phiên khác sửa tiếp.

Đây là thao tác tải do người chơi chủ động chọn, khác với [kiểm tra kết
quả lưu](deck-save-check.md): nút Kiểm tra vẫn không thay bản nháp khi khác.
Tải danh sách giống hệt không tạo bước lịch sử hoặc xóa nhánh redo. Giữ
bộ lọc, sắp xếp và preview; trạng thái/bảng so sánh dùng baseline mới.
Lịch sử vẫn tối đa 50 bước trong lần mở, mất khi đóng/lưu thành công như
trước; bản nháp chưa được lưu qua reload/dừng ứng dụng.

Chỉ thay bản nháp sau khi nhận kết quả thành công và đúng ghế. Lỗi mạng
hoặc ghế bị đổi ở cửa sổ khác giữ nguyên cards, baseline, revision và
undo/redo. Nút và các control deck bị khóa lúc đang tải; Đóng/Escape vẫn
được chặn khi đang gửi yêu cầu. Không tự tải lại hoặc tự lưu sau lỗi.
Không thêm endpoint, metadata vào file deck hoặc thay schema lưu.

## Kiểm chứng

Mở rộng ca `--deck-save-check`, chạy bằng `npm run beta:browser-deck-save-check`:

- Bản nháp 39 lá tải về bản hợp lệ rồi undo/redo được; undo trả đúng bản
  39 lá và nút Lưu vẫn khóa, không tự hợp thức hóa dữ liệu cũ.
- Offline và đổi cookie sang ghế B: tải lỗi giữ toàn bộ draft A và bảng
  so sánh, không lấy revision hoặc bài của B để thay nháp A.
- Sau hai phiên A tạo xung đột qua HTTP thật, nút Kiểm tra vẫn giữ bản
  local; chủ động Tải lấy đúng bản thắng, không tạo thêm POST lưu.
- Tải giữ preview/bộ lọc/sắp xếp và đưa bản local vào undo. Undo/redo lấy
  đúng danh sách, baseline mới vẫn giữ; tải cùng danh sách giữ nguyên cả
  lịch sử redo. Lưu sau Undo dùng revision đã xác nhận và chỉ lúc này
  mới có POST mới, revision tăng đúng một lần.
- View trận vẫn nguyên vẹn; ghế B tải cùng bản hiện có không đổi draft
  hay deck B. Giữ hồi quy mất phản hồi lưu và bảng thay đổi.
- Bố cục 1440/390 của ca cũ vẫn kiểm tra không tràn ngang; đã xem ảnh
  màn hình hẹp sau khi thêm nút.

Ca riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0. Giữ bộ
tổng hợp 41 bước/31 browser report, không thêm step hoặc mode mới.
Linux và Windows CI đầy đủ đang chờ xác nhận cho mốc này.

Không đổi engine, dữ liệu/review, catalog 109, artwork, starter hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
