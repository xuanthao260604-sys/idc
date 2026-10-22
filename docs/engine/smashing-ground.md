# Smashing Ground — Phép chọn quái theo DEF cao nhất

Mục này thêm một lá vào batch riêng defense-spell, giữ nguyên chín bundle và mọi review cũ.
Runtime hiện có 103 loại: 95 quái thường và 8 lá hiệu ứng được hỗ trợ trong scope giới hạn.

## Dữ liệu và nguồn

- Passcode 97169186, Konami CID 5905; Normal Spell.
- [Konami hiện hành](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=5905&request_locale=en):
  “Destroy the 1 face-up monster your opponent controls with the highest DEF (your choice, if tied).”
- API dùng “that has” thay cho “with”; overlay chép đúng câu Konami và giữ fingerprint/raw API.
  Không xem hai bản khác chữ là hoàn toàn trùng, không tự sửa raw hoặc generated bundle.
- Bản in Bắc Mỹ IOC-093, INVASION OF CHAOS, 01/03/2004, đối chiếu hàng in trên Konami và card_sets API.
- [Goat cardpool](https://www.goatformat.com/cardpool.html) liệt kê Invasion of Chaos (IOC).
- [Goat rulings3](https://www.goatformat.com/rulings3.html), FAQ Freed the Matchless General,
  nêu Smashing Ground trong nhóm Spell không target. Đây là nguồn cộng đồng; không gắn nhãn nguồn Konami sơ cấp.
- Đọc nguồn 22/10/2026; hash HTML và quotation lưu trong data/evidence. Không tải artwork.

Snapshot nhập mới vẫn imported=1, verifiedData=0, historicalReviewPending=1,
implemented/testedEffects/playable=0. Tổng 103 imported, 95 verified data, 8 pending lịch sử.
Đây là dữ liệu current-reference, chưa xác nhận nguyên văn bản in 2005.
Khả năng runtime do review riêng defense-spell.effects.json pin SHA toàn bộ definition,
format revision 4, scope normal-spell-highest-defense-single-link-v1.

## Hành vi hỗ trợ

Kích hoạt từ tay cần ô Phép/Bẫy trống, hoặc từ ô đã Set của mình (có thể cùng lượt).
Chỉ trong open Main1/Main2 của người đi lượt, đúng priority; không cost và không target lúc activation.
Cần ít nhất một quái ngửa của đối thủ. Có thể Set dù chưa có quái hợp lệ.

Sau hai pass, engine lấy quái ngửa do đối thủ điều khiển, so DEF và phá một quái có DEF cao nhất.
Không lọc theo tư thế tấn công/phòng thủ của quái ngửa. Quái úp và quái của mình không là ứng viên.
Nếu hòa DEF, controller của link chọn tại resolution; chỉ các quái hòa cao nhất được đưa vào lựa chọn.
Người kia không được trả lời; sai actor/option/version bị từ chối nguyên trạng.

Phá quái dùng đường xử lý gửi Mộ hiện có; không gây battle damage, không coi việc phá quái là lật bài.
Phép xuống Mộ sau xử lý, Chain/decision được dọn và cửa sổ phản hồi mở lại.
UI dùng luồng lựa chọn và thông báo phá quái hiện có, không thêm chọn target trước activation.

Primitive nhận DEF từ board server khi resolve, không đọc mô tả để chạy code hoặc nhận DEF từ client.
Trong engine hiện tại không có modifier; số đang dùng bằng DEF định nghĩa. Kiểm thử primitive với
board khác nhau không chứng minh đã triển khai modifier hoặc hiệu ứng thay đổi DEF trong gameplay.
Thiếu DEF cho ứng viên bị từ chối, không lấy ATK hoặc giá trị mặc định thay thế.

Giữ scope một link, response bằng pass. General mixed Chain, negate, immunity, destruction
replacement/prevention, SEGOC và modifier vẫn ngoài phạm vi. Không mở các lá khác chỉ vì chúng xuất hiện trong quotation.

## Bảo toàn và kiểm thử

cards:check kiểm tra đủ mười batch offline. Reimport lặp không sửa bundle/review;
raw hoặc review lỗi giữ cả mười bundle trước đó. Deck catalog 102 có cả hai Phép LP tải lại
không đổi byte; starter 40 lá cũ giữ nguyên. Theo copy limit Goat, tổng pool mới cho phép 307 lá,
không tự thêm trần Main Deck 60 lá của luật hiện đại.

18 ca riêng kiểm tra metadata, hash drift, sai scope; hai controller từ tay/Set;
so DEF thay vì ATK, loại quái của mình/quái úp, thời điểm hai pass, tie decision và từ chối lựa chọn sai;
không có quái hợp lệ, phá quái FLIP ngửa, DEF 0/thiếu/âm/NaN/không an toàn.
Browser mode --smashing-ground kiểm tra hòa DEF bằng thao tác UI, hai góc nhìn,
không có target select khi activation, giữ quái ngoài ứng viên và xem Mộ sau resolution.
Fixture chỉ chuẩn bị trước server; không chỉnh state khi chơi.

## Kết quả

Linux: 488/488 test trong 26 file, typecheck và 24/24 bước validation đạt.
14 browser report với Chromium 154.0.8037.57, runtimeExceptions=0.
Trận tự nhiên catalog 103 dùng Fissure/Hane-Hane/Smashing Ground/Trap Hole:
14 lượt, 287 lệnh, 13 attack, 1 decision, B thắng với LP 0/6050, không chỉnh state khi chơi.
Pilot 20 giữ kết quả 16 lượt/339 lệnh, đủ 5 hiệu ứng cũ.
Seed expanded đổi từ 72 sang 90 vì pool thay đổi khiến seed cũ không có decision;
giữ tiêu chí có decision và thêm yêu cầu phải kích hoạt Smashing Ground.
Windows và Ubuntu CI đều đạt trên commit 90176b60d16be5635e78f16c1cc5c71b5c1d83b7:
[run 39756279907](https://github.com/xuanthao260604-sys/idc/actions/runs/39756279907).
Đã tải và đọc artifact: Windows x64 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62; 488/488 test, 24/24 bước, 14 browser report, runtimeExceptions=0.
Có đủ 103 preview; ca hòa DEF và trận expanded đạt cùng kết quả Linux (14 lượt/287 lệnh, LP 0/6050).

Windows 11 desktop chưa chạy; artwork vẫn placeholder; chưa đóng gói hoặc bàn giao beta.
