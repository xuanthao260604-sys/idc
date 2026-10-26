# Giữ đúng ghế khi đọc deck — 26/10/2026

Khi cửa sổ đang xem A nhưng cookie dùng chung đã đổi sang B ở cửa sổ
khác, ba thao tác Mở deck, Kiểm tra deck đã lưu và Tải bản lưu vào nháp
trước đây vẫn nhận được danh sách deck B qua HTTP. Giao diện kiểm tra
seat và từ chối dùng phản hồi, nhưng dữ liệu của ghế khác đã được gửi.

Ba thao tác nay gửi GET /api/deck?seat=<ghế đang xem hoặc ghế bản nháp>.
Server kiểm cookie trước, rồi kiểm guard trước khi đọc store hoặc trả
danh sách. Sai ghế trả 409; query seat không hợp lệ trả 400; chưa chọn
ghế trả 401. Các phản hồi lỗi chỉ có error, không có cards, revision,
defaultCards hay góc nhìn trận. Giao diện vẫn kiểm seat của phản hồi
trước khi dùng nó.

Lỗi mở deck không mở hộp sửa hoặc tạo nháp. Lỗi kiểm tra/tải giữ nguyên
toàn bộ nháp, baseline đã xác nhận, revision, Hoàn tác/Làm lại, preview
và bộ lọc. Không tự lưu, gửi lại lệnh hoặc đổi ghế. Người chơi có thể
chọn lại ghế bằng thao tác hiện có rồi mở deck.

GET /api/deck không có query vẫn đọc deck theo cookie như API cũ; query
seat nay là guard, không phải cách chọn deck của người khác. Lệnh lưu,
nhập và xuất vẫn có guard seat hiện hữu. Đây là hotseat loopback, chưa
phải cơ chế xác thực hoặc online. Không đổi store, file deck, dữ liệu bài,
review/handler, luật chơi hoặc hình ảnh.

## Kiểm chứng

Thêm bốn test HTTP vào beta-server.test.ts (29 → 33): đúng/sai guard cho
cả A/B, query không hợp lệ và thiếu cookie. Kiểm phản hồi lỗi chỉ có
error, đọc đúng ghế giống API cũ và bàn đấu/deck giữ nguyên. Test cũ vốn
kiểm query bị bỏ qua nay đọc API không query; hành vi query mới được
kiểm bằng các test riêng.

Mở rộng ca trình duyệt --seat-guard hiện có, không thêm invocation:

- Với mỗi ghế, mở deck đúng ghế, sửa rồi Hoàn tác để có cả undo và redo;
  chọn preview, tìm bài và sắp xếp trước khi đổi cookie sang ghế kia.
- Kiểm tra bản lưu và tải vào nháp bị từ chối; toàn JSON của nháp, preview,
  bộ lọc và PlayerView giữ nguyên. Đóng nháp bằng xác nhận rõ ràng, mở
  deck khi cookie vẫn sai không tạo nháp hoặc mở hộp sửa.
- Thu phản hồi của đủ sáu yêu cầu sai ghế: status 409, chỉ có error;
  tám yêu cầu đúng ghế trả đúng seat. Chọn lại ghế chủ động khôi phục
  cả ba thao tác. Hai deck trước/sau không thay đổi.
- Giữ các kiểm tra cũ về Pass/Đầu hàng, refresh, tay bài riêng, chọn lá
  và đầu hàng đúng actor. Không chỉnh state trong lúc chơi.

Typecheck, build, 33 test HTTP và ca trình duyệt riêng đã đạt trên Linux.
Bộ tổng hợp đạt 809/809 test trong 35 file, 47/47 bước, 37 browser report
với Chromium 154.0.8037.57, tổng runtimeExceptions=0. Đã đọc report tại
artifacts/platform-validation/2026-10-26T06-14-48-788Z-163754/report.json;
ca seat-guard có đủ bốn cờ kiểm chứng đọc deck mới. Các hồi quy nhập lỗi,
deck cũ, mất phản hồi/xung đột và hai trận tự nhiên vẫn đạt.
Windows CI đang được kiểm tra; chưa dùng kết quả Linux để xác nhận Windows.

Catalog vẫn 109 loại; snapshot nhập và khả năng runtime tách riêng.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
