# C2a — Graph Counter và ledger phí ứng viên

Mốc 09/11/2026, tiếp nối [ma trận C1](chain-beta-scope.md).
Đã có thành phần kiểm graph và ledger; **chưa có resolver mới hoặc activation
mới trong gameplay**. Seven review active vẫn v5, link Counter thứ năm vẫn
bị chặn. Không đổi protocol, UI sản phẩm, manifest hoặc review.

## Hợp đồng thành phần

`packages/engine/src/bounded-counter-graph.ts` nhận Registry và snapshot
DuelState của ứng viên. Nó kiểm grammar S, S → M → V^n và T^k → V^n,
với pin định nghĩa, nguồn/snapshot/zone, identity, copy limit và receipt.
Giới hạn 1..8 link, k=1..3 và n=0..6 vẫn phải qua giới hạn ba bản/ô của
từng bên; không dùng cap tám như một luật Chain chung. Prefix nhiều T
phải cùng occurrence/target hợp lệ. Phạm vi không có control change hoặc
persistent face-up Spell/Trap; nguồn ngửa bị bỏ khỏi Chain bị từ chối.

Seven ứng viên dùng effect ID riêng `candidate-bounded-seven-response-v1`.
Không sửa dispatcher v5 để nhận ID này. Đầu vào là snapshot tin cậy của
thành phần, không phải một endpoint cho client gửi state. Validator không
chứng minh toàn bộ lịch sử priority/activation, kích thước deck gốc hoặc
một chuỗi chuyển trạng thái hợp lệ. Các điều đó cần action/adapter và
resolver ở C2b/C3. Không gọi validator này là thay thế toàn bộ invariants.

Chấp nhận checkpoint chain-response trước xử lý hoặc resolving sau hai
Pass; không chấp nhận pending decision, parent frame cũ, cleanup, battle,
modifier, terminal hoặc cửa sổ ngoài Main1/Main2. Không đổi input, không
trả phí, không gửi bài vào Mộ và không freeze object thuộc caller.

`packages/engine/src/bounded-seven-lp-ledger.ts` capture 1..6 receipt Seven
**đã được mô hình hóa là trả phí** sau khi graph đạt. Ledger có kind riêng,
max ba khoản mỗi người, tính liên tục theo payer và thứ tự sequence/group.
V1 tối đa hai khoản và V2 đúng ba khoản cũ giữ nguyên; không nâng cap của
API cũ. Không tạo ledger khi graph không có Seven.

History checker kiểm schema, identity, thứ tự, phép trừ và tổng theo payer.
Current checker kiểm thêm duel/registry/turn/player tuple, board fingerprint,
clock không lùi và receipt hiện tại. History vẫn đúng sau hồi LP nhưng
binding board cũ hết hiệu lực. SHA chỉ phát hiện drift, không xác thực
client hoặc chứng minh receipt đến từ action thật. Output clone/freeze
riêng, không giữ reference có thể làm caller input bị freeze.

## Kiểm thử và cách gọi tên bằng chứng

`tools/fixtures/bounded-counter-candidate.ts` tạo deck hợp lệ 40 lá mỗi
bên rồi dựng snapshot và receipt thành phần. Mọi receipt trong fixture
này là synthetic, không gọi applyAction để kích hoạt chuỗi mới. Không
đưa fixture vào beta CLI hoặc thêm endpoint sửa state.

524 ca mới trong `tools/bounded-counter-candidate.test.ts`:

- 172 phân bổ prefix Trap/owner Seven khả thi; n=0 kiểm không có ledger.
- 276 tổ hợp S=Pot, A/B, owner M và toàn bộ 69 chuỗi owner V; có Main1,
  Main2 và Spell từ tay với Set marker null.
- 11 Phép đã pin với sáu receipt, đủ root discard/target và graph tám link.
- Các ca timing/checkpoint, grammar, pin/source/target/discard drift,
  LP gap/amount/current/chronology, duplicate/orphan/copy/zone và context sai.
- Ledger JSON round-trip, freeze/input không đổi, history còn hợp lệ sau
  hồi LP nhưng current binding hết hiệu lực, clock rewind và ledger reseal
  vẫn không vượt qua kiểm semantics. API ledger v1 từ chối kind ứng viên.
- Invariant live v5 từ chối snapshot có candidate ID; Pass không thể biến
  snapshot ấy thành transition live. Hồi quy gameplay cũ kiểm gate thật.

Sửa lỗi cộng trong C1: 69+69+34=172 phân bổ, không phải 174; prefix ba T
có 34, không phải 36. Không đổi phạm vi luật. Đây là số phân bổ thiết kế;
chỉ các ca nêu trên là kiểm thành phần, không nâng thành test hiệu ứng live.

Linux local: typecheck, build và cards:check đủ 19 bundle đạt;
**4127/4127 test trong 61 file**, gồm 524 ca ứng viên mới. Capability JSON
bằng artifact Windows đã xác minh của source `ae2d567`; 320 file cũ trong
snapshot data/apps/packages/manifest/package/lock giữ nguyên byte. Chỉ
thêm module ứng viên/test/fixture và sửa tài liệu. Không chạy lại browser
Linux cho capability chưa nối vào gameplay; số browser Linux cũ không
được gán thành kết quả của source mới.

Source cuối: `286a56bcee9409e5ee5d1669a117587354d3c949`.
[CI 42563079635](https://github.com/xuanthao260604-sys/idc/actions/runs/42563079635),
attempt 1, completed/success trên cả Ubuntu job `128983556331` và Windows
job `128983556009`. Đã đọc log Ubuntu xác nhận 4127 test/61 file, gồm đủ
524 ca thành phần mới; typecheck/data/build/vanilla/mixed smoke đạt.

Đã tải artifact `windows-validation-42563079635-1`, ID `13651021996`;
SHA-256 ZIP khớp metadata GitHub:
`0f10addede1065d219278544bf8c0da2d557e220f94ef95b39286bad6eb4e0b1`.
Report: `2026-11-09T04-40-33-738Z-9172/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 156.0.4314.58: **4127/4127 test trong 61 file, 112/112 bước,
102/102 browser report**, runtimeExceptions=0.

Đã đọc đủ 112 step log, mỗi browser step có đúng một JSON khớp report,
đúng host/version; số ca của cả 60 suite cũ bằng baseline 3603 test của
`ae2d567`, suite mới đúng 524 ca. Facts của cả 102 browser report bằng
artifact `windows-validation-42198431280-1` khi bỏ riêng browserVersion
(baseline Edge 156.0.4314.56). `capabilities.log` giống nguyên byte.
Runtime vẫn 112 định nghĩa/95 quái thường/17 hiệu ứng/13 scope/19 snapshot,
trạng thái nhập 95 verified/17 historical pending không đổi. Đây là bằng
chứng hồi quy gameplay cũ, không phải 102 hành trình cho Counter mới.

Không thêm hành trình UI cho một capability chưa mở. Report Windows vẫn
ghi windows11DesktopVerified=false. Windows 11 desktop chưa được kiểm
chứng, chưa đóng gói hoặc bàn giao beta. Commit chốt sau CI chỉ sửa tài liệu;
bằng chứng trên thuộc source code `286a56b`, không gán cho một source khác.

## Điểm dừng

C2a không xử lý LIFO, không trả board patch và không resume root/cleanup.
Tác vụ tiếp theo là C2b: oracle LIFO độc lập và dispatcher/journal ứng viên
cho hai họ, rồi mới xem xét C2c/C3. Không dùng parity thay kiểm từng link;
đặc biệt Seven phủ nhận T cuối không phủ nhận các T trước.

Cập nhật chu kỳ sau: đã thêm [C2b dispatcher/journal ứng viên](bounded-counter-dispatcher.md).
Gate v5 vẫn giữ; điểm dừng tiếp theo là tích hợp phần chung C2c.
