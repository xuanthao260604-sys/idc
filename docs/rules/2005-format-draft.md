# Hồ sơ thiết kế Goat Format Bắc Mỹ 17/8/2005

Format ID: goat-2005-08-17, revision 4. Hồ sơ thiết kế: ready, 23 quyết định được review.
Tên file giữ chữ draft để không phá đường dẫn tài liệu đã chia sẻ; nội dung hiện là kết quả Giai đoạn 2.
Ready không có nghĩa đã có game hoặc mọi tương tác đã được engine kiểm thử.

## Mục tiêu bản nhỏ

Single duel, 8000 LP, 5 lá đầu, bốc ở Draw đầu, 5 ô Monster và 5 ô Spell/Trap mỗi bên.
Lượt/phase, Normal/Tribute Summon, Set, đổi tư thế, battle, thắng thua và nhóm hiệu ứng nhỏ
sẽ được triển khai ở Giai đoạn 4 sau khi có dữ liệu nguồn ở Giai đoạn 3.

Mốc card pool 17/8/2005 Bắc Mỹ dùng list tháng 4/2005 theo quy ước Goat, đã được người dùng
cho phép điều chỉnh. Card pool không tự hợp lệ chỉ bằng ngày release; phải xét promo/khu vực,
text/ruling lịch sử và khả năng hỗ trợ engine từng lá.

Fusion/Ritual, Trap Monster/Union và các hiệu ứng nâng cao chưa thuộc pool pilot chơi được
trước khi schema/handler/test đã đủ. Schema có thể biểu diễn một subtype không có nghĩa game
đã hỗ trợ subtype đó. Không có Synchro/Xyz/Pendulum/Link, luật anime, AI hoặc custom editor trong pilot.

## Tài liệu nguồn và quyết định

- reviewed-decisions.md: tổng hợp 23 quyết định, tiêu chí và giới hạn độ tin cậy.
- findings-2005.md: nghiên cứu ban đầu về cutoff tháng 4/tháng 8.
- source-review.md: lịch sử truy cập và nguồn mới.
- archive-rulebook-v5.md: provenance và tính nhất quán bản lưu rulebook.
- battle-timing-spec.md: priority, Chain, timing, battle và Damage Step.
- field-spell-review.md: nguồn và cách tổng hợp Field Spell.
- ../architecture/003-duel-contract.md: hợp đồng trạng thái, command và player view.

Profile: packages/card-data/src/formats/goat-2005-08-17.ts.
Các handler chưa tồn tại; effect descriptors là dữ liệu tham chiếu cho engine tương lai.
Nếu nguồn mâu thuẫn mới, mở lại decision và tăng revision; không dùng status để bỏ qua kiểm thử luật.
