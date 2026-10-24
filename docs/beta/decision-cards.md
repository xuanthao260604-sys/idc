# Chọn trực tiếp lá trong quyết định bắt buộc — 24/10/2026

Khi view của người đang xem có quyết định bắt buộc, đánh dấu đúng các lá
trên tay/sân thuộc optionIds do engine cấp. Lá có viền và nhãn riêng;
đã chọn có dấu ✓, aria-pressed và trạng thái khớp radio/checkbox trong
bảng lựa chọn. Không đánh dấu theo tên, ATK/DEF hoặc tự đoán mục tiêu.

Nhấn lá được đánh dấu vừa đọc nội dung theo góc nhìn, vừa đổi lựa chọn
nháp: radio giữ một mục tiêu; checkbox bật/tắt như bảng. Chọn trong bảng
cũng cập nhật dấu trên lá ngay. Không tự xác nhận hoặc gửi lệnh đấu khi
chỉ nhấn lá. Vẫn phải chọn đúng số và bấm Xác nhận lựa chọn; chọn quá số
lượng khóa nút gửi như trước.

Bài úp đối thủ giữ mặt sau, không có tên/mặt trước trong panel đọc; chỉ
nhận cue nếu chính quyết định đang xem cho phép chọn handle đó. Người
chơi không có decision không thấy cue hoặc lựa chọn riêng. Đổi ghế xóa
bản nháp theo policy cũ; quyết định kết thúc thì cue được xóa. Khi đang
gửi câu trả lời, các lá lựa chọn bị khóa.

Các nút bài native tiếp tục dùng Enter/Space; focus giữ sau render. Sắp
xếp tay bài không làm lệch bản sao đã chọn. Chỉ đọc bài trong dialog
preview vẫn không chọn hộ. Mộ đang xem cũng chỉ đọc: lựa chọn nằm trong
Mộ như Magician of Faith vẫn dùng bảng riêng, không thêm thao tác từ cửa
sổ Mộ. Giữ cue giao chiến và nhãn attacker/target hiện hành.

## Kiểm chứng

Ca mới `--decision-cards`, chạy bằng `npm run beta:browser-decision-cards`,
dùng fixture pilot 20 dựng trước server:

- B Flip Summon Man-Eater Bug: bốn quái hợp lệ được đánh dấu, gồm quái úp
  của A. Nhấn quái úp chỉ chọn nháp, toàn view/version/Chain không đổi;
  panel Bài úp không có mặt trước hoặc tên Mystical Elf.
- Chuyển radio và nhấn lá đồng bộ cả hai chiều, chỉ một cue đã chọn. A
  không có decision nên không thấy marker; về B xóa lựa chọn trước đó.
- Xác nhận mới tạo Chain và xóa cue. Target trong Chain vẫn giữ kín cho
  B; chỉ sau resolution mới xuống Mộ, hiện Mystical Elf công khai, đúng
  một lá bị phá và LP giữ nguyên.
- Chụp/xem viewport 1440/390: cue có mặt trên khung/mặt sau, không tràn
  ngang. Không thay artwork, dữ liệu hay effect handler để dựng hình.

Mở rộng `--discard`: radio/checkbox trong bảng cập nhật cue trên tám lá
tay; hai lá chọn giữ đúng sau sắp xếp. Space trên lá thứ ba tăng chọn lên
3/2 và khóa gửi, nhấn lại trở về 2/2. Mất mạng giữ lựa chọn; refresh giữ
nháp; mất phản hồi rồi retry không bỏ bài hai lần và cue hết sau decision.
Giữ toàn bộ kiểm tra preview chỉ đọc trước đó.

Hai ca riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0. Thêm
một step/browser mode, từ 43 lên 44 bước và từ 33 lên 34 browser report.
Linux và Windows CI đầy đủ đang chờ xác nhận cho mốc này.

Không đổi engine, dữ liệu/review, catalog 109, artwork, starter hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
