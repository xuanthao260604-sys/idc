# Earthquake — đổi tư thế đồng thời

Lô riêng earthquake nâng catalog từ 107 lên 108 loại: 95 quái thường và 13 lá
hiệu ứng (10 Phép, 2 FLIP, 1 Bẫy) trong scope giới hạn. Giữ nguyên 107 định nghĩa,
hồ sơ review, starter 40 lá và deck A/B đã lưu.

## Nguồn và trạng thái

Passcode 82828051, Konami CID 5983, Normal Spell. Text hiện hành trên
[Konami EN](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=5983&request_locale=en):
“Change all face-up monsters on the field to Defense Position.” API trùng text;
overlay không sửa facts. Hàng in chính thức AST-043, ANCIENT SANCTUARY,
01/06/2004; bộ này có trong [Goat cardpool](https://www.goatformat.com/cardpool.html).
Đọc nguồn 23/10/2026; receipt giữ hash raw API, evidence giữ hash HTML chính thức.

[FAQ Konami OCG](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=5983&request_locale=ja)
hiển thị ngày 17/09/2015: không target; cần ít nhất một quái ngửa tấn công ở một
trong hai sân để kích hoạt; xét quái tại resolution; nhiều quái đổi tư thế đồng thời.
Bốn trích dẫn nguyên văn lưu trong evidence/review. Đây là nguồn hiện hành,
không tự coi là ruling TCG 2005. Nguyên văn bản in lịch sử vẫn pending.

Snapshot mới: imported=1, verifiedData=0, historicalReviewPending=1,
implemented=0, testedEffects=0, playable=0. Tổng dữ liệu 108, verified=95,
pending=13. Runtime mở riêng bằng hash toàn định nghĩa, format revision 4,
scope normal-spell-all-position-single-link-v1; không sửa trạng thái lịch sử.

## Phạm vi hoạt động

Open Main1/Main2 của mình, đúng priority, từ tay với ô Phép/Bẫy trống hoặc own Set
(kể cả Set cùng lượt). Không cost hoặc target. Chỉ kích hoạt khi có ít nhất một
quái ngửa tấn công trên sân mình hoặc đối thủ; có thể Set khi chưa đủ điều kiện.

Sau hai pass, xét lại toàn sân và chuyển tất cả quái ngửa tấn công sang ngửa phòng
thủ trong một nhóm/sự kiện. Không có cửa sổ xử lý chen giữa từng quái. Quái phòng
thủ/bài úp giữ nguyên; không FLIP, không đổi LP, không tiêu Normal quota hoặc sửa
marker tấn công/đổi tư thế thủ công. Phép xuống Mộ và Chain đóng theo luồng cũ.
Public resolution chỉ ghi effect-position-changed/count, không lộ ID nội bộ.

Giới hạn pass-only một link; chưa hỗ trợ general mixed Chain, negate, immunity,
modifier, replacement, SEGOC hoặc mở rộng Trigger. Catalog không có Link Monster.
Không dùng kết quả này để tuyên bố hỗ trợ mọi tương tác Yu-Gi-Oh!.

## Bảo toàn và kiểm thử

23 test riêng: nguồn/review drift; hai actor × hand/Set × Main1/Main2; đổi đồng
thời, timing trước/sau pass, không cost/target/FLIP; chỉ sân mình hoặc đối thủ có
quái hợp lệ; sân trống/chỉ phòng thủ/chỉ bài úp; tham số sai giữ nguyên state;
đổi tư thế thủ công cùng lượt; dùng ở Main2 sau một lần tấn công thật; action
discovery/receipt retry/public privacy. Fixture chỉ dựng trước khi gửi hành động.

Deck catalog 107 chứa Block Attack/Reincarnation tải lại nguyên byte. Reimport
15 bundle lặp byte-stable; raw hoặc review lỗi không ghi đè bất cứ bundle hợp lệ
nào. Pool hợp lệ 322 bản sao; không thêm trần Main Deck 60 hiện đại.

Browser --earthquake: hủy giữ state; dùng own Set; không có selector target/cost;
qua một pass chưa đổi tư thế, sau resolution ba quái trên hai sân cùng phòng thủ;
bài úp giữ nguyên, không quyết định FLIP, LP giữ nguyên, runtimeExceptions=0.

Trạng thái kiểm chứng toàn nền tảng sẽ được bổ sung sau khi đọc report thực tế.
Windows 11 desktop chưa kiểm tra; chưa đóng gói hoặc bàn giao beta.
