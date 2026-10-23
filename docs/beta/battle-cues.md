# Hiển thị đòn tấn công đang xử lý

Bàn đấu thêm dòng Đang giao chiến với người chơi, quái tấn công, mục tiêu và số
ô; tấn công trực tiếp ghi rõ thay vì đánh dấu một ô mục tiêu. Quái tấn công có
viền cam, quái bị tấn công có viền xanh; aria-label cũng ghi vai trò để thông tin
không phụ thuộc riêng vào màu. Không thêm nút hoặc thay đổi trình tự Pass.

Hiển thị trong lúc trận chiến còn đang xử lý, gồm lúc chờ lựa chọn FLIP; xóa khi
không còn đòn tấn công đang xử lý hoặc trận kết thúc. Dòng trạng thái mô tả đòn
hiện tại, không tự tính hay dự đoán sát thương. Nếu quái đã rời sân trong xử lý,
chỉ ghi Quái đã rời sân, không tra lại dữ liệu ngoài góc nhìn.

Nguồn duy nhất là battle handles và VisibleCard của PlayerView. Bài úp đối thủ
vẫn là Bài úp, không thêm tên/chỉ số hoặc nội dung bài. Chủ bài vẫn được đọc bài
úp của mình như trước khi đổi seat; không gửi hành động hoặc đổi state khi đổi
cách hiển thị. Thông tin nằm trong arena, tiếp tục bị che ở màn chuyển máy.
Không đổi protocol/API, engine, luật chiến đấu, catalog 108, dữ liệu/review,
artwork, starter hoặc deck đã lưu.

## Kiểm chứng

Mở rộng ca browser effects: La Jinn/Celtic Guardian tấn công Hane-Hane/Man-Eater
Bug đang úp; đúng một attacker/target, aria-label đúng và không có card-name của
bài úp ở góc nhìn đối thủ; banner không có tên lá đó. Đổi seat sang chủ bài đọc
đúng tên mà stateVersion không đổi; xử lý FLIP xong xóa banner/viền.

Hai trận tự nhiên pilot 20 và expanded 108 kiểm tra banner/viền trên từng lần
tuyên bố tấn công, trực tiếp không có viền mục tiêu; trận kết thúc ẩn banner.
Đã chụp và xem Chromium 1440×1000 và 390×844, banner không tràn ngang và viền
hiển thị đúng cả trên mặt sau chung do người dùng cung cấp.

Linux đạt typecheck, 726/726 test trong 33 file; 31/31 bước validation,
21 browser report với Chromium 154.0.8037.57, tổng runtimeExceptions=0.
Hai trận tự nhiên giữ nguyên kết quả: pilot 16 lượt/339 lệnh, expanded 15 lượt/309 lệnh.
Windows và Ubuntu CI [run 39965022546](https://github.com/xuanthao260604-sys/idc/actions/runs/39965022546)
đạt trên source commit 82f8f92c17364258fa4691b86913f36e7098600c. Đã tải và đọc
artifact windows-validation-39965022546-1: win32 x64, OS 10.0.26100,
Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62. Windows đạt 726/726 test
trong 33 file, 31/31 bước, 21 browser report; tổng runtimeExceptions=0.
Ca effects xác nhận battleCues/hiddenTargetPrivacy/battleCuesClearedAfterResolution;
hai trận tự nhiên xác nhận battleCues/directAttackCues. Report ghi
windows11DesktopVerified=false.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
