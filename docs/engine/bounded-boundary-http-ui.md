# C3b.3b.2a — biên HTTP/UI Counter v6

Ngày 24/11/2026. Kế thừa code `f24d2e0`, báo cáo `6706dbc` và sáu luồng
HTTP/UI explicit v6. Chu kỳ này bổ sung kiểm biên; chưa bật v6 mặc định.

## Phạm vi

Chỉ mở rộng fixture và kiểm thử; không sửa engine, protocol, server hoặc
UI sản phẩm. Fixture có thêm lựa chọn Phép gốc nằm Set từ lượt trước,
không dựng Chain/receipt và không sửa state sau khi server bắt đầu.

66 ca HTTP mới:

- 12 ca LP: hai ghế × Main1/Main2 × 999/1000/1001 LP trước Seven thứ năm.
  Hai phí trước của cùng owner đã trả thật. 999/1000 bị từ chối, lá vẫn úp,
  không thu phí; 1001 trả đúng 1000 còn 1 LP. Resolve/cleanup giữ các phí.
- 32 ca: hai ghế × hai Main × tay/Set × bốn nhánh. Pot với 0/1 lá thiếu
  lần rút bắt buộc, Pot với đủ hai lá không kết thúc sớm; Ookazi gây lethal
  hoặc để đối thủ còn đúng 1 LP sau hai phí của đối thủ. Terminal bỏ frame/
  Chain/decision, không dọn các nguồn còn sống sau trận; lệnh mới bị chặn,
  retry activation cũ giữ cùng receipt và không đổi kết quả.
- 22 ca: cả hai ghế cho đúng 11 Phép gốc đã pin, Magic và năm Seven thật;
  chạy handler/root choice/cleanup qua HTTP, gồm draw/heal/damage/cost/target.
  Ca A dùng Set/Main2, B dùng tay/Main1. Không tính đây là toàn bộ tích
  Descartes của mọi root/độ dài/zone/phase.

Mọi ca kiểm deck A/B, facts chung giữa hai ghế, frame/snapshot không lộ,
clock mỗi lệnh thành công tăng một lần và retry sau resolution/terminal.

Tám mode browser `--bounded-boundary=a|b:blocked|paid|draw|damage` chạy
UI/HTTP thật sau setup. Ghế A dùng Main2, B Main1, bổ sung cặp phase ngược
với các mode C3b.3b.1. Blocked A kiểm 999, B kiểm 1000; Paid kiểm 1001
ở cả hai ghế. Draw kiểm 0/1 lá; Damage kiểm lethal. Hai mode terminal dùng
Phép gốc Set, Magic có thể cùng chủ với Phép. Cả năm phí, các Pass và
kết quả trận đều phát sinh từ lệnh thật. Seven preview/hủy không đổi state;
UI giữ cách kích hoạt trực tiếp Phép Set không có lựa chọn hiện có.
Không giả định Phép Set luôn có dialog xác nhận.

Validation thêm tám mode vào bộ cũ; artifact đúng source đã xác nhận
126 bước/116 browser report như bằng chứng dưới đây. Không bỏ mode cũ
hoặc tăng timeout workflow 25 phút.

## Điểm dừng

Chốt kiểm biên và đối chiếu CI/artifact rồi dừng. Review/manifest vẫn v5;
profile v6 của các test nằm trong cấu hình server tường minh. Không thêm
lá/hiệu ứng hoặc nâng trạng thái dữ liệu historical pending thành verified.
Dữ liệu/review/evidence, ảnh/frame/back và deck nguồn giữ nguyên.

Tiếp theo chốt gate review v6/default với baseline legacy có phiên bản;
không tái sinh golden để bỏ khác biệt. Phần chưa đủ phải được ghi trong
ma trận trước khi bật mặc định; C4 vẫn cần hành trình tự nhiên nhiều lượt
và checklist đóng Chain. C3/C4 chưa hoàn tất. Ước lượng C3 tổng thể 2–4
ngày công cần cập nhật theo tích hợp; đây không phải cam kết lịch beta.
Sau Chain giữ bộ tạo bài riêng và Windows 11 desktop thực. Chưa đóng gói/
bàn giao beta hoặc kiểm chứng Windows 11 bằng runner CI.

## Bằng chứng

Code `dc5452bb86da523d23035e9e8cdcd323da2861d9` tại [CI 45288045142](https://github.com/xuanthao260604-sys/idc/actions/runs/45288045142), attempt 1.
Ubuntu job `138089363817`, Windows job `138089363065` đều completed/success.
Đã đọc log Ubuntu: checkout SHA khớp code; **6892/6892 test/71 file**,
typecheck, cards:check/build và vanilla/mixed smoke đạt. Local đạt cùng
**6892/6892 test/71 file**, typecheck, cards:check/build và hai smoke.
66 ca HTTP mới đạt; 70 suite cũ giữ số ca và test cũ nguyên byte. 163 ca
migration với 142 golden state/raw events không tái sinh hoặc thay hash.

Linux local chạy đủ tám mode mới và hai hồi quy bounded-live-a-trap,
chain-view, Chrome/154.0.8037.57, runtimeExceptions=0. Không chạy lại bộ
126 bước đầy đủ trên Linux local trong chu kỳ này; Ubuntu CI cũng không
chạy browser tổng hợp. Không dùng số Windows điền vào bằng chứng Linux.

Artifact `windows-validation-45288045142-1`, ID `14873896987`;
SHA-256 ZIP khớp metadata GitHub:
`6f754cf556eaa12a81547d6f1f8c33081d0be10344c36ac4778acaa112d3f8b4`.
Report `2026-11-23T23-21-30-759Z-5816/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0,
npm 11.17.0, Edg/157.0.4341.60: **6892/6892 test/71 file,
126/126 bước, 116/116 browser report**, runtimeExceptions=0.

Đã đọc đủ 126 raw step log, đối chiếu mọi JSON browser với report/platform.
So baseline C3b.3b.1 `windows-validation-45276011271-1`, source `f24d2e0`:
giữ toàn bộ 118 bước và 108 browser facts khi bỏ riêng browserVersion;
capabilities.log nguyên byte. Tám mode mới Windows khớp facts Linux khi
bỏ platform/browserVersion. ZIP baseline cũng khớp metadata đã lưu.
Không ghép evidence từ source khác hoặc tự gọi runner là Windows 11.

Hash sau kiểm tra xác nhận engine/protocol, UI/server, dữ liệu/review/
evidence, ảnh/frame/back, deck nguồn và mọi test cũ nguyên byte. Fixture
bounded-live chỉ thêm rootSet; các cấu hình cũ mặc định vẫn đi từ tay.
README trước chu kỳ giữ làm prefix; default capabilities khớp baseline.
Không tạo active review v6 hoặc thay runtime manifest.

Harness ban đầu đã kỳ vọng dialog cho Phép Set không chọn mục tiêu;
đã sửa để theo đúng đường kích hoạt trực tiếp có sẵn, không thay UI hoặc
nới guard để qua test. Các assertion preview/hủy áp dụng cho Seven.
Commit chốt sau CI chỉ cập nhật tài liệu [skip ci]; bằng chứng code thuộc
`dc5452b`.

Dừng ở kiểm biên C3b.3b.2a. Bước tiếp theo là gate review v6/default với
baseline legacy có phiên bản và ma trận phần còn thiếu trước khi bật.
C4 audit nhiều lượt còn mở; chưa đóng Chain, chưa kiểm Windows 11 desktop,
chưa đóng gói/bàn giao beta. Sau Chain giữ bộ tạo bài riêng và Windows 11
thực.
