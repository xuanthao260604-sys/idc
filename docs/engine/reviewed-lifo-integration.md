# C2c — Kernel LIFO dùng chung trong gameplay v5

Mốc 09/11/2026, tiếp nối [C2b ứng viên](bounded-counter-dispatcher.md).
Đã tích hợp phần lập lịch LIFO vào các pattern đang mở. **Không mở scope,
review hoặc activation mới**; link Counter thứ năm vẫn bị chặn trước trả
phí/lật nguồn. C3 vẫn là mốc riêng trước khi mở các họ dài hơn và prefix
nhiều Trap Hole có Seven.

## Phần dùng chung và ranh giới

`packages/engine/src/counter-lifo-schedule.ts` là kernel thuần: từ graph
đã qua guard, trả các bước resolve/negate/skip với index liên kết. Không
đổi flags/board/LP/receipt, không freeze input hoặc giữ reference của caller.
Nó chỉ kiểm hình học prefix/response trực tiếp, identity và unspent flags;
không xác minh card condition, pin, cost, priority hay review. Bound tám
link phục vụ thành phần ứng viên, không phải luật Chain hoặc quyền gameplay.

Caller vẫn bắt buộc đi qua invariant/parent validator hiện có trước khi
dùng kernel. Trong `duel.ts`, `emitValidatedCounterLifo` ánh xạ schedule
sang đúng EngineEvent cũ, để engine sở hữu eventSequence/simultaneousGroup,
lastRelevantEvents và version. Không chuyển live effect ID sang ID ứng
viên, không cài output/journal C2b vào DuelState hoặc tăng version hai lần.

Các đường Counter cũ nay dùng chung schedule/fact mapping:

| Pattern đang mở | Cách giữ board/parent contract |
| --- | --- |
| S → Magic Jammer | Kernel chọn negate S; live helper chuyển nguồn vào Mộ rồi cleanup Counter đơn như cũ |
| Trap Hole → Seven | Cùng helper hai link, đúng fact Trap thay vì Spell |
| S → Magic Jammer → Seven | Parent cũ kiểm graph/cost/pin, dùng kernel chọn nguồn bị negate; giữ root plan/resume và cleanup frame cũ |
| Trap Hole → Seven → Seven | Kernel chọn Seven đầu bị negate, giữ bước Trap Hole phá target và private cleanup cũ |
| S → Magic Jammer → Seven → Seven | Atomic parent patch chọn nguồn bị negate theo kernel; journal/remaining Chain và owner order giữ nguyên |
| Trap Hole → Seven → Seven → Seven | Tương tự, giữ đúng quái sống sót và ba receipt LP lịch sử |

Hai pattern hai link dùng cùng resolver, nên đây là năm đường resolver
Counter. Luồng chỉ có nhiều Trap Hole cũng duyệt schedule chung, giữ
cleanup list theo thứ tự xử lý cũ. S đơn và FLIP vẫn dùng đường cũ; không
thay timing/SEGOC/Damage Step hoặc handler hiệu ứng.

`bounded-counter-dispatcher.ts` cũng dùng kernel này thay vòng lặp chọn
negation riêng. Oracle test C2b tiếp tục độc lập; không biến oracle thành
implementation dùng trong gameplay. Các API ứng viên lịch sử v1–v5 giữ
kind/effect ID/gate và shape output cũ; chúng không tự cấp activation mới.

## Frame, privacy và tương thích

Giữ nguyên tất cả parent frame, schema protocol, decision ID/options và
thứ tự cleanup của từng pattern. Các frame cũ tiếp tục kiểm pin/source/
ledger/board binding và lifetime; cleanup/concede/terminal vẫn xóa context
như trước. Không serialize journal ứng viên, raw LP receipt hoặc source
snapshot ra PlayerView. Adapter và command schema không đổi.

Với parent đã trả atomic board patch, helper chỉ phát facts tương ứng,
không chuyển nguồn vào Mộ lần nữa. Với parent chưa di chuyển nguồn, helper
thực hiện movement đúng bước negate. Root resolver vẫn nhận đúng context,
không refund/thu cost lại hoặc chạy root hai lần khi resume/retry.

Registry capability revision, active Seven review v5 và capability JSON
giữ nguyên vì public state/behavior và phạm vi không đổi. Không sửa dữ
liệu nhập, review/evidence, format, ảnh/khung/mặt sau hoặc deck mẫu/lưu.

## Baseline trước sửa và kiểm thử mới

Trước khi sửa bất kỳ file engine nào, đã capture baseline bằng code của
`88b16180cab1ca5e4b2e1eb1d721ccd467168c0c`, lưu tại
`tools/fixtures/reviewed-lifo-baseline.json`. Generator có fixture ban đầu
rồi chỉ dùng applyAction thật; không sửa board hoặc chèn receipt giữa
các activation/resolution. Đây là hành trình có setup kiểm soát, không
phải trận tự nhiên hoặc bằng chứng luật mới.

142 hành trình baseline gồm:

- 66 trường hợp 11 Phép × A/B × 0/1/2 Seven sau Magic; có tay/Set,
  Main1/Main2 và các cách chia controller theo fixture.
- 72 trường hợp Trap Hole × A/B × 1/2/3 Seven × normal/tribute/flip ×
  hai cách chia controller × Main1/Main2.
- Bốn concession khi đang root-choice hoặc cleanup ở hai ghế.

Mỗi hành trình giữ hash **toàn bộ state và raw events sau từng command**,
gồm version, LP, source/target, Mộ, private frame/decision và clock. Không
chuẩn hóa bỏ field để làm baseline khớp. Test không tự ghi lại baseline.
Các ma trận controller/cost đầy đủ hơn vẫn do các suite cũ kiểm tra.

163 ca mới trong `tools/reviewed-lifo-migration.test.ts`: 142 baseline,
một ca provenance/list, 17 graph âm, một ca output bất biến/input không
freeze và hai ca A/B có source Set hợp lệ/đủ LP nhưng activation thứ năm
vẫn bị từ chối. Trong hai ca cuối kernel có thể lập lịch giả định năm link,
nhưng applyAction giữ đúng gate v5, không trừ LP hoặc lật lá. Planning không
được nhầm với activation permission.

Các kiểm thử C2b/C2a và legacy ứng viên tiếp tục chạy, không chuyển những
case synthetic thành bằng chứng gameplay live. Capability mới của C1 vẫn
chưa được mở chỉ vì đã có kernel dùng chung.

## Kiểm chứng

Linux local: source cuối đạt typecheck, build, cards:check đủ 19 bundle và
**4832/4832 test trong 63 file**. Gồm 163 ca migration mới, 542 ca C2b,
524 ca C2a và toàn bộ suite legacy. Các module parent được đổi sang kernel
sau đợt full đầu đã được kiểm lại bằng targeted và full suite trên source
cuối; không gán kết quả của bản trung gian cho bản cuối.

Capability JSON bằng mốc C2b. Trong snapshot 320 file cũ, chỉ bốn file engine
đổi đúng phạm vi refactor; data/apps/protocol/manifest/package/lock cũ giữ
nguyên byte. Interpreter C2b cũng đổi sang kernel chung, giữ API và kết quả.
Không chạy lại browser Linux trong mốc này; bằng chứng Linux hiện hành là
unit/integration/typecheck/build/data, không cộng số browser lịch sử.

CI Windows/Ubuntu chờ xác nhận source. Artifact Windows phải đúng source
và giữ facts của 102 browser report; không dùng việc Linux đạt thay bằng
chứng Windows. Windows 11 desktop vẫn chưa chạy; chưa đóng gói/bàn giao beta.

## Điểm dừng

Hoàn thành C2c khi migration và hồi quy hai nền tảng đạt, rồi dừng báo cáo.
Việc tiếp theo C3 bắt đầu bằng review mới cho grammar C1, xác định căn cứ
luật/pin và giới hạn trước khi nối frame/activation/discovery/UI mới. Không
tự nâng review v5, nhập thêm bài hoặc coi Chain tổng quát đã hoàn tất.
Mốc C4 vẫn cần audit nhiều lượt trên scope mới trước khi chuyển editor và
kiểm chứng Windows 11 desktop.
