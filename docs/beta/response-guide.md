# Bài phản hồi trong hướng dẫn lượt — 28/10/2026

Bàn đấu liệt kê các lá có thể phản hồi ngay dưới hướng dẫn lượt. Người
chơi có thể mở lựa chọn từ đây thay vì phải tìm từng lá úp trên sân.
Mỗi nút ghi loại phản hồi, tên lá và ô Phép/Bẫy để phân biệt bản sao.

## Hành vi

Danh sách lấy từ availableActions của góc nhìn hiện hành, chỉ nối với
các lá đã biết trên hàng Phép/Bẫy của chính viewer. Chỉ hiện khi viewer
có priority trong cửa sổ summon-response/chain-response, không có kết quả
hoặc decision đang chờ. Các tổ hợp chi phí/mục tiêu của cùng một lá gộp
thành một nút theo handle; hai bản sao khác ô vẫn có hai nút riêng.

Trap Hole mở hộp chọn mục tiêu hiện có; Magic Jammer mở hộp chọn chi phí
và đọc Phép đang phản hồi. Nút trên sân và nút mới dùng chung đường mở
lựa chọn. Mở hộp, xem preview hoặc Hủy không gửi lệnh. Xác nhận mới gửi
command và server vẫn kiểm lại luật/quyền/version. Khi chờ phản hồi mạng,
các nút bị khóa và handler kiểm busy cùng intent hiện tại trước khi mở.

Nếu không có lá phản hồi hợp lệ, hướng dẫn nhắc dùng Pass và chờ hai bên
nhường quyền liên tiếp. Không tự Pass hoặc tự dùng Bẫy. Khi đang chờ
người khác, không liệt kê bài hoặc khả năng phản hồi của họ. Chuyển góc
nhìn/refresh thay danh sách bằng handle hiện hành; Chain đóng, hết quyền,
decision hoặc kết quả trận làm danh sách rỗng. Bảng nằm trong arena nên
tiếp tục bị che cùng bàn đấu ở màn chuyển máy.

Không đổi engine/protocol/API, review, 18 bundle, starter, deck đã lưu
hoặc artwork. Runtime giữ 111 loại/16 hiệu ứng/12 scope, Magic Jammer vẫn
chỉ trong pattern hai liên kết đã duyệt; không mở luật hoặc lá mới.

## Kịch bản kiểm chứng

Hai browser mode --response-guide=a/b dựng fixture trước server và thao
tác qua UI/HTTP thật; không chỉnh state sau khởi động:

- Normal Summon Battle Ox, chuyển priority: hai Trap Hole được liệt kê
  theo ô 1/2, hai Magic Jammer úp cùng sân không xuất hiện sai timing.
  Enter mở lựa chọn, Hủy giữ nguyên view và số request. Kích hoạt đúng
  bản ô 2, rồi ô 1; Chain hai Trap phá Battle Ox đúng một lần.
- Ookazi kích hoạt, hai Magic Jammer được liệt kê theo ô 4/5. Chọn đúng
  bản ô 5, preview cost Skull Servant, Hủy không đổi state; xác nhận và
  hai Pass phủ nhận Phép, LP giữ nguyên. Góc nhìn đang chờ không thấy
  tên các lá úp khác trong hướng dẫn.
- Pot of Greed kích hoạt: đối thủ còn Magic Jammer úp nhưng hết tay nên
  không có nút phản hồi. Sau khi họ Pass, chủ Phép có thể tự phản hồi
  bằng Counter của mình. Hai cost plan chỉ tạo một nút; refresh dùng
  handle mới, preview/Hủy vẫn chỉ đọc.
- Giữ request xác nhận chờ mạng: nút phản hồi bị khóa, nhấn lại không
  thêm request; thả request chỉ gửi một command và trả cost một lần.
  Hai Pass phủ nhận Pot, không bốc bài; LP 8000/8000, hai cost fact và
  hai fact phủ nhận. Chain đóng xóa các nút, saved deck A/B giữ nguyên.

Đã chụp và xem ảnh 1440×1000 và 390×844 tại
artifacts/response-guide/desktop.png và narrow.png. Nút tự xuống hàng,
không tràn ngang. Hai ca mới vào validate:platform; không thêm unit test
mô phỏng lại hàm UI. Bộ thư viện/HTTP hiện có vẫn 1050 test trong 41 file.

## Kết quả

Linux đạt 1050/1050 test trong 41 file, 62/62 bước validation và 52 browser
report bằng Chromium 154.0.8037.57, runtimeExceptions=0. Đã đọc report tại
artifacts/platform-validation/2026-10-28T07-46-07-239Z-42141/report.json;
mỗi bước browser có đúng một report khớp host/version. Hai mode
response-guide-a/b đạt toàn bộ cờ kiểm chứng nêu trên; các mode Counter,
audit tương tác và hồi quy cũ cũng đạt. Không cộng ca browser vào số
unit/HTTP test.

18 bundle giữ 111 định nghĩa/95 verified/16 historical pending. Toàn
capabilities log giống nguyên byte mốc trước: 111 supported, 16 hiệu ứng,
12 scope và 18 snapshot. Không có diff trong data hoặc packages. Hai trận
tự nhiên giữ kết quả: pilot 16 lượt/339 lệnh, B thắng LP 0/4200; expanded
13 lượt/263 lệnh, A thắng LP 6300/0. Không chỉnh state trong khi chơi.

Windows và Ubuntu CI đã đạt trên source commit
d2e979114f0562e02f02bbf0c205e2744658d502,
[run 40652326558](https://github.com/xuanthao260604-sys/idc/actions/runs/40652326558).
Đã tải/đọc artifact windows-validation-40652326558-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62. Windows đạt 1050/1050 test (41 file), 62/62 bước,
52 browser report; mỗi bước browser có đúng một report khớp host/version,
runtimeExceptions=0. Hai mode response-guide-a/b đạt toàn bộ cờ, gồm
đúng intent, bản sao theo ô, gộp cost plan, đúng priority, không lộ bài úp,
Trap/Counter, tự phản hồi Phép, thiếu cost, Hủy, Enter, refresh, khóa busy,
một command khi xác nhận và xóa nút sau resolution. Các mode Counter và
audit cũ cũng đạt; 18 bundle giữ số liệu nhập, không nâng status snapshot.

Toàn capabilities JSON giống Linux và mốc trước; hai trận tự nhiên có
kết quả giống Linux. Report ghi windows11DesktopVerified=false tại
artifacts/ci-response-guide/2026-10-28T07-47-42-819Z-8196/report.json.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
