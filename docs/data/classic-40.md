# Catalog 40 lá — lô classic-10b

Mở rộng cộng thêm từ 30 lên 40 loại; giữ nguyên byte của hai bundle cũ và hồ sơ review hiệu ứng.
Lô mới có 10 Normal Monster, không thêm handler hiệu ứng. Nguồn được truy cập ngày 2026-10-16.

| Lá | Passcode | Level / ATK / DEF | Bản in Bắc Mỹ | Ngày |
| --- | --- | --- | --- | --- |
| [7 Colored Fish](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4446&request_locale=en) | 23771716 | 4 / 1800 / 800 | MRD-098 | 2002-06-26 |
| [Ansatsu](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4133&request_locale=en) | 48365709 | 5 / 1700 / 1200 | SDY-016 | 2002-03-29 |
| [Basic Insect](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4056&request_locale=en) | 89091579 | 2 / 500 / 700 | LOB-008 | 2002-03-08 |
| [Dark King of the Abyss](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4175&request_locale=en) | 53375573 | 3 / 1200 / 800 | LOB-020 | 2002-03-08 |
| [Masaki the Legendary Swordsman](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4299&request_locale=en) | 44287299 | 4 / 1100 / 1100 | LOB-038 | 2002-03-08 |
| [Mystic Horseman](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4097&request_locale=en) | 68516705 | 4 / 1300 / 1550 | SDK-012 | 2002-03-29 |
| [Neo the Magic Swordsman](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4881&request_locale=en) | 50930991 | 4 / 1700 / 1000 | SDY-035 | 2002-03-29 |
| [Rogue Doll](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4050&request_locale=en) | 91939608 | 4 / 1600 / 1000 | SDK-008 | 2002-03-29 |
| [Swordstalker](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4384&request_locale=en) | 50005633 | 6 / 2000 / 1600 | SDK-025 | 2002-03-29 |
| [Uraby](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4086&request_locale=en) | 01784619 | 4 / 1500 / 800 | LOB-069 | 2002-03-08 |

## Nguồn và trạng thái

Raw YGOPRODeck lưu bất biến theo SHA-256 trong `data/raw/ygoprodeck`; receipt lưu URL và thời điểm lấy.
Mỗi evidence Konami lưu URL, hash HTML, chỉ số, mô tả hiện hành và dòng bản in gốc được đối chiếu riêng.
Không dùng ngày API làm bằng chứng duy nhất về eligibility. Không tải ảnh bài; giao diện vẫn dùng placeholder.
Tên/mô tả là current-reference, không khẳng định nguyên văn bản in năm 2005.

Cả 10 mô tả khớp Konami và chỉ là flavor text. Ví dụ Rogue Doll không được tăng sức mạnh khi đánh thuộc tính DARK.
Một số ứng viên bị loại trước nhập vì sai danh tính hoặc thiếu bản in trong LOB/SDK/SDY/MRD đã duyệt.

Snapshot mới: imported 10, verifiedData 10, historicalReviewPending 0; implemented/testedEffects/playable đều 0.
Tổng snapshot: imported 40, verifiedData 35, historicalReviewPending 5. Những số này không thay thế capability runtime.
Runtime: 35 Normal Monster dùng luật chung và 5 lá hiệu ứng đã review trong scope giới hạn của engine.
Không mở rộng general Chain, SEGOC, negate, Special/Fusion/Ritual hoặc luật ngoài scope cũ.

## Bảo toàn và kiểm thử

Importer nhận batch riêng `classic-10b`; `cards:check` kiểm tra cả ba bundle offline.
Kiểm thử giữ nguyên 30 định nghĩa cũ, review handler, reimport lặp, checksum/raw lỗi, review conflict,
và reload deck đã lưu từ catalog 20/30 mà không sửa file. Main Deck 118 lá hợp lệ theo giới hạn bản sao Goat.
20 quái của hai lô mở rộng được kiểm thử riêng: số hiến tế đúng/sai, triệu hồi, direct attack theo ATK Konami và invariant.
Browser kiểm tra preview đủ 20 lá mở rộng; hồi quy Gaia hiến tế hai lá/đánh Armored Lizard vẫn giữ.

Linux: 21/21 bước, 11 browser run, không runtime exception. Bộ aggregate ban đầu chạy 305 test; sau bổ sung ba ca bảo toàn/migration, bộ test riêng đạt 308/308.
Trận tự nhiên catalog 40: 9 lượt, 170 lệnh, 8 attack, 1 decision, chỉ Hane-Hane được dùng; B thắng với LP 0/8000. Không chỉnh state trong lúc chơi. Hồi quy pilot 20 vẫn đạt 16 lượt/339 lệnh và đủ 5 hiệu ứng.
Windows và Ubuntu CI đã đạt trên commit `d902d0a80f252891cf60105651bfd96e9aa1b3d4`, [run 38877923439](https://github.com/xuanthao260604-sys/idc/actions/runs/38877923439).
Artifact Windows đã tải và đối chiếu: win32/x64, OS release 10.0.26100, Node 24.19.0, npm 11.17.0,
Microsoft Edge 154.0.4258.62; 308/308 test, 22 test file, 21/21 bước và 11 browser report, runtimeExceptions 0.
Hai trận tự nhiên và các số liệu trên trùng Linux. Các ca reimport chạy offline trên snapshot đã lưu.
Artifacts chỉ là bằng chứng kiểm thử, được gitignore; không phải gói beta.
Windows 11 desktop chưa chạy; chưa đóng gói/bàn giao beta.
