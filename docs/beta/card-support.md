# Trạng thái dữ liệu và khả năng của từng lá — 26/10/2026

Khi đọc lá đã biết danh tính, mở mục Trạng thái dữ liệu và hoạt động để xem
ba thông tin tách riêng: đối chiếu dữ liệu, loại văn bản và khả năng đã mở
trong game. Áp dụng ở panel lá đang chọn, preview trong xây deck, xem Mộ,
chi phí/mục tiêu/hiến tế, đọc quyết định bắt buộc và đọc lá trong Chain.
Mặc định thu gọn; chỉ xem thông tin, không có nút gửi hành động đấu.

API catalog lấy dataVerification và textBasis từ định nghĩa nhập hiện tại.
Runtime phân loại theo registry đang chấp nhận lá: quái thường, hiệu ứng
Phép, FLIP hoặc Bẫy. Không dùng cờ implementation/testing của snapshot nhập
để suy ra hiệu ứng đang hoạt động. Không nâng pending thành verified vì lá
đã có handler. Các giá trị này mô tả khả năng theo nhóm, không phải bản mô
tả đầy đủ mọi ruling hoặc chứng nhận mọi tương tác đã được kiểm thử.

Ví dụ Magician of Faith hiện đồng thời hiển thị Còn chờ đối chiếu,
Tham chiếu hiện hành và Hiệu ứng FLIP trong phạm vi thử nghiệm. Đây là đúng
hai trạng thái độc lập đang lưu, không sửa văn bản hoặc hồ sơ review của lá.
Quái thường đã verified dùng nhãn Quái thường theo luật hiện có. Thiếu
thông tin thì ghi chưa có/chưa ghi, không đoán loại văn bản hoặc trạng thái.

Thông tin nằm ngoài phần text gốc, khung và ảnh bài. Bài úp đối thủ không
được dựng mục trạng thái vì view không cho biết định nghĩa. Chuyển từ lá
đã biết sang lá úp xóa phần đọc cũ theo hành vi hiện có. Không mở rộng tay,
Deck hoặc định danh bài úp trong PlayerView. Dữ liệu catalog công khai vẫn
chỉ thêm ba nhãn trạng thái, không xuất handler, review hash hay raw events.

## Kiểm chứng

Một test HTTP mới kiểm toàn bộ pilot 20: 15 quái thường, 2 Phép, 2 FLIP,
1 Bẫy; metadata công khai khớp định nghĩa, Pot còn pending nhưng runtime
đã mở Phép. Snapshot vẫn not-started/not-run và registry không bị đổi.

Mở rộng ca expanded-catalog hiện có:

- Đọc đủ 109 lá, kiểm nhãn dữ liệu/văn bản/runtime: 95 verified, 14 pending.
- Mở/đóng thông tin ở Blue-Eyes, Pot, Trap Hole và Faith giữ nguyên view,
  lựa chọn và bản nháp deck. Đọc panel tay mình cũng có cùng thông tin.
- Không sửa card text, level, chỉ số hoặc lớp khung; giữ toàn bộ hồi quy
  triệu hồi hiến tế/chiến đấu có sẵn của ca catalog.
- Chụp/xem Faith tại 1440×1000 và 390×844: thông tin mở đọc được khi cuộn,
  panel/dialog không tràn ngang.

Các helper regression đọc Mộ, chi phí/mục tiêu, quyết định bắt buộc và
Chain kiểm đúng trạng thái cho lá đã biết, không có mục trạng thái với lá
úp. Mở/đóng mục trong quyết định giữ các ô đã chọn và không đổi view.
Không thêm browser invocation/step: giữ 47 bước và 37 browser report.

Ca catalog riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0.
Đang chạy bộ tổng hợp Linux; Windows CI chưa xác minh source mới.

Không đổi engine, catalog 109, facts/effect/review, artwork, starter hoặc deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
