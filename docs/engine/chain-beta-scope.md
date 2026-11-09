# C1 — Phạm vi Chain beta và ma trận nghiệm thu

Chốt thiết kế C1 ngày 09/11/2026 trên nền `11b7272`.
Trạng thái: kế hoạch kỹ thuật đã đối chiếu code/review, **chưa bật runtime
mới, chưa chứng minh hiệu ứng mới**. Active Seven review vẫn v5. Không dùng
tài liệu này thay review luật, capability hoặc kết quả kiểm thử.

## Quyết định phạm vi

Beta đích là hotseat hai người, pool hiện có 112 định nghĩa/17 lá hiệu ứng,
Chain có giới hạn theo capability; không phải toàn bộ Goat. Kết thúc C4
thì chuyển sang bộ tạo bài riêng giới hạn U1, rồi kiểm chứng Windows 11 W1.
U1 nằm trong beta đích theo lộ trình; việc thay toàn bộ bài/hình ảnh là U2
riêng, không chặn đóng Chain. Chưa đóng gói/bàn giao beta.

Chọn tổng quát hóa hai họ đang có, thay việc thêm một resolver cho mỗi độ
dài. Phần mới gồm suffix Seven dài hơn và prefix nhiều Trap Hole có Seven.
Không thêm lá, handler hiệu ứng mới, Spell Speed 2 mới, hay luật timing mới.
Phải có review phiên bản mới và bằng chứng trước khi nối các tổ hợp mới
vào game. Giữ nguyên v1–v5 để kiểm hồi quy; không tự coi chúng đã duyệt mọi
độ dài. C2 chỉ xây ứng viên và chuyển đổi phần dùng chung; C3 mới mở scope
đã qua kiểm chứng. Không cần xin lại hướng chỉ vì đây là gate kỹ thuật.

## Ký hiệu và pool được pin

- S: một trong 11 Normal Spell bên dưới, speed 1, người đang có lượt
  kích hoạt ở open Main1/Main2 từ tay hoặc ô đã Set.
- T: Trap Hole `official:04206964`, speed 2, phản hồi cùng một sự kiện
  Normal/Tribute/Flip Summon hợp lệ mà runtime đang cho phép; không phải
  negate Summon. Chỉ bên đối thủ của quái được triệu hồi có thể dùng T.
- M: Magic Jammer `official:77414722`, speed 3, bỏ một lá trên tay làm
  phí; phản hồi trực tiếp activation S, không phản hồi monster effect.
- V: Seven Tools `official:03819470`, speed 3, trả 1000 LP khi LP >1000;
  phản hồi trực tiếp Trap card activation cuối là T, M hoặc V.
- T^k / V^n: k / n instance khác nhau, không phải cùng nguồn kích hoạt lại.
  n=0 nghĩa không có Seven. Cả hai bên có thể dùng Counter khi đến priority;
  tự phản hồi vẫn phải chờ đối thủ có cơ hội Pass.

| S được pin | ID | Điều cần giữ khi S được phép xử lý |
| --- | --- | --- |
| Pot of Greed | official:55144522 | Bốc bắt buộc, nhánh deck 0/1/2 và terminal |
| Fissure | official:66788016 | Chọn quái đồng ATK lúc resolution, không đổi thành activation target |
| Hinotama | official:46130346 | 500 damage, có nhánh kết thúc trận |
| Dian Keto the Cure Master | official:84257639 | Hồi 1000 LP, không làm thay receipt phí đã trả |
| Smashing Ground | official:97169186 | Chọn quái đồng DEF lúc resolution |
| Hammer Shot | official:26412047 | Quái ngửa tấn công ATK cao nhất trên hai sân, tie choice |
| Tribute to The Doomed | official:79759861 | Discard và target lúc activation, phí không hoàn |
| Monster Reincarnation | official:74848038 | Discard và target Mộ, kiểm identity/vị trí lúc xử lý |
| Block Attack | official:25880422 | Target đổi sang DEF, giữ quota đổi tư thế |
| Earthquake | official:82828051 | Quái ngửa ATK trên cả hai sân, không target/lật bài úp |
| Ookazi | official:19523799 | 800 damage, có nhánh kết thúc trận |

ID và fingerprint lấy từ `COUNTER_CONTINUATION_PINS` trong
`packages/engine/src/counter-continuation.ts`, đối chiếu 19 bundle và
14 file review active ở `tools/runtime-catalog-inputs.json`. Review S vẫn
quyết định điều kiện riêng; bảng không viết lại text bài hoặc metadata nhập.

## Ma trận hiện hành và mục tiêu

| ID | Pattern / cửa sổ | Hiện hành v5 | Mục tiêu C3/C4 |
| --- | --- | --- | --- |
| R1 | S; hai Pass; resolving có thể pause effect-choice | Đã mở | Giữ đúng 11 plan, resume/terminal và cleanup |
| R2 | Một FLIP đã hỗ trợ; choice/response/pass/resolve | Đã mở riêng | Giữ Hane-Hane, Man-Eater Bug, Faith; không ghép Counter vào monster effect |
| R3 | T^k, k=1..3 trong deck hợp lệ, cùng summon-response | Đã mở nhiều Trap Hole | Giữ LIFO, cùng target có thể mất trước link sau, owner-order cleanup |
| R4 | S → M → V^n | n=0..2 | n=0..6 khi nguồn, ô, LP và priority hợp lệ |
| R5 | T → V^n | n=0..3 | n=0..6 khi nguồn, ô, LP và priority hợp lệ |
| R6 | T^k → V^n, k=2..3, n>=1 | Chưa mở | Nối đúng prefix nhiều T rồi suffix V, không chen T sau Counter |

R2 chỉ giữ đường FLIP hiện có sau Flip Summon/battle và chỉ Pass trong
response của nó. Không dùng C1 để đổi việc xếp Trigger/Trap ở sự kiện Flip
Summon. R3 không coi fixture năm Trap Hole trong test thành deck hợp lệ;
deck hiện giới hạn ba bản. T chỉ dùng khi timing/occurrence của engine
thật đang hợp lệ, không bỏ qua pending Trigger để tạo prefix.

Đối với R4–R6, toàn bộ building phải ở Main1/Main2 theo scope Counter beta
đã chọn; không mở Damage Step. Chain đang resolving, có pending decision,
đã kết thúc hoặc đang cleanup không được nhận activation mới.

### Vì sao phạm vi hữu hạn mà không chọn mốc năm/sáu link tùy ý

Ba lá T/M/V đều có `legality.maxCopies=3` trong dữ liệu nhập. Mỗi bên có
năm ô Phép/Bẫy; nguồn activation còn chiếm ô trong lúc xây Chain. Pool hiện
không có hiệu ứng đưa Trap về tay/Set lại hoặc đổi control Trap giữa Chain.

Vì vậy, trong **hai họ đề xuất với deck hợp lệ**:

| Họ | Ràng buộc tính toán | Dài nhất có thể đạt |
| --- | --- | --- |
| S → M → V^n | n<=6, mỗi bên tối đa 3 V; cộng S/M của từng bên không vượt 5 ô | 8 link |
| T → V^n | n<=6, mỗi bên tối đa 3 V | 7 link |
| T^2 → V^n | Hai T và V của chủ T không vượt 5 ô | 8 link |
| T^3 → V^n | Chủ T chỉ còn 2 ô cho V; bên kia tối đa 3 V, nên n<=5 | 8 link |

Đây là bound suy từ pool/zone hiện có, không phải luật Yu-Gi-Oh! giới hạn
Chain tám link. Không sửa deck hoặc tạo bản sao thứ tư để đạt độ dài.
Activation vẫn kiểm điều kiện thực từng bước; tám link không cấp quyền
cho pattern bất kỳ. Thêm control/revival/custom effect sau này phải xem
lại bound, không tái sử dụng nó làm luật chung.

### Kết quả cần kiểm chứng, không phải bằng chứng mới

- V giải quyết từ trên xuống, phủ nhận activation/phá liên kết Trap ngay
  trước; link đã bị phủ nhận không tiếp tục phủ nhận link trước nó.
- Với R4: n chẵn (kể cả 0), M còn xử lý và phủ nhận S; n lẻ, M bị phủ nhận,
  S tiếp tục đúng một lần, có thể pause choice hoặc kết thúc trận.
- Với R5: n lẻ phủ nhận T nên quái sống; n chẵn T tiếp tục và phá quái nếu
  target còn hợp lệ. Không hoàn Summon quota trong cả hai trường hợp.
- Với R6: suffix chỉ tác động trực tiếp tới T cuối. Các T trước vẫn phải
  được xử lý độc lập. Không suy “Seven phủ nhận T cuối” thành “quái sống”;
  T trước có thể phá cùng quái, link còn lại kiểm target và no-op khi cần.
- Phí của mọi activation được chấp nhận vẫn giữ nguyên dù link bị phủ nhận.
  Một payer trả m khoản Seven cần ít nhất 1000*m+1 LP trước các khoản đó
  nếu không có thay đổi LP xen giữa; không dựng lại LP bằng số dư trung gian.
- Nguồn bị phá bởi negate vào Mộ tại bước xử lý tương ứng; nguồn S/T/M/V
  còn lại được cleanup ở cuối theo chính sách đã review, không làm lại cost.
  Target của Monster Reincarnation được kiểm lại theo identity/vị trí đã
  pin, không tự chọn lại một lá vừa vào Mộ do bước negate trước đó.

Tính chẵn/lẻ là oracle phụ để đối chiếu. Resolver phải đi từng link và kiểm
condition/identity, không chỉ tính parity rồi áp kết quả toàn board.

## Ma trận từ chối trước mutation

| Nhóm | Ca bắt buộc |
| --- | --- |
| Condition/speed | V phản hồi S hoặc FLIP; M phản hồi T/M/V/FLIP; T sau V/M; S chain vào link khác; V nhắm link cũ thay vì cuối |
| Timing/priority | Sai người đang có priority; Trap Set cùng lượt; ngoài Main cho họ Counter; pending choice/cleanup; activate trong resolution; sau terminal |
| Cost/zone | LP 1000/999/1; LP thiếu cho khoản sau; M tay rỗng; discard không thuộc tay mình; source không Set/không trên sân mình/ô đã đổi |
| Review/pin | Review cũ không được mở họ mới; definition/revision/hash/scope/continuation lệch; journal ứng viên dùng làm frame live |
| State/transport | Sai duel/version/ghế; raw instance ID; handle nguồn/Chain/decision cũ; command ID trùng payload khác; source/link/receipt trùng hoặc bị giả |
| Bound/fixture | Deck vượt copy limit; một nguồn dùng hai lần; prefix/suffix ngoài grammar; không lách bằng sửa Chain length, đổi effect ID hay LP history |

Mỗi ca lỗi phải kiểm state đầu vào, LP, source position/zone, Mộ, version và
public activity không đổi. Rejected intent không trả phí hoặc lật bài. Retry
cùng command trả cùng outcome và không làm thay state hiện hành.

## Các điểm code phải xử lý theo thứ tự

| Thành phần hiện tại | Vấn đề cần giải quyết | Bước dự kiến |
| --- | --- | --- |
| `duel.ts`: activateLPCounterTrap / pass / invariants | Prefix và resolver phân nhánh theo length 2/3/4; invariant có cap 5 | C2 tạo graph/dispatcher chung có grammar rõ; không chỉ nâng cap |
| `counter-review.ts`, `registry.ts` | Scope/continuation v1–v5 pin pattern và revision | Giữ schema/gate cũ; thêm review/gate mới trước C3; revision registry đổi rõ |
| `seven-lp-cost-ledger.ts`, `three-seven-lp-cost-ledger.ts` | Ledger v1 tối đa hai khoản; v2 đúng ba khoản | C2 thiết kế ledger ứng viên nhận 1..6 receipt, giữ API/v1/v2 cũ cho lịch sử |
| Các journal trong protocol/continuation | Frame riêng cho từng pattern; root choice và cleanup có lifetime riêng | Dùng context chung stage/cursor/link identity, kiểm board binding theo stage; lịch sử phí không giả làm binding hiện tại |
| `chain-cleanup.ts` | Primitive nhận tối đa 10 nguồn, đã có owner permutation; không cấp quyền activation | Tái dùng primitive; integration phải đưa đúng survivor set, chờ đủ hai owner rồi commit một lần |
| `available-actions.ts` | V chỉ probe length 1/2/3 | C3 gọi cùng gate cho từng prefix hợp lệ; giữ probe bất biến; không chỉ đổi mảng độ dài |
| PlayerView/adapter/app/browser tools | Handle link đã xử lý, preview, decision riêng và public facts | Chỉ chiếu link/choice hợp lệ theo stage; preview latest link; giữ ẩn raw journal/ledger/source snapshot |
| `engine-capabilities.ts` | Chuỗi mô tả limitations còn chỉ kể một phần pattern v5 | C3 cập nhật mô tả theo review mới, không nâng số supported effect hoặc metadata nhập |

Activation negation là thao tác mới cần ở hai họ này; effect negation chưa có
lá nào trong pool thực hiện. Giữ hai trường riêng và chặn effectNegated giả;
không công bố một API effect-negation tổng quát chỉ vì có field trong type.

## Trình tự triển khai và kiểm chứng

1. C2a: graph validator và ledger ứng viên, oracle LIFO độc lập, không đổi
   manifest active. Kiểm mọi số n có thể đạt, owner/copy/zone và biến thể lỗi.
2. C2b: dispatcher/journal ứng viên cho R4/R5/R6; reuse plan S và cleanup;
   pause/resume, terminal/concede, source/board drift. Candidate tests tách
   khỏi gameplay và không được gọi là activation live.
3. C2c: dùng phần chung cho pattern cũ sau khi đối chiếu behavior/baseline;
   gate v5 vẫn chặn pattern mới. Không giữ một đường resolver mới chưa chạy
   và gọi đó là đã hoàn tất tích hợp.
4. C3: review mới có nguồn/pins và giới hạn suy luận; schema/registry/gate,
   activation/discovery/projection/UI nối cùng scope; kiểm prefix mới bằng
   hành động thật, không chèn receipt hoặc sửa board sau setup.
5. C4: hành trình nhiều lượt cho cả hai họ, odd/even, dài nhất hợp lệ,
   thiếu phí rút ngắn chuỗi, nhiều T không bị đồng nhất; retry/receipt/handle,
   root choice/terminal, hai batch owner, giữ deck và dữ liệu khi nhập lỗi.
   Full Linux và Windows CI đúng source cuối, đọc đủ report/log và so baseline.

Ma trận logic phải có hai ghế, Main1/Main2, mọi phân chia V giữa hai người
trong giới hạn ba bản/ô còn lại, M cùng/khác người kích hoạt S, và toàn bộ
11 S ở nhánh được xử lý/bị phủ nhận. Bao phủ root cost/target/tie,
draw 0/1/2, damage lethal, heal và source cũ trả về tay rồi dùng lại.
Không nhân mọi biến thể thành cùng một test UI nặng: engine/candidate kiểm
các graph khả thi; adapter kiểm identity/receipt/privacy; UI kiểm đại diện
các tương tác khác nhau và bound dài nhất. Ghi bảng coverage thực tế thay
vì đặt một số test mục tiêu rồi coi số lượng là điều kiện đạt.

Bộ liệt kê thiết kế kiểm được 69 chuỗi owner V cho prefix một T và 69 cho
hai T, 36 cho ba T (gồm n=0), tổng 174. Đây chỉ là phân bổ owner theo copy/
zone, chưa xét LP/target/timing và **không phải 174 test đã chạy**. Chuỗi
owner có thể có cùng người liên tiếp nhờ đối thủ Pass. Trường hợp sáu V ở
R4 có 20 phân bổ 3+3, hợp với cả M cùng hoặc khác chủ S. Các số này giúp
kiểm generator không bỏ trường hợp hoặc sinh fixture vượt ô, không chứng
minh nguồn luật hoặc hiệu ứng.

## Căn cứ đang có và điểm cần review tiếp

| Căn cứ trong repo | Dùng cho thiết kế | Giới hạn |
| --- | --- | --- |
| [Seven Tools review](../rules/seven-tools-review.md), v5 với 40 evidence | Card activation, direct response, LP cost và Speed 3 | Chỉ active v5 mới mở đúng pattern hiện tại; không tự mở suffix dài hơn |
| [Counter-to-counter review](../rules/counter-to-counter-review.md) | LIFO, phản hồi Counter, no-refund, root continuation | Có nguồn archive/cộng đồng và bổ sung hiện tại; không phải FAQ TCG 2005 riêng cho mọi độ dài |
| [Cleanup review](../rules/chain-cleanup-order-review.md) | Chain-end cleanup, owner chọn thứ tự trong batch | Chính sách tổng hợp có giới hạn tin cậy; không suy thứ tự giữa hai Mộ |
| [Trap cleanup](trap-cleanup-order.md), [v5 live](trap-three-seven-live.md) | Nhiều T, occurrence, invariants, activation thật và cleanup | Không có bằng chứng live cho R6 hoặc link Counter thứ năm trở lên |
| [Battle timing](../rules/battle-timing-spec.md) | Ghi nhận ranh giới Trigger/SEGOC/Damage Step tương lai | Là đặc tả rộng, không phải toàn bộ đã được triển khai |

C3 phải viết review bổ sung cho grammar mới, source/link semantics và
cleanup survivor set qua nhiều T. Có thể tái dùng evidence đã lưu nếu thực
sự hỗ trợ kết luận, ghi rõ đó là suy luận; nếu thiếu thì tìm thêm và ghi
nguồn thật. Không thêm quotation/ngày truy cập giả, không chỉnh historical
pending thành verified để vượt gate. Nếu tìm được mâu thuẫn với semantics
đề xuất thì dừng báo ảnh hưởng và sửa thiết kế trước khi bật runtime.

## Điều kiện đóng Chain và những gì để sau

Đóng C4 khi R1–R6 trong phạm vi nêu trên hoạt động đúng với deck hợp lệ,
mọi ca từ chối/identity/privacy/cost/cleanup có bằng chứng, không còn lỗi
chặn đã biết, Linux/Windows CI đạt và artifact khớp source. Không trì hoãn
editor để tiếp tục thêm vô hạn lá hoặc Chain pattern ngoài bảng.

Ngoài scope: SEGOC tổng quát, optional timing mới, Trigger mới phát sinh
giữa Chain, Damage Step mở rộng, Quick-Play/Continuous/Field effects mới,
modifiers/replacement/cost reducers, control change, Special/Fusion/Ritual,
summon-negation, effect-negation tổng quát, online/auth/lưu trận. Giữ hành
vi FLIP/battle đã có; không xóa chúng vì không tổng quát hóa trong C1.
Custom U1 chỉ dùng mẫu được hỗ trợ; hiệu ứng mới cần một scope riêng.

## Ước lượng sau khi đọc code

| Mốc tiếp theo | Ước lượng còn lại | Rủi ro chính |
| --- | --- | --- |
| C2a–C2c | 3–5 ngày công | Thay nhiều frame cũ mà giữ behavior; tách lịch sử cost khỏi board binding |
| C3 | 2–4 ngày công | R6 mới, đổi gate và đồng bộ UI; review có thể yêu cầu thêm nguồn |
| C4 | 2–3 ngày công | Số tổ hợp tăng, thời lượng suite/CI, lỗi chỉ xuất hiện trên Windows |

Chain còn **7–12 ngày công** sau C1; không quy đổi thành số phiên 30 phút
chắc chắn vì một tác vụ có thể kéo dài qua mốc dừng. Ước lượng editor và
Windows 11 giữ tại [lộ trình](chain-beta-roadmap.md). Khoảng thời gian là
công sức dự kiến, không cam kết ngày phát hành; thiếu môi trường Windows
11 vẫn là blocker W1, không được thay bằng kết quả Windows CI.

## Ghi nhận chu kỳ C1

Đã đối chiếu code guard/dispatcher/invariants, registry/review active,
ledger v1/v2, cleanup primitive, 11 pins và copy limit trong dữ liệu nhập.
Build và xuất capability hiện hành đạt; capability mới chưa được mở.
Kiểm phân bổ owner/copy/zone là phép tính kế hoạch, không chạy hiệu ứng.
Thay đổi chỉ ở tài liệu; không chạy lại full suite hoặc CI cho kế hoạch.
Tác vụ tiếp theo đã xác định: **C2a — validator graph và ledger ứng viên**.
Kết thúc C1 rồi dừng báo cáo, chưa chuyển sang viết C2a trong cùng chu kỳ.
