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

Validation Linux đầy đủ và Windows CI đang chờ kiểm chứng.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
