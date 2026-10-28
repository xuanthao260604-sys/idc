# Magic Jammer — Counter Trap trong phạm vi hai liên kết — 28/10/2026

Đã triển khai theo [review thiết kế](../rules/magic-jammer-review.md).
Runtime tăng 110 → 111 loại: 95 quái thường và 16 hiệu ứng (11 Phép,
3 FLIP, Trap Hole và Magic Jammer). Dữ liệu nhập vẫn 111/18 bundle,
95 verified/16 historical pending; không sửa snapshot hoặc cờ nhập để
đánh dấu hiệu ứng hoạt động. Bộ runtime hiện nạp cả 18 bundle.

## Review và hành vi

Review riêng data/reviews/magic-jammer.effects.json pin parsed definition
SHA-256 dcbfa15ffcecc32dd594e2794ab516642bc5ede743942717406b95f955e946bf,
format goat-2005-08-17 revision 4, scope
counter-trap-normal-spell-activation-v1. Dùng nguyên 15 evidence record
đã đối chiếu, giữ nhãn archive/community/official-current. Không xác nhận
nguyên văn bản in 2002/2005. Design evidence ngày 27/10 giữ nguyên như hồ
sơ nguồn lịch sử của bước review; runtime được mở bằng review mới này.

- Magic Jammer ở sân mình, Set từ lượt trước, đúng priority, không có
  decision đang chờ. Cần một lá trong tay để bỏ làm cost.
- Chỉ phản hồi trực tiếp activation của 11 Normal Spell đã duyệt. Người
  đối diện có quyền phản hồi trước; chủ Phép cũng có thể dùng Counter Trap
  của mình sau khi đối thủ Pass. Hand/Set của Phép gốc đều được hỗ trợ.
- Bỏ cost và lật Counter Trap khi activation được chấp nhận. Thêm liên
  kết speed 3, targetRefs rỗng và tham chiếu liên kết Phép đang phản hồi.
  Chưa áp phủ nhận hoặc hiệu ứng của Phép vào thời điểm này.
- Hai Pass liên tiếp xử lý Chain nguyên tử: Counter phủ nhận activation,
  phá lá Phép, bỏ qua toàn bộ plan của Phép; cleanup Counter đúng một lần.
  Cost gốc và cost Counter giữ ở Mộ; không hoàn lại, không tiêu quota.
- Mốc này chỉ nhận pattern Normal Spell + Magic Jammer. Magic Jammer không
  chain vào Magic Jammer vì đó là Counter Trap activation, và speed 1/2
  không phản hồi speed 3. Trong pool này hai bên chỉ còn Pass sau Counter.

Chưa mở Chain hỗn hợp tổng quát, Counter Trap khác, Quick-Play/Field/
Continuous/Equip/Ritual, protection/replacement, discard triggers hoặc
Spell activation trong Damage Step. Giới hạn hai liên kết là ranh giới
triển khai, không phải luật giới hạn số link của Yu-Gi-Oh!. FAQ cho phép
Magic Jammer trong Damage Step, nhưng pool chưa có activation Phép phù hợp
ở timing đó. Không đổi giới hạn engine thành luật cấm của lá.

## Lệnh, riêng tư và giao diện

Counter có schema review/handler riêng, không mở bằng review Trap Hole.
Giữ các lời gọi createRegistry cũ; Counter review là đầu vào bổ sung.
Sai definition/revision/legality/subtype/scope/format hoặc dùng review
Normal Trap cho Counter đều bị từ chối.

Action activate-counter-trap dùng cardHandle, discardHandle, chainHandle.
Handle liên kết tách mapping với handle lá bài, thuộc viewer và state
version, đổi khi projection/refresh đổi. Server kiểm lại link cuối và
điều kiện trước cost. Không nhận index, raw ID, amount, target hay handler
để client chỉ định kết quả. Probe availableActions không sửa state/history.

UI có nút Phản hồi Phép trên Counter hợp lệ, preview Phép đang phản hồi và
lá bỏ làm cost; không có lựa chọn target. Hủy giữ nguyên state. Chain hiển
thị speed 3 và liên kết đang phản hồi. Public facts mới phân biệt phủ nhận
activation và phá lá Phép với phá quái/LP; chỉ chứa player/count, không
sao chép event hoặc lựa chọn riêng tư. Cost đã trả ở Mộ là thông tin công khai.

Resolver chọn đúng pattern mới; không dùng finishSpell pop nhầm Counter
hoặc gọi planResolution của Phép đã bị phủ nhận. Không tạo effect-choice
của Smashing Ground/Hammer Shot khi Phép bị phủ nhận. Chỉ mở lại response
window sau cleanup; không có lệnh client chen giữa các bước xử lý.
Invariants vẫn từ chối cờ negated tùy ý trong state gửi vào; cờ phủ nhận
chỉ nằm trong xử lý nguyên tử, không nới guard cho các Chain ngoài scope.

## Bảo toàn và kiểm thử

Không sửa 18 bundle, overlay, raw hoặc evidence cũ, artwork hay starter 40.
Deck catalog 110 của A/B tải nguyên byte; nhập lại lỗi vẫn bảo toàn toàn bộ
file trong fixture. Pool đủ bản sao hiện có 331 lá; không thêm trần 60.

122 ca tools/magic-jammer.test.ts gồm ma trận 88 trường hợp A/B × tay/Set
× 11 Phép × Counter của mình/đối thủ; review drift, sai timing/cost/link,
không có Chain, decision đang chờ, invariants giả, Pot deck 0/1/2,
phủ nhận sát thương lethal, bảo toàn cost/deck và handle/receipt retry.
Một ca PublicResolution kiểm allowlist cho các fact Phép; hai ca preflight
kiểm bundle/review mới bị thiếu. Tổng tăng 905 → 1030 test trong 40 file.

Bốn browser mode a:opponent:damage, b:self:cost, a:self:pot,
b:opponent:choice thao tác UI/HTTP thật. Kiểm private Set, preview/cancel,
trả cost một lần, Chain speed 1/3 không target, giữ nguyên LP/deck/quái,
không effect-choice, public facts hai ghế và saved deck không đổi.
Bố cục desktop 1440/hẹp 390 không tràn ngang; ảnh đã xem ở
artifacts/magic-jammer/desktop.png, narrow.png, choice-desktop.png và
choice-narrow.png. Chỉ sửa fixture trước
khởi động server. Không chỉnh state trong khi chơi.

Linux đạt 1030/1030 test trong 40 file, 58/58 bước và 48 browser report,
Chromium 154.0.8037.57, runtimeExceptions=0. Đã đọc report tại
artifacts/platform-validation/2026-10-28T02-07-37-652Z-13473/report.json:
mỗi bước browser đúng một report khớp host/version; đủ bốn mode Counter,
122 ca Magic Jammer, 18 bundle/111 lá/95 verified/16 historical pending.
Capabilities ghi 111 supported, 16 reviewed effects/12 scope; Counter
review tách khỏi Trap Hole, trạng thái nhập Magic Jammer vẫn pending/
not-started/not-run. Kiểm tra riêng UI bổ sung xác nhận modal có hai preview
không tràn viewport ở cả hai kích thước sau khi hoàn tất bộ tổng hợp.

Windows và Ubuntu CI đã đạt trên source commit
7f50e81bf9260c53ea3565c47fe850e292aced96,
[run 40619933412](https://github.com/xuanthao260604-sys/idc/actions/runs/40619933412).
Đã tải/đọc artifact windows-validation-40619933412-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62. Windows đạt 1030/1030 test (40 file), 58/58 bước,
48 browser report, runtimeExceptions=0; mỗi bước browser đúng một report
khớp host/version. Đã kiểm tra đủ 122 ca Magic Jammer, bốn mode Counter,
18 bundle/111 lá và cả hai trận tự nhiên. Toàn capabilities JSON giống
Linux: 111 supported/16 effects/12 scope, Counter review riêng và trạng
thái nhập Magic Jammer vẫn pending/not-started/not-run. Hai trận tự nhiên
có kết quả giống Linux. Report ghi windows11DesktopVerified=false tại
artifacts/ci-magic-jammer-runtime/2026-10-28T02-16-42-463Z-1880/report.json.
Trận tự nhiên pilot giữ 16 lượt/339 lệnh, B thắng LP 0/4200. Expanded 111
loại seed 09 đạt 13 lượt/263 lệnh, 13 tấn công/1 quyết định, A thắng LP
6300/0; dùng Earthquake và Magician of Faith. Không gán Magic Jammer cho
trận tự nhiên này khi chưa xuất hiện trong effectsUsed; bốn fixture trên
là bằng chứng riêng cho Counter. Policy chơi tự nhiên phân biệt Counter
với Trap Hole và chỉ chọn phản hồi qua action công khai.

Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
