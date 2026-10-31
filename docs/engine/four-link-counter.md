# Phép thường → Magic Jammer → Seven → Seven

Mốc 01/11/2026: đã nối review v4, activation, discovery/preview, resolver và
private cleanup cho **đúng pattern bốn liên kết này**. Bốn activation chạy
bằng lệnh engine/adapter và UI thật. Giữ các pattern hai và ba liên kết cũ.
Không coi đây là hoàn tất Chain/Counter tổng quát của Yu-Gi-Oh!.

## Hành vi đang mở

Link 1 là một trong 11 Phép thường đã pin, từ tay hoặc bài Set, trong Main
Phase 1/2 của người đang có lượt. Link 2 là Magic Jammer, link 3/4 là hai
Seven riêng, đều phản hồi trực tiếp liên kết ngay trước. Counter phải Set từ
lượt trước, đúng priority; tự phản hồi lá mình cần đối thủ Pass trước.

Mỗi Seven trả 1000 LP lúc kích hoạt với LP >1000. Cùng người trả bắt đầu ít
nhất 2001 để trả hai lần; hai người có thể bắt đầu 1001 mỗi người. 2001 là
phép tính, không phải quotation/ruling mới. Không đủ LP thì lệnh bị chặn
trước khi trừ phí hoặc lật nguồn; có thể Pass để xử lý Chain ba link đang có.

| Liên kết khi xử lý LIFO | Kết quả |
| --- | --- |
| 4: Seven cuối | Phủ nhận activation và phá Seven đầu; nguồn bị phá vào Mộ ngay |
| 3: Seven đầu | Bỏ qua hiệu ứng; Magic Jammer không bị phủ nhận |
| 2: Magic Jammer | Phủ nhận activation và phá Phép gốc; nguồn Phép vào Mộ ngay |
| 1: Phép gốc | Bỏ qua toàn bộ hiệu ứng, không draw/damage/heal/return/destroy/đổi tư thế hoặc tạo effect-choice |
| Cleanup | Magic Jammer và Seven cuối còn trên sân đến cuối Chain; cùng owner chọn thứ tự, khác owner tự gửi về từng Mộ |

Giữ nguyên root discard nếu có, discard Magic và cả hai khoản LP. Không
refund hoặc trả phí lại khi resolve. Phép Reincarnation bị phủ nhận không
lấy lại lá vừa bỏ làm cost. Man-Eater Bug bỏ làm phí Magic không kích hoạt
FLIP. Pot bị phủ nhận không draw và không gây deck-out dù deck còn 0/1 lá.
Phép damage bị phủ nhận không gây thua cho người còn 1 LP. Giữ quota Summon
và thứ tự Mộ cũ; trong một Mộ, Seven đầu bị phá trước Phép gốc, cleanup sau.

## Review và dữ liệu

Active review data/reviews/seven-tools-v4.effects.json, revision 4, scope
counter-trap-reviewed-four-link-patterns-v4, continuation
reviewed-four-link-counter-patterns-v4. Schema ràng buộc đúng card/revision/
scope/continuation; manifest chỉ dùng một review Seven active. Giữ nguyên
v1/v2/v3 để kiểm lịch sử. Registry capability version:
reviewed-four-link-spell-counter-v7.

V4 giữ nguyên **40 evidence record** của v3, không thêm quotation hoặc ngày
truy cập mới. Kết quả bốn link dựa trên điều kiện card activation của hai
Counter, direct response, Speed 3/LIFO/no-refund và chính sách cleanup đã có
trong [review Counter](../rules/counter-to-counter-review.md),
[review Seven](../rules/seven-tools-review.md) và
[review cleanup](../rules/chain-cleanup-order-review.md). Đây là tổng hợp có
ghi giới hạn nguồn, không nhận là một FAQ TCG 2005 riêng cho bốn link này.

Không đổi definition SHA của 11 Phép và hai Counter. Catalog vẫn 112 loại:
95 quái thường, 17 hiệu ứng trong 13 scope, 19 snapshot, 14 review active.
Scope Seven v4 thay v3, không cộng thêm một scope. Dữ liệu nhập vẫn 95 verified
data/17 historical pending, các trường imported implementation/testing/playable
giữ nguyên lịch sử; không đồng nhất review runtime với metadata nhập.

## Bộ xử lý và trạng thái riêng

[Thành phần ứng viên](four-link-counter-candidate.md) được dùng chung qua hai
entry point riêng. API ứng viên giữ ID/kind cũ và gate v3 trong 243 ca lịch sử.
API live bắt buộc review v4, effect ID
pay-1000-negate-seven-tools-after-magic-jammer-v1 và journal kind
normal-spell-magic-seven-seven-v1. Không cho journal ứng viên trở thành frame
live hoặc dùng subtype/Spell Speed để tự mở pattern mới.

Invariant khi đang xây bốn link kiểm toàn bộ graph/pins/source/snapshot,
cost/chronology, target và số dư cuối theo từng payer. Không buộc LP cuối
khớp đồng thời cả hai số dư trung gian của cùng người; không dựng lại LP
để lách guard Chain ba link. Shared core trả patch atomic và receipts; parent
live phát đúng thứ tự các fact phủ nhận/phá/bỏ qua, không gọi root resolver.

DuelState có fourLinkCounterResolution riêng, chỉ sống khi chờ owner chọn
cleanup. Frame pin board/turn/clock, nguồn đã phá/còn lại và receipt LP/discard.
Parent kiểm riêng chính xác cleanup source/owner/options/decision; không
chồng lên các frame Phép/Counter cũ. Hash kiểm drift, không xác thực state
client; API không nhận board/journal/ledger từ người chơi.

Magic đã xử lý còn là liên kết đại diện trong lúc chờ cleanup. PlayerView
đánh dấu resolved, không chiếu target/history/frame/ledger nội bộ hoặc tạo
respondingToChainHandle trỏ tới root đã rời Chain. Quyết định chỉ hiện cho
đúng owner. Cleanup xong phát một batch gửi Mộ/một chain-resolved, xóa frame.
Đầu hàng xóa frame/decision/Chain, giữ phí đã trả và board đã xử lý theo
chính sách kết thúc trận hiện có.

Discovery dùng guard engine để thử intent ở độ dài 1/2/3; không tự cấp quyền
theo độ dài. UI dùng command hiện có, preview Seven ở liên kết 3 trước khi
xác nhận, giữ Hủy chỉ đọc và receipt retry không trả thêm phí. Không có lệnh
client mới để đặt damage, winner hoặc kết quả resolve.

## 400 ca engine/adapter mới

tools/four-link-counter.test.ts:

- 352 tổ hợp = 11 Phép × A/B × controller Magic × controller Seven đầu ×
  controller Seven cuối × từ tay/Set. Từ tay kiểm Main 1, Set kiểm Main 2;
  hai thứ tự cleanup theo biến thể đó. Bốn activation chạy thật, JSON round-trip
  cả building/paused state, root effects bỏ qua, phí/board/quota/Mộ không trùng.
- 4 Pot deck 0/1 trên A/B; 2 ngưỡng LP người trả thứ hai; 2 ngưỡng cùng payer
  bắt đầu 1001/2000, giữ phí đầu và xử lý ba link sau khi không trả được phí sau.
- 10 building state bị sửa, 5 intent sai, 12 paused frame bị sửa, 6 review v4
  bị drift; lỗi không đổi input và không trả/reveal/move thêm bài.
- 2 gate v3 vẫn chặn bốn link; 2 đầu hàng khi đang chờ cleanup; 1 nguồn Set
  thứ năm có đủ LP vẫn bị chặn; 2 adapter A/B kiểm latest/refresh/stale handles,
  wrong-link, receipts, projection riêng và cleanup một lần.

243 ca candidate giữ riêng registry v3; fixture của chúng vẫn xác nhận intent
thứ tư bị từ chối rồi mới chuẩn bị receipt giả lập. Các hành trình dương/live
và browser dùng pure board setup, không chèn receipt hoặc sửa state sau action
đầu. Các fixture âm chủ động sửa input hoặc chuẩn bị thêm nguồn Set để kiểm
guard; không gọi chúng là lịch sử activation tự nhiên. Các suite/luồng ba
link tiếp tục chạy với review v4; một kỳ vọng cũ chặn link 4
được cập nhật để phản ánh phạm vi mới, số ca suite vẫn giữ nguyên.

## Bốn hành trình trình duyệt mới

Thêm --four-link=[a|b]:[same|split], nâng full validation từ 94/84 lên
**98 bước/88 browser report**. Bốn activation, các Pass và cleanup đều qua UI.

| Mode | Root | LP | Cleanup |
| --- | --- | --- | --- |
| a:same | Reincarnation từ tay, Main 1 | Cùng người 2001 → 1001 → 1 | Owner chọn ngược Magic/Seven; discard/root target không được trả lại |
| a:split | Fissure Set bằng UI, Main 1 | Hai người 1001 → 1 | Owner chọn; không tạo effect-choice giữa hai quái bằng ATK |
| b:same | Dian Keto Set bằng UI, Main 2 | Cùng người 2001 → 1001 → 1 | Tự cleanup khác owner; không hồi LP sau phí |
| b:split | Pot từ tay, Main 2, deck rỗng | Hai người 1001 → 1 | Tự cleanup khác owner; không draw/deck-out |

Kiểm preview đúng Seven/link 3, LP 1001 → 1, không target/discard ở Seven;
dialog 1440/390px, Hủy không đổi view, gửi lại activation/cleanup không lặp.
Sau bốn link không có phản hồi thứ năm; public facts hai ghế bằng nhau,
deck lưu không đổi, frame/ledger không đi ra view, không runtime exception.
Pure helper chỉ đặt bàn trước khi server bắt đầu; không có state-edit endpoint
hoặc flag test trong beta CLI. Dữ liệu/khung của người dùng giữ nguyên.

## Kiểm chứng

Source: ea4e6719987c8f68c798409587f7acad027de554.
Linux cloud đã đạt **3094/3094 test trong 56 file, 98/98 bước, 88/88 browser
report**, Chrome 154.0.8037.57, Node 24.19.0, npm 11.9.0,
runtimeExceptions=0. Đã đọc report/đủ 98 step log, đối chiếu mỗi JSON browser
log với report và kiểm đúng bốn mode mới:
artifacts/platform-validation/2026-10-31T21-09-53-409Z-25020/report.json.
400 ca live và 243 candidate giữ riêng. Các suite cũ giữ số ca; các browser
facts cũ sau khi bỏ thông tin host/browser bằng baseline đã kiểm chứng.

Ubuntu CI đã đạt typecheck/unit/build/data/smoke; đọc log job 124658438463
xác nhận 3094 test/56 file, đủ 400 ca live và 243 ca candidate. Windows CI
đã đạt trên đúng source cuối tại
[run 41242275105](https://github.com/xuanthao260604-sys/idc/actions/runs/41242275105).
Đã tải artifact windows-validation-41242275105-1 và đọc report/đủ 98 step log:
artifacts/ci-four-link-live/2026-10-31T21-10-12-737Z-4168/report.json.
Windows win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62: **3094/3094 test trong 56 file, 98/98 bước, 88/88 browser
report**, runtimeExceptions=0. Đủ bốn mode mới với đúng root/phase/từ tay/Set,
payer/LP/cleanup; mỗi bước có một report khớp host/version và log gốc.
Capabilities JSON Windows/Linux bằng nhau và bằng baseline sau đúng các
thay đổi v4 đã nêu. Không ghép log vào report cũ. Report mới vẫn
windows11DesktopVerified=false; Windows 11 desktop chưa thử trực tiếp.
Chưa đóng gói hoặc bàn giao beta.

Capabilities chỉ đổi entry Seven sang scope/revision/continuation v4, thay
scope tương ứng và mô tả giới hạn mới; metadata nhập và các phần còn lại bằng
baseline. Hai trận tự nhiên giữ seed/kết quả trước: pilot seed 08, 16 lượt,
339 lệnh, LP [0,4200]; expanded seed 5e, 11 lượt, 239 lệnh, LP [0,8000]. Không
chỉnh state giữa trận và không phát sinh Counter trong hai trận này.

314 file đầu vào/mã sản phẩm cũ được đối chiếu với 471744e: 301 nguyên vẹn,
13 thay đổi đúng mã/manifest cần cho scope mới. Không file data/ cũ nào đổi;
chỉ thêm review v4, giữ raw/generated/import/format/evidence/v1/v2/v3 nguyên vẹn.
Package/lock, ảnh, khung/mặt sau và deck không đổi.

## Còn lại

Chưa mở Counter thứ năm, Trap Hole → ba Seven, mixed Chain tổng quát,
SEGOC, Damage Step, modifiers/replacements/cost reducers hoặc Continuous Trap
effect. Hai trận tự nhiên baseline không phát sinh Counter; bằng chứng mới
đến từ unit/adapter và browser có setup kiểm soát, không gọi đó là trận tự nhiên.
Bộ tạo bài riêng, online/lưu trận và đóng gói Windows ở mốc sau.
