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
hủy mọi Seven preview không đổi state/LP. Kiểm dialog ở 1440/390 px,
đọc nguồn Seven với mô tả scope mới, retry activation/answer trả cùng
receipt không xử lý lại; reorder/chọn radio chưa gửi không đổi state.
Người còn lại không thấy decision/option của owner. Link đã resolve bỏ
target handles, không lộ frame/source snapshot/digest. Hai ghế cùng facts
công khai, phí giữ nguyên khi resume, deck A/B giữ nguyên.

Suite HTTP riêng gồm sáu hành trình tương ứng và một kiểm default vẫn v5.
Có refresh làm stale handle trước Seven cuối, fresh intent hợp lệ, retry,
seat guard và từ chối field frame/review giả mạo trước mutation. Không
sửa engine/protocol/review hay dữ liệu bài trong chu kỳ này.

Bộ validate:platform thêm đủ sáu mode vào danh sách cũ: dự kiến 118 bước /
108 browser report; con số nghiệm thu chỉ chốt khi đã đọc artifact. Không
bỏ mode cũ hoặc tăng timeout workflow 25 phút.

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

Đang chốt kiểm tra và CI đúng source; chưa dùng kết quả dự kiến làm kết luận.
