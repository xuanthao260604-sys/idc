# Giữ đúng ghế khi gửi lệnh và đọc bàn đấu — 25/10/2026

Một cửa sổ hotseat có thể vẫn hiển thị A trong khi cửa sổ khác đã đổi
cookie dùng chung sang B. Trước đây lệnh Đầu hàng có thể bị áp cho B,
và Cập nhật bàn đấu có thể nhận góc nhìn/tay bài B vào màn hình đang xem A.

Giao diện hiện chụp seat cùng duelId/version trước khi gửi mỗi lệnh đấu.
Lớp HTTP so sánh seat với ghế từ cookie trước khi gọi adapter. Sai ghế trả
409 với thông báo lỗi, không thực hiện lệnh hoặc trả góc nhìn riêng của
ghế khác. Khi đúng ghế, bỏ riêng trường seat rồi gửi intent cũ vào adapter;
không cho client quyết định actorId hoặc đưa winner/state vào lệnh.

Đọc Cập nhật bàn đấu và Kiểm tra bàn đấu trong hộp Trận mới gửi
GET /api/view?seat=<ghế đang xem>. Server kiểm tra ghế trước khi chiếu view.
Sai ghế không trả selfHand/view. Trình duyệt cũng kiểm viewerId của phản
hồi trước khi nhận view, kể cả phản hồi của lệnh đấu. Lỗi giữ nguyên view,
tay bài và lá đang chọn; người chơi cần dùng Đổi người chơi để chọn lại ghế.
Thao tác đổi ghế chủ động vẫn mở góc nhìn mới theo hành vi hiện có.

Không đổi luật đầu hàng, priority, effect hoặc cách adapter chống lệnh lặp.
API lệnh không có seat và GET không có query vẫn giữ hợp đồng legacy;
bảo vệ trên áp dụng khi có guard, giao diện luôn gửi guard. Đây là hotseat
loopback, không phải xác thực/tài khoản hoặc đấu online. Không thay store deck.

## Kiểm chứng

Tám test HTTP mới trong beta-server.test.ts (20 → 28):

- Cả A/B: đầu hàng có guard đúng cookie ghi đúng người thua và giữ receipt
  khi gửi lại cùng lệnh.
- Cả A/B: cookie đổi sang ghế kia, Đầu hàng và Pass có seat cũ bị từ chối;
  JSON chỉ có error, toàn view và kết quả trận không đổi.
- Pass có guard và retry qua API có/không có guard dùng cùng receipt của
  adapter, không xử lý lần hai.
- Guard sai kiểu, actorId/winner hoặc state chèn vào action bị từ chối;
  không trả view riêng và không đổi bàn đấu.
- Cả A/B: GET đúng ghế khớp view, sai ghế hoặc query không hợp lệ chỉ trả lỗi;
  API đọc legacy vẫn hoạt động.

Ca mới `--seat-guard` (`npm run beta:browser-seat-guard`) dùng trận mới
bình thường, không chỉnh state trong lúc chơi:

- Cửa sổ đang xem A, gọi đổi cookie B mà không nhận view vào UI. Đầu hàng,
  Pass và cập nhật bị từ chối; nguyên view, tay và selection A giữ nguyên;
  bàn đấu phía server B chưa kết thúc hoặc tăng version.
- Chọn B chủ động rồi đổi cookie A: kiểm lại đầu hàng/cập nhật đối xứng.
- Chọn A chủ động, cập nhật đúng ghế rồi đầu hàng thật: B thắng, đúng một
  activity ghi actor A. Hai deck đọc trước/sau giống nhau.
- Đã chụp/xem thông báo ở 390px, không tràn ngang. Thêm một step/browser
  invocation, từ 46 lên 47 bước và từ 36 lên 37 browser report.

HTTP riêng, typecheck và ca trình duyệt đạt Linux/Chromium 154.0.8037.57,
runtimeExceptions=0. Đang chạy bộ tổng hợp Linux; Windows CI chưa xác minh
source mới. Các ca tạo trận, mất phản hồi, bỏ bài và deck cũ được giữ hồi quy.

Không đổi engine, catalog 109, facts/effect/review, artwork, starter hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
