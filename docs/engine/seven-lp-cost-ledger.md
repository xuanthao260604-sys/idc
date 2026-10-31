# Bản ghi nhiều lần trả LP của Seven Tools — thành phần nội bộ

Mốc 31/10/2026: chuẩn bị packages/engine/src/seven-lp-cost-ledger.ts cho
phần Chain tiếp theo. **Chưa được gọi từ game.** Không thêm activation,
review đang hoạt động, DuelState field, UI hoặc kiểu phản hồi mới.
Seven Tools → Seven Tools vẫn bị chặn như trước.

## Bài toán và phần đã làm

Guard hiện tại so LP hiện hành với afterLP của một Counter đang sống.
Khi cùng một người trả hai lần trong một Chain, không thể buộc LP cuối bằng
cả hai số dư trung gian. Module mới kiểm một hoặc hai payment Seven đã trả:

| Trường hợp | Receipt | Số dư cần khớp lúc capture |
| --- | --- | --- |
| Một lần | 1001 → 1 | Người trả còn 1 |
| Cùng một người, hai lần | 2001 → 1001, rồi 1001 → 1 | Còn 1; tổng trả 2000; before lần sau phải bằng after lần trước |
| Hai người, mỗi người một lần | Mỗi người 1001 → 1 | Mỗi người còn 1, không so after của A với LP của B |
| Sau hiệu ứng hồi LP | Receipt cũ vẫn 1001 → 1 dù LP mới 1001 | History vẫn đúng; binding board lúc capture đã hết hiệu lực |

2001 là kết quả số học của hai lần trả 1000 và giữ LP >0, không phải một
quotation/ruling mới được gán cho lá. Dùng đúng fixed cost và ngưỡng >1000
đã duyệt ở review Seven hiện hành; không thêm cost reducer/payment trigger.

captureSevenLPCosts nhận state server tin cậy với cost **đã trả**, kiểm:

- Definition Seven theo toàn SHA hiện hành, revision/format/registry, source
  face-up đúng ô/controller, snapshot activation khớp và Set từ lượt trước.
- Mỗi source Seven một event life-points-paid, fixed 1000, before/after nguyên
  an toàn, before >1000, after=before−1000; không card target/affected card.
- Link/source/event sequence/group không trùng, payment theo thứ tự Chain,
  sequence trước capture; payer khớp controller. Không nhận LP event từ lá khác.
- Cùng payer có chuỗi số dư nối tiếp; tổng/count theo từng người và current LP
  khớp after cuối của họ. Một hoặc hai receipt, không tự chấp nhận nhiều hơn.

Không trừ LP, trả phí lại, refund, phát event, thay card/zone hoặc resolve bất kỳ
hiệu ứng nào. Output là ledger đóng băng sâu, không phải một DuelState ổn định.
Mọi input lỗi giữ nguyên dữ liệu và không đóng băng object caller đưa vào.

## History khác với trạng thái hiện hành

Ledger pin duel/registry/format/turn, player IDs, clock tại capture, receipt
IDs/source IDs, số tiền/số dư, totals và board fingerprint. Hash integrity
phát hiện drift, không phải chữ ký xác thực; ledger client gửi không đáng tin.

assertCurrentSevenLPCosts kiểm board/source/cost hiện hành và đồng hồ không
lùi. Pass thông thường không đổi board vẫn hợp lệ. Sau root chạy, card rời
sân hoặc LP hồi, binding cũ bị từ chối. assertSevenLPCostHistory **chỉ** kiểm
cấu trúc, arithmetic/chronology và integrity của history đã capture; nó không
chứng minh một board mới, legal activation hoặc hiệu ứng vừa thực thi đúng.
Parent resolver tương lai phải giữ ownership ledger phía server, kiểm graph,
timing, toàn bộ zone invariant, transition effect và binding board mới riêng.
Không dùng history để bỏ guard current LP ở mọi Chain một cách tổng quát.

Ledger không diễn giải điều kiện effectId để cấp quyền phản hồi. Full activation
graph/priority do gate và engine kiểm riêng. Module không thay thế schema toàn
DuelState, receipt dedup, phiên bản lệnh hoặc PlayerView allowlist. Không có
API/field mới nhận ledger từ người chơi, không serialize ledger vào view.

## Kiểm thử

58 ca mới trong tools/seven-lp-cost-ledger.test.ts:

- 8 payment thật của pattern Normal Spell → Magic Jammer → Seven đang mở,
  trên A/B và các tổ hợp controller Counter; capture bằng lệnh engine thật.
- 16 fixture hai receipt: A/B × cùng/khác payer × LP tối thiểu/8000 ×
  Chain đang xây/bước capture resolving. Hai link đầu do engine tạo; activation
  Seven thứ ba được xác nhận **bị từ chối** trước khi fixture chuẩn bị receipt
  ứng viên. assertDuelInvariants vẫn từ chối state ba link ứng viên đó.
- 24 input sai bị chặn trước trả ledger, gồm số dư, amount/sequence/source,
  snapshot/Set turn, metadata, context và clock; không trả phí/move/freeze input.
- Gap trong cùng payer dù mỗi subtraction riêng đúng; 6 ledger bị đổi; cả
  trường hợp test chủ động tính lại hash nhưng arithmetic vẫn sai.
- Dian Keto xử lý thật sau capture: history giữ cost cũ trong khi binding board
  cũ bị từ chối; Pass tăng clock hợp lệ, clock lùi bị chặn; JSON round-trip.

Không gọi fixture hai Seven là các activation đã được game chấp nhận hoặc
luồng ba Counter qua UI. Chưa có effect/cleanup của pattern đó để test.
16 fixture chỉ kiểm accounting, không kiểm legal graph hoặc mọi kiểu negation.

Đã build/import module bằng Node ESM thật: capture từ activation Seven hợp lệ,
cho Reincarnation xử lý/cleanup rồi dùng Dian hồi LP. History vẫn afterLP=1,
LP mới 1001 và live binding cũ bị từ chối. Probe không đăng ký module vào game.

## Kiểm chứng và dữ liệu

Linux source 920c1fa đạt 2303/2303 test trong 52 file, đủ 58 ca mới;
typecheck/build/check 19 bundle đạt: 112 nhập, 95 verified data, 17 historical
pending. Đã import và chạy module build bằng Node thật, đọc history và từ chối
binding cũ sau khi LP hồi. Log riêng tại /tmp/idc-lp-ledger/final-tests.log,
final-data-build.log và node-probe.log. Đây là unit/build mới, không đổi số test
trong báo cáo full browser Linux của mốc trước.

Windows và Ubuntu CI đạt trên source
920c1fa0e2be26bc932fe92c2a269848596668be tại
[run 41201619908](https://github.com/xuanthao260604-sys/idc/actions/runs/41201619908).
Đã tải/đọc artifact windows-validation-41201619908-1 và từng log tại
artifacts/ci-seven-lp-ledger/2026-10-31T12-33-40-500Z-8368/report.json.
Windows win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62: 2303/2303 test/52 file, đủ 58 ca ledger mới,
84/84 bước và 74/74 browser report, runtimeExceptions=0. Mỗi bước browser có
một report khớp host/version. Capabilities JSON bằng baseline trước module;
10 mode ba link đơn, hai mode tương tác dài và hai trận tự nhiên giữ kết quả.
Các browser report kiểm scope gameplay cũ; không phải kiểm Seven → Seven
đã được activation chấp nhận. Report vẫn windows11DesktopVerified=false;
Windows 11 desktop chưa thử trực tiếp.

310 file đầu vào/mã sản phẩm cũ giữ nguyên SHA-256: data/, packages/ đang hoạt
động, apps/, manifest, package/lock, raw/generated/import/format/review, artwork,
starter và deck. Chỉ thêm module/test, không sửa metadata nhập hoặc effect.
Không đổi registry capability version, review active hoặc 112 definition/
95 quái thường/17 hiệu ứng/13 scope/19 snapshot hiện có.

Không lặp full browser Linux cho module chưa được nạp vào runtime. Báo cáo
Linux đầy đủ gần nhất vẫn source 1368375 với 2245 test/51 file, 84 bước/74
browser report tại artifacts/platform-validation/2026-10-31T10-50-30-513Z-324707/report.json.
Không gộp log unit mới vào report cũ hoặc nói report cũ chạy 2303 test.

## Tiếp theo

Người dùng đã chọn tiếp tục mở rộng Chain. Dùng ledger này trong thiết kế
riêng của Trap Hole → Seven → Seven, có review
version mới trước khi mở. Cần graph/source đã resolve, giữ LP cost của Seven
bị phủ nhận, root Trap Hole tiếp tục một lần, cleanup hai nguồn còn lại đúng
owner và private projection/receipt. Bản ghi chi phí không làm các bước đó tự
đúng. Các review v1/v2 và pattern đang chạy phải được giữ hồi quy; không mở
Counter thứ tư, generic mixed Chain, SEGOC hoặc Damage Step chỉ dựa vào cost
hay Spell Speed. Bộ tạo bài riêng và đóng gói Windows chưa làm trong mốc này.
