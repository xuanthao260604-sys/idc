# Nhật ký tìm nguồn luật — 2026-10-15

## Trạng thái mới nhất: đã truy cập được

Sau khi người dùng cập nhật môi trường, kiểm tra lại xác nhận:
- Trang rulebook và limited chính thức: HTTP 200.
- GoatFormat rules, cardpool, basics, how2play, rulingnotices: HTTP 200.
- /banlist.html: HTTP 404, không phải lỗi proxy. Danh sách nằm trên /cardpool.html.
- Cấu hình được đọc lại báo network policy unrestricted. Không yêu cầu mở thêm tên miền.

Các lỗi 403 và yêu cầu cấu hình bên dưới là lịch sử, không còn là blocker hiện tại.
Xem findings-2005.md cho bằng chứng đã đọc và giới hạn áp dụng.

## Kết quả thực tế

Các HTTPS GET dưới đây dùng TLS/proxy hiện có. Cả 5 yêu cầu đều lỗi:
`Tunnel connection failed: 403 Forbidden`. Chưa đọc được nội dung trang.
Không có trích dẫn nào được xác minh từ các URL này trong lần nghiên cứu này.

| URL đã thử | Vai trò dự kiến | Trạng thái |
|---|---|---|
| https://www.yugioh-card.com/en/rulebook/ | Trang rulebook chính thức; phải phân biệt bản hiện tại/lịch sử | Proxy chặn |
| https://www.yugioh-card.com/en/limited/ | Trang giới hạn chính thức; không tự coi là list 2005 | Proxy chặn |
| https://www.goatformat.com/rules.html | Nguồn cộng đồng về luật cổ điển, cần đối chiếu | Proxy chặn |
| https://www.goatformat.com/cardpool.html | Đánh giá định nghĩa card pool cộng đồng | Proxy chặn |
| https://www.goatformat.com/banlist.html | Đánh giá danh sách giới hạn cộng đồng | Proxy chặn |

URL được thử không đồng nghĩa trang tồn tại hoặc nội dung phù hợp: proxy từ chối trước khi đọc trang.
Không tự đồng nhất “TCG tháng 4/2005” với mọi quy ước giải Goat Format hiện nay.

## Cấu hình mạng

Đã đọc cấu hình hiện tại: restricted, preset package_managers, custom domains rỗng.
Đã lưu bản nháp thêm đúng www.yugioh-card.com và www.goatformat.com, giữ nguyên preset.
Lưu draft không áp dụng runtime. Người dùng cần lưu thay đổi trong Environment settings;
nếu UI yêu cầu thì Publish. Sau khi thay đổi có hiệu lực, thử lại các GET trước khi trích dẫn.
Nếu nguồn lịch sử nằm ở host lưu trữ khác, chỉ bổ sung host cụ thể khi có bằng chứng cần dùng.

## Quy trình khi truy cập được

1. Xác định ngày/khu vực áp dụng từ bằng chứng; không suy diễn từ ngày tháng trên URL.
2. Lưu URL, ngày truy cập, loại nguồn, đoạn trích và lý do áp dụng cho 2005.
3. Đối chiếu nguồn đương thời với tài liệu cộng đồng. Ghi rõ quyết định dự án khi chọn quy ước hồi tố.
4. Chuyển từng decision sang verified sau review; có mâu thuẫn dùng disputed.
5. Chỉ ready khi đủ tất cả hạng mục. Schema không tự chứng minh nguồn đúng: vẫn cần review thủ công.

## Điều kiện kết thúc Giai đoạn 2

- Khóa territory/cutoff/restriction list và chính sách text/errata có nguồn.
- Review đủ các mục trong ruleKeys ở packages/card-data/src/format.ts.
- Hoàn chỉnh contract trạng thái/command theo các luật đã xác minh trước khi viết engine.
- Test schema/build đạt; không có quyết định luật bắt buộc còn pending/disputed.

Lượt review tiếp theo đã hoàn tất hồ sơ thiết kế Giai đoạn 2; xem reviewed-decisions.md và archive-rulebook-v5.md. Chưa nhập card pool/chưa triển khai engine.

## Nguồn bổ sung sau lượt review đầu

Đã tìm/tải bản lưu rulebook v5.0 từ Internet Archive và mirror cộng đồng; nội dung byte khớp.
Đã đọc thảo luận Field Spell tháng 1/2005 có trích lời được gán cho UDEbot. Link trực tiếp
https://cogonline.net/threads/4106 hiện 404; không coi trích lời trong thread là đã xác thực bản tin gốc.
Yugipedia 403, Fandom 402, Pojo 403; đây là phản hồi các website, không chứng minh môi trường lại bị chặn mạng.
Các URL PDF cũ đoán theo tên trả 404; tra cứu CDX timeout. Các kết quả thất bại không dùng làm evidence.
Tìm kiếm chỉ để tìm URL; bằng chứng được lấy từ trang/PDF đã tải và đọc, không lấy search snippet làm nguồn.
