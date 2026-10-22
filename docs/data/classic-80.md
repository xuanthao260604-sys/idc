# Catalog 80 lá — lô classic-10f

Mở rộng từ 70 lên 80 loại bằng 10 Normal Monster; đạt ngưỡng dưới của mục tiêu dữ liệu 80–100 lá.
Đây là mốc catalog trong scope hiện có, không phải hoàn tất game hay mọi luật Yu-Gi-Oh!.
Sáu bundle cũ, review và starter 40 lá được giữ nguyên. Nguồn truy cập ngày 22/10/2026.

| Lá | Passcode | Level / ATK / DEF | Bản in Bắc Mỹ | Ngày |
| --- | --- | --- | --- | --- |
| [Ancient Brain](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4181&request_locale=en) | 42431843 | 3 / 1000 / 700 | MRD-082 | 2002-06-26 |
| [Ancient Lizard Warrior](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4636&request_locale=en) | 43230671 | 4 / 1400 / 1100 | MRD-050 | 2002-06-26 |
| [Armored Starfish](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4621&request_locale=en) | 17535588 | 4 / 850 / 1400 | LOB-116 | 2002-03-08 |
| [Baron of the Fiend Sword](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4882&request_locale=en) | 86325596 | 4 / 1550 / 800 | SDY-036 | 2002-03-29 |
| [Blue-Winged Crown](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4642&request_locale=en) | 41396436 | 4 / 1600 / 1200 | MRD-122 | 2002-06-26 |
| [Bottom Dweller](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4445&request_locale=en) | 81386177 | 5 / 1650 / 1700 | MRD-039 | 2002-06-26 |
| [Dark Titan of Terror](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4239&request_locale=en) | 89494469 | 4 / 1300 / 1100 | SDK-014 | 2002-03-29 |
| [Destroyer Golem](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4460&request_locale=en) | 73481154 | 4 / 1500 / 1000 | SDK-028 | 2002-03-29 |
| [Giga-Tech Wolf](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4418&request_locale=en) | 08471389 | 4 / 1200 / 1400 | MRD-096 | 2002-06-26 |
| [Hibikime](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4655&request_locale=en) | 64501875 | 4 / 1450 / 1000 | MRD-055 | 2002-06-26 |

## Nguồn và phạm vi

Raw YGOPRODeck cho đúng 10 ID đã xác minh được lưu theo SHA-256, receipt giữ URL/thời điểm.
Đối chiếu Konami từng lá: tên, chỉ số, chủng tộc, thuộc tính, loại Normal, mô tả và dòng bản in Bắc Mỹ.
Evidence giữ hash HTML. Bản in thuộc LOB/SDK/SDY/MRD đã review và trước cutoff 17/8/2005.
Mô tả hiện hành khớp API/Konami; không khẳng định nguyên văn bản in 2005.
Giga-Tech Wolf giữ passcode chuỗi `08471389`, không mất số 0 đầu.

Các câu mô tả chỉ là flavor: Giga-Tech Wolf không tự có xuyên thủ, Ancient Brain không có tăng sức mạnh trong bóng tối,
Hibikime không tạo hiệu ứng làm rối loạn quái. Không thêm handler mới.
Snapshot mới imported=10, verifiedData=10, historicalReviewPending=0; implemented/testedEffects/playable vẫn 0.
Tổng snapshot: imported 80, verifiedData 75, historicalReviewPending 5.
Capability runtime riêng: 75 quái thường theo luật chung và 5 lá hiệu ứng qua review/test trong scope cũ.
Không mở rộng general Chain/negate/SEGOC/Special/Fusion/Ritual hoặc mọi card ruling.
Khung người dùng và mặt sau chung giữ nguyên; ảnh minh họa từng lá vẫn là placeholder.

## Bảo toàn và kiểm thử

Batch `classic-10f` riêng; cards:check kiểm tra cả bảy snapshot offline.
Giữ nguyên 70 định nghĩa cũ và review; reimport lặp không đổi file; lỗi checksum/raw/review giữ cả bảy output.
Reload deck từ catalog 20/30/40/50/60/70 không sửa file; ca 70 chứa đủ 10 lá classic-10e.
Starter vẫn là 40 lá cũ. Main Deck 238 lá theo giới hạn bản sao trong catalog này hợp lệ Goat,
không áp trần 60 của luật hiện đại.

60 quái của sáu lô mở rộng được kiểm thử triệu hồi, số hiến tế đúng/sai và direct attack theo ATK nguồn.
Armored Starfish ATK 850 gây đúng 850 damage, không làm tròn.
20 ca phòng thủ của classic-10e/f dùng ATK 300 đánh quái úp, đi qua Main 1 → Battle bằng action thật:
phản damage theo DEF, lật quái, giữ/phá quái đúng và không piercing. Giữ hồi quy DEF 0/1530 của lô trước.
Bộ test phòng thủ đổi tên thành classic-normal-defense.test.ts và giữ nguyên các ca cũ.

Browser expanded đối chiếu đủ 80 preview: khung, sao theo level, tên/mô tả và ATK/DEF.
Screenshot đặt tên theo passcode để các lá cùng level không ghi đè ảnh của nhau.
Deck browser thử gồm 80 lá, mỗi loại một bản; không đổi starter/deck người chơi.
Seed expanded hex 03 được chọn sau headless có Spell/Trap/FLIP và kết thúc life-points; pilot 20 giữ seed 08.

## Kết quả

380/380 test (23 file) đã đạt trên Linux. Validation và Windows CI đang được hoàn tất.
Windows 11 desktop chưa chạy. Chưa đóng gói/bàn giao beta.
