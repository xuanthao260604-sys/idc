# Đọc lá nguồn và mục tiêu trong Chain

Mỗi liên kết trong bảng Chain có nút Đọc lá nguồn và các nút Đọc mục tiêu.
Mở cửa sổ riêng ghi rõ số liên kết, vai trò, người chơi/vị trí; hiển thị tên,
khung, chỉ số và nguyên văn nội dung từ catalog cho bài được phép đọc.
Bài úp đối thủ chỉ có thông báo giữ kín danh tính, không có hình mặt trước.
Chủ bài vẫn đọc được bài úp của mình khi đổi góc nhìn như trước.

Cửa sổ chỉ đọc, không có nút kích hoạt/chọn target/Pass, không sửa lựa chọn
hoặc stateVersion. Quay lại Chain hoặc Escape đóng và xóa nội dung/vị trí đã
xem. Render mới hoặc chuyển máy đóng/xóa cửa sổ để không giữ preview của góc
nhìn trước. Close event cũ không xóa một preview mới vừa mở ngay sau đó.

Nút đọc dùng visibleCard và PlayerView hiện tại; không lấy định nghĩa bài úp từ
nguồn khác. Không đổi API/protocol/engine, scope Chain, catalog 108, dữ liệu/
review/artwork, starter hoặc deck đã lưu. Không mở general mixed Chain/negate.

## Kiểm chứng

Mở rộng ca --chain-view bằng Chromium thật: đọc Trap Hole tại link 2, Battle Ox
là target và Pot of Greed ở Chain sau; đúng text catalog, không nút thao tác;
đóng/Escape xóa preview, mở liên tiếp giữ nội dung mới; toàn PlayerView trước/sau
đọc giống nhau. Giữ ca hai Trap, thứ tự 2→1, một Phép không target và dọn Chain.

Ca Tribute to The Doomed đọc target úp: A chỉ thấy Bài úp, không tên Man-Eater
Bug hoặc card-preview; B đọc đúng tên/text lá của mình; đổi lại A tiếp tục che.
Đã chụp và xem hộp thoại Chromium ở 1440×1000 và 390×844, không tràn ngang,
chiều cao nằm trong viewport và cuộn được khi nội dung dài.

Các ca riêng đã đạt, runtimeExceptions=0. Đang xác nhận bộ tổng hợp Linux và
Windows CI; kết quả sẽ ghi sau khi đọc report.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
