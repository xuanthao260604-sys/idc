# Thiết lập trận mới

> Bổ sung 25/10/2026: [bảo vệ tạo trận mới khi mất phản hồi](new-game-recovery.md) đã đạt Linux và Windows CI. Giao diện hiện gửi guard trận/phiên bản/ghế và có kiểm tra chỉ đọc; API legacy vẫn tương thích. Các số kiểm thử bên dưới là lịch sử. Windows 11 desktop chưa chạy.

Nút Trận mới mở hộp xác nhận, cho chọn A, B hoặc ngẫu nhiên đi trước.
Mặc định trong hộp là ngẫu nhiên. Hủy hoặc Escape giữ nguyên trận hiện tại.
Khi đang gửi yêu cầu, các nút bị khóa để tránh gửi trùng.
Lỗi được hiển thị trong hộp; giao diện chỉ nhận trận mới khi server trả thành công.

Server kiểm tra lựa chọn và tạo trận mới trước khi thay trận hiện tại.
Thiết lập sai hoặc các trường ngoài hợp đồng bị từ chối, không thay đổi trận cũ.
API cũ gửi `{}` vẫn chọn A để giữ tương thích; không cho đặt seed, LP hoặc deck từ client.
Ngẫu nhiên dùng cơ chế tạo trận của engine trên server, không do trình duyệt tự chọn.

Hai người bắt đầu 8000 LP; người đi trước có 6 lá, người còn lại 5 lá theo
Goat first-turn draw. Lượt đầu không được Battle Phase. Deck mặc định và dữ liệu
20 lá giữ nguyên. Tạo trận mới xóa tiến trình trận trước trong bộ nhớ; chưa có lưu trận.

## Kiểm chứng

- 9 kiểm thử HTTP beta, gồm chọn A/B, ngẫu nhiên, lỗi giữ nguyên trận và yêu cầu có seat.
- `npm run beta:browser-setup`: Chromium thao tác bằng chuột, hủy giữ nguyên view,
  chọn B/A/ngẫu nhiên, kiểm tra tay 6/5 từ cả hai góc nhìn, LP và sân trống.
- Kiểm tra một lần ngẫu nhiên chỉ xác nhận kết quả hợp lệ, không chứng minh phân phối.
- Đã chạy Chromium trên Linux. Có bước CI Windows riêng; chưa có kết quả chạy Windows
  và chưa xác nhận Windows 11 thực tế. Người dùng chưa cần nhận beta hoặc tự kiểm thử.
