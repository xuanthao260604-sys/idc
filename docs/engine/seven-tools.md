# Seven Tools — trả LP và phủ nhận Trap Hole — 29/10/2026

Đã triển khai theo [review thiết kế](../rules/seven-tools-review.md).
Runtime tăng 111 → 112 loại: 95 quái thường và 17 lá hiệu ứng (11 Phép,
3 FLIP, Trap Hole, Magic Jammer, Seven Tools). Dữ liệu nhập vẫn 112 loại
trong 19 bundle, 95 verified/17 historical pending. Trạng thái nhập và
trạng thái thực thi được ghi riêng; không sửa snapshot để đánh dấu playable.

## Review và phạm vi

Review mới data/reviews/seven-tools.effects.json pin official:03819470,
parsed definition SHA-256
2dbc5c07956ac97d58b2f449898bf2d73bd0488578b9c69c0fadd5e468accbc0,
format goat-2005-08-17 revision 4, scope
counter-trap-trap-hole-activation-v1 và handler
pay-1000-negate-trap-hole-activation. Giữ nguyên 17 evidence record từ
review nguồn với nhãn official-current/archive/community và giới hạn
tin cậy của từng trích đoạn. Chưa xác nhận nguyên văn bản in 2002/2005.

Hồ sơ seven-tools-scope-review.json giữ nguyên trạng thái của bước thiết
kế trước khi mở runtime. Đây là snapshot lịch sử; binding hoạt động lấy
từ review mới, không lấy cờ runtimeEnabled trong hồ sơ thiết kế. Loader
và preflight dùng chung manifest 19 bundle/14 file review. Metadata nhập
vẫn effects=[], implementation=not-started, testing=not-run; capability
report ghi riêng 17 hiệu ứng/13 scope/19 snapshot và hai Counter Trap.

Chỉ hỗ trợ pattern **Trap Hole → Seven Tools**, hai liên kết:

- Trap Hole là activation hợp lệ sau Normal/Tribute/Flip Summon được
  hỗ trợ trong Main 1/Main 2, đúng target/ATK/priority của review cũ.
- Seven Tools phải ở sân mình, Set từ lượt trước, đúng priority và không
  có decision đang chờ. Có thể phản hồi Trap Hole của mình sau khi đối
  thủ Pass. Tay rỗng vẫn dùng được.
- Cần **LP > 1000**. Trả đúng 1000 khi activation được chấp nhận:
  8000 → 7000 hoặc 1001 → 1; 1000/999/1 bị từ chối trước trả phí/lật bài.
  Ngưỡng này kết hợp phí từ card text và quy tắc chi phí đã đối chiếu
  trong review, không tự tạo ruling riêng cho lá.
- Không bỏ bài hoặc chọn card target. Link speed 3 ghi tham chiếu Trap
  activation đang phản hồi; lúc này chưa phá Bẫy hoặc xử lý quái.
- Hai Pass liên tiếp xử lý nguyên tử: phủ nhận activation Trap Hole,
  phá Trap Hole, bỏ qua plan phá quái; cleanup Seven Tools đúng một lần.
  LP không trừ lần hai. Quái, marker và Normal Summon/Set quota giữ nguyên;
  đây là Summon đã thành công, không phải phủ nhận Summon.

Hai liên kết là giới hạn triển khai, không phải giới hạn luật Yu-Gi-Oh!.
Chưa mở Magic Jammer → Seven Tools, Seven Tools → Seven Tools, prefix
nhiều Trap Hole, Bẫy khác hoặc Chain hỗn hợp tổng quát. Những pattern
Counter-to-counter có thể hợp lệ theo luật khi đủ điều kiện. FAQ cho
phép Seven Tools trong Damage Step; pool hiện chỉ nhận Trap Hole sau
Summon ở Main nên chưa có input đó. Chưa mở Continuous Trap effect,
cost reducer/payment trigger, protection/replacement hoặc SEGOC.

## Lệnh, riêng tư và giao diện

Action activate-lp-counter-trap nhận cardHandle và chainHandle. Client
không được chỉ định amount, LP kết quả, target, discard, handler hoặc
kết quả phủ nhận. Server kiểm lại review, source, prefix Trap Hole,
Summon, priority, điều kiện Set và LP trước mutation đầu tiên. Cost
journal ghi LP trước/sau, lượng trả, controller và sequence; invariants
kiểm đúng loại cost theo từng Counter. Nhánh bỏ bài của Magic Jammer
giữ hành vi cũ. Không nhận cờ negated tùy ý trong state.

Handle vẫn thuộc viewer/duel/state version; handle giả, cũ, của ghế khác
hoặc dùng card handle thay Chain handle bị từ chối. Discovery chỉ thử
transition bất biến, không trả phí. Receipt retry không trả phí hoặc
cleanup lần hai. Raw journal và thông tin bài úp đối thủ không đưa vào
public facts.

UI có nút **Phản hồi Bẫy**, danh sách trong hướng dẫn lượt, preview Trap
đang phản hồi và LP trước/sau phí 1000. Hủy chỉ đọc; xác nhận mới gửi.
Không có lựa chọn discard/target. Thiếu phí có thông báo cần trên 1000 LP.
Public facts tách chi phí LP, phủ nhận activation Bẫy và phá Bẫy; không
ghi thành sát thương, phá quái hoặc phá Phép. Cleanup Seven Tools không
đếm thêm một Bẫy bị phá bởi hiệu ứng. Hai ghế thấy cùng facts công khai.

## Kiểm thử

74 ca trong tools/seven-tools.test.ts gồm ma trận 24 tổ hợp A/B × chủ
Seven Tools × Normal/Tribute/Flip × Main 1/Main 2; biên LP, tay rỗng,
Set thật và cùng lượt Set, hai Pass, giữ quái/marker/quota, từ chối link
thứ ba/prefix không hỗ trợ, invariants giả, review drift, handle/receipt
và saved deck catalog 111. Thêm hai ca public facts và hai ca preflight.
Các kiểm thử nhập riêng vẫn bảo vệ việc import không tự mở handler.

Sáu browser mode dùng mouse/UI thật sau fixture đầu trận, không sửa state
khi chơi: a:opponent:8000, b:self:1001, a:self:8000, b:opponent:1001,
a:opponent:1000 và b:self:999. Bốn ca activation kiểm phí trả ngay đúng
một lần, Hủy, hai Pass, quái còn nguyên, facts A/B, guide/detail và modal
1440×1000/390×844. Hai ca thiếu phí kiểm chặn activation; không có Seven
Tools thì Trap Hole vẫn phá quái. Các cờ activation trong report âm là
false theo thiết kế, không diễn giải chúng thành ca activation đã chạy.

```sh
npm run beta:browser-seven-tools
npm run validate:platform
```

Đã xem ảnh desktop/narrow của preview tại 1001 LP → 1 LP. Bộ browser
chờ hai animation frame sau scroll trước khi lấy tọa độ click, vẫn dùng
mouse event thật và giữ nguyên các assertion; tránh lấy tọa độ trong lúc
layout chưa ổn định, gồm ca đổi viewport rồi chuyển ghế của Magic Jammer.

## Bằng chứng tổng hợp

Linux đạt 1138/1138 test trong 43 file, 68/68 bước và 58/58 browser
report bằng Chromium 154.0.8037.57, runtimeExceptions=0. Đã đọc từng
bước và log tại
artifacts/platform-validation/2026-10-29T13-51-17-905Z-130163/report.json.
Mỗi bước browser có đúng một report khớp host/version; log có đủ 74 ca
Seven Tools và 122 ca Magic Jammer, data check đủ 19 bundle/112 lá/
95 verified/17 historical pending. Capabilities ghi 112 supported,
17 hiệu ứng/13 scope/19 snapshot, gồm hai Counter Trap.

Windows và Ubuntu CI đạt trên source commit
7b9c0e1ba8b4c4411499800b881192d16b9ad970,
[run 40885763295](https://github.com/xuanthao260604-sys/idc/actions/runs/40885763295).
Đã tải và đọc artifact windows-validation-40885763295-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62. Windows đạt 1138/1138 test trong 43 file,
68/68 bước và 58/58 browser report; từng report khớp host/version,
runtimeExceptions=0. Report nằm tại
artifacts/ci-seven-tools-runtime/2026-10-29T13-51-45-189Z-5820/report.json.
Đã kiểm sáu mode Seven Tools với kết quả activation/thiếu phí tương ứng,
bốn mode Magic Jammer, hai mode audit tương tác, hai mode guide,
74 test Seven Tools, 122 test Magic Jammer và 19 test preflight/path.
Toàn capabilities JSON của Windows giống Linux, gồm pin Seven Tools và
trạng thái nhập pending. Hai trận tự nhiên có kết quả giống nhau.
Report vẫn ghi windows11DesktopVerified=false.

Một lượt Windows trước đó dừng vì timeout chuyển ghế trong ca Magic
Jammer sau đổi viewport; các ca Seven Tools của lượt đó đã qua. Bộ click
được bổ sung chờ layout như mô tả trên; lượt đầy đủ cuối kiểm cả ca này.
Không tăng timeout hoặc bỏ assertion để có kết quả đạt.

Hai trận tự nhiên dùng seed công khai, không sửa state khi chơi. Pilot
08: 16 lượt/339 lệnh/15 attack/4 decision, B thắng LP 0/4200. Expanded
5e: 11 lượt/239 lệnh/9 attack/1 decision, B thắng LP 0/8000; dùng Earthquake,
Fissure, Magician of Faith, Monster Reincarnation, Pot of Greed và Trap
Hole. Catalog thêm lá làm thay đổi shuffle; seed expanded được chọn lại
để giữ yêu cầu có decision và dùng Faith, không giảm assertion. Hai trận
này chưa dùng Seven Tools/Magic Jammer; bằng chứng Seven Tools là bộ ca
có kiểm soát ở trên, không suy từ kết quả trận tự nhiên.

248 file dữ liệu cũ được so hash và giữ nguyên byte, gồm raw/evidence,
19 bundle và review trước đó. Reimport lỗi vẫn giữ dữ liệu/deck A/B;
deck catalog 111 hợp lệ tiếp tục đọc nguyên byte, không tự chèn Seven
Tools vào starter hoặc deck đã lưu. Pool xây deck hiện 334 lá theo giới
hạn format. Không đổi artwork, dependency/lockfile hoặc format revision.

Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
Ảnh minh họa từng lá chưa được tải; khung người dùng và mặt sau chung giữ
nguyên. Mốc này chỉ hoàn tất phạm vi Seven Tools hai liên kết đã nêu.
