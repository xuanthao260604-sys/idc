# Giữ lựa chọn khi gửi gặp lỗi — 23/10/2026

Đã tái hiện lỗi cũ: chọn đủ 2 lá bỏ cuối lượt, gửi lúc offline thì form được render
lại và mất cả hai dấu chọn, dù PlayerView chưa thay đổi. Ca browser thất bại trước
bản sửa (actual=[] thay vì hai handle đã chọn) và đạt sau bản sửa.

Bản chọn tạm nay được giữ khi gửi quyết định gặp lỗi mạng, đọc lá trên bàn hoặc
cập nhật một PlayerView chưa đổi. Áp dụng cả radio của mục tiêu FLIP và checkbox
bỏ bài. Hiển thị đúng số đã chọn khi đang gửi; không tự gửi lại khi mạng trở lại.
Thông báo lỗi ghi rõ chưa xác nhận kết quả, khuyên cập nhật bàn đấu khi chưa chắc.

Bản chọn chỉ thuộc đúng duelId, viewer, stateVersion và toàn bộ quyết định hiện
hành (bao gồm các handle lựa chọn). Đổi người chơi, đổi trận/quyết định, đổi phiên
bản hoặc đổi các handle sẽ xóa bản chọn; xử lý xong quyết định cũng xóa. Không lưu
vào file/localStorage và không khôi phục qua F5/restart. Không giữ callback form cũ
khi quyết định kết thúc. Đây là nháp giao diện, không phải lệnh đã được chấp nhận.

Nếu server đã xử lý nhưng phản hồi bị mất, client vẫn ghi chưa xác nhận. Cập nhật
hoặc thử lại thủ công nhận trạng thái hiện hành; expectedStateVersion của engine
chặn lệnh cũ để không xử lý bỏ bài lần hai. Không đổi engine/adapter hay áp dụng
nháp lên một quyết định mới. Luật, catalog 106, review, dữ liệu và deck giữ nguyên.

## Kiểm chứng

Chromium 154.0.8037.57 trên Linux đã đạt các ca browser:
- Offline trước khi gửi: giữ nguyên PlayerView và 2 ô chọn; số lá vẫn 2/2.
- Chọn lá để đọc và cập nhật view chưa đổi: giữ lựa chọn; đổi A→B→A: xóa nháp riêng.
- Server xử lý thật rồi test làm mất phản hồi HTTP: client giữ nháp và ghi chưa
  xác nhận; thử lại nhận stale-state, stateVersion không tăng thêm, history có đúng
  một answer-decision, tay còn 6 lá và chỉ 2 lá bị bỏ.
- Radio mục tiêu FLIP giữ lựa chọn khi offline, gửi lại sau khi có mạng resolve đúng;
  bản chọn được xóa khi quyết định kết thúc.

Chỉ mô phỏng lỗi kết nối/phản hồi ở lớp fetch; không chỉnh state trận sau fixture.
Bộ validation Linux đầy đủ và Windows CI đang chờ kiểm chứng.
Windows 11 desktop chưa kiểm thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
