# Bảo vệ tạo trận mới khi mất phản hồi — 25/10/2026

Trước đây, nếu server đã tạo trận nhưng trình duyệt mất phản hồi, giao diện
vẫn giữ trận cũ. Bấm Bắt đầu trận mới lần nữa có thể thay luôn trận vừa tạo.

Giao diện hiện chụp seat, duelId và expectedStateVersion khi mở hộp xác nhận.
Server kiểm tra đủ ba trường trước khi tạo trận; khác ghế, trận hoặc phiên
bản thì trả 409 và giữ nguyên trận trên server. Bấm lại sau khi mất phản
hồi cũng bị từ chối vì duelId cũ không còn là trận hiện tại. Kiểm tra và
thay trận thực hiện liền nhau, không await giữa hai bước.

Nút Kiểm tra bàn đấu chỉ GET /api/view, không gửi reset. Đọc thành công và
đúng ghế sẽ tải view hiện tại, đóng hộp để người chơi xem lại bàn đấu trước
khi quyết định mở Trận mới lần nữa. Không kết luận trận hiện tại chắc chắn
do yêu cầu vừa lỗi tạo ra. Không tự thử lại, tự chọn người đi trước hoặc
thay đổi deck. Lỗi đọc/mất mạng giữ view, hộp và lựa chọn đi trước. Cookie
đổi sang ghế khác thì không nhận view/tay bài của ghế đó vào UI; cần đóng
hộp và chọn lại người chơi. Các control khóa khi gửi hoặc kiểm tra.

Hủy/Escape giữ hành vi cũ. Đóng xóa context xác nhận; lần mở sau chụp lại
view đang xem. Lỗi tạo nhắc kiểm tra bàn đấu khi chưa rõ kết quả. Nút mới
và thông báo dài xuống dòng trên màn hình hẹp.

## Hợp đồng và giới hạn

POST /api/reset từ giao diện gửi firstPlayer kèm đủ seat/duelId/expectedStateVersion.
Một phần guard, guard sai kiểu hoặc trường ngoài hợp đồng bị từ chối 400.
Giữ API cũ `{}` và `{ firstPlayer }` theo hợp đồng đã ghi trước đây; client
cũ không gửi guard vẫn có hành vi thay trận cũ. Bảo vệ trên áp dụng cho yêu
cầu có đủ guard; UI luôn gửi đủ. Không gọi đây là receipt/idempotency cho
API legacy, lưu trận qua restart hoặc khôi phục lại trận đã bị thay hợp lệ.
Không bổ sung endpoint chỉnh seed/LP/state hoặc xác thực online.

## Kiểm chứng

Bảy test HTTP mới, tổng beta-server.test.ts từ 13 lên 20:

- A/B/ngẫu nhiên: tạo đúng trận, gửi lại cùng guard trả 409, toàn view trận
  đã tạo và hai deck giữ nguyên.
- Có command thật thay version sau khi mở xác nhận: từ chối bản cũ; guard
  theo version mới sau khi xem lại được chấp nhận.
- Sai ghế, thiếu/sai guard và thêm seed bị từ chối, giữ view.
- Ba yêu cầu đồng thời cùng guard chỉ một 200, hai 409; view còn lại đúng
  trận được tạo bởi yêu cầu thành công.
- `{}` legacy vẫn hợp lệ và A đi trước.

Mở rộng ca `--new-game` sẵn có (`npm run beta:browser-setup`):

- Giữ các ca Hủy/A/B/ngẫu nhiên và tay 6/5 từ hai góc nhìn.
- Fetch thật đã hoàn tất reset rồi giả lập mất phản hồi ở trình duyệt.
  View UI cũ giữ nguyên; bấm lại gửi cùng guard, bị từ chối và không thay
  trận đã tạo. GET kiểm tra chỉ tải đúng trận hiện tại, không gửi reset.
- Mất mạng khi gửi/kiểm tra giữ UI và lựa chọn; phục hồi mạng đọc lại đúng
  bàn đấu, kể cả khi yêu cầu trước đó chưa tới server.
- Phiên local riêng gửi command thật khi hộp đang mở: guard version cũ
  bị từ chối. Đổi cookie sang B: cả reset và đọc kiểm tra không thay view A.
- Deck A/B đọc trước/sau giống nhau. Không chỉnh state khi đang chơi.
- Đã chụp/xem 1440×1000 và 390×844: dialog, ba nút và thông báo nằm trong viewport.

HTTP riêng, typecheck và ca trình duyệt đạt Linux/Chromium 154.0.8037.57,
runtimeExceptions=0. Đang chạy bộ tổng hợp Linux; Windows CI chưa xác minh
source mới. Không thêm browser mode/step: giữ 46 bước và 36 report.

Không đổi engine, catalog 109, dữ liệu/review, artwork, starter hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
