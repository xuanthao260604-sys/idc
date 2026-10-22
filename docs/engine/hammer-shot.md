# Hammer Shot — quái tấn công có ATK cao nhất trên hai sân

Batch hammer-shot thêm một lá, giữ nguyên 103 định nghĩa và mọi review trước đó.
Catalog runtime hiện có 104 loại: 95 quái thường và 9 lá hiệu ứng được hỗ trợ trong scope giới hạn
(6 Phép thường, 2 quái FLIP, 1 Bẫy). Starter 40 lá không đổi.

## Nguồn và trạng thái dữ liệu

- Passcode 26412047, Konami CID 6130, Normal Spell.
- [Konami hiện hành](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=6130&request_locale=en):
  “Destroy the 1 Attack Position monster on the field with the highest ATK (your choice, if tied).”
- API mô tả “Destroy 1 face-up Attack Position monster with the highest ATK. (If it is a tie, you get to choose.)”.
  Overlay chép đúng văn bản Konami; giữ raw và fingerprint API riêng, không sửa bundle bằng tay.
- Bản in Bắc Mỹ SOD-EN038, SOUL OF THE DUELIST, 01/10/2004: đối chiếu hàng in Konami và API card_sets.
  Hai hàng Rare/Ultimate Rare có cùng code/date/product; deduplicate bộ ba này khi ghi bằng chứng bản in.
- [Goat cardpool](https://www.goatformat.com/cardpool.html) liệt kê Soul of the Duelist (SOD).
- [Goat rulings3](https://www.goatformat.com/rulings3.html), Individual Card FAQs Hammer Shot:
  “"Hammer Shot" determines which monster to destroy using current ATK, not original ATK.”
  và “"Hammer Shot" does not target. You determine which monster is destroyed when "Hammer Shot" resolves.”
  Đây là nguồn cộng đồng, không gắn nhãn nguồn Konami sơ cấp.
- Đọc nguồn ngày 22/10/2026; hash HTML và quotation lưu ở data/evidence. Không tải artwork.

Snapshot mới imported=1, verifiedData=0, historicalReviewPending=1, implemented/testedEffects/playable=0.
Tổng snapshot: imported=104, verifiedData=95, historicalReviewPending=9.
Văn bản current-reference không được gọi là nguyên văn bản in 2005.
Runtime dùng hammer-shot.effects.json pin SHA toàn bộ parsed definition và format revision 4,
scope normal-spell-highest-attack-position-single-link-v1; sai hash/scope/override bị từ chối.

## Hành vi hỗ trợ

Phép thường một link: own open Main1/Main2, đúng priority; từ tay cần ô Phép/Bẫy trống hoặc
kích hoạt từ ô đã Set của mình, kể cả Set cùng lượt. Không cost và không chọn target khi kích hoạt.
Cần ít nhất một quái ngửa ở tư thế tấn công trên một trong hai sân; có thể chỉ có quái của mình.
Có thể Set dù chưa có ứng viên. Không kích hoạt nếu chỉ có quái phòng thủ hoặc sân trống.

Sau hai pass, chọn một quái tấn công có ATK hiện tại cao nhất trên cả hai sân và phá nó.
Nếu quái của mình có ATK cao nhất thì phải phá quái của mình; không tự ưu tiên đối thủ.
Quái phòng thủ ngửa hoặc úp không là ứng viên, dù ATK lớn hơn.
Nếu hòa ATK, controller của link chọn giữa các quái hòa cao nhất tại resolution, có thể chọn quái của mình.
Kiểm tra actor/decision/version/option trước khi phá; người kia không được trả lời lựa chọn này.

Gửi quái về Mộ của owner qua đường xử lý phá quái hiện có; không gây battle damage, không kích hoạt
FLIP chỉ vì quái bị phá. Phép được cleanup xuống Mộ, Chain/decision được dọn và mở lại cửa sổ.
UI dùng luồng lựa chọn hiện có, phân biệt hai lá cùng tên bằng người chơi và ô sân.
Public activity chỉ công khai một quái bị phá, không chuyển raw instance ID từ sự kiện nội bộ.
Gửi lại lệnh lựa chọn đã chấp nhận trả receipt cũ và không phá thêm quái.

Board server cung cấp tư thế và ATK tại resolution; không nhận stat/position từ client để thực thi hiệu ứng.
Primitive kiểm tra thiếu/tư thế mâu thuẫn thay vì coi mọi quái ngửa là quái tấn công.
Engine hiện chưa có modifier nên ATK đang dùng bằng ATK định nghĩa; test primitive với ATK khác nhau
không đồng nghĩa đã triển khai hiệu ứng tăng/giảm ATK trong gameplay.

Giữ giới hạn một link, response bằng pass. General mixed Chain, negate, immunity, replacement/prevention,
modifiers và SEGOC vẫn ngoài phạm vi. Tư thế face-down Attack đặc biệt không nằm trong model hiện tại.
Không suy ra đã hỗ trợ lá khác từ phần rulings xung quanh Hammer Shot.

## Bảo toàn và kiểm thử

cards:check kiểm tra đủ 11 batch offline; nhập lại hai lần giữ nguyên bundle/review.
Raw hoặc review lỗi giữ cả 11 bundle đã hợp lệ. Deck catalog 103 chứa Smashing Ground và hai Phép LP
được tải nguyên byte, không migrate/ghi đè file; default deck không đổi.
Theo copy limit Goat, toàn pool cho phép 310 lá, không tự đưa trần Main Deck 60 hiện đại vào luật cũ.

28 ca riêng kiểm tra metadata/review drift/scope/override; hai controller từ tay và Set, phá quái của
mỗi bên; quái phòng thủ có ATK cao hơn bị loại; hai quái hòa ATK giữa hai sân và quyền lựa chọn;
activation chỉ có quái của mình, thiếu ứng viên, phá FLIP ngửa, ATK 0 và ATK hiện tại trong primitive;
thiếu/mâu thuẫn/tư thế không hỗ trợ; adapter retry lựa chọn không phá lần hai và activity giống nhau ở A/B.
Browser --hammer-shot chọn phá Dark Magician của chính người kích hoạt khi hòa với đối thủ,
giữ hai Blue-Eyes ở phòng thủ ngửa/úp, xác nhận Chain, thông báo và Mộ.
Fixture chỉ chuẩn bị trước server; sau đó chạy qua lệnh public hoặc thao tác UI, không chỉnh state khi chơi.

## Kết quả

Linux: typecheck đạt, 519/519 test trong 27 file; 25/25 bước validation và 15 browser report
với Chromium 154.0.8037.57, runtimeExceptions=0.
Trận tự nhiên catalog 104: 18 lượt, 351 lệnh, 14 attack, 1 decision;
dùng Hammer Shot/Hinotama/Man-Eater Bug/Smashing Ground, B thắng LP 0/4200, không chỉnh state khi chơi.
Pilot 20 vẫn đạt 16 lượt/339 lệnh, đủ 5 hiệu ứng cũ.
Windows CI chờ xác minh source commit của mục này.
Seed expanded đổi từ 90 sang 06 để trận tự nhiên của pool mới thực sự dùng Hammer Shot và có decision;
kiểm tra browser yêu cầu Hammer Shot đã kích hoạt, không hạ điều kiện có decision/attack/kết thúc trận.
Windows 11 desktop chưa chạy; artwork vẫn placeholder; chưa đóng gói hoặc bàn giao beta.
