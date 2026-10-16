# Field Spell — quy ước thiết kế đã chọn

Ngày review: 2026-10-15. Đây là đặc tả cho engine tương lai, chưa phải hành vi đã kiểm thử.

## Quy tắc mục tiêu

- Mỗi người có một Field Zone riêng; toàn bàn chỉ có một Field Spell **đang hoạt động**.
  Bài face-down vẫn có thể tồn tại ở Field Zone của người còn lại.
- Set Field Spell không phá Field của đối thủ và không tự kích hoạt Field đang Set.
- Khi Field mới của đối thủ resolve thành công, vẫn face-up, Field đang hoạt động cũ
  bị phá hủy bởi game mechanic. Nếu Field mới bị phá hoặc activation bị negate trước đó,
  Field cũ của đối thủ vẫn tồn tại.
- Khi đặt Field mới vào chính Field Zone đang có bài của mình, bài cũ được phá hủy bởi
  game mechanic để thay ô. Áp dụng khi activate/Set và khi bài cũ face-up/face-down.
  Việc thay ô không tạo Chain Link; activation Field mới vẫn tạo Chain.
- Bài cũ của mình đã bị thay không được khôi phục nếu activation mới sau đó bị negate.
- Không đánh đồng phá hủy bởi mechanic với phá hủy bởi card effect. Trigger của từng lá
  vẫn phải được review: chữ “destroyed” và “destroyed by a card effect” khác nhau.

## Bằng chứng và phần tổng hợp

1. Rulebook English v5.0, trang in 17, bản lưu:
   https://archive.org/download/rulebook_v05/rulebook_v05.pdf
   Trích: “When a new Field Spell Card is activated, the previous active Field Spell Card
   is destroyed and sent to the Graveyard.” Đây là câu giản lược, chưa tách rõ own/opponent.
2. Goat Rule #3: https://www.goatformat.com/basics.html
   Trích: “If the activation of a Field Spell resolves while the opponent controls a
   face-up Field Spell, the previous Field Spell is destroyed.” Ví dụ MST phá Field mới
   xác nhận Field cũ của đối thủ còn tồn tại nếu Field mới không resolve được.
3. Thảo luận tháng 1/2005, post #11/#16:
   https://www.cogonline.net/threads/field-spell-card-game-mechanic-questions.38119/
   Trích lời được gán cho UDEbot: “If you control a Field Spell Card, you can activate or Set
   a new Field Spell, and destroy your own old one.” Trích dẫn nói đây là sửa lỗi của rulebook v4.
   Link trực tiếp của UDEbot hiện 404; chưa xác thực độc lập bản tin gốc hoặc danh tính tác giả.
   Nguồn được gắn community, không historical-official. Các ý kiến riêng mâu thuẫn trong
   thread không được coi là ruling đã chốt.

Mốc phá bài cũ khi thay ô của chính mình là cách dự án tổng hợp câu “activate or Set”
và ràng buộc một Field Zone từ các nguồn trên, không phải nguyên văn một câu rulebook.
Quyết định đã được ghi nhận với mức độ tin cậy này; nếu tìm thấy ruling UDE gốc trái với
cách tổng hợp, mở lại decision và tăng revision trước khi dùng lá có tương tác liên quan.
Không dùng quy tắc Field hiện đại gửi Mộ mà không phá hủy.

## Các ca cần kiểm thử ở Giai đoạn 4 — CHƯA CHẠY

1. A có Field face-up, B Set Field: Field A còn hiệu lực.
2. B activate Field, resolve thành công: Field A bị phá, Field B hoạt động.
3. A phá Field B bằng MST trong Chain: Field A không bị phá vì thay Field.
4. Negate activation Field B: Field A không bị phá vì thay Field.
5. A Set Field mới lên Field của mình: bài cũ bị phá, Field mới vẫn úp.
6. A activate Field mới rồi bị negate: bài cũ của A không quay lại.
7. Hai Field úp của hai bên có thể cùng tồn tại, không có Field active.
8. Phân biệt destroyed-by-mechanic và destroyed-by-effect cho Trigger.
