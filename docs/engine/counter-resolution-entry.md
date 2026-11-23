# C3b.2a — Checkpoint đầu vào resolver Counter v5

Ngày 23/11/2026, tiếp nối [C3b.1](bounded-counter-review-gate.md) tại
`e83df57`. Đã nối checkpoint dùng chung vào gameplay đang mở, chưa hoàn
thành C3b.2 hoặc C3. Registry vẫn chặn v6, manifest/review vẫn v5.

## Đường chạy thật

Sau Pass thứ hai, trước mutation resolution, engine tạo checkpoint tạm
trong Context của chính transition khi registry có continuation v5 và
Chain có Counter. Không tạo field mới trong DuelState/protocol; Context
không được lưu qua lệnh kế tiếp hoặc đưa vào PlayerView.

Checkpoint kiểm identity/link/source, pin định nghĩa, bản sao/ô, target,
Set từ lượt trước, occurrence Trap Hole, phí discard/LP đã trả, chronology,
board binding và clock. Capture đòi timing resolving, priority null và đủ
hai Pass; đây là checkpoint nội bộ sau lịch sử lệnh đáng tin cậy, không
chứng minh một snapshot tùy ý đã đi qua các lệnh hợp lệ. Kết quả có bản sao
links/timing và occurrence, graph/receipt/balance, board fingerprint, clocks
và lịch LIFO bất biến. Không đóng băng hoặc sửa input; không trả phí lại.

Năm đường Counter hiện có lấy lịch emission từ checkpoint này. Trước khi
emit, kiểm lại toàn bộ original links và lịch kernel, kể cả cost snapshot.
Các parent validator/frame cũ vẫn quản lý root, pause/resume và cleanup;
checkpoint không thay thẩm quyền của chúng hoặc xác nhận board sau effect.
Seam resolver ứng viên riêng và registry review cũ v1–v4 giữ đường hiện có.

Hàm kiểm binding hiện tại đối chiếu lại toàn checkpoint với capture mới:
đổi clock dù board fingerprint như cũ, đổi occurrence/timing, trả phí khác,
source, decision, terminal hoặc overlap đều không dùng lại entry cũ được.
Hash chỉ đối chiếu nội dung, không xác thực, chống phát lại hoặc cấp quyền
kích hoạt. Chưa dùng checkpoint này làm paused frame cho v6.

## Structural core và quyền chơi

Validator cấu trúc C2a được dùng chung qua hai entry riêng:

- Entry candidate giữ effect ID và kind cũ, không cấp quyền gameplay.
- Entry reviewed đòi capability v5, đúng handler, pattern S–M–V^0..2 hoặc
  T–V^1..3. Tách kind đầu ra và so effect ID live theo từng vị trí; không
  đổi nhãn candidate để coi như activation thật.

Các giới hạn cấu trúc rộng C1 (tối đa tám link) không mở giới hạn v5. Entry
live vẫn chặn prefix nhiều Trap Hole có Seven, link thứ năm và candidate
ID. Trap-only, Spell một link và FLIP không bị đưa vào đường Counter này.
Resolver generic cho tổ hợp mới chưa được nối; không cài review v6 chỉ vì
schema đã nhận cú pháp. Không nhập thêm bài hoặc thay metadata hiệu ứng.

## Kiểm chứng

30 ca mới kiểm capture hai họ/hai ghế từ lệnh thật sau fixture đầu, input
bất biến, clock/board/occurrence/receipt/decision/terminal, entry bị sửa,
candidate/registry gate, hai Pass và lịch trước emission. Đây là kiểm thử
checkpoint live v5, chưa phải kiểm thử hiệu ứng cho scope v6.

Đã chạy lại 142 golden journey trong suite migration 163 ca: giữ toàn bộ
hash state/raw event sau mỗi command, không tái sinh file baseline. Phần
candidate giữ API/kind/effect ID cũ và ma trận component trước đó. Protocol,
projection/UI, dữ liệu/reviews/evidence, ảnh và deck cũ giữ nguyên.

Kết quả local và CI được cập nhật tại phần bằng chứng chốt dưới đây. Chỉ
đọc artifact của đúng source, đối chiếu số ca từng suite và browser facts;
không dùng CI v5 làm bằng chứng hiệu ứng v6 hoặc Windows 11 desktop.

## Điểm dừng

Dừng sau C3b.2a và báo cáo. Việc tiếp theo C3b.2b là frame/resolver live cho
phạm vi hữu hạn: identity/occurrence xuyên root choice, board checkpoint
sau mutation, history chi phí, cleanup, terminal/concede và resume đúng một
lần. Không dùng lại entry trước effect làm binding board sau effect, không
chép journal ứng viên vào DuelState. Sau đó mới nối activation/discovery/UI
và bỏ guard v6 khi đủ bằng chứng.

C3 vẫn giữ ước lượng tổng thể 2–4 ngày công, cần cập nhật theo tích hợp;
không coi vài chu kỳ 30 phút là đã đóng Chain. C4 audit nhiều lượt vẫn cần
trước U1 bộ tạo bài riêng và W1 Windows 11 thực. Chưa đóng gói/bàn giao beta.

## Bằng chứng chốt

Đang kiểm chứng source C3b.2a; chốt sau khi đọc CI và artifact Windows.
