# Catalog 70 lá — lô classic-10e

Mở rộng từ 60 lên 70 loại bằng 10 Normal Monster; không thêm effect handler.
Năm bundle cũ, review và starter 40 lá được giữ nguyên. Nguồn truy cập ngày 22/10/2026.

| Lá | Passcode | Level / ATK / DEF | Bản in Bắc Mỹ | Ngày |
| --- | --- | --- | --- | --- |
| [Armaill](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4178&request_locale=en) | 53153481 | 3 / 700 / 1300 | LOB-079 | 2002-03-08 |
| [Armored Zombie](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4102&request_locale=en) | 20277860 | 3 / 1500 / 0 | MRD-013 | 2002-06-26 |
| [Doma The Angel of Silence](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4117&request_locale=en) | 16972957 | 5 / 1600 / 1400 | SDY-015 | 2002-03-29 |
| [Great White](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4066&request_locale=en) | 13429800 | 4 / 1600 / 800 | SDY-011 | 2002-03-29 |
| [Gyakutenno Megami](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4096&request_locale=en) | 31122090 | 6 / 1800 / 2000 | SDK-011 | 2002-03-29 |
| [King of Yamimakai](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4091&request_locale=en) | 69455834 | 5 / 2000 / 1530 | MRD-074 | 2002-06-26 |
| [Leogun](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4409&request_locale=en) | 10538007 | 5 / 1750 / 1550 | MRD-033 | 2002-06-26 |
| [Mystic Clown](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4287&request_locale=en) | 47060154 | 4 / 1500 / 1000 | SDK-018 | 2002-03-29 |
| [Rude Kaiser](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4388&request_locale=en) | 26378150 | 5 / 1800 / 1600 | SDK-027 | 2002-03-29 |
| [Spirit of the Harp](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4176&request_locale=en) | 80770678 | 4 / 800 / 2000 | LOB-078 | 2002-03-08 |

## Nguồn và phạm vi

Lấy raw API cho đúng 10 ID đã xác minh, lưu snapshot theo SHA-256 và receipt URL/thời điểm.
Mỗi lá được đối chiếu Konami độc lập: tên, chỉ số, chủng tộc, thuộc tính, loại Normal, mô tả và bản in Bắc Mỹ.
Evidence giữ hash HTML; bản in thuộc LOB/SDK/SDY/MRD đã review và trước cutoff 17/8/2005.
Tên/mô tả là current-reference, không khẳng định nguyên văn bản in 2005.
Cả 10 mô tả khớp API/Konami. “Nothing can stop” của Mystic Clown không cấp miễn nhiễm;
Gyakutenno Megami không có hiệu ứng bảo vệ chỉ vì câu flavor nói về việc bảo vệ kẻ yếu.

Snapshot mới: imported=10, verifiedData=10, historicalReviewPending=0; implemented/testedEffects/playable vẫn 0.
Tổng snapshot: imported 70, verifiedData 65, historicalReviewPending 5.
Capability runtime riêng: 65 quái thường theo luật chung, 5 lá hiệu ứng qua review và kiểm thử trong scope cũ.
Không mở rộng general Chain/negate/SEGOC/Special/Fusion/Ritual hoặc mọi card ruling.
Giữ khung người dùng và mặt sau chung; ảnh minh họa riêng từng lá vẫn là placeholder.

## Bảo toàn và kiểm thử

Batch riêng `classic-10e`; cards:check kiểm tra cả sáu snapshot offline.
Giữ nguyên 60 định nghĩa cũ và review; reimport lặp không đổi file, lỗi raw/checksum/review giữ nguyên cả sáu output.
Reload deck lưu từ catalog 20/30/40/50/60 không sửa file; ca 60 có đủ 10 lá của lô classic-10d.
Starter vẫn là 40 lá cũ. Main Deck 208 lá theo giới hạn bản sao trong catalog này hợp lệ Goat,
không áp giới hạn 60 lá của luật hiện đại.

50 quái của năm lô mở rộng được kiểm thử triệu hồi, số hiến tế đúng/sai và direct attack theo ATK nguồn.
10 ca phòng thủ mới dùng Skull Servant ATK 300 đánh từng lá mới đang úp phòng thủ:
đi qua Main 1 → Battle bằng action thật, lật ngửa khi chiến đấu, phản sát thương đúng DEF,
không piercing và kiểm tra quái bị phá khi DEF thấp hơn ATK.
King of Yamimakai DEF 1530 khiến A còn 6770 LP; Armored Zombie DEF 0 bị phá, không gây sát thương cho B.
Các ca kiểm thử không sửa luật engine; state fixture chỉ được chuẩn bị trước chuỗi action.

Browser expanded dùng deck thử 70 lá (mỗi loại một bản), không đổi starter/deck đã lưu.
Seed hex 13 được chọn sau headless kiểm tra có Spell/Trap/FLIP và kết thúc life-points;
pilot 20 giữ seed 08. Kiểm tra đủ 70 preview: khung, sao theo level, tên/mô tả và ATK/DEF.

## Kết quả

Linux: 357/357 test, 23 file; 21/21 bước validation; 11 browser run bằng Chromium 154.0.8037.57, runtimeExceptions 0.
Expanded preview xác nhận đủ 70 mặt trước có sao/chỉ số theo dữ liệu. Đã xem screenshot DEF 0 và DEF 1530
ở desktop/màn hình hẹp; không sửa ảnh khung gốc.
Trận expanded: 18 lượt, 365 lệnh, 14 attack, 3 decision; Fissure/Hane-Hane/Man-Eater Bug/Trap Hole được dùng;
B thắng LP 0/6800. Pilot 20 giữ 16 lượt/339 lệnh, đủ 5 effect, LP 0/4200.
Windows và Ubuntu CI đã đạt trên commit `9a3fadfd11136f8219a4e9d0cb19eaf4de2b745d`, [run 39742428389](https://github.com/xuanthao260604-sys/idc/actions/runs/39742428389).
Đã tải và đọc artifact Windows: win32/x64, OS release 10.0.26100, Node 24.19.0, npm 11.17.0;
Edge 154.0.4258.62, 357/357 test, 23 file, 21/21 bước, 11 browser report, runtimeExceptions 0.
Expanded xác nhận 70 preview có sao theo dữ liệu; trận tự nhiên trùng Linux: 18 lượt/365 lệnh/3 decision, LP 0/6800.
Artifact chỉ là bằng chứng kiểm thử, được Git bỏ qua; không phải gói beta.
Windows 11 desktop chưa chạy. Chưa đóng gói/bàn giao beta.
