# Block Attack — đổi tư thế bằng hiệu ứng

Lô block-attack thêm một lá, giữ nguyên 106 định nghĩa và hồ sơ cũ. Catalog nay có
107 loại: 95 quái thường và 12 lá hiệu ứng trong scope giới hạn (9 Phép, 2 FLIP, 1 Bẫy).
Starter 40 lá và deck A/B đã lưu không đổi.

## Nguồn và trạng thái

- Passcode 25880422, Konami CID 4874, Normal Spell.
- [Konami](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4874&request_locale=en):
  “Target 1 face-up Attack Position monster your opponent controls; change that target to face-up Defense Position.”
  API trùng text hiện hành, overlay không sửa facts.
- Hàng in Konami MRD-133, METAL RAIDERS, 26/06/2002; ngày API cũng 2002-06-26,
  nhưng release proof lấy từ hàng in chính thức. Goat [cardpool](https://www.goatformat.com/cardpool.html)
  có Metal Raiders. Đọc nguồn 23/10/2026; lưu hash raw API và HTML Konami.
- Chưa xác minh nguyên văn bản in 2005. Không tìm thấy FAQ riêng Block Attack trong
  trang Goat rulings A–C đã đọc; không tự tạo ruling hoặc coi current text là nguồn cổ.
- Snapshot mới: imported=1, verifiedData=0, historicalReviewPending=1,
  implemented/testedEffects/playable=0. Tổng nhập 107, verified data=95, pending=12.
  Khả năng runtime được mở riêng bằng review hash toàn định nghĩa, format revision 4,
  scope normal-spell-target-position-single-link-v1.

## Phạm vi hoạt động

Open Main1/Main2 của mình, đúng priority, từ tay với ô Phép/Bẫy trống hoặc Phép đã
Set của mình (kể cả Set cùng lượt). Chọn đúng một quái ngửa tư thế tấn công do đối
thủ điều khiển tại activation. Không trả cost, không chọn bài của mình, quái phòng
thủ/bài úp, bài trên tay/Mộ, chính lá Phép hoặc handle không hợp lệ. Có thể Set Phép
khi chưa có target; không thể kích hoạt lúc đó.

Quái giữ tư thế cũ qua một pass, chuyển ngửa phòng thủ khi resolve sau hai pass.
Không tiêu quota Normal hoặc sửa các marker đổi tư thế thủ công/tấn công; xem
positionChanges trong profile luật hiện hành. Phép cleanup xuống Mộ, Chain đóng.
Không lật bài úp, không kích hoạt FLIP từ đổi ATK→DEF, không tự phá quái hoặc đổi LP.

TargetRef ghi đúng instance/vị trí lúc chọn; invariant pin một target, không cost.
Resolution kiểm tra lại vị trí và tư thế. Chưa có general mixed Chain, negate,
modifier/immunity/replacement, thay controller hoặc mục tiêu rời sân rồi quay lại;
không coi guard hiện tại là hỗ trợ những tương tác đó. Không mở Stop Defense vì
nó có thêm phạm vi lật bài cần xét Trigger riêng.

UI lấy target từ availableActions, gồm target không có discard cost. Kích hoạt từ
Set vẫn mở hộp chọn target; preview chỉ đọc dữ liệu PlayerView. Lịch sử thêm fact
công khai effect-position-changed/count, không raw ID/target/source hoặc text diễn giải.

## Bảo toàn và kiểm thử

29 test riêng: snapshot/review/scope drift; hai actor × hand/Set × Main1/Main2;
chi phí bằng 0, target capture, timing trước/sau pass, cleanup/markers; target và
tham số sai giữ nguyên state; Set khi chưa có target; action discovery, receipt retry,
privacy; FLIP face-up không tạo Trigger; qua lượt thật rồi đổi tư thế thủ công;
link giả bị invariant từ chối. Fixture chỉ dựng trước hành động, không sửa state khi chơi.

Bổ sung ca deck catalog 106 chứa Reincarnation tải nguyên byte; kiểm tra cả 106
định nghĩa cũ. Reimport 14 batch lặp byte-stable, raw/review lỗi giữ toàn bộ 14 bundle.
Pool hợp lệ 319 bản sao, không thêm trần Main Deck 60 hiện đại.

Browser --block-attack: hủy giữ state, dùng từ own Set, không discard, chọn Battle Ox
ngửa tấn công, bỏ qua quái phòng thủ và bài úp; đổi tư thế đúng thời điểm, sau đó
Celtic Guardian đánh Battle Ox bằng DEF, không mất LP. Không chỉnh state sau setup.
Trận tự nhiên 107 với seed hex 5e dùng Block Attack/Man-Eater Bug/Reincarnation:
16 lượt, 334 lệnh, 17 attack, 2 decision, B thắng LP 0/5100; runtimeExceptions=0.
Pilot 20 giữ nguyên hồi quy; seed expanded đổi riêng để bắt buộc dùng lá mới.

Linux typecheck, 676/676 test trong 32 file, cards:check đủ 14 batch và ca browser
riêng/trận tự nhiên đã đạt. Validation đầy đủ Linux và Windows CI đang chờ.
Ảnh minh họa vẫn placeholder. Windows 11 desktop chưa chạy; chưa đóng gói/giao beta.
