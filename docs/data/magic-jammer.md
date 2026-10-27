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

Linux đạt 905/905 test trong 39 file, 54/54 bước validation và 44 browser
report bằng Chromium 154.0.8037.57, runtimeExceptions=0. Đã đọc report tại
artifacts/platform-validation/2026-10-27T09-29-31-026Z-276583/report.json,
kiểm tra từng bước browser có đúng một report khớp host/version/lỗi runtime.
Log test ghi đủ tám ca nhập Magic Jammer; log data-and-build ghi 18 bundle,
111 lá/95 verified/16 historical pending. Snapshot nhập vẫn chưa có hiệu ứng.

Toàn capabilities JSON giống mốc runtime trước: 110 supported/15 reviewed
effects/11 scope/17 snapshot đang hoạt động; không có Magic Jammer.
Hai trận tự nhiên giữ kết quả pilot 16 lượt/339 lệnh, B thắng LP 0/4200;
expanded 16 lượt/348 lệnh, B thắng LP 0/3450. Không chỉnh state khi chơi.

Windows và Ubuntu CI đã đạt trên source commit
8600676814b8c27f27d5807973146dbdd05992b1,
[run 40481382302](https://github.com/xuanthao260604-sys/idc/actions/runs/40481382302).
Đã tải/đọc artifact windows-validation-40481382302-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62. Windows đạt 905/905 test (39 file), 54/54 bước,
44 browser report, runtimeExceptions=0; từng bước browser đúng một report
khớp host/version. Đã kiểm tra tám ca nhập Magic Jammer, log 18 bundle/
111 lá/95 verified/16 historical pending. Toàn capabilities JSON giống
Linux và mốc trước; runtime 110/15, không có Magic Jammer. Hai trận tự nhiên
có kết quả giống Linux. Report ghi windows11DesktopVerified=false tại
artifacts/ci-magic-jammer-import/2026-10-27T09-31-32-765Z-6980/report.json.
Không thêm browser mode hoặc kiểm thử hiệu ứng phủ nhận ở mốc này.

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
