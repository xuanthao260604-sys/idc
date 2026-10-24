# Điều khiển tay bài bằng bàn phím — 24/10/2026

Khi một lá trên tay có tiêu điểm, ←/→ chuyển sang lá trước/sau theo thứ tự
đang hiển thị; Home/End tới đầu/cuối. Đến biên thì giữ nguyên, không vòng lại.
Các phím này chỉ di chuyển tiêu điểm và cuộn lá vào vùng nhìn thấy; không
tự chọn bài, gửi lệnh hoặc thực hiện hiệu ứng. Enter/Space chọn bài bằng
hành vi button native. Tab/Shift+Tab vẫn di chuyển theo thứ tự trình duyệt.

Sửa lỗi tiêu điểm bị mất khi chọn bài dựng lại giao diện: nếu button cũ có
focus, khôi phục vào button của chính lá vừa chọn. Áp dụng cho tay bài và
quái/Phép/Bẫy trên bàn, kể cả bài úp đối thủ chỉ được đọc như bài úp. Không
khôi phục handle cũ sau lệnh server, đổi ghế hoặc đổi trận. Không đổi các
preview chỉ đọc trong dialog.

Có hướng dẫn dưới tay bài và viền focus-visible. Chỉ bắt ←/→/Home/End khi
event đến từ button trong tay bài, không có modifier; select sắp xếp, form,
dialog và phím tắt khác giữ hành vi riêng. Khi đang gửi lệnh thì không điều
hướng thêm. Chuột vẫn chọn bài như trước. Tính năng [sắp xếp tay bài](hand-sorting.md)
giữ quy tắc hiển thị và reset đã có.

## Kiểm thử

Ca browser `--hand-keyboard`, chạy riêng bằng `npm run beta:browser-hand-keyboard`:

- Fixture catalog 109 dùng tay hỗn hợp, hai Battle Ox và Hane-Hane úp của B;
  chỉ dựng trước server, mọi thao tác sau đó qua UI.
- Home/End, biên trái/phải; di chuyển không tự chọn. Enter/Space giữ focus
  qua render; Tab/Shift+Tab tiếp tục đúng lá tiếp/trước. Shift+Arrow không bị
  listener tay bài bắt; select vẫn dùng Home/ArrowDown bình thường.
- Đổi sắp xếp tên rồi điều hướng theo thứ tự mới, phân biệt đúng hai bản sao.
  Toàn bộ view không đổi và CDP không ghi command khi chỉ di chuyển/đọc bài.
- Viewport 390×844: End tự cuộn tay bài để lá cuối nằm trọn trong vùng nhìn,
  trang không tràn ngang. Đã chụp và xem ảnh thực tế.
- Mở/hủy hộp triệu hồi bằng Enter/Escape không gửi lệnh; xác nhận bằng Enter
  gửi đúng handle bản sao đã chọn, giảm đúng số bài trên tay và quota Normal.
- Sau lệnh, chọn quái trên sân bằng Enter và bài úp đối thủ bằng Space vẫn
  giữ focus, không lộ tên/effect hoặc gửi thêm command. Đổi ghế xóa lựa chọn,
  vẽ đúng selfHand và không giữ focus ở tay cũ. Deck A/B đọc trước/sau giống nhau.

Ca riêng đạt Linux với Chromium 154.0.8037.57, runtimeExceptions=0. Bộ tổng
hợp thêm một bước, từ 38 lên 39 bước và từ 28 lên 29 browser report. Linux
và Windows CI đầy đủ đang chờ xác nhận mốc này.

Không đổi engine, dữ liệu/review, catalog 109, artwork, starter hoặc deck cũ.
Đây là hỗ trợ bàn phím trong phạm vi nêu trên, chưa xác nhận toàn bộ accessibility,
screen reader hoặc mọi trình duyệt. Windows 11 desktop chưa thử trực tiếp;
chưa đóng gói hoặc bàn giao beta.
