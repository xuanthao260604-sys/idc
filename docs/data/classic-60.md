# Catalog 60 lá — lô classic-10d

Mở rộng từ 50 lên 60 loại bằng 10 Normal Monster, không thêm effect handler.
Bốn bundle cũ, review và deck mặc định 40 lá được giữ nguyên. Truy cập nguồn ngày 22/10/2026.

| Lá | Passcode | Level / ATK / DEF | Bản in Bắc Mỹ | Ngày |
| --- | --- | --- | --- | --- |
| [Ancient Elf](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4439&request_locale=en) | 93221206 | 4 / 1450 / 1200 | SDY-024 | 2002-03-29 |
| [Aqua Madoor](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4219&request_locale=en) | 85639257 | 4 / 1200 / 2000 | LOB-027 | 2002-03-08 |
| [Baby Dragon](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4010&request_locale=en) | 88819587 | 3 / 1200 / 700 | MRD-061 | 2002-06-26 |
| [Blackland Fire Dragon](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4016&request_locale=en) | 87564352 | 4 / 1500 / 800 | MRD-062 | 2002-06-26 |
| [Flame Cerebrus](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4535&request_locale=en) | 60862676 | 6 / 2100 / 1800 | MRD-111 | 2002-06-26 |
| [Garnecia Elefantis](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4787&request_locale=en) | 49888191 | 7 / 2400 / 2000 | MRD-125 | 2002-06-26 |
| [Launcher Spider](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4396&request_locale=en) | 87322377 | 7 / 2200 / 2500 | MRD-095 | 2002-06-26 |
| [Ryu-Kishin Powered](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4383&request_locale=en) | 24611934 | 4 / 1600 / 1200 | SDK-024 | 2002-03-29 |
| [Skull Red Bird](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4472&request_locale=en) | 10202894 | 4 / 1550 / 1200 | LOB-105 | 2002-03-08 |
| [Winged Dragon, Guardian of the Fortress #1](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4013&request_locale=en) | 87796900 | 4 / 1400 / 1200 | SDY-003 | 2002-03-29 |

## Nguồn và trạng thái

Raw YGOPRODeck của đúng 10 ID được lưu theo SHA-256, receipt giữ URL/thời điểm lấy;
không nhập từ tên hay ID phỏng đoán. Danh sách ứng viên lấy từ API, sau đó đối chiếu từng lá với Konami.
Evidence lưu URL, hash HTML, chỉ số, mô tả hiện hành và dòng bản in gốc.
Tên/mô tả khớp nguồn hiện hành; không khẳng định nguyên văn bản in 2005.
Các bản in LOB/SDK/SDY/MRD đều có trước cutoff 17/8/2005, dựa trên dòng in Konami và bộ đã duyệt.

Cả 10 là quái thường, mô tả chỉ là flavor text: “random fire” của Launcher Spider không tạo hiệu ứng ngẫu nhiên,
“poor eyesight” của Blackland Fire Dragon không tạo hạn chế tấn công. Flame Cerebrus giữ đúng tên nguồn.
Snapshot mới imported=10, verifiedData=10, historicalReviewPending=0; implementation/testing/playable vẫn 0.
Tổng snapshot: imported 60, verifiedData 55, historicalReviewPending 5.
Runtime riêng: 55 Normal Monster theo luật chung và 5 lá hiệu ứng đã review trong scope cũ.
Không mở rộng general Chain/negate/SEGOC/Special/Fusion/Ritual hoặc mọi card ruling.

## Bảo toàn và kiểm thử

Batch `classic-10d` riêng; cards:check xác minh cả năm snapshot offline.
Kiểm thử giữ nguyên 50 định nghĩa cũ, review hiệu ứng, reimport lặp và bảo toàn cả năm output khi checksum/review lỗi.
Reload deck từ catalog 20/30/40/50 không sửa file; ca 50 có 10 lá từ classic-10c để kiểm tra bài ngoài starter.
Starter 40 lá vẫn được cố định; tổng giới hạn bản sao trong catalog này cho phép Main Deck 178 lá theo Goat,
không áp giới hạn 60 của luật hiện đại.

40 quái của bốn lô mở rộng được kiểm thử triệu hồi với số hiến tế đúng/sai và direct attack theo ATK Konami,
bao gồm Flame Cerebrus (một hiến tế), Launcher Spider/Garnecia Elefantis (hai hiến tế).
Browser kiểm tra đủ 60 preview: khung, sao theo level, tên, mô tả và ATK/DEF.
Deck browser expanded gồm 60 lá (mỗi loại một bản), không đổi deck mặc định/đã lưu.
Seed expanded 02 được chọn sau headless kiểm tra có các tương tác effect/decision; pilot 20 giữ seed 08.
Ảnh minh họa vẫn là placeholder; dùng bộ khung người dùng và mặt sau chung. Không tải artwork từng lá.

## Kết quả

Linux: 334/334 test (22 file), 21/21 bước validation, 11 browser run bằng Chromium 154.0.8037.57, runtimeExceptions 0.
Expanded preview: reviewedCardPreviews=60, dataDrivenLevels=true. Đã xem ảnh chụp Launcher Spider và tên dài Winged Dragon
ở desktop/màn hình hẹp; nguồn ảnh khung không bị sửa.
Trận expanded: 9 lượt, 182 lệnh, 8 attack, 1 decision; Man-Eater Bug/Pot of Greed/Trap Hole được dùng;
B thắng với LP 0/8000. Pilot 20 giữ 16 lượt/339 lệnh, đủ 5 hiệu ứng, LP 0/4200.
Windows và Ubuntu CI đã đạt trên commit `d7d1a74ed14ad5735105a367ebec86c24d96572f`, [run 39740451524](https://github.com/xuanthao260604-sys/idc/actions/runs/39740451524).
Đã tải và đọc artifact Windows: win32/x64, OS release 10.0.26100, Node 24.19.0, npm 11.17.0;
Edge 155.0.4283.62, 334/334 test, 21/21 bước, 11 browser report, runtimeExceptions 0.
60 preview có số sao theo dữ liệu; trận expanded có cùng 9 lượt/182 lệnh/1 decision và LP 0/8000 như Linux.
Ubuntu CI cũng đạt 334 test; bước npm ci mất khoảng 5 phút nhưng hoàn tất thành công, không sửa lockfile hoặc dependency.
Artifact chỉ là bằng chứng kiểm thử, được Git bỏ qua; không phải gói beta.
Windows 11 desktop chưa chạy. Chưa đóng gói/bàn giao beta.
