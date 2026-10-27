# Ookazi — nhập dữ liệu, chưa mở runtime — 26/10/2026

Cập nhật 27/10: [runtime Ookazi được triển khai riêng](../engine/ookazi.md).
Nội dung và kết quả bên dưới lưu mốc nhập dữ liệu 26/10, trước khi mở runtime.

Thêm batch riêng ookazi, một lá mới. Tổng dữ liệu đã nhập: 110 định nghĩa
trong 17 bundle, gồm 95 verified data và 15 pending đối chiếu văn bản lịch
sử. Runtime vẫn 109 loại/14 hiệu ứng từ 16 bundle đang hoạt động; Ookazi
chưa có trong tools/runtime-catalog-inputs.json, chưa dùng được trong deck
đấu, chưa có review hiệu ứng hoặc kiểm thử hiệu ứng runtime.

## Đối chiếu nguồn

Đọc nguồn ngày 26/10/2026:

- [YGOPRODeck v7](https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Ookazi&misc=yes):
  passcode 19523799, tên Ookazi, Spell Card/Normal, Konami CID 4352.
  Văn bản API: “Inflict 800 damage to your opponent.”
- [Konami CID 4352](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4352&request_locale=en):
  tên Ookazi, Normal Spell; Card Text:
  “Inflict 800 points of damage to your opponent's Life Points.”
  Bảng in có SDK-023, 2002-03-29, STARTER DECK KAIBA.
- [Goat cardpool](https://www.goatformat.com/cardpool.html) có nguyên cụm
  “Yugi and Kaiba Starter Decks (SDY/SDK)” trong Legal Sets. Dùng SDK-023
  từ bảng Konami, trước cutoff 17/8/2005; không dùng riêng API tcg_date
  hoặc nhãn format GOAT làm bằng chứng hợp lệ.

Hai nguồn có cách viết khác nhau. Snapshot API được giữ nguyên; overlay
pin fingerprint của facts API rồi chép đúng Card Text Konami. Bundle giữ
cả upstreamText và referenceText. Đây là current-reference, chưa khẳng
định văn bản in nguyên gốc năm 2002/2005. HistoricalTextReview vẫn pending;
verification=pending, implementation=not-started, testing=not-run, effects=[].
Snapshot summary implemented/testedEffects/playable đều 0. Các kiểm thử
nhập dữ liệu không được tính là đã kiểm thử hiệu ứng Ookazi.

Legality do pipeline áp profile Goat/restrictions tháng 4/2005 hiện có:
legal, maxCopies=3. Không viết lại danh sách cấm/giới hạn hoặc suy ra luật
hiệu ứng mới. Chưa tạo handler/binding hoặc diễn giải text thành code.

## Snapshot và bảo toàn

Các snapshot giữ nguyên byte đã tải, tên theo SHA-256; đã so sánh với file
download gốc. Raw HTML được lưu để xem lại chính dòng text/bản in, không
chỉ giữ hash của một trang có thể thay đổi:

| Nguồn | Byte | SHA-256 |
| --- | ---: | --- |
| API JSON | 1553 | 64f09716dfd58a62d347b6af253b615b26581252aed61b0f0ed8d5c7e6d618ca |
| Konami HTML | 131716 | f197145576d527bc20b289c136d6bc9d2c7325aabb2dfe75252bb94a8336fec1 |
| Goat cardpool HTML | 108404 | 487b8b43e3810bebf0638f23b9c4abced26f0b796be2797ed7c427ee354ace1a |

File nằm trong data/raw/ygoprodeck, data/raw/konami và data/raw/goatformat;
.gitattributes hiện có giữ raw bytes qua Windows/Linux. Thêm manifest,
receipt, evidence Konami 4352, overlay và generated bundle riêng. Không
sửa 16 bundle/review cũ, starter, deck A/B hoặc artwork. Chưa tải ảnh bài;
URL hình trong dữ liệu API không có nghĩa artwork đã được đưa vào game.

CLI nhận batch ookazi; npm run cards:ookazi-import nhập offline,
npm run cards:ookazi-fetch chỉ dùng khi chủ động làm mới nguồn. cards:check
kiểm đủ 17 bundle offline. Preflight và engine:capabilities vẫn kiểm kê
16 bundle cấp cho runtime; không nâng trạng thái Ookazi chỉ vì đã nhập.

## Kiểm chứng

Bảy test mới trong tools/ookazi-import.test.ts: đúng facts, bản in và hash
nguồn; hai phiên bản text; tổng nhập 110 nhưng runtime 109; thiếu review
thì registry từ chối Ookazi. Nhập lại hai lần và check cả 17 bundle không
đổi byte của file trong fixture, gồm các review/source và deck A/B hợp lệ.
Bốn lỗi checksum, fingerprint review, facts chính thức và ngày in sau
cutoff đều bị từ chối trước ghi; toàn bộ 17 bundle và file deck giữ nguyên.
Chỉ sửa bản sao ở thư mục tạm, không làm hỏng dữ liệu thật để thử.

Typecheck, build/import và bảy test riêng đã đạt Linux. Bộ tổng hợp đạt
848/848 test trong 36 file, 48/48 bước và 38 browser report bằng Chromium
154.0.8037.57, tổng runtimeExceptions=0. Đã đọc report tại
artifacts/platform-validation/2026-10-26T13-29-44-842Z-210986/report.json:
cards:check có đủ 17 bundle/110 lá/95 verified/15 pending; toàn capabilities
JSON giống mốc runtime trước. Các ca bảo toàn deck và hai trận tự nhiên
vẫn đạt.
Windows và Ubuntu CI [run 40331712686](https://github.com/xuanthao260604-sys/idc/actions/runs/40331712686)
đạt trên source commit 3eb63fc2a3cdb3e3f88778c6bcff37800a9b8dbf.
Đã tải và đọc artifact windows-validation-40331712686-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62.
Windows đạt 848/848 test trong 36 file, gồm bảy test nhập Ookazi;
48/48 bước và 38 browser report, tổng runtimeExceptions=0, đủ bằng chứng
từng bước. Đã parse data-and-build.log: 17 bundle, 110 lá, 95 verified,
15 pending; summary nhập implemented/testedEffects/playable vẫn 0.
Toàn capabilities JSON giống Linux: runtime 109 lá, 14 hiệu ứng và 16
snapshot cấp cho runtime. Report ghi windows11DesktopVerified=false.
Report đã đọc tại
artifacts/ci-ookazi-import/2026-10-26T13-34-37-161Z-8316/report.json.
Không thêm browser invocation hoặc hiệu ứng mới. Bước sau phải review
scope và kiểm thử runtime riêng trước khi mở Ookazi trong game.

Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
