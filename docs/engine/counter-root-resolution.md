# Tiếp tục Phép sau Counter — parent resolver ứng viên

**Mốc mới 31/10:** đã [mở pattern ba liên kết](three-link-counter.md) qua activation thật
và review Seven v2. Nội dung/kết quả bên dưới giữ mốc triển khai trước đó.

Mốc 31/10/2026: nối [journal Counter](counter-continuation-journal.md) vào
resolver Normal Spell và bước cleanup đã có. Đây là bước triển khai nội bộ
của pattern Phép → Magic Jammer → Seven Tools, **chưa mở kích hoạt link 3**.

## Đã làm và chưa mở

DuelState có counterResolution riêng, không mở rộng tuple một nguồn của
spellResolution cũ. Journal giữ ba receipt gốc và hai nguồn còn cần cleanup;
Magic đã bị phủ nhận/phá ở Mộ owner, Seven còn face-up và Phép gốc tiếp tục.
Frame không được serialize vào PlayerView hoặc nhận từ lệnh client.

resolveCandidateCounterContinuation là seam nội bộ cho input server tin cậy:
root và Magic có cost đã trả; Seven có receipt ứng viên được kiểm graph/pins,
Set turn, LP và thứ tự cost. Seam kiểm toàn board/root activation qua invariant,
lắp patch phá Magic, phát event rồi gọi **chính resolver Phép đang dùng**.
Không có route HTTP, client command, beta flag hoặc availableActions gọi seam.
Engine vẫn từ chối ba link đang xây và Seven phản hồi Magic trong game.

Input seam không phải một DuelState ổn định được engine chấp nhận. Output đã
được assertDuelInvariants và có thể tiếp tục bằng applyAction/command adapter.
Test không gọi một API trả tiền Seven hợp lệ: receipt link 3 được fixture tin
cậy chuẩn bị, phân biệt rõ với hai activation đầu do engine thật thực hiện.
Phần activation/review/discovery/preview còn là công việc tiếp theo.

## Vòng đời

| Giai đoạn | Trạng thái |
| --- | --- |
| before-root | Nội bộ trong một transition; không được trả ra adapter |
| root-choice | Chờ đúng plan Fissure/Smashing Ground/Hammer Shot, đúng owner/options/id; Magic ở Mộ, root và Seven chưa cleanup |
| cleanup | Hiệu ứng root đã xong. Hai nguồn root/Seven vào cùng batch; owner chung chọn đủ hai theo thứ tự, khác owner thì mỗi bên có một nguồn, không cần hỏi |
| hoàn tất | Commit batch một lần, một event sent-to-graveyard, xóa Chain/frame/decision, một chain-resolved rồi action-response |

Dùng chung bộ order/commit đã có với Trap Hole. Không trộn Magic đã bị phá,
lá discard hay nạn nhân của root vào batch hai nguồn. Mộ có sẵn giữ nguyên
thứ tự; cost và Magic đã vào Mộ trước batch, nạn nhân hiệu ứng vào trước cleanup.
Danh sách sourceIds của event là membership batch, không thay thế thứ tự Mộ
mà mỗi owner đã xác nhận. Cả hai permutation được kiểm thử.

Các cost trong journal là lịch sử: Dian Keto có thể hồi LP sau Seven mà không
bị bắt trả lại phí hoặc so LP mới với afterLP cũ. Monster Reincarnation có thể
lấy lại chính quái cost gốc; invariant không bắt lá đó nằm ở Mộ mãi. Block
Attack giữ target lịch sử khi tư thế đã đổi bởi chính hiệu ứng. Những ngoại lệ
này chỉ áp dụng khi parent frame cleanup được kiểm đầy đủ, không nới guard
cho Chain đang xây hoặc Phép một liên kết thông thường.

Checkpoint pin registry/format/turn, full definition SHA của 13 lá, receipt,
board và nguồn. capturedSequence/capturedStateVersion được giữ tại entry;
state ổn định phải có cả hai đồng hồ đã tiến lên. Choice tính lại từ board
server, cleanup phải khớp hai nguồn và đúng owner/options. Không đồng thời có
frame Phép đơn. Hash phát hiện drift, không phải chữ ký xác thực; không dùng
checkpoint để chấp nhận board bất kỳ do client đề xuất.

createDuel khởi tạo counterResolution=null; endDuel/concession xóa context.
Registry capability version lên two-link-counters-candidate-root-continuation-v4
vì contract server thay đổi. Review, handler activation và báo cáo 13 scope
đang mở vẫn giữ nguyên; không có review Seven v2 được kích hoạt sớm.

## Khi trận kết thúc giữa root

Theo chính sách kết thúc trận của dự án: LP=0 hoặc không rút đủ bài thì dừng
ngay; không tạo lựa chọn sau duel-ended, không tự chọn thứ tự hai nguồn.
Magic đã bị phá ở Mộ; root và Seven giữ ở sân tại thời điểm dừng. Chain và
mọi frame/decision được xóa. Không phát sent-to-graveyard hoặc chain-resolved
cho phần chưa hoàn tất. Với Pot còn một lá, rút lá đó trước khi thất bại lần
rút kế tiếp. Đầu hàng khi chờ choice/cleanup giữ board đã xử lý, không cleanup
thay người chơi. Đây là chính sách snapshot sau trận, không khẳng định một
FAQ TCG 2005 riêng quy định thứ tự bookkeeping sau kết thúc trận. Scope Phép
đơn cũ giữ hành vi cleanup một nguồn đã kiểm trước đó.

## Kiểm thử và giới hạn

File tools/counter-root-resolution.test.ts kiểm trực tiếp seam, handler thật,
applyAction và command adapter; chưa có browser ba liên kết từ activation.
Matrix 352 ca = 11 Phép × A/B × owner Magic × owner Seven × Main1/2 × tay/Set.
Hai activation đầu có cost/target/event do engine tạo; mọi ca đều xác nhận
activation Seven thứ ba hiện bị từ chối trước khi chuẩn bị receipt ứng viên.
35 ca bổ sung kiểm LP 1001 → 1 → 1001, root discard về tay, terminal A/B,
Pot còn 0/1 lá, đầu hàng ở hai giai đoạn, clock/version/receipt/source/choice
hỏng, input board sai, chặn lệnh chen ngang, new duel, privacy, handle refresh,
retry cùng receipt và command conflict. Không phát lại payment/discard/activation;
root chạy một lần và chỉ có một cleanup khi kết thúc bình thường.

387 ca mới đạt cùng 120 ca journal cũ. Đã so sánh duel.ts mốc 0530c17 với
bản mới bằng cùng registry/dependency hiện tại: 82 trace/324 command, 12
decision, 8 terminal; toàn state/event bằng nhau, input không đổi và invariant
cả hai đạt. Đây là hồi quy scope cũ, không phải bằng chứng activation ba link.

Linux source a6ffd0b đạt 1832/1832 test trong 49 file, 72/72 bước validation,
62/62 browser report, runtimeExceptions=0. Report cuối:
artifacts/platform-validation/2026-10-31T07-00-25-039Z-289607/report.json.
Node 24.19.0, npm 11.9.0, Chrome/154.0.8037.57. Đã đọc report cùng từng log,
kiểm đủ 387 ca mới và các suite cũ, typecheck/build, check 19 bundle. Lần npm
test đầu trong sandbox lỗi EPERM khi bind loopback; báo cáo đầy đủ chạy ngoài
giới hạn loopback đạt, không coi lần bị chặn là pass. Report Linux đầu bắt đầu
trước bổ sung guard/ca cuối có 1815 test; không dùng report đó làm bằng chứng
1832 test. Source cuối đã được chạy lại trọn bộ, không ghép log mới vào report cũ.

Hai trận tự nhiên giữ seed 08/5e: 16/11 turn, 339/239 command, LP 0/4200 và
0/8000. Không trận nào dùng Counter; 62 browser report kiểm scope gameplay
cũ và hồi quy, không chứng minh activation ba link hoặc UI parent mới.
Capabilities JSON giống baseline: 112 definition, 95 quái thường, 17 hiệu ứng,
13 scope và 19 snapshot; trạng thái metadata nhập giữ riêng.

Windows và Ubuntu CI đều đạt trên source
a6ffd0b18f6d16e4d6d41e525715b5c47bcc44dc tại
[run 41178710481](https://github.com/xuanthao260604-sys/idc/actions/runs/41178710481).
Đã tải/đọc artifact windows-validation-41178710481-1 và kiểm từng log tại
artifacts/ci-counter-root-resolution/2026-10-31T06-58-52-341Z-7780/report.json.
Windows win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 156.0.4314.56: 1832/1832 test/49 file, gồm đủ 387 ca parent mới và
120 ca journal, 72/72 bước, 62/62 browser report, runtimeExceptions=0.
Mỗi bước browser có đúng một report khớp host/version; capabilities JSON
Windows/Linux bằng nhau và bằng baseline, natural seed 08/5e giữ kết quả.
Report vẫn windows11DesktopVerified=false. Không coi CI là thử trực tiếp desktop.
Đối chiếu SHA-256 309 file đầu vào/mã sản phẩm cũ: 304 file giữ nguyên, chỉ
5 file engine/protocol chủ đích thay đổi. data/, UI, raw/generated/review/format,
artwork, starter/deck, manifest/package/lockfile giữ nguyên byte.

Dữ liệu nhập/historical text, artwork, deck lưu và hồ sơ review không được nâng
trạng thái bởi các test ứng viên này. Windows 11 desktop chưa thử trực tiếp.

## Bước kế tiếp

Thêm review Seven v2 và mapping handler giữ pattern Trap Hole → Seven cũ,
đồng thời chỉ cho Seven phản hồi trực tiếp Magic trong đúng prefix Normal
Spell hai link đã duyệt. Giữ review v1 làm lịch sử và một review active/card.
Nối activation/payment/priority, Pass dispatch vào parent resolver, discovery
và preview đúng link đang phản hồi; kiểm mọi lệnh thật qua engine/adapter/UI.
Không mở link 4+, Seven → Seven, generic mixed Chain hoặc SEGOC. Bộ tạo bài
riêng và đóng gói Windows vẫn là các mục sau, chưa được làm trong mốc này.
