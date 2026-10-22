# Monster Reincarnation — lấy quái từ Mộ về tay

Batch reincarnation thêm một lá, giữ nguyên 105 định nghĩa và review cũ.
Runtime hiện có 106 loại: 95 quái thường và 11 lá hiệu ứng được hỗ trợ trong scope giới hạn
(8 Phép thường, 2 quái FLIP, 1 Bẫy). Starter 40 lá không đổi.

## Nguồn và trạng thái dữ liệu

- Passcode 74848038, Konami CID 6213; Normal Spell.
- [Konami hiện hành](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=6213&request_locale=en):
  “Discard 1 card, then target 1 monster in your GY; add it to your hand.”
  Tên và text API trùng Konami, overlay không sửa facts.
- Bản in Bắc Mỹ RDS-EN045, RISE OF DESTINY, **01/12/2004**: đối chiếu hàng in Konami và API card_sets.
  Raw API có tcg_date 20/11/2004; cả hai giá trị được giữ, dùng hàng in Konami làm release proof.
  Không lấy ngày API làm bằng chứng phát hành duy nhất.
- [Goat cardpool](https://www.goatformat.com/cardpool.html) liệt kê Rise of Destiny (RDS).
- [Goat rulings5](https://www.goatformat.com/rulings5.html), Monster Reincarnation FAQ, cho phép chọn
  quái vừa bỏ để lấy lại. Quote lưu đúng nguyên văn, gồm cách viết lỏng “discarded by the effect”;
  không biến chi phí thành effect discard vì câu đó. Đây là nguồn cộng đồng, không phải Konami sơ cấp.
- [Konami OCG supplement hiện hành](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=6213&request_locale=ja)
  ghi “自分の墓地にモンスターが存在しない場合、このカードは発動できません。”:
  không được kích hoạt khi Mộ của mình chưa có quái. Phần bổ sung hiển thị ngày 03/06/2017;
  không gọi đây là nguồn TCG năm 2005. Chỉ dùng cho điều kiện activation; không đưa luật Extra Deck/Trigger hiện đại vào engine.
- Đọc nguồn ngày 22/10/2026, lưu quotation và hash HTML trong data/evidence. Không tải artwork.

Snapshot mới vẫn imported=1, verifiedData=0, historicalReviewPending=1, implemented/testedEffects/playable=0.
Tổng nhập: 106, verified data=95, pending lịch sử=11. Current-reference không phải nguyên văn bản in 2005.
Runtime dùng reincarnation.effects.json pin SHA toàn bộ definition và format revision 4,
scope normal-spell-discard-graveyard-single-link-v1. Review sai hash/scope/override bị từ chối.

## Hành vi hỗ trợ

Own open Main1/Main2, đúng priority, từ tay cần ô Phép/Bẫy trống hoặc từ ô đã Set của mình,
kể cả Set cùng lượt. Có thể Set khi chưa đủ điều kiện; activation phải có đủ chi phí và target.

1. Trước khi trả chi phí, Mộ của controller phải có ít nhất một quái hợp lệ.
   Mộ rỗng, chỉ có Phép/Bẫy hoặc chỉ đối thủ có quái trong Mộ đều không đủ.
2. Bỏ một lá khác từ tay mình làm chi phí. Có thể bỏ Monster/Spell/Trap, không dùng chính instance
   Phép đang kích hoạt hoặc bài từ deck/sân/Mộ/tay đối thủ làm chi phí.
3. Chọn một quái trong Mộ của mình; nếu lá vừa bỏ là quái thì có thể chọn chính nó.
   Không chọn bài trong tay khác với lá cost, quái trên sân, Mộ đối thủ hoặc Phép/Bẫy trong Mộ.
4. Sau hai pass, đưa đúng quái đã chọn về tay owner. Đây không phải Special Summon, không tiêu quota Normal,
   không kích hoạt FLIP hoặc Trigger chỉ vì quái bị bỏ/đưa về tay. Phép cleanup xuống Mộ sau xử lý.

UI tập hợp ý định discardHandle/targetHandle trong một lần xác nhận. Server kiểm tra toàn bộ ý định trước
khi thay đổi trạng thái; điều kiện có quái sẵn trong Mộ xét trước cost. TargetRef chụp vị trí **sau khi trả cost**,
nên target vừa bỏ được ghi đúng là graveyard, không phải hand. Intent sai bị từ chối nguyên trạng.

Invariant phân biệt target quái trên sân của Tribute và target quái ở Mộ của Reincarnation.
Chỉ scope mới cho phép instance cost cũng là target. Không nới gate cost/target của lá cũ.
Primitive return-selected-graveyard-monster riêng không rơi vào chọn quái theo ATK/DEF.

Giao diện dùng các target server cho phép: phân biệt nhãn “Mộ” và “Lá sẽ bỏ làm chi phí”.
Khi đổi lá cost, target không tương thích bị vô hiệu hóa. Hủy không mất bài.
Chi phí hiện ngay khi activation; quái còn ở Mộ sau một pass và chỉ về tay khi resolve.
Thông báo/history dùng discard-cost rồi return-to-hand; không gửi raw instance ID hoặc costEvents.
Sau khi về tay, quái lại thuộc thông tin tay riêng; đối thủ nhận số lượng bài và sự kiện công khai.
Gửi lại activation đã có receipt không bỏ hoặc trả quái lần hai, kể cả sau refreshView.

Dùng chung helper trả về tay với Hane-Hane: xóa đúng zone cũ, trả về owner, reset counters/markers
của lần ở sân trước. Quái có thể được Normal Summon/Set sau đó theo quota hiện có.

Giới hạn: một link, response bằng pass; chỉ Normal/Effect Monster được registry hỗ trợ.
Chưa có Fusion/Extra Deck return, Necrovalley, graveyard banish/replacement, Trigger do discard,
negate, general mixed Chain, modifiers/immunity hoặc SEGOC. Không mở Night Assailant/Makyura
chỉ vì FAQ Goat nhắc chúng, không áp câu Trigger của FAQ đó hoặc Dandylion OCG vào pool hiện tại.
Guard vị trí không phải bằng chứng xử lý mọi trường hợp rời sân/Mộ rồi quay lại khi mở Chain tổng quát.

## Bảo toàn và kiểm thử

cards:check kiểm tra đủ 13 batch offline. Reimport lặp giữ output/review; raw/review lỗi giữ toàn bộ
13 bundle hợp lệ trước đó. Deck catalog 105 chứa Tribute và Hammer Shot tải nguyên byte; starter cũ giữ nguyên.
Pool cho phép tổng 316 bản sao theo copy limit Goat, không tự áp trần Main Deck 60 hiện đại.

38 ca riêng kiểm tra metadata/ngày in khác API/review drift/scope/override; hai controller từ tay/Set;
trả quái cũ hoặc chính cost, thời điểm cost/return, không Special Summon; reset marker và dùng quái sau hồi;
Mộ trống/không có quái, target/cost/tham số sai, link giả; action discovery, privacy và retry receipt.
Fixture chuẩn bị trước chuỗi hành động; clone link giả chỉ kiểm tra invariant, không là gameplay.

Hai browser mode --reincarnation=grave và --reincarnation=cost: hủy giữ trạng thái,
đổi cost làm target tương ứng bật/tắt, lấy Hane-Hane có sẵn hoặc Battle Ox vừa bỏ,
kiểm tra hand/Chain/Mộ/LP và không có quái tự xuất hiện trên sân. Không chỉnh state sau setup.
Hồi quy cũ giữ nguyên tiêu chí; seed expanded đổi từ hex 18 sang hex 2b để trận tự nhiên dùng lá mới.

## Kết quả

Linux: typecheck và 620/620 test trong 29 file đạt; 28/28 bước validation và 18 browser report
bằng Chromium 154.0.8037.57, runtimeExceptions=0. Cả hai ca trả quái cũ/trả quái vừa bỏ đều đạt.
Trận tự nhiên catalog 106 dùng Hane-Hane/Man-Eater Bug/Monster Reincarnation/Trap Hole:
17 lượt, 336 lệnh, 13 attack, 2 decision, A thắng LP 6400/0; không chỉnh state khi chơi.
Pilot 20 giữ 16 lượt/339 lệnh và đủ 5 hiệu ứng cũ.
Windows CI đang chờ xác minh source commit của mục này.
Windows 11 desktop chưa chạy; artwork vẫn placeholder; chưa đóng gói hoặc bàn giao beta.
