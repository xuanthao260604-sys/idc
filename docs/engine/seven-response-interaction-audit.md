# Seven phản hồi Seven — tương tác qua nhiều lượt

Mốc 31/10/2026: audit phần tiếp nối của
[Trap Hole → Seven Tools → Seven Tools](seven-response.md). Không mở thêm
hiệu ứng, pattern Chain, lá bài hoặc ruling. Engine, protocol, UI sản phẩm,
review v1/v2/v3, manifest runtime và dữ liệu nhập giữ nguyên.

## Hành trình hồi LP thành công

Fixture chỉ chuẩn bị bàn ban đầu ở lượt 3, gồm các Bẫy và Faith có marker Set
ở lượt trước. Mọi Summon, activation, Pass, đổi lượt, lựa chọn và cleanup
sau đó đi qua engine/adapter hoặc UI thật; không sửa state giữa trận.
Định nghĩa, chỉ số và hiệu ứng lấy từ catalog/review hiện hành.

| Giai đoạn | Hành vi được kiểm |
| --- | --- |
| Lượt 3 | Battle Ox được Normal Summon; đối thủ dùng Trap Hole, rồi tự phản hồi bằng hai Seven sau các Pass cần thiết. Cùng một người trả 2001 → 1001 → 1 |
| Xử lý đầu | Seven cuối phủ nhận/phá Seven trước; Trap Hole phá Ox một lần. Owner chọn thứ tự cleanup Trap/Seven. Các phí LP giữ nguyên |
| Phục hồi quái | Monster Reincarnation bỏ Man-Eater Bug làm cost, trả chính Ox vừa bị phá về tay. Cost không FLIP. Quota Summon vẫn dùng rồi, không thể triệu hồi Ox lần nữa trong lượt này |
| Lượt 4 | Đối thủ dùng Dian Keto, LP vẫn 1 khi kích hoạt và chỉ thành 1001 lúc xử lý. Đây là hiệu ứng hồi LP, không phải hoàn phí |
| Lượt 5 | Magician of Faith có marker Set lượt 1 trong fixture được Flip Summon, lấy lại chính Reincarnation từ Mộ mình; không lấy Trap, Seven, monster hoặc Dian trong Mộ đối thủ |
| Chuỗi thứ hai | Ox được Normal Summon lại sau khi quota reset. Trap Hole thứ hai, Seven của chủ Ox, rồi Seven còn lại của đối thủ tạo một Chain ba link mới, lần này hai người trả riêng |
| Xử lý sau | Seven của chủ Ox bị phủ nhận/phá, Ox bị Trap Hole phá lần thứ hai; cleanup theo thứ tự ngược với batch đầu, giữ prefix Mộ đã có |
| Dùng lại Phép | Reincarnation đã lấy lại được kích hoạt mới, lần này bỏ Hane-Hane làm cost và trả cùng Ox về tay lần nữa. Link ID/cost mới, không tiếp tục receipt cũ, không kích hoạt FLIP từ discard |
| Kết thúc | Chủ Ox dùng Ookazi khi đối thủ còn 1 LP. Chỉ khi sát thương 800 xử lý mới về 0 và kết thúc đúng winner |

LP theo thứ tự **[chủ Ox, đối thủ]**:
`[8000,2001] → [8000,1001] → [8000,1] → [8000,1001] → [7000,1001] → [7000,1] → [7000,0]`.

Có hai Chain ba link riêng, tổng bốn lần trả LP. Cùng người trả hai lần ở
Chain đầu, hai người trả ở Chain sau; ledger cũ không ép LP mới bằng số dư
trung gian cũ. Đối thủ dùng đúng ba bản Seven khác nhau, chủ Ox dùng một bản.
Deck fixture có tối đa ba Seven mỗi người, hai Trap Hole; không dựng bốn bản
Seven trong cùng deck hoặc tự hồi một Counter từ Mộ mà chưa có hiệu ứng đó.

## Nhánh Phép hồi LP bị phủ nhận

Chủ Ox dùng Magic Jammer phản hồi Dian của đối thủ, bỏ Skull Servant làm cost.
Dian bị phủ nhận/phá, LP đối thủ vẫn 1. Faith vẫn lấy lại Reincarnation và Ox
vẫn được triệu hồi mới ở lượt 5.

Ở Chain thứ hai, Seven của chủ Ox trả 8000 → 7000. Seven còn lại của đối thủ
bị chặn vì LP=1, trước khi trừ phí hoặc lật bài. Sau hai Pass, Seven của chủ
Ox phủ nhận Trap Hole, nên Ox vẫn trên sân. Reincarnation không thể chọn Ox
trên sân; lệnh sai giữ nguyên Hane-Hane trong tay, không trả discard cost.
Ookazi sau đó mới kết thúc trận bằng sát thương thật.

Nhánh này có một Chain ba link và một Chain hai link, **ba** khoản LP, không
có lần hồi LP thành công. Không gọi đây là hai Chain ba link đã xử lý.
Timeline: `[8000,2001] → [8000,1001] → [8000,1] → [8000,1] → [7000,1] → [7000,0]`.

## Engine và command adapter

tools/seven-response-interactions.test.ts thêm 20 ca:

- 16 hành trình: A/B × Main Phase 1/2 ban đầu × thứ tự cleanup đầu × hồi
  thành công/bị phủ nhận. Nhánh thành công đảo thứ tự batch cleanup sau.
- 4 hành trình adapter: A/B × hai nhánh. So LP/tay bài/version với engine,
  quyền xem quyết định riêng, không lộ frame/ledger/snapshot nội bộ.

Mỗi accepted transition kiểm input nguyên vẹn và invariant state mới; rejected
transition giữ nguyên object/state. Kiểm đúng từng payer/beforeLP/afterLP,
phí mới riêng, root/quái không xử lý hai lần, nguồn/cost không trùng trong Mộ,
quota và vùng của từng lá sau cả hai chuỗi. Chỉ Faith phát FLIP; các monster
bị discard không phát FLIP. Đầu hàng và frame bị sửa đã có ở 128 ca mốc trước.

Adapter kiểm gửi lại từng lệnh đã chấp nhận không đổi view/version/LP. Receipt
Seven của Chain đầu được gửi lại khi LP đã hồi, lúc Chain sau đang xây và sau
kết thúc; chỉ nhận lại kết quả cũ. Cùng intent Counter với command ID/version
mới cũng bị từ chối; handle triệu hồi trước khi Ox đi qua Mộ/tay không thể
dùng cho lần Summon mới. Decision ID/options cleanup đầu không áp dụng cho
batch thứ hai. Không mở endpoint nhận board/ledger từ client.

## Bốn hành trình trình duyệt

Thêm --seven-response-interactions=[a|b]:[heal|negated] vào full validation,
nâng 90/80 thành **94 bước/84 browser report**. Mỗi mode dùng fixture helper
thuần tools/fixtures/seven-response-interactions.ts trước khi server khởi động;
tools/seven-response-interactions-browser.mjs chỉ quan sát view/receipt công
khai và thao tác UI. Không import Vitest hoặc thêm flag test vào beta CLI.

UI kiểm preview đúng Seven ở liên kết 2, Hủy không đổi state, phản hồi trực
tiếp, lựa chọn cost/target/cleanup, đổi lượt, Faith, phục hồi và tái triệu hồi.
Kiểm API bằng handle hiện hành để chứng minh thiếu LP bị chặn, không chỉ
dựa vào nút ẩn. Lệnh/cleanup cũ bị từ chối, receipt cũ chỉ đọc. Nhánh thành
công có 66 lệnh được chấp nhận; nhánh phủ nhận có 60, đều kết thúc lượt 5.

Collector test lưu public summaries lúc response xuất hiện để kiểm các fact
đã rời cửa sổ history 60 của sản phẩm. Không tăng limit hoặc đọc state kín.
66 lệnh vượt limit; 60 lệnh chưa vượt. View cuối hai ghế vẫn có public facts
đồng nhất; deck lưu không đổi. Hai mode phủ nhận không có cleanup hai nguồn
ở Chain sau, vì Counter thứ hai không được kích hoạt.

Workflow giữ toàn bộ kiểm tra và tăng timeout job 15 → 20 phút để có khoảng
chạy bốn hành trình dài bổ sung. Không thay cài đặt/build/luật trong game.

## Kiểm chứng

Source audit: a4810266a63f73e2ffea3cd042a6bd9dbd8c9292.
Linux cloud đạt **2451/2451 test trong 54 file, 94/94 bước, 84/84 browser
report**, Chrome 154.0.8037.57, Node 24.19.0, npm 11.9.0,
runtimeExceptions=0, tại
artifacts/platform-validation/2026-10-31T14-34-37-257Z-374670/report.json.
Đã đọc report/từng log và kiểm đủ 20 ca mới, bốn mode mới, sáu mode Seven
phản hồi Seven cũ cùng các suite/luồng hồi quy. Capabilities JSON bằng nguyên
baseline mốc Seven v3, kể cả metadata nhập và mô tả giới hạn.

Ubuntu CI đã đạt typecheck/unit/build/data/smoke; đọc log job 124565039889
xác nhận 2451 test/54 file và đủ 20 ca mới. Bộ browser Linux đầy đủ là report
cloud nêu trên, không gán nó cho job Ubuntu CI.
Windows CI đạt tại
[run 41210759562](https://github.com/xuanthao260604-sys/idc/actions/runs/41210759562).
Đã tải artifact windows-validation-41210759562-1, đọc report và toàn bộ
94 step log tại
artifacts/ci-seven-response-interactions/2026-10-31T14-34-54-573Z-5888/report.json.
Windows win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62: **2451/2451 test, 54 file, 94/94 bước, 84/84 browser
report**, runtimeExceptions=0. Mỗi bước browser có đúng một report đúng
host/version; JSON trong log gốc khớp report.json trên cả hai hệ. Có đủ bốn
mode mới với số Chain/payment/command và timeline đúng như trên. Capabilities
JSON Windows/Linux bằng nhau và bằng baseline v3; không ghép log mới vào
report cũ. Report vẫn windows11DesktopVerified=false; chưa thử Windows 11
desktop trực tiếp.

Hai trận tự nhiên giữ baseline: pilot seed 08, 16 lượt, 339 lệnh, LP [0,4200];
expanded seed 5e, 11 lượt, 239 lệnh, LP [0,8000]. Không sửa state giữa trận;
không phát sinh Counter, nên không dùng hai trận đó làm bằng chứng mới cho
Seven phản hồi Seven. Các hành trình mới có fixture kiểm soát riêng.

313 file data/, apps/, packages/, manifest runtime và package/lock cũ giữ
nguyên byte so với c6fc884. Dữ liệu vẫn 112 nhập, 95 verified data, 17 historical
pending; runtime 112 definition, 95 quái thường, 17 hiệu ứng, 13 scope,
19 snapshot và review Seven v3. Không đánh dấu lại trạng thái nhập thành
implemented/tested/playable. Artwork và khung/mặt sau người dùng giữ nguyên.

## Phạm vi còn lại

Audit này kiểm tương tác trong pattern đã mở; không hoàn tất Chain tổng quát.
Counter link 4+, nhiều Trap Hole rồi Counter, SEGOC, Damage Step, modifiers/
replacements và Continuous Trap effect vẫn ngoài phạm vi. Các trận tự nhiên
baseline không phát sinh Counter; không gọi fixture này là trận tự nhiên.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói beta, bộ tạo bài riêng,
online hoặc lưu trận qua restart.
