# Phép thường → Magic Jammer → Seven Tools

**Mốc tiếp nối 31/10:** đã bổ sung [audit phục hồi/tái kích hoạt](three-link-interaction-audit.md)
qua nhiều lượt. Nội dung và kết quả dưới đây giữ mốc mở pattern đầu tiên.

Mốc 31/10/2026: đã nối activation, review, discovery, resolver và UI cho
**đúng pattern ba liên kết này**. Các lệnh kích hoạt chạy qua engine và adapter.
Hai pattern hai liên kết Phép → Magic Jammer và Trap Hole → Seven vẫn giữ.
Không coi đây là hoàn tất mọi luật Chain/Counter của Yu-Gi-Oh!.

## Review và dữ liệu

Active review mới: data/reviews/seven-tools-v2.effects.json, revision 2,
scope counter-trap-trap-hole-or-magic-jammer-v2. Giữ base handler Trap Hole
v1 và thêm continuation normal-spell-magic-jammer-seven-tools-v1, chỉ cho
Seven Tools official:03819470. Manifest thay đường dẫn review active; không
nạp đồng thời hai revision cho cùng card. Review v1, hai hồ sơ thiết kế/cleanup,
raw/import/generated và trạng thái historical text đều giữ nguyên.

Registry counterContinuations chỉ có entry khi review qua schema, đúng card,
revision, format và definition SHA. V1 không có entry nên vẫn chặn link 3.
Schema không cho gắn continuation vào Magic Jammer hoặc scope cũ. Registry
capability version lên reviewed-three-link-counter-continuation-v5.
Báo cáo vẫn 112 definition/95 quái thường/17 hiệu ứng/13 scope; scope Seven
v2 thay v1, không cộng hai scope hoặc tự nâng metadata nhập thành playable.

Phép gốc phải thuộc 11 definition đã pin trong hồ sơ thiết kế, bằng toàn SHA,
không suy hiệu ứng từ tên/text. Magic và Seven cũng pin definition đầy đủ.
Dùng lại handler thật của 11 Phép, không thêm hoặc sửa dữ liệu lá bài.
Review v2 kế thừa dẫn chứng v1 và các quotation từ review thiết kế/cleanup.
Nguồn hiện hành/OCG, bản chép cộng đồng và baseline thời kỳ được phân biệt;
không nhận đây là xác thực bản in/FAQ TCG 2005 gốc. Thứ tự cleanup theo quyết
định tổng hợp nguồn đã ghi trong docs/rules/chain-cleanup-order-review.md.

## Kích hoạt và xử lý

| Bước | Hành vi |
| --- | --- |
| Phép gốc | Main1/2 của active player; tay hoặc ô Set, cost/target do handler hiện có kiểm |
| Magic Jammer | Phản hồi trực tiếp Phép gốc, bỏ một lá làm cost |
| Seven Tools | Phản hồi trực tiếp Magic ở link 2, đúng priority, Set từ lượt trước, LP >1000; trả đúng 1000 một lần, không discard/card target |
| Hai Pass | LIFO: Seven phủ nhận/phá Magic; bỏ qua Magic, Phép gốc còn hiệu lực và xử lý đúng một lần |
| Chờ lựa chọn | Root identity/cost/target giữ nguyên; Magic ở Mộ, root và Seven còn face-up; chỉ đúng người thấy lựa chọn |
| Cleanup | Root/Seven gửi cùng batch sau hiệu ứng; cùng owner chọn đủ hai theo thứ tự, khác owner mỗi bên một nguồn thì không hỏi |

Self-response được phép sau đối thủ Pass theo priority. Không cho dùng handle
của root/Chain cũ để trả lời thay Magic hiện tại. Mọi guard trước payment/reveal;
intent bị từ chối giữ nguyên input. AvailableActions dùng link cuối và probe qua
engine, không trừ LP khi xem danh sách. Chi phí LP là cost, không phải damage.

Second Pass dùng resolver trong cùng transition với đúng một stateVersion tăng;
không gọi một ActionResult lồng để tăng version hai lần. Journal giữ hai Counter
đã xử lý; Chain sống chỉ còn root. Cost là lịch sử: Dian Keto có thể 1001 → 1 →
1001; Monster Reincarnation lấy lại quái discard gốc. Không refund/pay lại phí.
Owner order giữ prefix Mộ và các lá cost/nạn nhân/Magic đã vào trước batch.
Bộ điều phối vẫn phân biệt ba Trap Hole với pattern mới, không dựa riêng độ dài 3.

LP=0 hoặc rút không đủ: dừng ngay, không mở choice/cleanup sau duel-ended;
root/Seven giữ ở sân tại thời điểm dừng, Magic đã ở Mộ; xóa Chain/context.
Đây là chính sách snapshot sau trận đã ghi ở parent resolver, không một tuyên bố
mới về thứ tự bookkeeping chính thức sau trận. Concession và new duel xóa frame.

## Giao diện và dữ liệu riêng

Discovery/preview phản hồi đúng Magic ở liên kết 2; hộp xác nhận hiện
1001 → 1 LP, không có chọn card target hoặc discard. Hủy chỉ đọc, retry cùng
command không trả phí hoặc chạy root lại. Guide chỉ hiện action đúng priority.
Note hỗ trợ Seven nêu hai prefix hiện được mở, không nói mọi Trap đều hỗ trợ.

Root đã xử lý nhưng đang chờ owner cleanup có resolved=true trong PlayerView;
không còn target handle của hiệu ứng đã xong. Đây là cần thiết khi target đã về
tay kín: không gửi handle để theo dõi tay đối thủ hoặc làm projection bị lỗi.
Receipt gốc vẫn trong journal server. UI ghi hiệu ứng đã xử lý/chờ cleanup,
không nói lá vốn có target là không target lúc activation. Frame, SHA/binding,
raw instance IDs và cost receipts không đi ra client.

## Kiểm thử

395 ca mới trong tools/three-link-counter.test.ts:

- 352 ca = 11 root × A/B × owner Magic × owner Seven × Main1/2 × tay/Set.
  Cả ba activation và các Pass/decision đều là lệnh engine thật được chấp nhận;
  kiểm cost, source, original receipt, thứ tự Mộ và kết thúc Chain một lần.
- 43 ca còn lại: LP 1001/1000/999/1, same-turn/hand/priority/root-link/extra-field,
  v1 gate và một review active/card, drift v2, LP heal, terminal A/B và Pot 0/1,
  forged building context, chặn Counter thứ tư, handle refresh/stale và receipt,
  projection target về tay kín trên cả hai ghế.

387 ca parent ứng viên cũ được giữ với registry review v1 để kiểm seam độc lập
và ranh giới cũ; không cộng chúng thành 387 activation ba link thật. Các suite
120 journal, 67 Phép đơn, 51 cleanup Trap Hole và 74 Seven cũ vẫn giữ riêng.
Ca cũ từng yêu cầu chặn Magic nay kiểm v2 cho phép đúng prefix; v1 negative
đã có test riêng. Không xóa coverage chặn Trap Hole thứ hai/Seven → Seven.

Thêm 10 browser mode --three-link=a/b:choice/heal/cost/lethal/draw vào full
validation. Fixture chỉ đặt board trước server; mọi activation, response, Pass,
choice và cleanup qua UI thật. Kiểm Main1 A/Main2 B, LP1001, preview đúng link,
hủy, responsive 1440/390px, phí một lần/retry, riêng tư quyết định, Mộ và deck
lưu không đổi. Các mode terminal không giả vờ cleanup đã hoàn tất.
Bộ validation hiện 82 bước/72 browser report; browser mới kiểm activation ba link thật, tách khỏi 387 ca seam ứng viên cũ.

## Trạng thái kiểm chứng

Linux source cuối 473a68c đạt 2227/2227 test trong 50 file, đủ 395 ca mới;
82/82 bước và 72/72 browser report, runtimeExceptions=0. Đã đọc report cùng
từng log tại artifacts/platform-validation/2026-10-31T10-10-01-753Z-310789/report.json.
Node 24.19.0, npm 11.9.0, Chrome/154.0.8037.57. Typecheck/build và check 19
bundle đạt: 112 nhập, 95 verified data, 17 historical pending. Mỗi bước browser
có đúng một report khớp host/version và đủ 10 mode mới trên A/B.

Hai trận tự nhiên cũ giữ seed 08/5e, 16/11 turn, 339/239 command và LP 0/4200,
0/8000. Chúng không dùng Counter; bằng chứng ba link là matrix và 10 browser
mode kiểm soát riêng. Capabilities chỉ đổi scope/revision/continuation của Seven
và mô tả giới hạn; toàn bộ phần còn lại bằng baseline trước mốc này.

Full Linux đầu và Windows run 41191404041 trên 82e10dc dừng ở assertion câu
mô tả Seven v1 trong browser test. Đã đọc log Windows thực: expected “chỉ phản
hồi Trap Hole ở liên kết đầu tiên”, trong khi UI đã nêu scope v2. Sửa assertion
ở 473a68c, không thay runtime; Linux cuối đã chạy lại trọn bộ. Không tính report
failed làm pass hoặc ghép log của run khác.

Windows và Ubuntu CI đều đạt trên source
473a68c8e590f62991e4e1b14048ce05ff40fe40 tại
[run 41191623038](https://github.com/xuanthao260604-sys/idc/actions/runs/41191623038).
Đã tải/đọc artifact windows-validation-41191623038-1 và từng log tại
artifacts/ci-three-link-counter/2026-10-31T10-10-23-054Z-9496/report.json.
Windows win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62: 2227/2227 test/50 file, đủ 395 ca mới, 82/82 bước và
72/72 browser report; 10 mode ba link đủ A/B, runtimeExceptions=0.
Capabilities Windows/Linux bằng nhau và chỉ có delta Seven v2 đã nêu so với
baseline. Mỗi bước browser có đúng một report khớp nền tảng/phiên bản.
Report giữ windows11DesktopVerified=false; Windows 11 desktop chưa thử trực tiếp.

Đối chiếu SHA-256 309 đầu vào/mã sản phẩm cũ: 300 giữ nguyên, 9 thay đổi
chủ đích gồm 7 file engine/protocol, app.js và manifest. Không file data/ cũ
nào đổi: giữ raw/generated/import/format, mọi review v1, artwork, starter/deck.
Chỉ thêm review Seven v2. Package/lock không đổi. 40 dẫn chứng trong v2 đều
chép đúng từ review v1 hoặc hai hồ sơ thiết kế đã đóng băng, gồm nguyên 17
dẫn chứng v1; không tạo quotation mới để hợp thức hóa code.

## Giới hạn và bước sau

Không mở Counter link 4+, Seven → Seven, generic mixed Chain, SEGOC,
Damage Step input, continuous Trap effects, modifiers/replacements hoặc cost
reducers. Trap-only Chain nhiều Trap Hole cũ vẫn trong scope riêng đã kiểm.
Chưa online, lưu trận qua restart, bộ tạo bài riêng, artwork từng lá hoặc
đóng gói/bàn giao Windows beta. Sau mốc này cần rà soát tương tác của scope
mới và xác định phần Chain còn lại; không tự nhận toàn bộ Yu-Gi-Oh! đã xong.
