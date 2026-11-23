# C3b.3b.1 — HTTP/UI/browser Counter v6 explicit opt-in

Ngày 24/11/2026. Kế thừa backend `813a487`, báo cáo `040110c`;
không làm lại audit v5 đã chốt. Đây là bước kiểm transport/UI trước khi
đổi active review và cấu hình mặc định, chưa phải chốt toàn bộ C3b.3b.

## Thay đổi

Catalog HTTP chỉ thêm tên continuation công khai cho Seven khi server đã
nhận registry v6. UI đọc khả năng này để mô tả scope phản hồi hữu hạn,
không tiếp tục ghi giới hạn link 2/3 của v5 cho server v6. Không chuyển
review/journal/frame hay receipt phí riêng ra catalog. Default v5 giữ
nguyên shape catalog và mô tả cũ; beta CLI không thêm cờ test hoặc endpoint
để người chơi gửi review/frame nhằm mở v6.

Sáu mode browser `--bounded-live=a|b:spell|trap|choice` chạy với registry
v6 tường minh trong harness, cùng server/UI thật. Chỉ fixture trước khi
listen chuẩn bị board: lượt 3, bài đã Set từ lượt 1. Sau đó mọi Summon,
activation, Pass, root choice, xếp thứ tự vào Mộ và retry qua UI/HTTP.

| Mode mỗi ghế | Chuỗi và kiểm tra chính |
| --- | --- |
| spell | Pot → Magic → sáu Seven, tám link, sáu phí, root bị phủ nhận; owner chọn cleanup |
| trap | Ba Trap Hole → năm Seven, tám link; phá quái đúng một lần, hai owner cleanup riêng |
| choice | Fissure → Magic → năm Seven, bảy link; root choice một lần rồi owner cleanup |

Ghế A dùng Main1, B dùng Main2. Preview phản hồi trỏ đúng link hiện tại;
hủy mọi Seven preview không đổi state/LP. Kiểm dialog phản hồi ở 1440/390 px,
đọc nguồn Seven với mô tả scope mới, retry activation/answer trả cùng
receipt không xử lý lại; reorder/chọn radio chưa gửi không đổi state.
Người còn lại không thấy decision/option của owner. Link đã resolve bỏ
target handles, không lộ frame/source snapshot/digest. Hai ghế cùng facts
công khai, phí giữ nguyên khi resume, deck A/B giữ nguyên.

Suite HTTP riêng gồm sáu hành trình tương ứng và một kiểm default vẫn v5.
Có refresh làm stale handle trước Seven cuối, fresh intent hợp lệ, retry,
seat guard và từ chối field frame/review giả mạo trước mutation. Không
sửa engine/protocol/review hay dữ liệu bài trong chu kỳ này.

Bộ validate:platform thêm đủ sáu mode vào danh sách cũ; artifact đúng
source đã xác nhận 118 bước/108 browser report như bằng chứng dưới đây.
Không bỏ mode cũ hoặc tăng timeout workflow 25 phút.

## Giới hạn và điểm dừng

Fixture ban đầu chưa phải trận tự nhiên nhiều lượt. Chưa đủ ma trận đầy
đủ tay/Set, LP boundary, terminal, các root/pattern còn lại ở HTTP/browser
v6; bằng chứng backend C3b.3a cho các phần đó giữ riêng, không thay bằng
sáu journey này. Chưa tạo active review v6 hoặc đổi runtime manifest.

Chốt C3b.3b.1 sau hồi quy và artifact Windows, rồi dừng. C3b.3b.2 tiếp tục
phần ma trận HTTP/UI còn thiếu và active review/capability có nguồn trước
khi bật mặc định. C4 vẫn cần audit nhiều lượt và tiêu chí đóng Chain trong
roadmap. Ước lượng C3 tổng thể 2–4 ngày công cần cập nhật theo tích hợp,
không quy đổi thành cam kết số chu kỳ. Sau Chain giữ U1 bộ tạo bài riêng
và W1 Windows 11 desktop thực. Chưa đóng gói/bàn giao beta.

## Bằng chứng

Code `f24d2e0752b97cbe77618630b3cbb04e326e57fb` tại [CI 45276011271](https://github.com/xuanthao260604-sys/idc/actions/runs/45276011271), attempt 1.
Ubuntu job `138047875457`, Windows job `138047874761` đều completed/success.
Đã đọc log Ubuntu: checkout SHA khớp code; **6826/6826 test/70 file**,
typecheck, cards:check/build và vanilla/mixed smoke đạt. Local đạt cùng
**6826/6826 test/70 file**, typecheck, cards:check/build và hai smoke.
Bảy ca HTTP mới đạt; 69 suite trước giữ số ca, toàn bộ test cũ nguyên byte,
163 ca migration với 142 golden state/raw events giữ nguyên, không tái sinh.

Local/Linux chạy đủ sáu mode mới cùng hai hồi quy response-guide-a và
chain-view, Chrome/154.0.8037.57, runtimeExceptions=0. Không chạy lại toàn
bộ 118 bước trên Linux local trong chu kỳ này; Ubuntu CI cũng không chạy
bộ browser tổng hợp. Không dùng số Windows để điền vào bằng chứng Linux.

Artifact `windows-validation-45276011271-1`, ID `14869255329`;
SHA-256 ZIP khớp metadata GitHub:
`53754bfffa4a4024c823b8fd6034bd6521050a674e9b57838be0734606854c35`.
Report `2026-11-23T22-04-42-069Z-7896/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0,
npm 11.17.0, Edg/157.0.4341.60: **6826/6826 test/70 file,
118/118 bước, 108/108 browser report**, runtimeExceptions=0.

Đã đọc đủ 118 raw step log; mọi JSON browser khớp report/platform và
không runtime exception. So baseline C3b.3a
`windows-validation-45271655505-1`, source `813a487`: giữ toàn bộ 112 bước
và 102 browser facts cũ khi bỏ riêng browserVersion; capabilities.log
nguyên byte. Chỉ thêm sáu mode mới; sáu bộ facts mới Windows khớp Linux
khi bỏ platform/browserVersion. ZIP baseline cũng khớp metadata đã lưu.
Tổng hợp không ghép report/log khác source hoặc giả lập Windows 11.

Hash sau kiểm tra xác nhận engine/protocol, dữ liệu/review/evidence,
ảnh/frame/back, deck nguồn và mọi test cũ nguyên byte. README cũ giữ làm
prefix; default capabilities local khớp baseline. UI/catalog chỉ dùng
continuation đã có trong registry server, không nâng verification của
bài hoặc tạo active review v6.

Trong quá trình nối harness đã sửa phần fixture expanded mặc định chạy
nhầm mode mới và selector chọn phần tử cuối trong DOM Chain hiển thị đảo
LIFO; không nới invariant hoặc sửa engine. Sáu mode cuối và CI cùng source
đã đạt. Commit sau CI chỉ cập nhật tài liệu [skip ci]; bằng chứng code thuộc
`f24d2e0`.

Dừng ở C3b.3b.1. Default review/manifest vẫn v5; ma trận HTTP/UI còn thiếu
và active review/gate thuộc C3b.3b.2, C4 audit nhiều lượt còn mở. Chưa đóng
Chain, chưa kiểm Windows 11 desktop, chưa đóng gói/bàn giao beta. Sau Chain
giữ bộ tạo bài riêng rồi Windows 11 thực.
