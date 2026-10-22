# Phép thường thay đổi LP — Hinotama và Dian Keto

Mục này thêm hai hiệu ứng cố định vào scope Normal Spell một link:
`inflict-damage` cho đối thủ và `gain-life-points` cho controller. Catalog runtime tăng từ 100 lên 102,
gồm 95 quái thường và 7 lá hiệu ứng được hỗ trợ. Không sửa 100 định nghĩa hoặc review cũ.

| Lá | Passcode / CID | Text hiện hành đối chiếu Konami | Bản in Bắc Mỹ |
| --- | --- | --- | --- |
| [Hinotama](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4350&request_locale=en) | 46130346 / 4350 | Inflict 500 damage to your opponent. | LOB-056, 2002-03-08 |
| [Dian Keto the Cure Master](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4348&request_locale=en) | 84257639 / 4348 | Increase your Life Points by 1000 points. | SDY-023, 2002-03-29 |

## Nguồn và phạm vi review

Đọc API/Konami ngày 22/10/2026; raw theo SHA-256, evidence Konami có hash HTML và dòng in gốc.
Bản in có trước cutoff Goat; không dùng ngày API làm bằng chứng duy nhất.
Đã tải lại rulebook v5 English từ [archive](https://archive.org/download/rulebook_v05/rulebook_v05.pdf):
681725 byte, SHA-256 d02c016334f65c98a9fe900ae0b2630a3de63f63e330426ab07c55d9466dc61a,
khớp mốc rà soát trước. Đây là archive, không mô tả là bản được Konami ký số.
Rulebook ghi bắt đầu với 8000 LP và LP về 0 thì thua. Quy tắc hồi được áp bằng cộng 1000 theo card text;
8000 là mức khởi đầu, không bị dùng làm trần hồi LP. Đây là tổng hợp ngữ nghĩa, không gán một câu “no cap” cho PDF.
Cách viết “destroyed” về Normal Spell trong v5 là giản lược; engine vẫn cleanup xuống Mộ, không phát sự kiện phá quái.

Hai overlay nhập vẫn historicalTextReview=pending: current-reference không được đổi thành nguyên văn bản in 2005.
Snapshot mới imported=2, verifiedData=0, historicalReviewPending=2, implemented/testedEffects/playable=0.
Tổng snapshot imported=102, verifiedData=95, historicalReviewPending=7.
Runtime dùng review riêng `life-point-spells.effects.json`, pin hash toàn bộ parsed definition và format revision 4,
scope mới `normal-spell-life-points-single-link-v1`. Đổi text/revision/legality, scope sai hoặc override chính thức đều bị từ chối.

## Hành vi hỗ trợ

- Chính người chơi đang có lượt, Main 1/Main 2 mở và đúng priority; từ tay cần ô Phép/Bẫy trống,
  hoặc kích hoạt bài đã Set của mình. Normal Spell có thể Set rồi kích hoạt ngay trong cùng lượt.
- Không cost, không target hay lựa chọn người nhận từ client; lượng LP lấy từ review server.
- Giữ nguyên LP khi activation và sau một pass; chỉ đổi khi hai người đã pass để resolve link.
- Hinotama trừ 500 LP của đối thủ, sàn 0; LP 0 kết thúc ngay với winner là controller, reason life-points.
  Damage fact vẫn là 500 khi overkill; LP không âm. Cleanup link hoàn tất trong cùng command;
  không có link hay hành động khác được chơi sau kết thúc.
- Dian Keto cộng 1000 cho controller; có thể từ 8000 lên 9000, không tự tác động đối thủ hoặc bốc bài.
- Phép xuống Mộ sau xử lý; Chain rỗng, mở lại cửa sổ hành động nếu trận còn tiếp tục.
- PublicResolution thêm effect-damage/life-points-gained, chỉ playerId/amount; UI và history phân biệt với battle damage.

Không mở general mixed Chain/negate, LP replacement/prevention/redirection, Bad Reaction to Simochi,
Des Wombat, trigger do damage/heal hay các lá khác tương tác LP. Chúng không nằm trong pool hỗ trợ.
Đây không phải cam kết xử lý đúng mọi tương tác Yu-Gi-Oh!. Không diễn giải mô tả bài thành code.

## Bảo toàn và kiểm thử

Batch riêng `lp-spells`; cards:check kiểm tra cả chín snapshot offline. Reimport lỗi giữ nguyên mọi output/review.
Deck từ catalog 100 vẫn tải được nguyên byte; starter vẫn 40 lá cũ. Hai Phép mới thêm qua xây deck.
Tổng giới hạn bản sao cho catalog cho phép Main Deck 304 lá theo Goat, không áp trần 60 hiện đại.

Test kiểm tra hai controller, từ tay/Set cùng lượt, thời điểm hai pass, không cần quái hoặc deck còn bài,
LP trên 8000, sát thương không lethal/đúng 500/overkill/1 LP, kết thúc và cleanup, từ chối sai phase/actor/mixed link/client amount,
review drift, tham số không hợp lệ và projection không lộ event riêng tư.
Browser có hai mode normal/lethal: hồi từ Set lên 9000, Hinotama làm đối thủ còn 7500;
fixture đối thủ 400 LP bị kết thúc về 0. Không chỉnh state sau setup. Thông báo và activity đúng loại hiệu ứng.
Bộ validate tăng từ 21 lên 23 bước, từ 11 lên 13 browser run. Preview kiểm tra cả 102 lá.

## Kết quả

Linux: 456/456 test (24 file), 23/23 bước validation và 13 browser report, runtimeExceptions 0.
Hai fixture LP đạt 9000/7500 và lethal 8000/0. Trận expanded tự nhiên với 102 loại:
11 lượt/220 lệnh/10 attack/1 decision, dùng Dian Keto/Hinotama/Hane-Hane, A thắng LP 6100/0;
không chỉnh state khi chơi. Hồi quy pilot 20 vẫn 16 lượt/339 lệnh và đủ 5 hiệu ứng cũ.
Windows và Ubuntu CI đã đạt trên commit eb5e7af21d3e8a5c3f808eafadc1f997173188a3: [run 39750638222](https://github.com/xuanthao260604-sys/idc/actions/runs/39750638222).
Windows x64 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 154.0.4258.62: 456/456 test, 23/23 bước và 13 browser run, không có runtime exception.
Hai ca LP xác nhận [9000,7500] sau hồi/gây sát thương và [8000,0] khi sát thương kết thúc trận; trận tự nhiên 102 lá đạt 11 lượt/220 lệnh, dùng cả hai lá mới, LP cuối [6100,0].
Windows 11 desktop chưa chạy; ảnh minh họa vẫn placeholder; chưa đóng gói hoặc bàn giao beta.
