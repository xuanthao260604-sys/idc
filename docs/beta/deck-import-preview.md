# Xem trước trước khi nhập file deck — 24/10/2026

Chọn file hợp lệ mở cửa sổ xem trước, chưa thay bản nháp. Hiển thị tên file,
số lá hiện tại/trong file và bảng số bản sao thay đổi, kể cả lá về 0. So
sánh với bản nháp đang sửa, không phải baseline đã lưu. Nếu chỉ khác thứ
tự hoặc danh sách giống hệt thì có thông báo riêng. File được xác thực
bằng endpoint nhập hiện có trước khi được đưa vào cửa sổ này.

Hủy hoặc Escape đóng riêng cửa sổ xem trước, giữ editor cùng bài, baseline,
revision, lịch sử và deck đã lưu. Tên file và dữ liệu xem trước được xóa
khi đóng. Nút Hủy nhận focus đầu tiên. Áp dụng mới thay bản nháp thành
một bước có thể Hoàn tác; file trùng hoàn toàn không thêm bước hoặc xóa
redo. Vẫn phải bấm Lưu deck để dùng ở trận mới.

Preview gắn với đúng đối tượng bản nháp, ghế và danh sách lúc đọc file.
Nếu ngữ cảnh local đã đổi, Áp dụng từ chối và yêu cầu chọn file lại. Parent
editor không tương tác được khi dialog xem trước đang mở. File lỗi không
mở preview hoặc sửa bản nháp; giới hạn 12.000 byte, schema/format/card
validation và file JSON portable không thay đổi. Không nhập definitions,
artwork, hiệu ứng hoặc dữ liệu trận.

Phần đếm bản sao dùng chung với [bảng thay đổi bản nháp](deck-changes.md).
Cửa sổ riêng phân biệt cột “Nháp hiện tại” và “Trong file”; không thay
baseline, revision hoặc deck đã lưu khi chỉ xem hay Áp dụng. Đây là cập
nhật cho hành vi nhập file tức thời của mốc [file deck](deck-files.md).

## Kiểm chứng

Mở rộng ca `--deck-builder`, chạy bằng `npm run beta:browser-deck-builder`:

- Xuất và chọn file thật: preview 40 → 41 lá, Blue-Eyes White Dragon từ
  2 lên 3 bản sao. Toàn bộ draft/view/deck đã lưu giữ nguyên trước áp dụng.
- Hủy bằng nút và Escape giữ nguyên draft cùng lịch sử, không đóng editor;
  state preview, hàng và tên file được xóa. Có thể chọn lại cùng file.
- Áp dụng thêm đúng một bước undo; undo/redo lấy lại đúng danh sách. File
  trùng không đổi lịch sử; file đảo thứ tự có mô tả riêng và Hủy giữ nháp.
- File JSON lỗi vẫn giữ nháp/lịch sử. Các ca lưu lỗi, chuyển file A→B, deck
  41/42 và chỉ dùng deck mới sau tạo trận tiếp tục chạy trong ca cũ.
- Kiểm tra và chụp/xem cửa sổ 1440×1000, 390×844: không tràn ngang hoặc
  cao quá viewport, nút xuống dòng khi cần. Text tên file dùng textContent.

Ca riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0. Giữ bộ tổng
hợp 41 bước và 31 browser report, không thêm step hoặc mode mới. Linux và
Windows CI đầy đủ đang chờ xác nhận cho mốc này.

Không đổi engine, dữ liệu/review, catalog 109, artwork, starter hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
