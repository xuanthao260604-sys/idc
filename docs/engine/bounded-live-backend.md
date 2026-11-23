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

Bằng chứng CI sẽ được chốt sau khi run khớp source hoàn thành.
