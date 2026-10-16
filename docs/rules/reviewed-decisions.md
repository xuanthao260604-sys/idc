# Review luật Goat — kết quả Giai đoạn 2

Ngày: 2026-10-15. Profile revision 4: goat-2005-08-17.
Hồ sơ thiết kế có đủ **23/23 quyết định được review**, trạng thái ready.
Ready ở đây chỉ là sẵn sàng làm đầu vào thiết kế/nhập dữ liệu; chưa có engine hoặc game để chơi.

## Ý nghĩa của verified

Verified là quyết định đã đối chiếu với nguồn ghi kèm và được chọn làm quy ước dự án.
Nguồn có nhãn community/official-current/archive riêng, không được trình bày toàn bộ thành
ruling chính thức gốc năm 2005. Schema chỉ kiểm tra cấu trúc và yêu cầu bằng chứng, không tự
chứng minh nguồn hoặc logic đúng. Các suy luận tổng hợp được ghi riêng, nhất là Field Spell.
Nếu có bằng chứng mâu thuẫn mới: chuyển decision sang disputed, tăng revision và mở lại review;
không sửa âm thầm luật của trận đang chạy hoặc làm mất phiên bản bài cũ.

## Các nhóm quyết định

| Nhóm | Quyết định đã ghi | Nguồn chính |
|---|---|---|
| Định dạng | Bắc Mỹ; cutoff 17/8/2005; list tháng 4/2005 | Goat cardpool |
| Text | Ruling/text lịch sử và quy ước Goat; không tự dùng errata hiện tại | Goat basics, individual rulings |
| Bắt đầu | 8000 LP; phát 5 lá; người đi trước vẫn bốc ở Draw đầu | v5 archive, Goat basics |
| Bộ bài | Main >=40, không có max theo luật; Fusion không max; Side 0 hoặc 15; giới hạn bản sao tổng hợp | v5 archive, Goat basics, rulebook hiện tại cho baseline |
| Sân | 5 ô monster, 5 ô spell/trap mỗi bên, Field riêng, Fusion Deck, trap monster có thể chiếm 2 slot | v5 archive, Goat basics |
| Lượt/triệu hồi | 6 phase; Battle đầu bị cấm; Main2 chỉ sau Battle; quota Normal/Set chung; tribute theo level | Rulebook baseline + ngoại lệ Goat |
| Tư thế | Đổi tay tối đa 1 lần/lượt theo hạn chế; ngoại lệ khi summon bởi đối thủ | Rulebook baseline + Goat #14 |
| Battle | ATK/ATK, ATK/DEF, direct, 0 ATK tie; replay là declaration mới | Rulebook baseline + Goat #5/#15 |
| Damage Step | Sáu timing, giới hạn Chain/các nhóm effect được dùng | Goat #10 |
| Thắng/thua | LP, failed required draw, effect có hỗ trợ, draw đồng thời; single duel | v5 archive + baseline |
| Priority/Chain | Trigger trước ignition; response window; LIFO; không chen Chain giữa resolution | Goat basics/priority, official timing/baseline |
| Trigger | SEGOC theo thời điểm và nhóm; optional when xét event cuối theo ruling | Goat #9/#12, Peten FAQ |
| Cost/target/negate | Tách cost, target, activation/effect negation, không refund; ngoại lệ LP/draw/search | Baseline + Goat #8/#16 |
| Continuous/equip | Theo dependency, expiry và instance; ngoại lệ Continuous Trap/Union/monster equip | Baseline + Goat #6/#13/#18 |
| Field | Phân biệt thay Field của mình với Field đối thủ; phá bởi game mechanic | v5 archive + Goat #3 + thảo luận đương thời; xem field-spell-review.md |
| End Phase | Hand limit 6, phản hồi sau discard, kiểm tra lại công việc bắt buộc | Baseline + Goat #19 |
| Phạm vi | Fusion/Ritual là cơ chế lịch sử; pilot chưa hỗ trợ, cần schema/handler/test trước khi đưa bài vào chơi | v5/current book + quyết định phạm vi dự án |

## Banlist tham chiếu

Artifact: packages/card-data/src/formats/restrictions-2005-04.ts.
17 Forbidden, 41 Limited, 15 Semi-Limited theo ba section tại:
https://www.goatformat.com/cardpool.html

Tên tham chiếu chưa map sang passcode/ID chính thức. Đây không phải nhập card pool.
Không nằm trong list không đồng nghĩa hợp lệ hoặc được phép chơi 3 bản.
Ví dụ theo list: Monster Reborn 0; Pot of Greed 1; Nobleman of Crossout 2.
Giai đoạn 3 cần xét release/promo, tên/ID, text/ruling và ghi nguồn từng lá.

## Xác thực đã thực hiện

- Đối chiếu 72 đoạn trích của profile với text nguồn đã tải; không có đoạn trích lệch sau chuẩn hóa khoảng trắng.
- Bản PDF v5.0 ở Internet Archive và mirror cộng đồng có byte giống nhau, SHA-1 khớp metadata archive.
  Điều này kiểm tra tính nhất quán bản tải, không xác thực danh tính nhà phát hành hay mọi nội dung PDF.
- TypeScript, Vitest và build đã chạy; xem README cho lệnh. Kiểm thử chỉ bao phủ schema/gate/list.
- Checklist battle/online trong tài liệu là kiểm thử tương lai, chưa chạy.

## Điều kiện Giai đoạn 2

Đã có phạm vi luật bản đầu, schema bài/hiệu ứng, nguồn và trạng thái riêng, list tham chiếu,
profile luật có provenance, hợp đồng state/command/view và checklist để triển khai.
Chưa có card pool chơi được; chưa có engine/online; chưa xác minh từng lá.
Bước tiếp theo theo kế hoạch là Giai đoạn 3 — pipeline nhập dữ liệu nhóm nhỏ.
