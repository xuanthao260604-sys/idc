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

16 ca tích hợp mới và hai ca trình duyệt A/B đã đạt Linux. Bộ tổng hợp
Linux và Windows CI đang được kiểm chứng; kết quả sẽ ghi từ report thực tế.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
