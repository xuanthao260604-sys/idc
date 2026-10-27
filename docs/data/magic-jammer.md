# Magic Jammer — nhập dữ liệu, chưa mở runtime — 27/10/2026

Chuẩn bị dữ liệu cho nhánh phản hồi/phủ nhận Phép tiếp theo. Thêm batch
magic-jammer riêng; tổng nhập tăng 110 → 111 loại trong 18 bundle, gồm
95 verified data và 16 historical pending. Runtime giữ 110 loại/15 hiệu ứng
qua 17 bundle đang hoạt động. Magic Jammer chưa có binding hoặc review
hiệu ứng, chưa được dùng trong deck đấu.

## Đối chiếu nguồn

Nguồn đã đọc ngày 27/10/2026:

- [YGOPRODeck](https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Magic%20Jammer&misc=yes):
  passcode 77414722, tên Magic Jammer, Trap Card/Counter, Konami CID 4862.
- [Konami CID 4862](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4862&request_locale=en):
  tên Magic Jammer, Counter Trap; Card Text khớp API:
  “When a Spell Card is activated: Discard 1 card; negate the activation,
  and if you do, destroy it.”
  Bảng in có MRD-128, 2002-06-26, METAL RAIDERS.
- [Goat cardpool](https://www.goatformat.com/cardpool.html): Legal Sets
  có nguyên cụm “Metal Raiders (MRD)”. Kết hợp bản in Konami trước cutoff
  17/8/2005; không dùng riêng API tcg_date hoặc nhãn GOAT để xác nhận hợp lệ.

API và Card Text Konami khớp nhau nên overlay không sửa text/type.
Fingerprint facts API:
4c52827717962e80be1c6952cc0df61d9940df652d23507c0010c078cc1186c3.
Giữ subtype=counter, không đổi thành Normal Trap để dùng handler hiện có.
Legality legal/maxCopies=3 do pipeline/restrictions Goat tháng 4/2005 áp
như các batch khác, không viết thêm danh sách giới hạn riêng.

Đây là current-reference; chưa xác nhận nguyên văn bản in năm 2002/2005.
HistoricalTextReview=pending, verification=pending, implementation=not-started,
testing=not-run, effects=[]; summary implemented/testedEffects/playable=0.
Các kiểm thử nhập không được gọi là đã kiểm thử hiệu ứng phủ nhận.

## Snapshot và bảo toàn

| Nguồn | Byte | SHA-256 |
| --- | ---: | --- |
| API JSON | 3847 | c6bf08c99d5ca853de81f2760f74d596fdeeb8aa7ea708b61646cd7340a1eefa |
| Konami HTML | 147299 | c845de6762ad7f9dce7f1f229a3af767c313b6a1d5e455f9ebc01be5a8220ab3 |
| Goat HTML | 108404 | 487b8b43e3810bebf0638f23b9c4abced26f0b796be2797ed7c427ee354ace1a |

Giữ đúng byte tải gốc trong data/raw; snapshot Goat đã tồn tại với cùng
hash nên tái sử dụng, không ghi lại. .gitattributes hiện có giữ raw bytes
qua Windows/Linux. Thêm manifest/receipt, evidence Konami 4862, overlay và
generated bundle riêng. Không sửa 17 bundle/review cũ, starter hoặc artwork.
Không tải ảnh minh họa; URL ảnh trong API không có nghĩa ảnh đã vào game.

CLI nhận batch magic-jammer; npm run cards:magic-jammer-import nhập offline,
cards:magic-jammer-fetch chỉ dùng khi chủ động làm mới nguồn. cards:check
kiểm đủ 18 bundle; tools/runtime-catalog-inputs.json và preflight vẫn có
17 bundle đang hoạt động, giữ capabilities như mốc trước.

## Kiểm chứng

Tám ca tools/magic-jammer-import.test.ts: đúng facts/Counter subtype/bản in,
hash và nội dung snapshot, text và trạng thái nhập; tổng dữ liệu 111 nhưng
runtime 110. Registry không nhận Magic Jammer, kể cả khi ghép dữ liệu mới
vào danh sách cũ cùng tất cả review đang có; deck chứa lá này bị từ chối.

Nhập lại hai lần offline và check cả 18 bundle giữ nguyên mọi file bằng
so sánh byte, gồm review/source và deck A/B hợp lệ. Năm lỗi checksum,
fingerprint review, facts chính thức, ngày sau cutoff và mã bản in chưa
được đối chiếu đều bị từ chối trước ghi; toàn bộ file/deck trong fixture
được giữ nguyên. Chỉ làm lỗi trên bản sao thư mục tạm.
Các ca nhập Ookazi cũng được cập nhật để kiểm đủ 18 bundle hiện hành.

Typecheck, import offline và tám ca riêng đã đạt Linux. Bộ tổng hợp Linux
và Windows CI sẽ được ghi sau khi đọc report thực tế.

## Điều kiện trước khi mở hiệu ứng

Cần review riêng về activation/cost, phủ nhận activation và cleanup, phản
hồi đúng liên kết Chain, điều kiện Set và quyền phản hồi Counter Trap.
Đối chiếu áp dụng lịch sử/Goat trước khi chọn scope runtime. Engine hiện
từ chối các cờ activationNegated/effectNegated và chỉ có handler Trap Hole;
chưa thể mở Magic Jammer chỉ bằng cách thêm vào catalog.
Sau đó mới triển khai engine/command/view/UI và kiểm thử timing, cost,
LIFO, phủ nhận, bảo toàn riêng tư và các lá đang hỗ trợ. Các điểm này là
việc cần làm tiếp, không phải chức năng đã hoàn tất trong mốc nhập dữ liệu.

Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
