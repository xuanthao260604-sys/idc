# Xem trước quái hiến tế — 23/10/2026

Hộp Normal Summon/Set cần hiến tế có số **Đã chọn n/m quái hiến tế** và phần đọc
các quái đang tích. Hiển thị vị trí ô, tên, khung/sao/chỉ số và nguyên văn text.
Bỏ tích xóa lá tương ứng khỏi phần đọc; mở lại hộp không giữ lựa chọn đã hủy.
Triệu hồi không cần hiến tế không hiển thị phần này.

Chỉ đọc bài của mình từ PlayerView hiện tại, bao gồm quái của mình đang úp mà
projection cho phép biết. Không đọc state thô hoặc dựng danh tính bài úp đối thủ.
Ảnh minh họa vẫn placeholder, không sửa ảnh khung người dùng cung cấp.

Đọc hoặc tích ô chưa hiến tế bài; Hủy giữ nguyên trận. Nút xác nhận chỉ bật khi
cả tổ hợp số lá/ô đặt bài có trong availableActions. Ô đang có quái chỉ dùng nếu
chính quái đó được hiến tế. Engine vẫn xác thực lại trước khi thực hiện; không
bổ sung luật hoặc coi việc xem trước là bằng chứng lệnh đã thành công.
Không thay cost của Tribute to The Doomed (bỏ bài trên tay), luật triệu hồi,
review, dữ liệu 106 lá, deck đã lưu hoặc định dạng file deck.

## Kiểm chứng

Browser Chromium 154.0.8037.57 trên Linux đã đạt:
- Curse of Dragon Set cần 1 hiến tế: chọn Celtic Guardian đang úp, chọn đúng ô của
  quái đó làm ô đặt bài; xác nhận có thể bật, nhưng Hủy vẫn giữ nguyên PlayerView.
- Gaia The Fierce Knight cần 2: số 0/2→1/2→2/2 đúng, thiếu lá khóa xác nhận;
  bỏ tích xóa đúng nội dung, chọn lại khôi phục đúng text. Chỉ hiến tế thật khi xác nhận.
- Chủ bài đọc được quái úp của mình; trước đó góc nhìn B không thấy tên quái úp A.
- Xem đủ 106 preview trong editor, rồi triệu hồi Gaia/chiến đấu như cũ (800 damage).
- Đã xem ảnh 1440px/390px; dialog không tràn ngang và cuộn trong chiều cao màn hình.

Fixture điều chỉnh trước startup để có quái úp của mình và Curse of Dragon;
không chỉnh state sau khi chơi. Linux đầy đủ đạt typecheck, build, dữ liệu và
644/644 test trong 31 file; 28/28 bước validation, 18 browser report, runtimeExceptions=0.
Hai trận tự nhiên giữ 16 lượt/339 lệnh (pilot) và 17 lượt/336 lệnh (106).
Report Linux: artifacts/platform-validation/2026-10-23T02-27-32-540Z-96075/report.json.
Windows và Ubuntu CI đạt trên source commit f00066940107c2bb519811d8a302e5b1d72b1ee8:
[run 39889656197](https://github.com/xuanthao260604-sys/idc/actions/runs/39889656197).
Đã tải và đọc artifact windows-validation-39889656197-1: win32 x64,
OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 154.0.4258.62.
Windows đạt 644/644 test trong 31 file, 28/28 bước, 18 browser report,
tất cả runtimeExceptions=0. Report expanded-catalog xác nhận tributePreviews,
oneTributeSetCancelPreservesState, deselectionUpdatesPreview, ownSetPrivacy đều true.
Các assertion bổ sung trong browser regression hiện có; không tăng số unit test.
Windows 11 desktop chưa kiểm thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
