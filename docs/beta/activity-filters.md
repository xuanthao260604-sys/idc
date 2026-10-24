# Lọc lịch sử thao tác công khai — 24/10/2026

Lịch sử có phạm vi toàn bộ phần đang giữ hoặc lượt hiện tại, cùng tùy chọn
“Ẩn Pass không kèm kết quả”. Chỉ ẩn các dòng action=pass không có resolution;
Pass có tóm tắt bốc bài, phá quái, sát thương… vẫn hiện. Các hành động khác
như Úp bài hoặc đề nghị chuyển phase vẫn hiện dù không có tóm tắt kết quả.
Hai bộ lọc kết hợp; có số thao tác hiển thị/tổng phần đang giữ và thông báo
riêng cho lịch sử trống so với không có dòng phù hợp.

Dòng mới nhất nằm đầu, thêm nhãn phase từ PublicActivity hiện có. Lượt và
phase là ngữ cảnh lệnh do adapter ghi trước xử lý, không được UI suy lại từ
kết quả. Vì vậy Pass kết thúc End có thể bốc bài cho lượt sau nhưng dòng
vẫn thuộc lượt/phase lúc gửi Pass; bộ lọc không tự gán lại lượt của nó.

Giữ tối đa 60 thao tác như trước, không xóa/mở rộng dữ liệu gốc, không lấy
raw event hoặc thêm thông tin lá bài. UI chỉ đọc view.activity và các tóm
tắt công khai đã có; không đưa tên/ID/source/target/lựa chọn riêng vào log.
Không phải replay, lưu trận hoặc lịch sử đầy đủ qua restart.

Đổi bộ lọc chỉ vẽ lại lịch sử, không gửi command, đổi lựa chọn bài hay dựng
lại bàn đấu. Giữ phạm vi trong cùng ghế/trận qua action, thay lượt và cập
nhật view; đổi ghế hoặc duelId thì về toàn bộ lịch sử và hiện cả Pass. Các
control select/checkbox native có nhãn, dùng chung policy view hiện hành.

## Kiểm chứng

Ca `--activity-filters`, chạy bằng `npm run beta:browser-activity-filters`,
dùng fixture pilot 20 trước server rồi thao tác qua UI:

- Lịch sử đầu trống; Set Fissure và Pass: ẩn Pass vẫn giữ Set, không lộ tên
  Fissure. Pot xử lý ở Pass giữ đúng dòng bốc 2; Pass trước đó bị ẩn.
- Đổi phạm vi/kết hợp bộ lọc giữ nguyên toàn view và bài đang chọn; CDP
  xác nhận không phát sinh lệnh đấu khi chỉ lọc.
- Qua lượt thật: bộ lọc giữ trong ghế B, chuyển theo turn mới và có trạng
  thái không có dòng phù hợp; thao tác mới tự xuất hiện. Cập nhật view giữ
  filter; đổi ghế/trận reset mặc định và trận mới có lịch sử rỗng.
- Kiểm tra và chụp/xem 1440×1000, 390×844: control/list không tràn ngang.

Hai ca trận tự nhiên pilot/expanded sau khi kết thúc cũng kiểm đủ bốn tổ
hợp bộ lọc trên phần lịch sử 60 dòng, so sánh thứ tự stateVersion, số dòng
và toàn view trước/sau. Expanded dùng catalog runtime 109. Giữ toàn bộ ca
đấu tự nhiên cũ, không sửa state khi chơi.

Ca riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0. Thêm một
step/browser mode, từ 42 lên 43 bước và từ 32 lên 33 browser report. Linux
đạt typecheck, 784/784 test trong 35 file, 43/43 bước và 33 browser report,
tổng runtimeExceptions=0. Hai ca tự nhiên đều đạt activityFilteringAtHistoryLimit.
Report tại artifacts/platform-validation/2026-10-24T14-53-11-624Z-33638/report.json.
Windows và Ubuntu CI [run 40104493247](https://github.com/xuanthao260604-sys/idc/actions/runs/40104493247)
đạt trên source commit ff80fbf9188799acf510b7eed49db91743528a18. Đã tải và đọc
artifact windows-validation-40104493247-1: win32 x64, OS 10.0.26100,
Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62. Windows đạt 784/784 test
trong 35 file, 43/43 bước và 33 browser report, tổng runtimeExceptions=0.
Ca activity-filters và hai ca tự nhiên activityFilteringAtHistoryLimit đều
đạt; số lệnh pilot/expanded vẫn 339/262. Report ghi windows11DesktopVerified=false.

Không đổi engine, dữ liệu/review, catalog 109, artwork, starter hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
