# Xem Mộ và đọc lá bài

> Cập nhật: đã có [tìm và lọc bài trong Mộ](graveyard-filters.md), giữ vị trí gốc và kiểm chứng trên Windows CI. Các kết quả bên dưới ghi mốc viewer ban đầu.

Cửa sổ Xem Mộ riêng cho từng người chơi, không dùng chung form gửi hành động.
Danh sách đi từ trên xuống: lá mới vào Mộ nằm đầu danh sách. Chọn lá để đọc tên,
loại/chỉ số và nguyên văn text nguồn ngay trong cửa sổ. Mộ trống có thông báo riêng.
Danh sách cuộn ngang, nội dung dài xuống dòng; đóng bằng nút Đóng hoặc Escape.

Trước đây bấm lá trong Mộ chỉ cập nhật panel sau modal, khiến nội dung bị che.
Nay preview nằm trong modal và không thay lựa chọn bài trên sân/tay trước đó.
Không có nút kích hoạt/triệu hồi từ Mộ: đây là chức năng chỉ đọc thông tin công khai
trong PlayerView, không gửi command, không tăng version hoặc thay history.
Không thêm dữ liệu, artwork hoặc hiệu ứng; text giữ nguyên nguồn, không tự dịch/bịa.

Kiểm thử browser effect đã bổ sung: Mộ đối thủ trống; đọc Pot; sau Fissure kiểm tra
thứ tự Fissure/Pot ở Mộ mình, đọc Mystical Elf ở Mộ đối thủ, so khớp text catalog
và toàn bộ view trước/sau. Luồng 5 hiệu ứng vẫn chạy trong cùng lần kiểm tra.
Kiểm thử này trên Chromium/Linux; chưa xác nhận Windows 11 thực tế.
