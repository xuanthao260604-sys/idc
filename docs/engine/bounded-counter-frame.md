# C3b.2b.1 — Hợp đồng frame Counter hữu hạn, chưa nối resolver

Ngày 23/11/2026, kế thừa `c643a48` và [checkpoint đầu vào](counter-resolution-entry.md).
Đã thêm hợp đồng frame/chuyển checkpoint cho parent resolver tiếp theo.
Frame hiện được kiểm ở module staged, **chưa gắn vào DuelState, chưa được
Pass/answer gọi và chưa mở activation v6**. C3b.2b/C3 vẫn chưa hoàn tất.

## Frame giữ gì

`bounded-counter-frame.ts` cung cấp start, kiểm history, kiểm current binding,
checkpoint root-choice/cleanup và release. Frame giữ original links/receipt,
player/turn, review fingerprint, origin clock, occurrence gốc, survivor set,
checkpoint clock/binding và các order đã chọn. Không giữ toàn bộ entry
DuelState hoặc journal replay của candidate. Caller input không bị sửa hay
đóng băng; frame/output là bản sao bất biến.

Start đòi preflight proposal v6 đúng 14 dependency pin/binding C3b.1 và
structural graph của hai họ C1, đủ hai Pass, response bị đình chỉ. Seven
staged dùng effect ID riêng `pay-1000-negate-direct-trap-activation-v6`;
không đổi nhãn candidate trong production. Đây là identity trong code,
không thêm lá, sửa effect text hoặc nâng metadata bài đã nhập.

API staged kiểm cấu trúc/pin/cost/copy/zone, không cấp quyền kích hoạt.
`createRegistry` tiếp tục chặn continuation v6; manifest/review active v5
không đổi. State tổng hợp mang ID staged vẫn bị invariant gameplay v5 từ
chối, kể cả chuỗi hai link. Bounded graph chỉ thêm một nhánh structural
riêng, giữ hai entry candidate/live-v5 hiện có.

## Lifecycle và giới hạn tin cậy

- `before-root` bind exact board/timing/decision/cleanup/clock sau capture.
- Parent áp dụng LIFO/effect bằng API đã review rồi mới checkpoint snapshot
  có clock commit tiến lên: `root-choice` hoặc `cleanup`. Không quay lại
  before-root hoặc mở lại root choice sau cleanup.
- Root choice đòi root Normal Spell còn hiệu lực, đúng plan/option/min/max/
  player/decision ID. Cleanup đòi đúng survivor set và decision owner từ
  helper cleanup; cùng stage chỉ cho cập nhật đúng một owner đang chờ.
- History receipt kiểm fixed cost, payer/copy bound, chronology, nguồn/
  slot/pin, prefix/suffix, discard identity và target không thể do Magic
  bỏ xuống sau activation. Không yêu cầu afterLP cũ bằng LP sau hồi máu.
- Summon occurrence giữ như lịch sử, không ép `lastRelevantEvents` hiện tại
  quay về Summon sau semantic event của resolution. Current binding vẫn
  bao gồm timing/event hiện hành; sửa nó sau checkpoint bị từ chối.
- Release trả null sau cleanup commit hoặc terminal/concede đã được parent
  thực hiện. Cleanup commit có thể cùng version với checkpoint và event
  sequence mới; đầu hàng phải là command/version mới. Terminal do Phép gốc
  ngay sau sweep được nhận diện riêng với đầu hàng trước sweep.
  Kiểm source lifecycle/clock/context; không chuyển bài, trả
  LP, chọn thứ tự hoặc tạo quyết định sau trận.

Hash chỉ là integrity/binding, không phải xác thực hoặc dịch vụ chống
replay. Parent sở hữu state và lịch sử lệnh đáng tin cậy, phải dùng resolver,
cleanup helper và adapter kiểm version/handle. Checkpoint **không chứng
minh một board đề xuất tùy ý là kết quả effect hợp lệ**; release không thay
việc parent kiểm order/answer. Caller phải checkpoint snapshot đã advance
clock commit; hợp đồng gọi trong transition engine sẽ được nối/kiểm ở mục
sau. Chưa dùng frame này cho dữ liệu client hoặc serialization gameplay.

## Bằng chứng test đúng phạm vi

528 ca mới là **test hợp đồng frame trên fixture tổng hợp**, không phải
activation hoặc resolver v6 qua applyAction. Fixture tạo instance/receipt
và mô phỏng sweep/effect/cleanup; chỉ trong test đổi ID candidate sang ID
staged. Không chép candidate journal vào frame hoặc coi receipt mô hình là
phí được trả bằng lệnh thật.

482 phân bổ gồm Trap prefix 1–3 ở hai ghế (172 mỗi ghế) và 69 suffix cho mỗi
owner Magic ở họ Pot. Kiểm lifecycle/source/owner cleanup; thêm start cho
11 Phép pin, root choice của ba plan chọn phá, hồi LP nhưng giữ history phí,
semantic event thay occurrence hiện hành, stale/current binding, frame sửa
rồi reseal, cleanup không tiến và release/concede sai hoặc đúng.
Không dùng các số này để nâng số hiệu ứng/playable trong catalog.

Hồi quy v5, typecheck/build, data check, smoke và CI được chốt dưới đây.
142 golden state/raw-event và mọi review/evidence/bundle/ảnh/deck nguồn giữ
nguyên; không tái sinh baseline hoặc thay khung/mặt sau.

## Điểm dừng

Chốt tác vụ hợp đồng frame này rồi dừng. Mục tiếp theo **C3b.2b.2** là parent
resolver dùng frame: tạo event thật, apply root plan đúng một lần, nối
checkpoint vào clock commit, resume owner/root choice, cleanup và terminal.
Sau đó còn activation/discovery/projection/UI và kiểm chứng scope mới trước
khi gỡ guard registry v6. C4 audit nhiều lượt chưa hoàn tất.

Giữ mục tiêu sau Chain là U1 bộ tạo bài riêng giới hạn và W1 Windows 11
thực. Ước lượng C3 tổng thể 2–4 ngày công còn phải cập nhật theo tích hợp;
không coi hợp đồng staged là đã đóng Chain. Chưa đóng gói/bàn giao beta.

## Bằng chứng chốt

Source code: `3e716ba99c6284552159ac10311faa1454213bcc` tại
[CI 45193878890](https://github.com/xuanthao260604-sys/idc/actions/runs/45193878890),
attempt 1; Ubuntu job `137759038845`, Windows job `137759039084` đều
completed/success. Log Ubuntu khớp source SHA và **5460/5460 test trong 66
file**, typecheck, data/build và hai smoke đạt. Local bản cuối cũng đạt
**5460/5460 test/66 file**, typecheck, cards:check/build, vanilla/mixed smoke.
Lượt local cũ và CI `45192651580` source `13b48d7` trước bổ sung terminal
không được dùng làm bằng chứng cho source cuối hoặc ghép report/log.

Artifact `windows-validation-45193878890-1`, ID `14828352310`;
SHA-256 ZIP khớp metadata GitHub:
`710b4519627d346e0b083fd7eb55e6f58c1f98730f12b1ec0bdd28cd4b71dc3e`.
Report: `2026-11-23T14-25-01-800Z-5968/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0,
npm 11.17.0, Edg/157.0.4341.60: **5460/5460 test/66 file, 112/112 bước,
102/102 browser report**, runtimeExceptions=0.

Đã đọc đủ 112 raw step log, từng JSON browser khớp report và platform.
So baseline C3b.2a `windows-validation-45183066151-1`, source `d40434a`:
65 suite cũ giữ số ca, chỉ thêm suite frame 528 ca; 102 browser facts giữ
nguyên khi bỏ riêng browserVersion; capabilities.log giống nguyên byte.
Hash ZIP baseline cũng được đối chiếu metadata đã lưu. 142 golden không
thay đổi; mọi data/reviews/evidence/bundle/ảnh/deck nguồn, protocol/UI và
review/manifest v5 giữ nguyên byte. Nội dung README trước chu kỳ giữ
nguyên; capabilities local cũng khớp C3b.2a.

528 ca mới là mô hình frame contract, không phải bằng chứng activation
hoặc parent resolver v6. Chưa tạo active review v6, chưa cài frame vào
DuelState và registry vẫn chặn continuation v6. Commit chốt sau CI chỉ sửa
tài liệu `[skip ci]`; bằng chứng code thuộc `3e716ba`.
`windows11DesktopVerified=false`; chưa kiểm Windows 11 desktop, chưa đóng
gói/bàn giao beta. Tiếp theo là parent resolver C3b.2b.2, không đóng C3/C4.
