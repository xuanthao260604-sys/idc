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

Đang kiểm chứng source C3b.1; cập nhật sau khi đọc kết quả CI và artifact.
