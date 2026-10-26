# Hành động trong lượt của quái mình — 26/10/2026

Khi chọn quái trên sân của mình, phần đọc bài nay có bảng ghi nhận ba
việc trong lượt hiện tại: đã triệu hồi/Set, đã đổi tư thế thủ công, đã
tuyên bố tấn công. Bảng không hiện cho quái đối thủ (ngửa hoặc úp), bài
trên tay, Mộ, preview catalog hoặc khi trận đã kết thúc. Nội dung bài gốc
và trạng thái dữ liệu/runtime vẫn được giữ riêng.

PlayerView thêm ownMonsterActivity: mỗi quái trên sân của viewer có đúng
cardHandle và ba cờ boolean summonedOrSetThisTurn, positionChangedThisTurn,
attackDeclaredThisTurn. Projection đọc marker hiện tại từ engine, đổi
thành cờ rồi đóng băng dữ liệu; không gửi marker gốc, ID nội bộ, ngày/lượt
marker hoặc thông tin quái đối thủ. Handle thuộc cùng projection như
các vùng bài, được thay cùng cơ chế hiện có. Quái rời sân không còn entry.

Đây là hành động được engine ghi nhận, không phải số lượt còn lại hoặc
quyền thao tác. Flip Summon được ghi là triệu hồi và đổi tư thế thủ công
theo marker engine hiện có; không dùng quota Normal. Earthquake thay tư
thế bằng hiệu ứng không được ghi thành đổi thủ công. Cờ tấn công xuất hiện
khi tuyên bố, chưa cần chờ xử lý đòn đánh; không diễn giải nó thành một đòn
đã gây damage. Main2 không xóa ghi nhận. Sang lượt mới, so sánh lượt và
cơ chế reset của engine làm cờ lượt cũ hết hiệu lực. Các nút thao tác và
server vẫn kiểm toàn bộ điều kiện như trước.

Không đổi transition gameplay, format, review, dữ liệu nhập, artwork,
starter, file deck hoặc khả năng hiệu ứng. Không thêm luật replay hoặc
nhiều lần tấn công. Thông tin chỉ đọc, không tạo command khi chọn xem.

## Kiểm chứng

Thêm 12 test vào summon-quota.test.ts (14 → 26), đối xứng A/B:

- Chỉ có handle của quái mình, kể cả quái mình úp; đúng bốn field và frozen,
  không đổi snapshot, không có ID nội bộ hoặc identity quái úp đối thủ.
- Normal Summon/Set ghi đúng và Hane-Hane đưa quái về tay xóa entry.
- Flip Summon ghi hai cờ nhưng quota Normal vẫn chưa dùng.
- Earthquake khác đổi tư thế thủ công sau đó.
- Tuyên bố tấn công ghi ngay, giữ qua resolution/Main2, hết hiệu lực khi
  chuyển sang lượt kế tiếp qua lệnh thật. Fixture chỉ dựng trước hành động.

Ca mới --monster-activity, npm run beta:browser-monster-activity, dùng pilot
fixture trước khởi động rồi chỉ gửi lệnh thật: Normal Summon, đổi tư thế,
Flip Summon, chiến đấu, Main2, refresh và sang lượt kế tiếp. Kiểm hai góc
nhìn, quái đối thủ úp/ngửa, bài trên tay và chọn đọc không đổi view. Đòn
800 ATK vào 2000 DEF giữ hai quái, LP A còn 6800; bảng vẫn ghi tuyên bố
trong lượt. Deck A/B trước/sau giữ nguyên. Đã chụp/xem bố cục 1440px/390px,
bảng không tràn ngang. Thêm một invocation: tổng 48 bước/38 ca trình duyệt.

Typecheck, build, 26 test quota/activity, 10 test projection và ca trình
duyệt riêng đã đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0.
Bộ tổng hợp Linux đạt 841/841 test trong 35 file, 48/48 bước và 38 browser
report, tổng runtimeExceptions=0. Đã đọc report
artifacts/platform-validation/2026-10-26T12-46-42-972Z-202974/report.json:
đủ bằng chứng mỗi bước, ca monster-activity có đủ cờ kiểm chứng; các ca
riêng tư, dữ liệu/deck cũ và hai trận tự nhiên vẫn đạt. Capabilities JSON
giống mốc trước.
Windows và Ubuntu CI [run 40325600572](https://github.com/xuanthao260604-sys/idc/actions/runs/40325600572)
đạt trên source commit 272267c2690a6a4f088510a19164c856744d202e.
Đã tải và đọc artifact windows-validation-40325600572-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62.
Windows đạt 841/841 test trong 35 file, gồm 26 test quota/activity;
48/48 bước và 38 browser report, tổng runtimeExceptions=0, mỗi bước có
đúng một report khớp host. Ca monster-activity xác nhận ownFieldOnly,
hiddenPrivacy, summonAndFlipRecorded, manualChangeRecorded,
attackRecordedBeforeResolution, main2AndRefreshPreserve, nextTurnResets,
readOnlySelection, responsive và savedDecksUnchanged. Capabilities JSON
giống Linux; hai trận tự nhiên giữ 16 lượt/339 lệnh và 13 lượt/262 lệnh.
Report ghi windows11DesktopVerified=false. Report đã đọc tại
artifacts/ci-monster-activity/2026-10-26T12-50-40-921Z-6864/report.json.

Catalog vẫn 109 loại; nhập dữ liệu và hiệu ứng đã review vẫn tách riêng.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
