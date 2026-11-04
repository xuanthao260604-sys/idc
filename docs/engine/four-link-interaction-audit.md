# Chuỗi bốn liên kết — phục hồi, hồi LP và lần kích hoạt sau

Mốc 04/11/2026: audit phần tiếp nối của
[Phép → Magic Jammer → Seven → Seven](four-link-counter.md) qua nhiều lượt.
Giữ nguyên engine, protocol, UI sản phẩm, review v4, dữ liệu và phạm vi luật.
Không mở Counter thứ năm hoặc một effect/card mới.

## Hành trình hồi LP thành công

Fixture chỉ chuẩn bị bàn ở lượt 3, gồm các Counter đã Set ở lượt trước.
Mọi activation, Pass, Set mới, đổi lượt, hồi LP, Flip, lựa chọn và cleanup
sau action đầu đều qua engine/adapter hoặc UI thật; không chỉnh board giữa trận.

| Giai đoạn | Hành vi được kiểm |
| --- | --- |
| Lượt 3, Chain đầu | Monster Reincarnation bỏ Man-Eater Bug làm cost và chọn lại chính nó trong Mộ. Magic Jammer bỏ Hane-Hane. Hai người lần lượt trả 1000 LP cho hai Seven, mỗi người còn 1 |
| Kết quả bốn link | Seven cuối phủ nhận/phá Seven đầu. Magic còn hoạt động, phủ nhận/phá Reincarnation. Không trả MEB về tay, không hoàn discard/LP, không kích hoạt FLIP từ các quái bị bỏ |
| Hồi LP của chủ Phép | Dian Keto được kích hoạt mới, LP vẫn 1 khi kích hoạt và chỉ thành 1001 khi xử lý; không dùng khoản phí cũ làm hiệu ứng hồi |
| Chuẩn bị Faith | Chủ Phép Normal Set Faith ở lượt 3, không được Flip ngay. Qua lượt đối thủ rồi đến lượt 5 mới Flip Summon |
| Lượt 4 | Đối thủ dùng Dian Keto của họ, hồi 1 → 1001 khi xử lý |
| Lượt 5 | Faith lấy lại chính Reincarnation bị phủ nhận từ Mộ mình; không lấy Counter, quái hoặc Dian trong Mộ đối thủ |
| Chain mới | Cùng instance Reincarnation kích hoạt lại bằng link ID mới, bỏ Skull Servant làm cost và chọn MEB từ lần đầu. Magic thứ hai bỏ Battle Ox. Hai Seven khác, đã Set từ trước, trả phí mới |
| Kết quả sau | Bốn link xử lý lần nữa: root vẫn bị phủ nhận, MEB vẫn trong Mộ, Skull mới bỏ vẫn trong Mộ. Cùng owner đảo thứ tự cleanup giữa hai batch; khác owner tự cleanup |
| Kết thúc | Chủ Phép dùng một Ookazi riêng, gây sát thương thật khi xử lý, đối thủ 1 → 0 và kết thúc đúng winner ở lượt 5 |

Khi Seven đầu thuộc chủ Phép, timeline LP theo **[chủ Phép, đối thủ]**:
`[1001,1001] → [1,1001] → [1,1] → [1001,1] → [1001,1001] → [1,1001] → [1,1] → [1,0]`.
Unit còn kiểm vai hai Seven đổi ngược: số dư trung gian theo đúng người trả,
không buộc LP của A khớp receipt B. Có hai Chain bốn link riêng, bốn khoản LP;
không nối hai lần kích hoạt thành một Chain dài.

## Nhánh hồi LP đối thủ bị phủ nhận

Sau Chain đầu, chủ Phép hồi LP của mình lên 1001 rồi **Set thêm Magic Jammer
từ tay bằng lệnh thật ở lượt 3**. Trap này chưa được kích hoạt trong lượt Set.
Đến lượt 4, nó phản hồi Dian của đối thủ, bỏ Mystical Elf làm cost. Dian bị
phủ nhận/phá, đối thủ vẫn 1 LP; Magic đã Set ở lượt 3 là nguồn hợp lệ ở lượt 4.

Faith vẫn lấy lại root và root vẫn trả discard cost mới ở lượt 5. Có hai
nhánh unit tùy người điều khiển Seven đầu:

| Seven đầu trong Chain sau | Liên kết còn đủ phí | Kết quả |
| --- | --- | --- |
| Chủ Phép, đang có 1001 LP | Link 3 trả 1000; link 4 của đối thủ bị chặn ở 1 LP | Chain ba link: Seven phủ nhận Magic; Reincarnation thực sự trả MEB cũ về tay. Tổng ba khoản LP qua hai Chain |
| Đối thủ, vẫn còn 1 LP | Nguồn Seven đầu đã chọn không trả được phí link 3; sau đó hai bên Pass | Chain hai link: Magic phủ nhận root; MEB vẫn trong Mộ. Tổng hai khoản LP, các Seven còn lại giữ Set |

MEB được trả lại ở nhánh ba link là hiệu ứng của lần Reincarnation mới, không
phải tự refund cost của lần bị phủ nhận. Skull mới bỏ vẫn nằm trong Mộ; các
receipt cost cũ giữ nguyên. Các lệnh không đủ phí không lật nguồn/trừ LP.
Ookazi riêng sau đó mới gây sát thương kết thúc trận; payment không phải damage.

Nhánh hai link là hành trình chủ động Pass sau khi nguồn đã chọn không đủ
phí. Người còn đủ LP vẫn có thể dùng một nguồn Seven khác nếu đúng priority/
gate; audit không đặt thêm luật cấm phản hồi hoặc ép mọi Chain phải kết thúc
ở hai link khi một người thiếu LP.

Browser kiểm nhánh ba link sau Chain bốn link, với timeline:
`[1001,1001] → [1,1001] → [1,1] → [1001,1] → [1001,1] → [1,1] → [1,0]`.
Không gọi nhánh này là hai Chain bốn link đã xử lý.

## 36 ca engine/adapter mới

tools/four-link-interactions.test.ts:

- 32 hành trình = A/B × controller Magic × controller Seven đầu × hồi LP
  thành công/bị phủ nhận × thứ tự cleanup đầu. Chủ Seven cuối đối diện chủ
  Seven đầu. Hai Main Phase ban đầu được kiểm theo A/B; lượt 5 dùng Main 1.
- 4 hành trình adapter = A/B × hai nhánh hồi LP. Dịch action qua handle hiện
  hành, đối chiếu version/LP/tay bài với engine, kiểm view và quyết định riêng.

Trước/sau từng transition kiểm input không đổi, invariants ở mỗi state ổn định,
root instance giữ nguyên nhưng link ID khác, cost mới riêng, đúng vùng/tổng
LP, không trùng card trong Mộ. Chỉ Faith phát FLIP; các quái bị discard không
phát FLIP. Normal Set dùng quota ở lượt 3; Flip lượt 5 không dùng quota mới.

Gửi lại receipt Seven cuối của Chain đầu sau hồi LP, khi Chain sau đang xây
và sau kết thúc chỉ trả kết quả cũ. Cùng intent với command ID/version mới bị
từ chối, view không đổi. Handle root trước khi qua Mộ/Faith không dùng được
cho lần kích hoạt mới. Decision/options cleanup cũ không áp dụng cho batch
mới khi có hai batch riêng. Mọi lệnh được chấp nhận đều được retry, không
trả thêm cost hoặc tạo thêm activity. Frame/ledger/snapshot không chiếu ra view.

Fixture dùng tối đa ba Magic Jammer và hai Seven trong mỗi deck, đúng giới
hạn đã nạp. Bốn khoản LP dùng bốn bản Seven khác nhau ở hai deck; không bịa
hiệu ứng lấy lại Trap hoặc vượt ba bản trong một deck để dựng hành trình.

## Bốn hành trình trình duyệt

Thêm --four-link-interactions=[a|b]:[heal|negated], nâng full validation từ
98/88 thành **102 bước/92 browser report**. Cả hai mode A dùng Magic thuộc
đối thủ; mode B dùng Magic của chủ Phép (tự phản hồi sau đối thủ Pass).
Seven đầu thuộc chủ Phép, Seven cuối thuộc đối thủ trong cả bốn mode.

| Mode | Độ dài hai Chain chính | LP payments | Lệnh chấp nhận | Cleanup |
| --- | --- | --- | --- | --- |
| a:heal | [4,4] | 4 | 60 | Hai batch owner đối thủ, thứ tự ngược nhau |
| a:negated | [4,3] | 3 | 63 | Batch đầu owner đối thủ; batch sau owner chủ Phép; decision cũ bị chặn |
| b:heal | [4,4] | 4 | 62 | Hai batch tự cleanup khác owner |
| b:negated | [4,3] | 3 | 66 | Batch đầu tự cleanup; batch sau owner chủ Phép chọn thứ tự |

Kiểm UI thật cho cost/target, preview Seven ở link 3, Hủy chỉ đọc, hai lần
kích hoạt root, Normal Set/Flip, hồi LP và Set/kích hoạt Trap ở hai lượt khác
nhau. Kiểm cả API thiếu phí bằng source Set/chain handle hiện hành, không chỉ
dựa vào nút ẩn. Retry HTTP đối chiếu receipt và **view từ server trả về**:
stateVersion, LP và độ dài Chain không đổi, không chỉ so biến view trên trình
duyệt. Lệnh root/cleanup cũ bị chặn; public facts hai ghế bằng nhau, deck lưu
không đổi và không runtime exception.

Collector test lưu public activity khi response xuất hiện, theo stateVersion,
để kiểm cả fact đã rời cửa sổ history 60. Không tăng limit hoặc đọc state kín.
Mode a:heal đúng 60 lệnh chưa vượt; ba mode còn lại vượt. Không gán toàn bộ
history cho view cuối khi các entry đầu đã rời cửa sổ đó.

Pure helper tools/fixtures/four-link-interactions.ts đặt bàn trước server;
tools/four-link-interactions-browser.mjs chỉ quan sát view/receipt công khai
và thao tác UI. Không thêm endpoint sửa state hoặc test flag vào beta CLI.

## Kiểm chứng

Source audit: dae6ad68242f48d9c099cd9cb64da4946ade0958.
Linux cloud đạt **3130/3130 test trong 57 file, 102/102 bước, 92/92 browser
report**, Chrome 154.0.8037.57, runtimeExceptions=0, tại
artifacts/platform-validation/2026-11-04T07-42-34-226Z-85013/report.json.
Đã đọc đủ 102 step log; JSON trong mỗi browser log khớp report, đúng một
report/bước, đúng host/version và không runtime exception. Đủ 36 ca mới;
56 suite cũ giữ nguyên số ca. Các browser facts cũ sau khi bỏ thông tin
host/tên/version browser bằng baseline đã xác minh; capabilities JSON bằng
nguyên baseline v4, gồm metadata nhập và mô tả giới hạn.

Ubuntu CI đạt typecheck/unit/build/data/smoke; đã đọc log job 126454078029
xác nhận 3130 test/57 file, gồm 36 ca mới và 400 ca live cũ. Windows CI đã
đạt trên đúng source cuối tại
[run 41794125965](https://github.com/xuanthao260604-sys/idc/actions/runs/41794125965).
Đã tải artifact windows-validation-41794125965-1 và đọc report/đủ 102 step log:
artifacts/ci-four-link-interactions/2026-11-04T07-42-54-439Z-6352/report.json.
Windows win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 156.0.4314.56: **3130/3130 test trong 57 file, 102/102 bước, 92/92 browser
report**, runtimeExceptions=0. Đủ bốn mode mới với độ dài Chain, số payment,
timeline và số lệnh đúng như bảng. Log gốc khớp JSON từng browser report;
capabilities Windows/Linux bằng nhau và bằng baseline v4, không ghép report.
Report vẫn windows11DesktopVerified=false; Windows 11 desktop chưa thử trực
tiếp. Chưa đóng gói hoặc bàn giao beta.

Hai trận tự nhiên giữ baseline: pilot seed 08, 16 lượt, 339 lệnh, LP [0,4200];
expanded seed 5e, 11 lượt, 239 lệnh, LP [0,8000]. Không sửa state giữa trận
và không phát sinh Counter; không dùng hai trận đó làm bằng chứng mới cho
các hành trình Chain có fixture kiểm soát ở trên.

316 file data/, apps/, packages/, manifest runtime và package/lock cũ giữ
nguyên byte so với 02365a2. Review v1/v2/v3/v4/evidence, generated/raw/import,
artwork/khung/mặt sau và deck không đổi. Runtime vẫn 112 definition, 95 quái
thường, 17 hiệu ứng, 13 scope, 19 snapshot; dữ liệu nhập 95 verified data,
17 historical pending. Không nâng metadata nhập thành implemented/tested/playable.

## Còn lại

Audit này kiểm tương tác trong scope v4 hiện có. Chưa mở Counter thứ năm,
Trap Hole → ba Seven, mixed Chain tổng quát, SEGOC, Damage Step, modifiers/
replacements/cost reducers hoặc Continuous Trap effect. Các fixture kiểm soát
không được gọi là trận tự nhiên. Bộ tạo bài riêng, online/lưu trận và bản
đóng gói Windows vẫn ở mốc sau.
