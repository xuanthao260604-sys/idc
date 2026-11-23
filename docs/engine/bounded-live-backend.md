# C3b.3a — backend Counter hữu hạn qua lệnh thật

Ngày 24/11/2026. Kế thừa parent staged C3b.2b.2 (`096a23e`, báo cáo
`ca1ef9c`); không tái làm audit hoặc thay nguồn dữ liệu cũ.

## Phạm vi đã nối

Registry nhận v6 khi caller server cung cấp review v6 rõ ràng và toàn bộ
14 pin/handler qua preflight. Revision capability v9 riêng cho v6; default
v5 giữ revision v8 và ABI cũ. Guard “chưa triển khai” của C3b.1 được thay
bằng guard dependency và đường lệnh backend trong chu kỳ này. Preflight
đứng riêng vẫn không cấp quyền activation.

Frame dữ liệu riêng của server được lưu trong DuelState chỉ với registry
v6. ApplyAction nối activation, phí, Pass thứ hai, root choice, cleanup
riêng từng owner, resume và terminal/concede với parent hiện có. Mỗi lệnh
thành công commit một stateVersion; không thu lại phí khi resume. Invariant
kiểm board cùng graph building hoặc binding/checkpoint frame đang pause.
Client không có lệnh gửi frame/review để mở capability.

Grammar giữ C1: 11 root Spell → Magic → tối đa sáu Seven; hoặc 1–3 Trap
Hole trên cùng occurrence summon hợp lệ → Seven; tối đa ba copy mỗi owner,
năm ô S/T, tám link trong pool này. Normal/Tribute/Flip Summon dùng lệnh
thật. Từ chối trước trả phí/lật nguồn nếu không đủ LP hoặc sai response.

Discovery dùng probe applyAction đến link thứ tám. Projection bỏ target
handle của link đã resolve trong lúc đợi root/cleanup, kể cả target Mộ đã
trở về tay. Frame, lịch sử phí và thứ tự cleanup riêng không gửi ra view.
Adapter giữ stale handle, command receipt/retry và quyền trả lời owner.

## Bằng chứng và giới hạn

Fixture chỉ chuẩn bị board đầu vào (lượt 3 và bài Set từ lượt trước).
Sau đó mọi link, receipt và biến động board đi qua applyAction thật;
không gán lại Chain hoặc dựng receipt tổng hợp. Đây chưa phải audit chơi
tự nhiên qua nhiều lượt. Suite mới kiểm 344 Trap shapes, 276 Pot shapes,
22 root Spell cases, ba kiểu summon và ba root choice; thêm terminal,
paused request/clock, adapter/discovery/privacy/LP boundary. Golden v5
không tái sinh. Hai assertion trong suite preflight 70 ca được cập nhật
theo việc constructor giờ cho explicit v6 hợp lệ; không xóa ca cũ.

Không tạo active review v6, không đổi runtime manifest, dữ liệu bài,
review/evidence, ảnh/frame/back hoặc deck đã lưu. HTTP/browser mặc định
vẫn dùng v5. Kiểm adapter trong bộ nhớ không được tính là UI/HTTP mới.
Các báo cáo C3b.1–C3b.2 là lịch sử ở mốc tương ứng, không bị viết lại.

## Điểm dừng

Chốt backend explicit opt-in và đối chiếu CI/artifact rồi dừng. C3b.3b
cần UI/HTTP và browser journey scope mới, review v6 hoạt động đúng nguồn
và manifest/capability trước khi bật ứng dụng mặc định. Sau đó C4 audit
nhiều lượt, rejection/terminal/privacy và đối chiếu Windows. C3/C4 chưa
hoàn tất; chưa đủ điều kiện đóng Chain/beta. Ước lượng C3 tổng thể 2–4
ngày công vẫn là khoảng công sức cần cập nhật theo kết quả tích hợp.
Sau Chain giữ U1 bộ tạo bài riêng, rồi W1 Windows 11 desktop thực; không
đóng gói hoặc bàn giao beta trong chu kỳ này.

## Bằng chứng chốt

Code `813a487419d85e4faa528a1849f77c807c8667db` tại [CI 45271655505](https://github.com/xuanthao260604-sys/idc/actions/runs/45271655505), attempt 1.
Ubuntu job `138032720309`, Windows job `138032720728` đều completed/success.
Checkout SHA trong log Ubuntu khớp code; **6819/6819 test/69 file**,
typecheck, cards:check/build và vanilla/mixed smoke đạt. Local cũng đạt
**6819/6819 test/69 file**, typecheck, cards:check/build và hai smoke.
662 ca lệnh thật và 8 ca adapter mới; 67 suite trước giữ số ca. Suite
migration 163 ca giữ 142 golden journey state/raw events, không tái sinh.

Artifact `windows-validation-45271655505-1`, ID `14866088769`;
SHA-256 ZIP khớp metadata GitHub:
`6b5b53a3e9b268fcb64e385714c5333c1163aef22f72423a082c0ca708d5a0ad`.
Report `2026-11-23T21-38-23-427Z-7308/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0,
npm 11.17.0, Edg/157.0.4341.60: **6819/6819 test/69 file,
112/112 bước, 102/102 browser report**, runtimeExceptions=0.

Đã đọc đủ 112 raw step log, kiểm từng JSON browser khớp report/platform,
đủ 102 report và không runtime exception. So baseline C3b.2b.2
`windows-validation-45255332294-1`, source `096a23e`: 67 suite cũ giữ số ca;
102 browser facts khớp khi bỏ riêng browserVersion; capabilities.log
nguyên byte. ZIP baseline cũng khớp metadata đã lưu. Báo cáo/artifact
hiện tại không ghép nguồn hoặc dùng số test từ code khác.

Hash đối chiếu trước chu kỳ xác nhận data/reviews/evidence/bundle/ảnh,
frame/back, deck nguồn và golden giữ nguyên. README cũ là prefix nguyên
vẹn; capabilities local khớp baseline. Protocol thêm field riêng v6 nhưng
state/projection v5 giữ golden cũ. Hai assertion preflight được cập nhật
theo constructor explicit opt-in, không coi số ca bằng nhau là chứng minh
mọi assertion cũ không đổi. API staged sidecar cũ từ chối persisted v6;
đường đó phải qua applyAction để tránh lưu frame sai clock.

Lượt kiểm local trung gian đã dừng sau khi ca corrupt trusted-state kỳ vọng
receipt từ chối, trong khi hợp đồng invariant ném lỗi trước transition.
Đã sửa kỳ vọng test theo hợp đồng; giữ guard invariant. Bộ cuối trên source
đã chốt và hai nền tảng CI đạt như trên.

**Giới hạn:** 670 ca mới là backend/adapter explicit opt-in, chưa phải
HTTP/browser v6 hoặc audit tự nhiên qua nhiều lượt. 102 browser report
trên CI chạy default v5, không được tính làm bằng chứng scope mới. Chưa
có active review v6/default manifest mới. C3b.3b và C4 còn mở; chưa đóng
Chain. Report ghi windows11DesktopVerified=false; chưa kiểm Windows 11
desktop, chưa đóng gói/bàn giao beta. Commit chốt sau CI chỉ cập nhật tài
liệu [skip ci]; bằng chứng code thuộc `813a487`. Sau Chain giữ bộ tạo bài
riêng và Windows 11 thực. Dừng chu kỳ tại đây.
