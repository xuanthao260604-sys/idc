# Magician of Faith — FLIP lấy lại Phép từ Mộ

Lô riêng magician-faith nâng catalog từ 108 lên 109 loại: 95 quái thường và 14
lá hiệu ứng trong scope giới hạn (10 Phép, 3 FLIP, 1 Bẫy). Giữ nguyên 108 định
nghĩa và hồ sơ cũ, starter 40 lá và deck A/B đã lưu. Artwork vẫn placeholder.

## Nguồn và trạng thái

Passcode 31560081, Konami CID 4434, LIGHT/Spellcaster, cấp 1, ATK 300/DEF 400.
[Konami EN](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4434&request_locale=en):
“FLIP: Target 1 Spell in your GY; add that target to your hand.” API trùng facts,
overlay không sửa dữ liệu. Hàng in chính thức MRD-036, METAL RAIDERS, 26/06/2002;
bộ này có trên [Goat cardpool](https://www.goatformat.com/cardpool.html). Đọc nguồn
23/10/2026; hash raw API/HTML, printing và receipt lưu riêng. Hạn mức 3 theo
profile April 2005 đã có; không dùng hạn mức hiện đại để thay luật Goat.

[FAQ Konami OCG](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=4434&request_locale=ja)
hiển thị ngày 10/07/2021: hiệu ứng bắt buộc kể cả khi không có target và có kích
hoạt trong Damage Step. Trích dẫn nguyên văn lưu trong evidence/review. Đây là
nguồn hiện hành, không được gắn nhãn ruling TCG gốc năm 2005. Trang Goat rulings
L–O đã đọc không có mục riêng Magician of Faith; không tự tạo FAQ lịch sử.
Nguyên văn bản in lịch sử tiếp tục pending.

Snapshot mới: imported=1, verifiedData=0, historicalReviewPending=1,
implemented=0, testedEffects=0, playable=0. Tổng nhập 109, verified=95,
pending=14. Runtime mở riêng bằng review hash toàn định nghĩa, format revision 4,
scope flip-own-graveyard-spell-single-link-v1; không sửa cờ snapshot để báo đạt.

## Phạm vi hoạt động

FLIP khi Flip Summon hoặc bị đánh lật ngửa: chỉ chọn một Phép trong Mộ của
controller tại activation. Không chọn Bẫy/quái, Phép trên tay/sân, hoặc Mộ đối
thủ. Có nhiều Phép thì người điều khiển chọn; decision chỉ gửi cho người đó.
Ghi target instance/location; sau hai pass mới lấy đúng lá về tay, kiểm tra lại
location/owner/kind. Không cost. Không sửa LP hoặc tiêu quota Normal Summon/Set.

Không có target vẫn kích hoạt FLIP bắt buộc với zero target, xử lý không lấy bài.
Trong chiến đấu, source đã xác định bị phá vẫn xử lý FLIP trước khi xuống Mộ ở
cuối Damage Step. Dùng luồng returned-to-hand/public summary cũ. Phép lấy lại có
thể dùng tiếp khi tới open Main hợp lệ, theo availableActions và luật hiện hành.

Giới hạn một link/pass-only; chưa mở mixed Chain, negate, Necrovalley/immunity,
replacement, thay controller/target rời Mộ rồi quay lại, SEGOC hoặc mọi ruling.
Hane-Hane/Man-Eater Bug giữ scope và hồ sơ cũ; chỉ handler mới lấy target từ Mộ.

## Bảo toàn và kiểm thử

28 test riêng: snapshot/review drift; A/B × Flip Summon/battle × 0/1/2 Phép;
target capture, trước/sau pass, lấy đúng một lá, source battle cleanup; target
sai giữ nguyên decision/state; link giả; dùng lại Phép; deck catalog 108 có
Earthquake/Reincarnation tải nguyên byte, starter không đổi. Fixture chỉ dựng
trước hành động, kiểm invariant sau từng lệnh và không sửa state đầu vào.

16 bundle nhập lại lặp byte-stable; raw/review lỗi giữ toàn bộ bundle hợp lệ,
bao gồm lô mới. Pool hợp lệ 325 bản sao; không thêm trần Main Deck 60 hiện đại.

Browser --magician-faith: hai lựa chọn Pot/Fissure ở Mộ mình; bỏ qua Trap/quái
và Phép Mộ đối thủ; decision riêng, preview nguồn/target; không lấy sau một pass,
chỉ lấy khi resolution; dùng Pot lấy lại để bốc hai lá; LP/quota giữ nguyên.
Trận tự nhiên catalog 109 seed hex 09 dùng Magician of Faith/Block Attack/Dian Keto:
13 lượt, 262 lệnh, 12 attack, 1 decision; A thắng LP 9000/0, không sửa state.
Driver engine kiểm tra có một lần lấy Spell về tay. Pilot seed 08 giữ hồi quy cũ.

Linux typecheck và 770/770 test trong 35 file, các ca browser riêng đạt,
runtimeExceptions=0. Đang xác nhận bộ tổng hợp Linux và Windows CI.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
