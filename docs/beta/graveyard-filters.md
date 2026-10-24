# Tìm và lọc bài trong Mộ — 24/10/2026

Cửa sổ Xem Mộ có ô tìm tên/nội dung và bộ lọc Tất cả/Quái/Phép/Bẫy. Không
phân biệt hoa thường, bỏ khoảng trắng ở hai đầu truy vấn; kết hợp đồng
thời với loại bài. Quái gồm quái thường và quái hiệu ứng. Đếm theo số lá,
không gộp các bản sao cùng tên.

Danh sách luôn đi từ trên xuống của Mộ như trước; lọc không sắp xếp lại
hoặc thay thứ tự trong PlayerView/engine. Nhãn vị trí vẫn theo vị trí
gốc từ trên xuống, không đánh số lại theo kết quả lọc. Chọn đúng instance
bằng handle, nên hai bản sao cùng tên vẫn được đọc và đánh dấu riêng.

Nếu lá đang đọc còn trong kết quả, giữ preview; nếu bị lọc ẩn thì xóa
preview và lựa chọn. Không có kết quả và Mộ trống có thông báo khác nhau;
Mộ trống khóa hai bộ lọc. Không có nút hành động/triệu hồi từ Mộ. Chỉ đọc
những lá Mộ công khai đã có trong view, không mở rộng sang tay, deck hoặc
bài úp trên sân.

Mỗi lần mở bắt đầu với truy vấn rỗng và tất cả loại. Đóng bằng nút/cancel
dialog xóa danh sách, preview và bộ lọc; chuyển ghế, đổi trận hoặc render
view mới cũng xóa context cũ. Giữ hành vi native của input search: Escape
trong ô có chữ có thể xóa truy vấn trước; Escape tại nút Đóng đóng dialog.
Không thay lá đang chọn trên tay/sân khi đọc/lọc Mộ.

## Kiểm chứng

Ca `--graveyard-filters`, chạy bằng `npm run beta:browser-graveyard-filters`:

- Catalog 109, fixture A có sáu lá Mộ, gồm hai Battle Ox, FLIP, Phép/Bẫy;
  B có ba lá Mộ và Hane-Hane úp trên sân. Chỉ dựng trước server.
- Tìm “  bAtTlE  ” giữ hai bản sao, vị trí 2/4 từ trên xuống; chọn bản thứ
  hai đúng handle. Bộ lọc Quái giữ cả Faith và hai Ox theo thứ tự gốc.
- Tìm nội dung “draw 2” kết hợp Phép trả Pot, giữ vị trí gốc 6; kiểm text
  khớp catalog. Giữ preview khi vẫn thấy Pot; chuyển Bẫy gây kết quả rỗng
  xóa preview; bỏ truy vấn thấy Trap Hole.
- Reset filter khi mở Mộ phía khác/ghế B; không tìm thấy Hane-Hane úp qua
  tìm kiếm Mộ. Đóng/Escape xóa context và không đổi lá đang chọn trên sân.
- So sánh nguyên view trước/sau từng lượt xem A/B; CDP không ghi command
  đấu khi lọc/đọc. Không đổi stateVersion hoặc thứ tự/số lá trong Mộ.
- Tạo trận mới qua UI để kiểm Mộ trống, không chỉnh state: số 0/0, thông
  báo đúng và control khóa, không giữ dữ liệu trận cũ.
- Đã chụp và xem bố cục 1440×1000, 390×844: control không tràn ngang, danh
  sách cuộn riêng và dialog nằm trong viewport.

Ca riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0. Thêm một
step/browser mode, từ 41 lên 42 bước và từ 31 lên 32 browser report. Linux
và Windows CI đầy đủ đang chờ xác nhận cho mốc này.

Không đổi engine, dữ liệu/review, catalog 109, artwork, starter hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
