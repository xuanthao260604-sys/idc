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

Validation thêm tám mode vào bộ cũ, dự kiến 126 bước/116 browser report.
Không bỏ mode cũ, không tăng timeout workflow 25 phút. Con số nghiệm thu
chỉ chốt theo artifact thực tế.

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

Đang chốt hồi quy và CI đúng source; chưa dùng số dự kiến làm kết luận.
