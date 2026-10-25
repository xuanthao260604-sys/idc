# Điều khiển các hàng sân bằng bàn phím — 25/10/2026

Dùng ←/→ và Home/End trên một lá đang có focus để di chuyển giữa các lá
trong cùng hàng Quái hoặc Phép/Bẫy, ở cả sân mình lẫn đối thủ. Bỏ qua ô
trống, dừng ở đầu/cuối hàng; hàng chỉ có một lá vẫn giữ focus ở lá đó.
Tab/Shift+Tab tiếp tục theo thứ tự native để ra hàng hoặc sang điều khiển
khác. Không chặn tổ hợp có Ctrl/Alt/Shift/Meta hoặc phím trong dialog.

Di chuyển chỉ đổi focus và cuộn lá vào vùng nhìn; không tự đọc/chọn,
đổi bản nháp, gửi command hoặc thay đổi vị trí bài. Enter/Space dùng nút
native để chọn/đọc, giữ focus sau render. Nếu đang có quyết định bắt buộc,
Enter/Space cũng chọn nháp như nhấn chuột; vẫn cần nút Xác nhận lựa chọn
để gửi quyết định. Khóa điều hướng bổ sung trong lúc gửi lệnh.

Các hàng có role group, nhãn người chơi/loại hàng và mô tả phím. Nhãn của
lá trên sân có chủ sân, loại ô và số ô gốc kể cả khi giữa hàng có ô trống.
Bài úp đối thủ vẫn chỉ có nhãn Bài úp; không thêm tên, effect hoặc artwork
vào góc nhìn. Không thay đổi thứ tự DOM, thứ tự Tab hoặc engine.

Tay bài dùng chung hàm di chuyển với hàng sân, tiếp tục theo thứ tự hiển
thị sau sắp xếp. Dòng hướng dẫn đã bổ sung phạm vi hàng sân và phím Tab.

## Kiểm chứng

Ca `--field-keyboard`, chạy bằng `npm run beta:browser-field-keyboard`,
dùng fixture pilot 20 dựng trước server, không chỉnh state khi đang chơi:

- Chạy cả góc nhìn A/B, cả hai hàng sân mình/đối thủ; các lá cách nhau bởi
  ô trống và có một hàng chỉ chứa một lá. Kiểm tra phím hai chiều, Home/End,
  giới hạn, tổ hợp có modifier và Tab/Shift+Tab.
- Enter/Space giữ focus và đọc đúng lá, đúng số ô/chủ sân. Bài úp đối thủ
  không có tên/mặt trước/definition. Toàn view giữ nguyên và không có command
  trong các bước chỉ di chuyển/đọc.
- B Flip Summon Man-Eater Bug bằng bàn phím, tạo quyết định sáu mục tiêu.
  Di chuyển focus không chọn nháp; Space/Enter đổi đúng radio/cue. Chọn quái
  úp của A vẫn giữ kín, chỉ xác nhận riêng mới tạo Chain; sau resolution đúng
  Celtic Guardian vào Mộ, LP không đổi và cue được xóa.
- Viewport 1440/390 giữ lá có focus trong vùng nhìn, không tràn ngang. Đã
  chụp/xem ảnh hai viewport. Deck A/B đọc trước/sau giống nhau.

Ca riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0. Thêm một
step/browser report: bộ tổng hợp dự kiến 45 bước và 35 browser report.
Đang chờ kết quả tổng hợp Linux và Windows CI cho source mới.

Không đổi dữ liệu/review, catalog 109, effect handler, artwork hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp. Đây là phạm vi bàn phím nêu trên,
chưa xác nhận toàn bộ accessibility/screen reader. Chưa đóng gói/bàn giao beta.
