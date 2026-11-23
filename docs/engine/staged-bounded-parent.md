# C3b.2b.2 — Parent resolver staged dùng handler và EngineEvent thật

Ngày 24/11/2026 (giờ Việt Nam), kế thừa `174dcf4` và
[hợp đồng frame](bounded-counter-frame.md). Đã nối frame với parent resolver,
root/owner resume, cleanup và terminal qua seam staged. **Chưa đưa seam vào
Pass/answer công khai, chưa lưu frame trong DuelState, chưa mở activation
v6 hoặc HTTP/projection/UI cho scope mới.** C3/C4 chưa hoàn tất.

## Đường xử lý và clock

`resolveStagedBoundedCounter` nhận một entry đáng tin cậy đã trả phí, đủ hai
Pass và đóng response. Nó kiểm frame/preflight, clone input, chạy kernel
LIFO và dùng các helper hiện có trong duel.ts để phát EngineEvent và áp
hiệu ứng. Không gọi candidate interpreter, không đổi ID candidate trong
production và không giữ một bản entry DuelState/replay journal trong frame.

Counter còn hiệu lực negate đúng activation liền trước; negate/skip/resolve
phát event thật. Trap prefix kiểm lại target location/position/ATK trước
mỗi link; target rời sân không bị phá hoặc đưa vào Graveyard lần hai.
Phép gốc dùng chính `resolveSpell`, planResolution, draw/damage/heal/return/
position/destruction và helper chuyển bài hiện có. Cost từ activation được
đọc như lịch sử, không trả hoặc hoàn lại ở resolver.

Các pause trả `state + frame + events` riêng. Frame chỉ nằm trong Context
staged và sidecar của kết quả, không thêm field/null mặc định vào state v5.
Parent bind frame vào view của clock commit `stateVersion + 1`, rồi chỉ tăng
version thật một lần khi kết thúc transition. Cleanup checkpoint, commit
và release có thể cùng version, với event sequence tiến lên. Root terminal
ngay sau sweep dùng release của frame gốc, không hỏi order sau trận.

`resumeStagedBoundedCounter` dùng RequestSchema/actor/version như engine,
chỉ nhận answer-decision hoặc concede khi đang pause. Kiểm frame/current
binding trước mutation. Chọn root dùng đúng decision/option đã pin, apply
phá đúng một lần rồi sang cleanup; cleanup dùng orderChainCleanup và commit
chung khi mọi owner đã chọn. Event `cleanup-order-selected` chỉ chứa
playerId, không chứa option/permutation; Graveyard chỉ đổi khi commit.
Sai version, owner, ID, thiếu/trùng option hoặc action khác trả state/frame
cũ, không có mutation. Đây chưa phải receipt deduplication theo commandId
của transport; wiring adapter sẽ được kiểm riêng.

Sau complete/terminal, frame được bỏ và state hoàn tất qua invariant v5.
Đầu hàng dùng endDuel hiện có, giữ LP và vị trí các nguồn còn sống. Hai
entry mới là seam backend đáng tin cậy, không phải một API nhận snapshot
hoặc frame từ client. Hash/frame không xác thực lịch sử lệnh tùy ý.

## Phạm vi kiểm chứng

689 ca mới bắt đầu từ **fixture tổng hợp với receipt đã mô hình hóa**;
chưa phải chuỗi activation v6 bằng applyAction. Chỉ test fixture gán ID
staged. Sau entry, parent thực thi handler/helper và emit EngineEvent thật;
resume gọi request schema và transition staged thật, không tự sửa board để
mô phỏng kết quả resolver như suite frame trước.

- 344 Trap cases: hai ghế × 172 phân bổ copy/slot hợp lệ, gồm nhiều Trap Hole.
- 276 Pot cases: hai ghế × hai owner Magic × 69 suffix owner; so resolve/
  negate với oracle reduction độc lập và kiểm draw đúng một lần.
- 44 trường hợp của đúng 11 plan Phép với suffix 1/2/5/6, kể cả heal và
  target discard/graveyard; ba root choice và các resume/cleanup.
- Required draw từ 0/1/2 lá cho cả hai ghế, damage không terminal cho hai
  Phép/hai ghế, concede, request sai/stale, private order và handoff state.

Mỗi transition thành công chỉ tăng một state version; event sequence liên
tục, group identity riêng và không trả cost lại. Input bất biến; phí giữ
nguyên trừ biến động effect hợp lệ. 142 golden journey trong suite migration
163 ca không thay file/hash state/raw events. State staged trước xử lý vẫn
bị invariant/activation v5 từ chối; không nâng số playable/effect nhập bài.

## Điểm dừng và bước kế tiếp

Dừng sau parent staged và báo cáo. Bước tiếp theo C3b.3: đưa frame vào server
state có phiên bản/gate v6, nối Pass/answer/activation, discovery, preview,
public/private projection và UI. Giữ so sánh legacy v5 có phiên bản; không
tái sinh golden vô điều kiện. Chỉ gỡ guard registry sau đủ bằng chứng cho
đường chơi mới; hiện review/manifest vẫn v5.

C4 vẫn cần audit nhiều lượt trên scope mới. Sau Chain giữ mục tiêu U1 bộ tạo
bài riêng và W1 Windows 11 desktop thực. Ước lượng C3 tổng thể 2–4 ngày công
cần cập nhật theo tích hợp, không phải cam kết số phiên 30 phút. Chưa đóng
gói/bàn giao beta và không coi Windows runner là Windows 11 đã kiểm chứng.

## Bằng chứng chốt

Code được kiểm chứng: `096a23e8ccb594a1352a67e0ea6e8dce6f683536` tại
[CI 45255332294](https://github.com/xuanthao260604-sys/idc/actions/runs/45255332294),
attempt 1. Ubuntu job `137975532869`, Windows job `137975533528` đều
completed/success. Đã đọc log Ubuntu, source SHA khớp: **6149/6149 test/67
file**, typecheck, data/build và vanilla/mixed smoke đạt. Local cũng đạt
**6149/6149 test trong 67 file**, typecheck, cards:check/build và hai smoke.
Suite parent mới đủ 689 ca; migration cũ đủ 163 ca, 142 golden không đổi.

Artifact `windows-validation-45255332294-1`, ID `14859572005`;
SHA-256 ZIP khớp metadata GitHub:
`aace328c6ba35730e3cb7d0fc4d563d68443d8c21cbd654e73b4b1db984d9e73`.
Report: `2026-11-23T20-03-57-548Z-6312/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0,
npm 11.17.0, Edg/157.0.4341.60: **6149/6149 test/67 file, 112/112 bước,
102/102 browser report**, runtimeExceptions=0.

Đã đọc đủ 112 raw step log; từng JSON browser khớp report, đủ 102 report,
đúng platform/version và không runtime exception. So artifact baseline
C3b.2b.1 `windows-validation-45193878890-1` source `3e716ba`: 66 suite cũ
giữ số ca, chỉ thêm suite parent 689 ca; 102 browser facts giữ nguyên khi
bỏ riêng browserVersion; capabilities.log giống nguyên byte. ZIP baseline
cũng khớp metadata đã lưu. Không ghép report/log khác source.

Mọi data/reviews/evidence/bundle/ảnh/deck nguồn, protocol/UI và 142 golden
giữ nguyên byte. README trước chu kỳ giữ nguyên nội dung; capabilities
local khớp baseline. Chỉ duel.ts là source engine cũ được sửa, các nhánh
mới đòi Context staged; đường chơi/manifest v5 giữ nguyên.

689 ca mới dùng entry receipt tổng hợp rồi chạy handler/event/resume của
parent staged, không phải bằng chứng activation, HTTP hoặc UI v6. Frame
vẫn là sidecar; registry v6 còn bị chặn và chưa tạo active review v6.
Commit chốt sau CI chỉ cập nhật tài liệu `[skip ci]`; bằng chứng code thuộc
`096a23e`. Report ghi `windows11DesktopVerified=false`; chưa kiểm Windows 11
desktop, chưa đóng gói/bàn giao beta. Tiếp theo là wiring C3b.3, C3/C4 chưa
hoàn tất; mục tiêu sau Chain vẫn là bộ tạo bài riêng và Windows 11 thực.
