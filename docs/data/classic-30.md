# Mở rộng catalog 20 → 30 lá

Trạng thái: đã nhập lô classic-10 riêng và nối vào game; kết quả kiểm chứng cuối mục ở cuối tài liệu.
25 quái thường và 5 lá hiệu ứng trong các scope cũ. Không bổ sung handler hiệu ứng hoặc artwork.

## Mười lá mới đã đối chiếu

| Lá bài | Passcode | Cấp | ATK/DEF | Bản in Konami | Ngày |
| --- | --- | --- | --- | --- | --- |
| [Gaia The Fierce Knight](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4044&request_locale=en) | `06368038` | 7 | 2300/2100 | LOB-006 | 2002-03-08 |
| [Armored Lizard](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4057&request_locale=en) | `15480588` | 4 | 1500/1200 | MRD-005 | 2002-06-26 |
| [Battle Steer](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4020&request_locale=en) | `18246479` | 5 | 1800/1300 | MRD-064 | 2002-06-26 |
| [Curse of Dragon](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4045&request_locale=en) | `28279543` | 5 | 2000/1500 | LOB-066 | 2002-03-08 |
| [Judge Man](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4039&request_locale=en) | `30113682` | 6 | 2200/1500 | SDK-007 | 2002-03-29 |
| [Skull Servant](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4030&request_locale=en) | `32274490` | 1 | 300/200 | LOB-004 | 2002-03-08 |
| [Dragon Zombie](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4103&request_locale=en) | `66672569` | 3 | 1600/0 | SDY-014 | 2002-03-29 |
| [Crawling Dragon](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4100&request_locale=en) | `67494157` | 5 | 1600/1400 | MRD-012 | 2002-06-26 |
| [Koumori Dragon](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4037&request_locale=en) | `67724379` | 4 | 1500/1200 | SDK-006 | 2002-03-29 |
| [Red-Eyes Black Dragon](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4088&request_locale=en) | `74677422` | 7 | 2400/2000 | LOB-070 | 2002-03-08 |

Nguồn YGOPRODeck cung cấp batch JSON thật; Konami đối chiếu độc lập tên, loại, thuộc tính,
chủng tộc, cấp, ATK/DEF, văn bản hiện tại và hàng bản in. Evidence lưu URL/ngày đọc/hash HTML.
LOB/SDK/SDY/MRD dựa trên review cardpool đã có, mỗi lá vẫn kiểm tra riêng code/date.
Tất cả hàng bản in được chọn trước cutoff Bắc Mỹ 17/8/2005; không lấy misc_info.tcg_date làm luật.

Gaia có ngày API 2004-03-01 nhưng hàng LOB-006 Konami là 2002-03-08; dùng hàng Konami.
Gaia và Red-Eyes có dấu nháy bọc thừa trong API, sửa bằng patch overlay theo text Konami.
Text/name là current-reference; không khẳng định đó là nguyên văn/tên in năm 2005.
Các tình huống tên/archetype ngoài pool hiện tại chưa được triển khai.

## Ranh giới nhập và runtime

- Pilot 20 giữ nguyên manifest/receipt/generated/overlays và 5 review hiệu ứng. Không refresh lại
  nguồn 20 lá hoặc đổi fingerprint để làm registry qua.
- Classic-10 có manifest, receipt, raw content-addressed, 10 evidence, overlay và bundle riêng.
  Bundle chỉ được tạo bởi importer, không sửa tay.
- runtime-catalog.ts kiểm tra format/ID/passcode/tên trùng rồi hợp nhất hai bundle; conflict thì
  dừng, không dùng quy tắc bản mới ghi đè bản cũ. Năm review hiệu ứng gốc vẫn kiểm tra hash toàn định nghĩa.
- Import snapshot tổng 30: 25 verified data, 5 historical printed-text pending, implementation/testing
  vẫn là metadata lần nhập (0). Runtime registry hỗ trợ 30 definitions trong scope.
- 10 lá mới là normal monster có text mô tả, đã kiểm thử triệu hồi/hiến tế và chiến đấu từng lá.
  Không gọi đây là 10 hiệu ứng mới hoặc đã hoàn tất mọi tương tác Yu-Gi-Oh!.

## Dùng và kiểm tra

```sh
npm run cards:classic-import
npm run cards:check
npm run engine:capabilities
npm run beta:browser-expanded
npm run beta:browser-expanded-duel
```

cards:import/fetch mặc định vẫn chọn pilot để bảo toàn workflow cũ. cards:classic-fetch là refresh
có chủ đích cho lô mới; không cần mạng để import/check. cards:check kiểm tra cả hai batch.
Khởi động lại beta để nạp catalog 30. Trận đang chạy không bị hot-reload hay ghi đè bởi importer.
Deck A/B đã lưu với 20 lá vẫn nạp được vì toàn bộ ID/format/definition cũ giữ nguyên; không migrate file.
Deck mẫu mới 40 lá chứa cả 30 loại; người chơi vẫn dùng deck đã lưu nếu đã có.

## Kiểm thử bổ sung

- 7 test hợp nhất/bảo toàn 20 definitions, conflict, deck cũ còn nguyên, deck 88 lá hợp lệ
  theo Goat (không áp max 60), import hai lần và lỗi review/raw không ghi đè cả hai bundle.
- 10 test gameplay dùng nguồn thật, kiểm tra tribute 0/1/2, từ chối sai tribute nguyên trạng,
  triệu hồi đúng và sát thương tấn công trực tiếp theo ATK đã đối chiếu Konami.
- Browser expanded: thấy 30 lá, đọc text của đủ 10 lá mới, Gaia tribute hai quái,
  tấn công Armored Lizard gây 800 damage. Fixture chỉ dựng trước server.
- Browser expanded-duel: deck 40 có 30 loại, bắt đầu chia bài thực, seed nội bộ cố định,
  chỉ thao tác UI đến kết thúc; không sửa state lúc đấu. Linux: 11 lượt/221 lệnh,
  A thắng LP 6500/0, 10 attack, 2 decision, dùng Fissure/Man-Eater Bug.
- Baseline effect/full-duel pilot 20 giữ riêng để tiếp tục kiểm chứng đủ 5 hiệu ứng và
  so sánh trận 16 lượt/339 lệnh; không nói trận mở rộng đã dùng mọi lá/effect.
- CLI startup xác nhận catalog thực của ứng dụng có 30 lá, lưu deck và reload qua restart.

Windows CI cho mốc mở rộng được đối chiếu riêng sau khi chạy, không lấy kết quả của mục xây deck.

Bộ tổng hợp Linux đã đạt 295/295 test (22 file), 21/21 bước và 11 browser run,
bao gồm cả baseline 20 lẫn catalog 30. Chưa gộp kết quả Linux thành bằng chứng Windows.
