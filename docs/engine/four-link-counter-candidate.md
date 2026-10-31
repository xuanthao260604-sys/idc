# Ứng viên Phép → Magic Jammer → Seven → Seven

**Mốc tiếp nối 01/11:** đã [mở bốn activation thật](four-link-counter.md) qua
review v4 và parent cleanup riêng. Nội dung/kết quả bên dưới giữ mốc ứng viên;
243 ca cũ vẫn dùng registry v3, không được đổi thành bằng chứng gameplay v4.

Mốc 01/11/2026: chuẩn bị thành phần xử lý độc lập cho đúng pattern bốn liên
kết này. **Chưa được game gọi; kích hoạt thứ tư vẫn bị chặn.** Không thêm
review active, continuation gate, DuelState field, API, PlayerView hoặc UI.
Không coi ca ứng viên là bốn activation đã được engine chấp nhận.

## Kết quả cần có

Phạm vi thiết kế giữ 11 Phép thường đã pin ở
[mốc ba liên kết](three-link-counter.md), Magic Jammer và hai Seven. Hai
Counter Seven đều phản hồi trực tiếp liên kết ngay trước; mỗi lần trả 1000
LP cần LP >1000. Cùng người trả cần ít nhất 2001 trước hai khoản phí; hai
người có thể bắt đầu 1001 mỗi người. Đây là phép tính, không phải ruling mới.

| Thứ tự xử lý | Kết quả ứng viên |
| --- | --- |
| Link 4: Seven thứ hai | Phủ nhận activation và phá Seven thứ nhất ở link 3; đưa nguồn bị phá vào Mộ ngay |
| Link 3: Seven thứ nhất | Bỏ qua hiệu ứng vì activation đã bị phủ nhận; Magic Jammer không bị phủ nhận |
| Link 2: Magic Jammer | Tiếp tục phủ nhận activation và phá Phép gốc; đưa Phép vào Mộ ngay |
| Link 1: Phép gốc | Bỏ qua toàn bộ hiệu ứng, không chọn mục tiêu lúc xử lý, không draw/heal/damage/return/destroy/đổi tư thế |
| Cleanup cuối Chain | Hai nguồn còn lại là Magic Jammer và Seven cuối. Cùng owner chọn thứ tự; khác owner không tạo một thứ tự giả giữa hai Mộ |

Giữ nguyên discard cost của Magic và của Phép gốc nếu có, cùng hai khoản LP.
Không refund, trả lại phí hoặc kích hoạt FLIP từ discard. Trong một Mộ, Seven
đầu bị phá trước Phép gốc; các nguồn cleanup vào sau các lá đã bị phá/cost.
Giữ thứ tự prefix Mộ và quota Summon. Monster Reincarnation bị phủ nhận không
lấy lại lá đã bỏ làm cost dù lá đó chính là target đã chọn hợp lệ lúc kích hoạt.

Kết luận trên là tổng hợp điều kiện kích hoạt Seven/Magic, direct response,
Speed 3, LIFO, không hoàn cost và chính sách cleanup trong các hồ sơ đã có:
[review Counter](../rules/counter-to-counter-review.md),
[review Seven](../rules/seven-tools-review.md),
[review cleanup](../rules/chain-cleanup-order-review.md) và review Seven v3.
Không thêm quotation/ngày truy cập mới, không tuyên bố đã tìm được ví dụ
TCG 2005 riêng cho bốn liên kết này. Chưa tạo review runtime mới từ suy luận
đó; review v1/v2/v3 và toàn bộ evidence cũ giữ nguyên.

## Thành phần đã chuẩn bị

packages/engine/src/four-link-counter-candidate.ts:

- prepareFourLinkCounterCandidate kiểm context resolving, bốn nguồn và full
  definition pins, graph/direct response, earlier Set, cost/chronology, target
  gốc và binding vùng bài. Từ chối các vùng field/banished/fusion ngoài phạm
  vi ứng viên, kể cả tham chiếu trùng ẩn ở đó; không bỏ qua để làm mất bài.
- Dùng ledger hai khoản Seven đã có; không đổi ngưỡng hoặc schema ledger.
  Chỉ nhận receipt đã trả và kiểm số dư nối tiếp theo từng người, không tự
  trừ LP hoặc dựng lại LP hiện hành để vượt guard của Chain ba liên kết.
- Trả atomic board patch phá Seven đầu rồi Phép gốc, journal lịch sử,
  remainingChain chứa Magic đã xử lý và cleanupSourceIds [Magic, Seven cuối].
  steps là mô tả công việc của thành phần, **không phải game events đã phát**.
- assertFourLinkCounterCandidate kiểm checkpoint do server giữ: schema/hash,
  graph đã có đúng hai activation bị phủ nhận, LP/discard history, nguồn còn
  lại/đã phá, board/clock/turn và format. Hash là kiểm drift, không xác thực
  state client hoặc chứng minh mọi board được đề xuất đều là transition hợp lệ.

Output đóng băng sâu, không freeze hoặc sửa input. Nó chưa phải DuelState ổn
định được assertDuelInvariants chấp nhận; future parent phải cài frame/context
riêng và phát events/cleanup/decisions đúng một lần. Checkpoint không còn hợp
lệ sau khi cleanup foundation đã đổi board. Không có API nhận journal từ client.

Chỉ một helper cũ được đổi tên/export thành assertCounterContinuationGraph
để tái sử dụng kiểm graph đã có; nội dung guard không đổi và hai call site
cũ được cập nhật. Bộ xử lý mới không được import bởi duel/adapter/registry/
UI sản phẩm. Capability version, active Seven v3 và các pattern đang chơi giữ
nguyên; không cho phép pattern mới chỉ dựa vào subtype hoặc Spell Speed.

## Kiểm thử và giới hạn fixture

tools/four-link-counter-candidate.test.ts có **243 ca**:

- 176 ca = 11 Phép × A/B × controller Magic × controller Seven đầu ×
  controller Seven cuối. Có Phép từ tay/Set và Main 1/2. Kiểm root bị bỏ qua,
  LP, tay/deck/quái/quota/cost giữ nguyên, GY theo owner, source/flags/snapshot,
  immutable output/input và JSON round-trip.
- 16 tổ hợp cleanup foundation: A/B × cùng/khác payer × LP tối thiểu/8000 ×
  Main 1/2. Gọi bộ cleanup nội bộ trên patch, kiểm owner order, prefix Mộ,
  mỗi source đúng một lần và checkpoint cũ bị từ chối sau cleanup. Đây chưa
  phải hộp chọn cleanup đang chạy qua engine/UI của một Chain bốn link.
- 33 input sai: flags, effect/response/identity, Set/snapshot, LP arithmetic/
  receipt/gap, discard/target, context/clock/registry, orphan/trùng vùng và
  nguồn thứ năm. Lỗi giữ nguyên input, không move/pay/freeze dữ liệu caller.
- 12 checkpoint bị đổi, gồm board/LP/cost/flags/nguồn/clock/turn/ledger và
  graph sai dù test chủ động tính lại integrity hash.
- 4 ca Pot với deck còn 0/1 lá trên A/B: các activation đầu chạy thật, Phép
  chưa resolve; ứng viên phủ nhận Pot nên không draw hoặc tạo kết quả deck-out.
- 2 ca adapter A/B xác nhận không discovery phản hồi thứ tư; intent có source
  Set hợp lệ và đủ LP vẫn bị illegal-timing, view không đổi, không lộ journal.

Pure helper tools/fixtures/four-link-counter-candidate.ts chỉ chuẩn bị bàn
ban đầu, rồi chạy **ba activation thật** và các Pass cần thiết. Intent thứ tư
được engine từ chối trước khi fixture tạo receipt ứng viên và đổi timing sang
resolving. assertDuelInvariants vẫn từ chối fixture bốn link; không gọi receipt
tự chuẩn bị là activation được game cho phép. Không import helper vào beta CLI.

Đã build/import module bằng Node ESM thật cho Reincarnation, Pot deck 0/1 và
Ookazi; kiểm input không đổi, LP giữ nguyên, hai nguồn bị phủ nhận, journal
round-trip và cleanup source đúng. Các probe này vẫn là thành phần ứng viên.

## Bằng chứng kiểm chứng

Source cuối: 388a88209d7458f1b7fdb9c3cd6ae2d0e05943f2.
Linux đạt typecheck, **2694/2694 test trong 55 file**, gồm đủ 243 ca mới;
build/check 19 bundle đạt 112 nhập, 95 verified data, 17 historical pending.
Capabilities build mới bằng nguyên baseline v3. Logs riêng tại
/tmp/idc-four-link-candidate/final-tests.log, final-data-build.log,
final-typecheck.log, capabilities.log và node-probe.log. Đã chạy lại probe
trên module build cuối, gồm guard tham chiếu vùng ngoài phạm vi.

Windows CI đã đạt trên đúng source cuối tại
[run 41237424685](https://github.com/xuanthao260604-sys/idc/actions/runs/41237424685).
Ubuntu CI đã đạt typecheck/unit/build/data/smoke; đã đọc log job 124644019371
xác nhận 2694 test/55 file và đủ 243 ca thành phần mới.
Lượt 41237294197 đã hủy để thay bằng source guard vùng cuối; không tính là đạt.

Đã tải artifact windows-validation-41237424685-1 và đọc report/đủ 94 step log:
artifacts/ci-four-link-candidate-final/2026-10-31T20-08-05-725Z-5260/report.json.
Windows win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62: **2694/2694 test trong 55 file, 94/94 bước, 84/84 browser
report**, runtimeExceptions=0. Đủ 243 ca ứng viên, 54 suite cũ giữ nguyên số
ca; mỗi browser step có đúng một report khớp host/version và log gốc.

Theo dõi CI từng gián đoạn vì GitHub trả 401; watch thoát 1 do không đọc
được jobs, không phải CI lỗi. Kết nối đã truy cập được lại, kết luận success
và artifact nói trên đã được đọc trực tiếp sau đó; không dùng trạng thái
watch bị gián đoạn để suy đoán kết quả Windows.

Full validation Linux trên source cuối cũng đã đạt **2694/2694 test trong
55 file, 94/94 bước, 84/84 browser report**, Chrome 154.0.8037.57,
Node 24.19.0, npm 11.9.0, runtimeExceptions=0, tại
artifacts/platform-validation/2026-10-31T20-23-05-239Z-7789/report.json.
Đã đọc đủ 94 step log, đối chiếu JSON của từng browser log với report,
kiểm 243 ca mới và 54 suite cũ giữ nguyên số ca. Các browser facts sau khi
bỏ thông tin host/tên/version browser bằng baseline đã xác minh trước đó;
capabilities JSON bằng nguyên baseline. Hai trận tự nhiên giữ seed/kết quả
cũ, không phát sinh Counter. Các browser mode là hồi quy gameplay hiện có,
**không phải bốn activation đã được game chấp nhận**.

Report Linux lịch sử a481026 với 2451 test/54 file, 94 bước/84 browser report
vẫn giữ nguyên tại artifacts/platform-validation/2026-10-31T14-34-37-257Z-374670/report.json.
Không gộp log unit mới vào report đó hoặc đổi số test trong report lịch sử.
Capabilities JSON Windows/Linux bằng nhau và bằng baseline v3. Report mới
vẫn windows11DesktopVerified=false; Windows 11 desktop chưa thử trực tiếp.

313 file đầu vào/mã sản phẩm cũ được đối chiếu với df7d3b6: 312 nguyên vẹn,
chỉ helper graph cũ đổi tên/export như mô tả; thêm module/fixture/test riêng.
Không đổi data/, raw/generated/import/format/review, manifest, package/lock,
artwork, khung/mặt sau hoặc deck. Runtime vẫn 112 definition, 95 quái thường,
17 hiệu ứng, 13 scope, 19 snapshot; metadata nhập không được nâng trạng thái.

## Tiếp theo

Để bật bốn activation thật cần review version mới với gate đúng pattern,
parent frame đã resolve giữ cost/nguồn, invariant, discovery/preview, private
cleanup projection, receipt và các luồng engine/adapter/browser riêng. Giữ
review v1/v2/v3 và các pattern cũ để hồi quy. Trap Hole → ba Seven cần ba khoản
LP và thiết kế riêng, chưa nằm trong thành phần hai khoản LP này. Counter thứ
năm, mixed Chain tổng quát, SEGOC, Damage Step, modifiers/replacements, custom
card editor và bản đóng gói Windows vẫn chưa được làm trong mốc này.
