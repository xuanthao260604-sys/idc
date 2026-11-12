# C3b.1 — Schema và preflight cho review Counter v6

Ngày 12/11/2026, tiếp nối [C3a](../rules/bounded-counter-review.md) tại
`f62a69d`. Đây là phần chuẩn bị gate của C3b, chưa phải activation v6.
Gameplay/manifest vẫn dùng v5; chưa có live frame, discovery hoặc UI mới.

## Thay đổi

`CounterReviewsSchema` nhận diện đúng cặp scope
`counter-trap-reviewed-bounded-patterns-v6` và continuation
`reviewed-bounded-counter-patterns-v6`, Seven Tools đúng ID, handler trả
1000 LP và revision tối thiểu 6. Các cặp v1–v5 giữ điều kiện cũ. Schema là
kiểm cú pháp và quan hệ scope, không chứng minh resolver đã tồn tại hoặc
các trích dẫn là đầy đủ/chính xác về lịch sử.

`createRegistry` chủ động từ chối continuation v6 với lỗi chưa triển khai,
kể cả khi định nghĩa Seven thiếu hoặc sẽ bị lọc khỏi catalog. Không trả về
registry chỉ bật base handler mà thiếu resolver cho scope mới. Cần tích
hợp frame/resolver/activation và kiểm thử trước khi gỡ chặn; chỉ sửa schema
hoặc thay manifest không đủ mở v6.

`preflightBoundedCounterReview` là hàm chuẩn bị riêng, nhận registry đáng
tin cậy hiện có và proposal, không được dùng làm quyền kích hoạt. Nó kiểm:

- Đúng proposal revision 6, format Goat revision 4, hash Seven và cặp scope/continuation.
- Toàn bộ 14 định nghĩa pin C3a và legality, năm ô Spell/Trap, copy limit tổng ba.
- Đúng 11 binding Phép, kể cả lượng damage/heal/draw; ba binding Trap/Magic/Seven.

Không giả định mọi Phép có ba bản: giới hạn từng lá nằm trong full-definition
pin, ví dụ Pot of Greed giữ giới hạn đã nhập. Bound tám link thuộc pool đã
review, không thành giới hạn luật chung. Kết quả preflight đóng băng bản
sao pin/danh sách/bound, ghi registry revision và hash proposal, luôn có
`runtimeEnabled=false`. Không chứa journal, board, quyền chơi hoặc state
có thể gửi tới adapter; không sửa hay đóng băng input. Hash chỉ phục vụ đối
chiếu nội dung, không xác thực nguồn hoặc chống phát lại. Khi nối gameplay
phải kiểm lại dependency và board hiện hành, không tin receipt preflight cũ.

Không tạo review v6 trong data/reviews, không sửa manifest hoặc nâng metadata
nhập bài. Hồ sơ C3a vẫn là bằng chứng lịch sử ngày 10/11; trường
`proposalAcceptedByCurrentSchema` của checker hiện thành true đúng thay đổi
schema, còn registry tiếp tục từ chối. Các dòng schema=false trong báo cáo
C3a mô tả mốc cũ, không phải kết quả chạy hiện tại.

## Kiểm chứng và giới hạn

Suite mới có 70 ca: pairing/schema, preflight dương, thiếu/đổi từng pin,
binding/tham số, format/copy/zone, input bất biến, v1–v5 tương thích và chặn
registry v6. Đây là kiểm thử gate/phụ thuộc, không phải test hiệu ứng live
cho chuỗi mới. 142 golden journey và 163 ca migration v5 giữ nguyên file;
không tái sinh baseline.

Typecheck/build, hồi quy toàn bộ và CI được chốt theo source tại phần bằng
chứng dưới đây. Không dùng số ca candidate/preflight để nâng số hiệu ứng
đã triển khai. Dữ liệu/review/evidence cũ, deck, ảnh, khung và mặt sau giữ
nguyên; capabilities v5 phải khớp baseline C2c.

## Điểm dừng và bước tiếp theo

Hoàn thành tác vụ C3b.1 rồi dừng báo cáo. Nhóm gate của C3b chưa hoàn tất:
chưa cài review v6 active hoặc cho phép live registry mới. Việc tiếp theo
là C3b.2: thiết kế/nối live context và resolver với identity, occurrence,
clock, ledger, cleanup/pause/resume/terminal; sau đó activation, discovery,
projection/UI và ma trận lệnh thật. Không lấy journal candidate làm live
frame. Chỉ gỡ guard registry cùng tích hợp và bằng chứng cần thiết.

C3 tổng thể giữ ước lượng 2–4 ngày công, còn phụ thuộc kết quả tích hợp;
chu kỳ 30 phút không phải cam kết hoàn tất C3. Sau C3 vẫn cần C4 audit nhiều
lượt trước U1 bộ tạo bài riêng và W1 Windows 11 thực. Chưa đóng gói hay bàn
giao beta; Windows runner không thay Windows 11 desktop.

## Bằng chứng chốt

Code được kiểm chứng là `47a7ce86614b7d0a6937051b808912f17122d518` tại
[CI 43191173336](https://github.com/xuanthao260604-sys/idc/actions/runs/43191173336),
attempt 1. Ubuntu job `131090578048` và Windows job `131090579088` đều
completed/success. Đã đọc log Ubuntu, khớp source SHA và **4902/4902 test
trong 64 file**, typecheck, offline data/build và hai smoke đều đạt.
Local cũng đạt typecheck/build, cards:check, hai smoke và **4902/4902 test
trong 64 file**. Suite mới đủ 70 ca, migration cũ đủ 163 ca.

Artifact `windows-validation-43191173336-1`, ID `13931827614`,
SHA-256 ZIP khớp metadata GitHub:
`a79cd045c3d92f26261b95eb247dc28b2c5943a5b718e59a5bcabdfeee259426`.
Report: `2026-11-12T09-24-59-089Z-8340/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0,
npm 11.17.0, browser Edg/156.0.4314.58: **4902/4902 test/64 file,
112/112 bước, 102/102 browser report**, runtimeExceptions=0.

Đã đọc đủ 112 raw step log, mỗi browser JSON khớp report/bước và platform.
So artifact C2c `windows-validation-42590265485-1` source `898b29c`:
cả 63 suite cũ giữ số ca; chỉ thêm suite gate 70 ca. Facts của 102 browser
report giữ nguyên khi bỏ riêng browserVersion; `capabilities.log` giống
nguyên byte. Không ghép log/report của run hoặc source khác.

Chạy lại checker C3a: 14 pin/14 nguồn/30 trích dẫn vẫn khớp, 29 evidence kế
thừa nguyên vẹn; schema nhận proposal v6, v5 vẫn active, chưa có file active
v6. Registry từ chối v6 đã được kiểm riêng trong suite mới. C3a profile và
mọi data/reviews/evidence, bundle, ảnh, deck được giữ nguyên byte; ngoài
hai tài liệu chỉ dẫn, chỉ hai file engine có sẵn thay đổi theo tác vụ.
Không đổi protocol/UI, hash registry v5 hoặc baseline golden.

Commit chốt sau CI chỉ cập nhật tài liệu với `[skip ci]`; bằng chứng code
thuộc `47a7ce8`, không gán kết quả cho code mới chưa chạy. Report vẫn ghi
`windows11DesktopVerified=false`. Chưa có kiểm thử Windows 11 desktop,
chưa có positive live test cho scope v6; chưa đóng gói/bàn giao beta.
