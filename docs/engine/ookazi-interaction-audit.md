# Rà soát tương tác Ookazi — 27/10/2026

Bổ sung kiểm thử sau [mốc mở hiệu ứng Ookazi](ookazi.md), giữ nguyên
catalog 110 loại/15 hiệu ứng đã duyệt. Không đổi engine, review, dữ liệu
nhập, deck mẫu hoặc artwork. Mục này kiểm tra các hiệu ứng đã mở khi dùng
liên tiếp; không mở thêm luật hoặc lá bài.

## Cơ sở và phạm vi

Dùng nguyên các review đang pin definition và format revision 4:
Ookazi gây 800; Hinotama gây 500; Dian Keto hồi 1000; Magician of Faith
lấy một Phép trong Mộ mình về tay; Monster Reincarnation và Tribute to
The Doomed bỏ một lá làm chi phí theo scope đã duyệt.
Các nguồn và giới hạn được ghi trong data/reviews/ookazi.effects.json,
life-point-spells.effects.json, magician-faith.effects.json,
reincarnation.effects.json và tribute-doomed.effects.json.
Không lấy dữ liệu mới, không tự diễn giải card text thành code.

Mỗi Phép xử lý ở một link độc lập, sau hai Pass rồi mở lại cửa sổ hợp lệ.
Không coi chuỗi thao tác này là mixed Chain. Chưa hỗ trợ negate,
prevention/redirection/replacement hoặc trigger do bỏ bài/thay đổi LP
ngoài các scope hiện có. Historical text pending và summary nhập vẫn giữ
nguyên; kiểm thử runtime không nâng trạng thái snapshot nhập.

## Kịch bản đã bổ sung

16 ca tools/ookazi-interactions.test.ts, đối xứng A/B:

| Kịch bản | Kết quả cần kiểm tra |
| --- | --- |
| Ba Phép LP theo hai thứ tự | LP controller 9000, đối thủ 6700; từng activation giữ LP đến khi resolve; dùng lại một ô Phép/Bẫy, không tiêu Normal quota |
| Dùng Ookazi → Faith lấy lại → dùng mới | 8000 → 7200 → 6400; lấy về tay không tự gây sát thương; chọn đúng Mộ mình, bản Ookazi đối thủ không bị di chuyển |
| Bỏ Ookazi cho Monster Reincarnation hoặc Tribute to The Doomed | Cost ghi nhận ngay nhưng LP không đổi; nguồn xử lý đúng mục tiêu, Faith có thể lấy lại Phép rồi Ookazi mới gây 800 khi kích hoạt/resolve riêng |
| Hinotama rồi Ookazi khi đối thủ có 1300 hoặc 1299 LP | LP về 0, kết thúc và cleanup trong cùng lệnh; từ chối Dian Keto sau khi trận đã kết thúc |
| Lấy lại Ookazi và thử handle/lệnh cũ | Handle cũ bị từ chối không đổi state/history; hai activation thật dùng handle hiện hành, retry receipt không cộng thêm sát thương; public facts giống ở A/B |

Fixture chỉ được chuẩn bị trước hành động đầu hoặc trước khi tạo adapter.
Mọi bước engine sau đó kiểm invariants và input không bị sửa. Các ca handle
đi qua command adapter; refresh chỉ đổi góc nhìn/handle. Đây không phải
bằng chứng chống xử lý lặp sau restart process hoặc qua hệ thống online.

Hai browser mode --ookazi-interactions=a/b thực hiện bằng thao tác UI:
Monster Reincarnation bỏ Ookazi, lấy Battle Ox từ Mộ; Flip Summon Faith,
chọn Ookazi trong hai Phép ở Mộ mình; lấy lại rồi lần lượt dùng Ookazi,
Dian Keto và Hinotama. Kiểm tra preview cost/target, lựa chọn riêng tư,
LP trước/sau Pass, ba lượng LP khác nhau và activity ở cả hai ghế.
Bản Ookazi trong Mộ đối thủ giữ nguyên; saved deck A/B không đổi.
Fixture mới được tách khỏi setup sân catalog mặc định, tránh hai fixture
cùng di chuyển một bản bài. Không có chỉnh state sau khởi động server.

## Kết quả

Linux đạt 897/897 test trong 38 file, 54/54 bước validation và 44 browser
report bằng Chromium 154.0.8037.57, runtimeExceptions=0. Đã đọc report tại
artifacts/platform-validation/2026-10-27T06-49-33-735Z-263989/report.json,
kiểm tra từng browser step có đúng một report khớp host/version/lỗi runtime.
Cả hai report tương tác A/B đều có LP controller 9000, đối thủ 6700,
đủ public facts và savedDecksUnchanged. Log ghi đủ 16 ca tích hợp mới;
17 bundle nhập giữ 110 lá/95 verified/15 historical pending.

Toàn capabilities JSON giống mốc Ookazi trước: runtime 110 lá/15 hiệu ứng,
11 scope/17 snapshot, riêng import Ookazi vẫn pending/not-started/not-run.
Không có diff trong data, packages hoặc apps. Hai trận tự nhiên giữ kết quả:
pilot 16 lượt/339 lệnh, B thắng LP 0/4200; expanded 16 lượt/348 lệnh,
B thắng LP 0/3450. Không chỉnh state trong khi chơi.

Windows và Ubuntu CI đã đạt trên source commit
58f179edc49b6215453e4b22ce7b8c997894bd20,
[run 40463530657](https://github.com/xuanthao260604-sys/idc/actions/runs/40463530657).
Đã tải/đọc artifact windows-validation-40463530657-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62. Windows đạt 897/897 test (38 file), 54/54 bước,
44 browser report; từng bước browser có đúng một report khớp host/version,
runtimeExceptions=0. Đã đọc log đủ 16 ca mới, 17 bundle/110 lá và cả hai
report tương tác A/B (LP 9000/6700, các cờ kiểm tra đều đạt).
Toàn capabilities JSON giống Linux và mốc trước; cả hai trận tự nhiên có
kết quả giống Linux. Report ghi windows11DesktopVerified=false tại
artifacts/ci-ookazi-interactions/2026-10-27T06-51-18-222Z-5820/report.json.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
