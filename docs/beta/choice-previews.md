# Xem trước chi phí và mục tiêu

Hộp xác nhận hành động có phần đọc lá đang chọn làm chi phí và/hoặc mục tiêu.
Hiển thị vị trí theo lựa chọn, tên, khung, sao/chỉ số và nguyên văn nội dung lá đã biết.
Ảnh minh họa vẫn là placeholder hiện có. Không bổ sung hoặc tải artwork.

Khi thay lựa chọn, phần đọc cập nhật ngay. Khi đổi chi phí Monster Reincarnation
làm mục tiêu không còn tương thích, lựa chọn và phần đọc đều chuyển theo tổ hợp
server cho phép, không giữ nội dung của lá trước. Mục tiêu chính là lá sắp bỏ
được hiển thị theo góc nhìn hiện tại và nhãn “Lá sẽ bỏ làm chi phí”, không tự đưa
xuống Mộ khi mới xem trước. Hủy hoặc đọc bài không gửi lệnh engine.

Chỉ tìm card trong PlayerView hiện có: tay của viewer và các vùng sân/Mộ được
projection trả về. Bài úp đối thủ chỉ hiện “Bài úp” và lời nhắc danh tính được giữ
kín; không dựng mặt trước hoặc tra catalog để đoán danh tính. Tấn công trực tiếp
hiện mô tả thay cho lá mục tiêu. Nội dung chỉ đọc, không có nút hành động phụ.

Đây là hộp chọn chi phí/mục tiêu trước khi gửi lệnh, chưa bổ sung xem trước nhiều
lá hiến tế hoặc bảng lựa chọn bắt buộc. Không đổi timing, cost, Chain hay validate
của engine. Catalog 106, dữ liệu/review, deck đã lưu và file chuyển deck giữ nguyên.

## Kiểm chứng

Các ca browser riêng trên Linux Chromium 154.0.8037.57 đạt:
- Reincarnation: xem Battle Ox làm cost và target; đổi cost khiến target chuyển
  về Hane-Hane trong Mộ, phần đọc đúng; xem/hủy giữ nguyên view.
- Tribute: chuyển từ Celtic Guardian đã biết sang Man-Eater Bug đang úp của đối
  thủ; xóa mặt trước và chỉ hiện thông tin kín. Cost Battle Ox vẫn đọc đúng.
- Phần đọc hiển thị nguyên văn text từ catalog, không có nút hành động bên trong.
- Đã xem ảnh 1440px/390px; dialog cuộn trong chiều cao màn hình và không tràn ngang.

Linux: typecheck, build, dữ liệu nhập và 644/644 test trong 31 file đều đạt;
validation đầy đủ 28/28 bước, 18 browser report, runtimeExceptions=0.
Report: artifacts/platform-validation/2026-10-22T13-56-34-032Z-57854/report.json.
Cả hai trận tự nhiên giữ kết quả cũ (pilot: 16 lượt/339 lệnh; 106: 17 lượt/336 lệnh);
đã kiểm tra mô tả tấn công trực tiếp trong hộp chọn thay vì dựng lá mục tiêu.
Windows và Ubuntu CI đều đạt trên source commit b68f4f1ee79c5ab41b575c00ebacd9daf2645c6e:
[run 39791352732](https://github.com/xuanthao260604-sys/idc/actions/runs/39791352732).
Đã tải và đọc artifact windows-validation-39791352732-1: win32 x64,
OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62.
Windows đạt 644/644 test trong 31 file, 28/28 bước, 18 browser report,
tất cả runtimeExceptions=0. Hai report Reincarnation có choicePreviews và
previewFollowsCostChange=true; Tribute có previewKeepsHiddenIdentity=true.
Các kiểm tra mới nằm trong browser regression hiện có; không tăng số unit test.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
