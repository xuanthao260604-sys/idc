# Xem thành phần deck và lọc bài đang dùng

Màn xây deck có thêm bộ lọc Danh sách: Toàn bộ catalog / Có trong deck. Kết hợp
với tìm theo tên/nội dung và lọc Quái/Phép/Bẫy, không đổi thứ tự hoặc số bản sao
trong bản nháp. Mở lại màn xây deck đặt bộ lọc về toàn catalog; từng seat vẫn có
deck riêng. Catalog giữ 108 loại, không thêm lá hoặc thay hiệu ứng.

Thống kê hiển thị số bản sao Quái/Phép/Bẫy và số loại khác nhau của toàn bộ bản
nháp, độc lập với bộ lọc. Dòng Hiển thị cho biết số loại phù hợp với các bộ lọc.
Thêm/bớt bài, dùng deck mẫu và nhập file cập nhật thống kê theo bản nháp hiện tại.
Bớt bản sao cuối làm hàng biến mất khi đang lọc Có trong deck; chuyển Toàn bộ
catalog để thêm lại. Các giới hạn bản sao/kích thước, Lưu deck và lỗi giữ bản nháp
vẫn theo luồng cũ. Lọc hoặc xem preview không lưu deck và không sửa trận.

Thực hiện ở app.js/index.html; không thêm dependency hoặc API, không đổi store,
engine, nguồn bài, raw/generated/review, artwork hay deck đã lưu. Thống kê dùng
kind từ catalog hiện hành và đếm số bản sao; không suy luận từ mô tả hiệu ứng.

## Kiểm chứng

Browser --deck-overview chạy với catalog 108 qua listener loopback thật: kiểm tra
thống kê bản sao/số loại; giao giữa bộ lọc có-trong-deck/loại/tìm kiếm; trạng thái
không kết quả; bỏ bản sao cuối/thêm lại/thêm bản sao thứ hai; khôi phục deck mẫu;
preview; đóng không lưu giữ deck cũ; mở lại và đổi A/B reset bộ lọc; trận giữ nguyên.
Đổi seat chủ ý quay vòng private handle, so sánh trạng thái trận sau khi bỏ handle
và kiểm tra nguyên view trước handoff. Không thay state qua endpoint kiểm thử.

Đã chụp và xem Chromium ở 1440×1000 và 390×844, hộp thoại không tràn ngang.
Thêm ca browser này vào validate:platform; giữ ca deck-builder cũ cho nhập/xuất
file, lỗi mạng, lưu A/B và áp dụng deck ở trận mới. Không thêm unit test mô phỏng
DOM; kiểm chứng UI bằng trình duyệt thật.

Đang chạy bộ tổng hợp Linux và Windows CI; kết quả sẽ được ghi sau khi đọc report.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
