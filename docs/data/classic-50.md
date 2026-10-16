# Catalog 50 lá — lô classic-10c

Mở rộng cộng thêm từ 40 lên 50 loại; giữ nguyên ba bundle cũ và các review hiệu ứng.
Lô mới có 10 Normal Monster, không thêm handler hiệu ứng. Đối chiếu nguồn ngày 2026-10-16.

| Lá | Passcode | Level / ATK / DEF | Bản in Bắc Mỹ | Ngày |
| --- | --- | --- | --- | --- |
| [Dissolverock](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4250&request_locale=en) | 40826495 | 3 / 900 / 1000 | LOB-031 | 2002-03-08 |
| [Fireyarou](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4297&request_locale=en) | 71407486 | 4 / 1300 / 1000 | LOB-085 | 2002-03-08 |
| [Kagemusha of the Blue Flame](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4220&request_locale=en) | 15401633 | 2 / 800 / 400 | LOB-028 | 2002-03-08 |
| [Monster Egg](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4153&request_locale=en) | 36121917 | 3 / 600 / 900 | LOB-017 | 2002-03-08 |
| [Mystical Sheep #2](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4288&request_locale=en) | 83464209 | 3 / 800 / 1000 | LOB-037 | 2002-03-08 |
| [Petit Dragon](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4206&request_locale=en) | 75356564 | 2 / 600 / 700 | LOB-024 | 2002-03-08 |
| [Sand Stone](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4523&request_locale=en) | 73051941 | 5 / 1300 / 1600 | LOB-109 | 2002-03-08 |
| [Succubus Knight](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4627&request_locale=en) | 55291359 | 5 / 1650 / 1300 | LOB-117 | 2002-03-08 |
| [Tri-Horned Dragon](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4711&request_locale=en) | 39111158 | 8 / 2850 / 2350 | LOB-000 | 2002-03-08 |
| [Two-Mouth Darkruler](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4224&request_locale=en) | 57305373 | 3 / 900 / 700 | LOB-030 | 2002-03-08 |

## Nguồn và trạng thái

Raw YGOPRODeck lưu bất biến theo SHA-256; receipt giữ URL và thời điểm lấy.
Evidence Konami lưu URL, hash HTML, chỉ số, mô tả hiện hành và dòng bản in gốc được đối chiếu riêng.
Cả 10 lá có bản in LOB Bắc Mỹ ngày 2002-03-08, thuộc pool đã review; không dùng ngày API làm bằng chứng duy nhất.
Tên/mô tả là current-reference, không khẳng định nguyên văn bản in 2005. Mô tả cả 10 khớp nguồn Konami.
Các câu mô tả như “hypnotizing enemies” của Mystical Sheep #2 không tạo ra hiệu ứng.
Các ID ứng viên trỏ sang Spell/Synchro bị loại trước khi nhập; không tự đổi tên/type của dữ liệu nguồn.
Không tải artwork; giao diện vẫn dùng placeholder.

Snapshot mới: imported 10, verifiedData 10, historicalReviewPending 0;
implemented/testedEffects/playable đều 0. Tổng snapshot: imported 50, verifiedData 45, historicalReviewPending 5.
Runtime riêng: 45 Normal Monster theo luật chung và 5 lá hiệu ứng đã review trong scope engine hiện có.
Không mở rộng general Chain, negate, SEGOC, Special/Fusion/Ritual hoặc rulings ngoài scope.

## Deck và kiểm thử

Cố định danh sách starter của mốc 40 trong `tools/starter-deck.ts`, giữ nguyên nội dung deck mặc định; thêm catalog không tự thay deck người chơi.
Kiểm tra reload deck lưu từ catalog 20/30/40 và giữ nguyên file, reimport lặp, lỗi checksum/raw và review conflict
cho từng lô mở rộng; cả bốn output hợp lệ được giữ nguyên khi lỗi. Deck Goat tối đa theo bản sao trong catalog này là 148 lá,
không đưa giới hạn 60 của luật hiện đại vào format.

30 quái của ba lô mở rộng được kiểm thử riêng: deck 40 lá chủ động chứa lá đang kiểm tra và hai quái hiến tế,
số hiến tế đúng/sai, triệu hồi, direct attack theo ATK Konami, invariant. Bao gồm Tri-Horned Dragon cấp 8 (hai hiến tế).
Browser mở preview đủ 30 lá mở rộng, hồi quy Gaia hiến tế hai lá và đánh Armored Lizard.
Trận browser expanded sử dụng deck kiểm thử 50 lá (mỗi loại một bản), hợp lệ Goat và chứa đủ bài mới;
không gọi đó là trận từ deck mặc định 40. Hồi quy pilot 20 dùng deck cũ và seed 08. Trận expanded dùng seed 05: đối chiếu headless trước cho thấy có quyết định FLIP. Seed 08 với deck 50 kết thúc mà không có decision nên không đáp ứng yêu cầu coverage của browser; giữ nguyên assertion thay vì bỏ qua.

## Kết quả

Linux: 321/321 test (22 file), typecheck/build/data check/startup và 21/21 bước validation đạt.
11 browser run bằng Chromium 154.0.8037.57, runtimeExceptions 0.
Trận expanded: 9 lượt, 181 lệnh, 8 attack, 2 decision; Fissure/Hane-Hane/Man-Eater Bug được dùng,
A thắng với LP 6400/0, không chỉnh state trong lúc chơi.
Hồi quy pilot 20: 16 lượt, 339 lệnh, 15 attack, 4 decision và đủ 5 effect; B thắng LP 0/4200.
Kiểm tra bổ sung từng phát hiện deck mặc định bị thay bởi thứ tự ID; đã sửa bằng starter cố định và test đạt.

Windows và Ubuntu CI đã đạt trên commit `c1c1d3897278eb50653d02d585e35a3b877504d8`, [run 38878802549](https://github.com/xuanthao260604-sys/idc/actions/runs/38878802549).
Đã tải và đọc artifact Windows: win32/x64, OS release 10.0.26100, Node 24.19.0, npm 11.17.0,
Microsoft Edge 154.0.4258.62; 321/321 test, 22 file, 21/21 bước và 11 browser report, runtimeExceptions 0.
Preview catalog 50/30 lá mở rộng và trận tự nhiên 9 lượt/181 lệnh/2 decision khớp kết quả Linux.
Artifacts chỉ là bằng chứng kiểm thử, được gitignore; không phải gói beta.
Windows 11 desktop chưa chạy.
Chưa đóng gói, phát hành hoặc bàn giao beta. Hoàn thành mục này sẽ dừng trước lô/tính năng tiếp theo.
