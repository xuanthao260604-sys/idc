# Kết quả đọc nguồn ban đầu

Ngày truy cập: 2026-10-15. Đây là ghi nhận nghiên cứu, chưa phải profile luật ready.
Không có dữ liệu lá bài nào được nhập vào card pool trong bước này.

## 1. Banlist và cutoff phát hành là hai thông số riêng

Nguồn cộng đồng: https://www.goatformat.com/cardpool.html (HTTP 200).

Trích: “the cardpool for Goat Format is understood to reflect all cards that would
have been legal for premier event play on August 17, 2005.”

Trích: “all incarnations of Goat Format use the April 2005 Forbidden/Limited List for the TCG.”

Hệ quả: tên gọi April 2005 banlist không chứng minh cutoff phát hành cũng là tháng 4.
Ban đầu giữ mục tiêu tháng 4. Sau khi người dùng cho phép cập nhật, dự án chọn Goat
Bắc Mỹ 17/8/2005 và banlist tháng 4/2005 (ADR 002). Chưa nhập card pool; các quyết định
đã review hồ sơ luật ở revision 4; dữ liệu từng lá vẫn phải xác minh (reviewed-decisions.md).

## 2. Các khác biệt luật đã được nguồn cộng đồng mô tả

Nguồn: https://www.goatformat.com/basics.html (HTTP 200).
Những điểm sau chỉ được xác nhận là nội dung nguồn cộng đồng đã đọc; chưa coi là
bằng chứng chính thức đương thời hoặc quyết định luật dự án đã chốt.

| Chủ đề | Trích ngắn | Ý nghĩa cần xem xét cho thiết kế |
|---|---|---|
| Lượt đầu | “the player who goes first will draw a card at the start of their first draw phase” | Phải tách opening hand và lượt Draw đầu, không khởi tạo 6 lá để bỏ qua Draw Phase |
| Kích thước bộ bài | “Unlimited Fusion Deck and Main Deck” | Không mặc định áp giới hạn 60/15 hiện đại vào luật 2005; nếu có giới hạn kỹ thuật cần ghi riêng |
| Side Deck | “not allowed to use Side Decks with more than 0 but less than 15 cards” | Cần đối chiếu chính sách lịch sử; bản đầu chưa có match/side decking |
| Field Spell | “It is not possible for both players to control a face-up active Field Spell card.” | Không áp cơ chế hai Field Spell hiện đại |
| Priority | “or a monster's Ignition Effect” | Cần thiết kế cửa sổ priority cổ điển, vẫn phải phân biệt Trigger |
| Trap monster | “both” a Monster Zone and a Spell/Trap Zone | Một instance có thể chiếm hai zone; không ép mọi instance chỉ có một slot khi mở rộng |

Các phần còn lại về replay, trigger giữa Chain, End Phase và LP cost cần review sâu
và đối chiếu theo từng tình huống trước khi chuyển decision sang verified.
Không triển khai logic từ đoạn trích rút gọn.

## 3. Độ tin cậy và phạm vi nguồn

- https://www.goatformat.com/rules.html: chính trang cộng đồng mô tả mục tiêu tái hiện
  cách Head Judge xử lý ở premier event April 2005 format; không phải tài liệu Konami năm 2005.
- https://www.goatformat.com/rulingnotices.html: có notice phát hành năm 2021;
  phải tách diễn giải hiện nay khỏi tài liệu lịch sử gốc.
- https://www.yugioh-card.com/en/rulebook/: trang chính thức hiện tại, liên kết
  SD_RuleBook_EN_10.pdf; chưa đọc PDF trong lượt này, không dùng để khẳng định luật 2005.
- https://www.yugioh-card.com/en/limited/: liên kết danh sách 2026-09-21 khi truy cập;
  không phải nguồn chứng minh danh sách tháng 4/2005.

## Công việc nghiên cứu tiếp theo

1. Giai đoạn 3: đối chiếu tính hợp lệ bài/promo theo mục tiêu Goat Bắc Mỹ 17/8/2005 đã chọn.
2. Tìm bản lưu tài liệu/banlist/rulebook đương thời có xuất xứ rõ.
3. Đối chiếu priority, Damage Step, deck size và Field Spell theo các nguồn đó.
4. Lưu quyết định kèm evidence; chỉ cập nhật profile sau review.
