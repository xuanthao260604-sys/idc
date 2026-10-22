# Tribute to The Doomed — chi phí bỏ bài và mục tiêu khi kích hoạt

Mục này thêm một Normal Spell bằng batch riêng tribute-doomed; không sửa 104 định nghĩa hoặc review cũ.
Runtime có 105 loại: 95 quái thường và 10 lá hiệu ứng được hỗ trợ trong scope giới hạn
(7 Phép thường, 2 quái FLIP, 1 Bẫy). Starter 40 lá không đổi.

## Nguồn, tên bài và trạng thái nhập

- Passcode 79759861, Konami CID 4856.
- [Konami hiện hành](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4856&request_locale=en)
  ghi tên **Tribute to The Doomed** và text: “Discard 1 card, then target 1 monster on the field; destroy it.”
- API ghi **Tribute to the Doomed**, text trùng Konami. Raw API giữ nguyên; manifest kiểm tra đúng tên upstream,
  overlay sửa riêng chữ hoa “The” theo bằng chứng Konami. Review nhập giữ upstreamName để đối chiếu.
- Pipeline chỉ cho hiệu chỉnh tên khác chữ hoa/thường, có fingerprint upstream và phải khớp toàn bộ facts Konami.
  Hiệu chỉnh này không được dùng để vượt restriction name do khác cách viết hoa/thường.
  Không có hiệu chỉnh tên ở bundle cũ; output/provenance cũ phải tiếp tục khớp offline.
- Bản in Bắc Mỹ MRD-057, METAL RAIDERS, 26/06/2002: đối chiếu hàng in Konami và card_sets API.
- [Goat cardpool](https://www.goatformat.com/cardpool.html) liệt kê Metal Raiders (MRD).
- [Goat rulings1](https://www.goatformat.com/rulings1.html), Big Shield Gardna FAQ,
  xác nhận Tribute có thể target quái úp; [rulings3](https://www.goatformat.com/rulings3.html),
  Gravekeeper’s Watcher FAQ, nêu Tribute trong nhóm discard làm cost. Đây là nguồn cộng đồng,
  không gọi là nguồn Konami sơ cấp. Các lá tương tác được nhắc trong FAQ không được mở bởi mục này.
- Đọc nguồn 22/10/2026; quotation và hash HTML lưu ở data/evidence; không tải artwork.

Snapshot mới imported=1, verifiedData=0, historicalReviewPending=1, implemented/testedEffects/playable=0.
Tổng snapshot 105 imported, 95 verified data, 10 pending lịch sử. Current-reference không đồng nghĩa
nguyên văn bản in 2005. Runtime dùng review riêng tribute-doomed.effects.json pin SHA toàn bộ definition,
format revision 4, scope normal-spell-discard-target-single-link-v1.

## Hành vi hỗ trợ

Chỉ own open Main1/Main2, đúng priority; từ tay cần ô Phép/Bẫy trống hoặc từ ô đã Set của mình,
kể cả Set cùng lượt. Có thể Set khi chưa trả được cost hoặc chưa có target; khi kích hoạt phải có đủ cả hai.

Client vẫn gửi activate-spell, bổ sung discardHandle và targetHandle cho đúng handler này.
Server chuyển handle sang ID và kiểm tra trước khi thay đổi trạng thái:

- Bỏ đúng một lá khác từ tay của người kích hoạt; không dùng chính instance Phép đang kích hoạt,
  bài đối thủ, deck, Mộ hoặc bài trên sân làm chi phí.
- Chọn một quái trên một trong hai sân, bao gồm quái của mình, quái phòng thủ ngửa và quái úp.
  Không target bài trong tay, deck hoặc ô Phép/Bẫy.
- Kích hoạt thiếu chi phí/target, sai thời điểm/người chơi hoặc version cũ bị từ chối nguyên trạng.
  Non-targeting Spell cũ từ chối các tham số cost/target này.

Chi phí được trả ngay trong activation, trước cửa sổ response. Event cards-discarded có reason activation-cost,
được lưu vào costEvents của link; targetRefs lưu quái và vị trí khi chọn. Đây không phải effect discard,
không phải hiến tế quái, không tự kích hoạt FLIP khi bỏ quái FLIP từ tay.
Public resolution dùng discard-cost riêng; UI/history ghi “bỏ 1 lá làm chi phí”.

Mục tiêu vẫn ở sân sau activation và sau một pass. Sau hai pass, xử lý quái đã chọn, không chọn lại quái
ATK/DEF cao/thấp. Phá quái úp không lật nó để kích hoạt FLIP. Quái xuống Mộ của owner;
Phép cleanup xuống Mộ sau xử lý. Chain/decision rỗng và mở lại cửa sổ.

UI cho chọn ô, lá trả chi phí và mục tiêu trước xác nhận; hủy không mất bài. Với Phép đã Set,
ô đã cố định. Nhãn mục tiêu giữ kín tên quái úp của đối thủ; người sở hữu vẫn biết bài úp của mình.
Sau khi trả chi phí, lá bị bỏ ở Mộ là thông tin công khai. Không gửi raw instance ID/costEvents ra client.
Action discovery chỉ dò transition thuần, không trả chi phí khi dựng nút lựa chọn.
Gửi lại activation đã nhận receipt, kể cả sau refreshView, không bỏ bài hoặc phá quái lần hai.

Invariant chỉ cho cost/target đúng loại link, một cost event hợp lệ và target monster đã biết.
Primitive có plan destroy-selected-monster riêng để không rơi nhầm vào xử lý Fissure.

Giữ giới hạn một link và response bằng pass. General mixed Chain, negate, trigger do discard,
replacement cost, immunity, modifiers và SEGOC chưa được mở. Guard vị trí target không phải bằng chứng
cho mọi tương tác rời sân/quay lại sân; cần rà lại danh tính instance trước khi mở Chain tổng quát.
Receipt chỉ tồn tại trong adapter đang sống; chưa có replay protection qua restart, online hoặc lưu trận.

## Bảo toàn và kiểm thử

cards:check kiểm tra đủ 12 batch offline. Nhập lặp giữ nguyên output/review; raw hoặc review lỗi giữ
cả 12 bundle hợp lệ trước đó. Deck catalog 104 chứa Hammer Shot/Smashing Ground tải nguyên byte,
các deck và starter trước đó vẫn giữ nguyên. Pool có thể chứa tổng 313 bản sao theo giới hạn Goat;
không tự áp trần Main Deck 60 của luật hiện đại.

57 ca riêng: tên nguồn/canonical, sửa tên sai, review drift/scope/override; 16 tổ hợp hai controller,
từ tay/Set, target của mình/đối thủ, ngửa/úp; trả cost trước response và phá sau hai pass;
cost monster/Spell/Trap/FLIP; quái phòng thủ; thiếu cost hoặc target, timing/actor sai;
không thêm tham số vào Phép cũ, link giả thiếu/sai cost/target; action discovery và retry receipt.
Các fixture chuẩn bị trước chuỗi hành động. Clone giả mạo link chỉ dùng kiểm tra invariant,
không mô tả là thao tác gameplay hoặc endpoint sửa trạng thái.

Browser --tribute-doomed kiểm tra hủy giữ bài, Set rồi kích hoạt, chọn Battle Ox làm chi phí và target
Man-Eater Bug úp của đối thủ, thông báo cost/destroy tách thời điểm, Chain và xem Mộ.
Không chỉnh state sau setup. Hồi quy cũ tiếp tục chạy đủ các chế độ trình duyệt.

## Kết quả

Linux: typecheck và 579/579 test trong 28 file đạt; 26/26 bước validation và 16 browser report
bằng Chromium 154.0.8037.57, runtimeExceptions=0.
Trận tự nhiên catalog 105 dùng Fissure/Hane-Hane/Man-Eater Bug/Pot of Greed/Smashing Ground/Tribute:
18 lượt, 370 lệnh, 15 attack, 3 decision, B thắng LP 0/4950; không chỉnh state khi chơi.
Pilot 20 giữ 16 lượt/339 lệnh và đủ 5 hiệu ứng cũ.
Seed expanded đổi từ hex 06 của pool 104 sang hex 18 cho pool 105 để trận có dùng lá mới và có decision.
Windows và Ubuntu CI đều đạt trên source commit c4fe6f19e3928cf8e2be797c16e7cf29221dabf5:
[run 39778095511](https://github.com/xuanthao260604-sys/idc/actions/runs/39778095511).
Đã tải và đọc artifact: Windows x64 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 154.0.4258.62; 579/579 test, 26/26 bước, 16 browser report, runtimeExceptions=0.
Đủ 105 preview; fixture chi phí/target và trận expanded đạt cùng kết quả Linux
(18 lượt/370 lệnh/15 attack/3 decision, LP 0/4950).
Windows 11 desktop chưa chạy;
artwork vẫn placeholder, chưa đóng gói hoặc bàn giao beta.
