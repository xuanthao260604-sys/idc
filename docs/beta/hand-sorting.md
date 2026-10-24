# Sắp xếp tay bài — 24/10/2026

Tay bài có bốn cách xem: thứ tự nhận bài, tên A–Z, Quái → Phép → Bẫy và cấp
sao giảm dần. Theo loại hoặc cấp sao thì tên A–Z là tiêu chí phụ; các bản sao
cùng tên/cấp giữ thứ tự nhận ban đầu. Phép/Bẫy nằm sau quái khi xếp theo cấp.

Chỉ sắp xếp bản sao danh sách từ PlayerView để vẽ giao diện. Không sửa
selfHand, DuelState, deck order, availableActions hoặc dữ liệu đã lưu; không
gửi command khi đổi kiểu sắp xếp. Lá đang chọn vẫn gắn với handle của đúng
bản sao, giữ highlight/nội dung và dùng hành động cũ. Control dùng select
native có nhãn, dùng được bằng bàn phím và bị khóa khi đang gửi lệnh hoặc
tay có dưới hai lá.

Kiểu xem giữ trong góc nhìn hiện tại khi chọn bài, cập nhật bàn đấu hoặc nhận
view mới cùng trận. Chuyển máy/chọn ghế hoặc tạo trận mới trả về thứ tự nhận
bài. Không lưu sở thích hoặc danh sách tay bài vào localStorage/file. Chỉ đọc
tay của người đang xem; không yêu cầu thêm dữ liệu tay/deck đối thủ.

## Kiểm thử

Browser `--hand-sorting`, chạy riêng bằng `npm run beta:browser-hand-sorting`:

- Fixture catalog 109, tay có Quái thường/FLIP/Phép/Bẫy, hai Battle Ox và quái
  cấp 8. Chỉ dựng fixture trước server; không sửa state trong lúc chơi.
- Chọn bản sao Battle Ox thứ hai, đổi đủ bốn kiểu bằng Home/ArrowDown. Kiểm
  thứ tự tên cụ thể, thứ tự hai bản sao, focus trên select và lá đang chọn.
- So sánh toàn bộ view trước/sau mỗi lần sắp xếp; theo dõi CDP xác nhận chưa
  gửi command. Sau đó Normal Summon qua UI gửi đúng handle đã chọn, số bản
  sao trên tay giảm đúng và quota Normal được tiêu.
- Đổi ghế chỉ vẽ selfHand của ghế mới và xóa lựa chọn; về ghế cũ dùng thứ tự
  nhận bài. Cập nhật bàn đấu cùng ghế giữ kiểu sắp xếp.
- Kích hoạt Pot sau khi sắp xếp và bốc đúng hai lá; tạo trận mới trả control
  về mặc định. Deck đã lưu trước/sau ca giống nhau.
- Kiểm tra và chụp/xem bố cục 1440×1000 và 390×844: control trong viewport,
  trang không tràn ngang; dãy tay bài vẫn cuộn riêng trên màn hình nhỏ.

Ca riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0. Đã thêm ca
vào `validate:platform`, nâng từ 37 lên 38 bước và 27 lên 28 browser report.
Bộ tổng hợp Linux và Windows CI đang chờ xác nhận cho mốc này.

Catalog vẫn 109 loại, 95 quái thường và 14 hiệu ứng đã review trong scope giới
hạn. Không đổi engine, dữ liệu nhập/review, artwork, starter 40 hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
