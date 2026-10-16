# ADR 002 — Chọn mốc Goat Format Bắc Mỹ 17/8/2005

Trạng thái: đã chọn mục tiêu dự án; chưa xác nhận triển khai luật hoàn chỉnh.

Người dùng cho phép điều chỉnh mốc thời gian sang lựa chọn phù hợp hơn.
Chọn cutoff card pool premier event Bắc Mỹ 17/8/2005 theo quy ước GoatFormat.com,
kết hợp Forbidden/Limited TCG tháng 4/2005. Không thay đổi timeline phát triển ở quyết định này.

Lý do: có tài liệu cộng đồng chuyên về luật/tương tác cổ điển, giúp đối chiếu và kiểm thử;
vẫn giữ phong cách TCG cổ điển, không thêm cơ chế Synchro/Xyz/Pendulum/Link.
Nguồn đã đọc: https://www.goatformat.com/cardpool.html, ngày 2026-10-15.
Xem docs/rules/findings-2005.md cho trích dẫn và giới hạn độ tin cậy.

## Hệ quả

- Đổi format ID dự thảo thành goat-2005-08-17; chưa có dữ liệu/deck lưu cần migrate.
- Ngày cutoff không tự hợp thức hóa mọi lá có release date trước cutoff: cần xét khu vực,
  promo, điều kiện premier event, danh sách giới hạn và quy ước riêng của format.
- Các lá từ tháng 5 đến tháng 8 chỉ được xem xét sau xác minh từng lá; chưa nhập trong ADR này.
- Text hiện tại không mặc định là text/ruling 2005. Ruling hồi tố của cộng đồng cần ghi nguồn.
- Chỉ có 80–100 lá được chọn cho bản đầu, không cam kết toàn bộ card pool Goat.
- Fusion/Ritual cần schema và engine thích hợp trước khi hỗ trợ, dù chúng thuộc thời kỳ này.
- Khi chọn mục tiêu, tất cả decision còn pending. Revision 2 từng có 5/23 decision; revision 4 đã review 23 quyết định thiết kế, dùng thêm bản lưu v5.0 (docs/rules/reviewed-decisions.md). Status ready chỉ áp dụng hồ sơ thiết kế, chưa có engine.
- Yêu cầu bài tự tạo vẫn là phần mở rộng sau, không đổi phạm vi giai đoạn hiện tại.

Tên file docs/rules/2005-format-draft.md giữ nguyên vì không gắn tháng cụ thể.
Không còn profile tháng 4 song song; nội dung nghiên cứu trước giữ lại để truy vết quyết định.
