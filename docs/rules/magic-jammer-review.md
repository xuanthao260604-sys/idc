# Magic Jammer — review thiết kế Chain/phủ nhận — 27/10/2026

Đã đối chiếu nguồn và chốt thiết kế phạm vi đầu tiên. Đây là đầu vào cho
triển khai, chưa phải hiệu ứng đã hoạt động. Magic Jammer vẫn nằm ngoài
runtime; nhập 111 loại, chơi được 110 loại/15 hiệu ứng. Không đổi engine,
format revision, review đang hoạt động, deck hoặc cờ dữ liệu nhập.

Hồ sơ: data/evidence/effects/magic-jammer-scope-review.json,
status=design-reviewed-not-enabled, runtimeEnabled=false,
implementationAndEffectTests=not-started. Pin parsed definition Magic Jammer:
dcbfa15ffcecc32dd594e2794ab516642bc5ede743942717406b95f955e946bf,
format goat-2005-08-17 revision 4. Không đặt hồ sơ này vào runtime inputs
hoặc coi nó là review Trap Hole hiện có.

## Nguồn đã đọc và cách áp dụng

Hồ sơ giữ 7 nguồn và 15 đoạn trích, mỗi đoạn có locator, loại nguồn và lý
do áp dụng. Trích dẫn đã được tìm thấy trong nội dung tải thực tế sau khi
chỉ chuẩn hóa khoảng trắng; hash nguồn kiểm trên byte gốc.

| Nguồn | Phân loại và giá trị sử dụng |
| --- | --- |
| [Konami English CID 4862](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4862&request_locale=en) | Current reference đã nhập: bỏ 1 lá; phủ nhận activation của Spell Card và phá lá đó nếu phủ nhận thành công |
| [Rulebook English v5 lưu trữ](https://archive.org/download/rulebook_v05/rulebook_v05.pdf) | Archive; trang in 32: Chain xử lý ngược, có thể phản hồi lá của mình sau khi đối thủ không phản hồi; trang 33: Counter Trap thuộc Spell Speed 3, chỉ speed 3 phản hồi được; trang 36: không hoàn chi phí khi activation bị phủ nhận |
| [Rulebook chính thức hiện tại](https://www.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf) | Baseline theo profile Goat đã chọn: Trap phải Set trước và chờ qua lượt Set; không phải nguồn gốc năm 2005 |
| [Goat Basics](https://www.goatformat.com/basics.html) | Quy ước cộng đồng về luật nền và ngoại lệ, kèm lưu ý của trang về thay đổi luật gần đây |
| [Goat rulings3](https://www.goatformat.com/rulings3.html) | Mục Gravekeeper's Watcher xác nhận bỏ bài của Magic Jammer là cost; không triển khai Watcher hoặc các trigger bỏ bài |
| [Goat rulings5](https://www.goatformat.com/rulings5.html) | Mục MAGIC JAMMER ghi Netrep Rulings: phân biệt initial activation của Wave Motion Cannon với hành động dùng effect; ví dụ Double Spell không cho phản hồi muộn. Các lá ví dụ vẫn ngoài pool |
| [Konami FAQ tiếng Nhật CID 4862](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=4862&request_locale=ja) | Bổ sung OCG hiện tại, hiển thị 28/9/2017: không target; trực tiếp chain activation Spell Card của mình/đối thủ, không chain effect activation; bỏ 1 lá là cost; có thể dùng trong Damage Step |

FAQ Nhật là nguồn bổ sung hiện tại. Không gọi nó là ruling TCG gốc 2005.
Các quyết định chính được đối chiếu cùng card text English, rulebook v5
và các mục Goat biên tập. Nguồn Netrep trên trang cộng đồng không được
mô tả là bản tin UDE nguyên gốc đã xác thực. Văn bản in lịch sử của lá vẫn
pending; review này không sửa verification/implementation/testing trong
bundle nhập.

PDF v5 tải lại có 681725 byte và SHA-256
d02c016334f65c98a9fe900ae0b2630a3de63f63e330426ab07c55d9466dc61a,
khớp mốc archive trước. PDF hiện tại có 3415528 byte, SHA-256
82be14641b2b7940467034a5b14b0d4037835831866537738d34fd9df5a0f444.
Giữ hash, kích thước, trích đoạn và vị trí; không chép PDF vào repository.
Các HTML mới giữ nguyên byte trong data/raw/konami và data/raw/goatformat;
nguồn English dùng lại snapshot của mốc nhập. Không ghi đè evidence cũ.

## Phạm vi triển khai đầu tiên

Pattern được chọn: liên kết 1 là activation của một Normal Spell đã hỗ trợ;
liên kết 2 là Magic Jammer đã Set qua lượt trước. Giới hạn hai liên kết là
ranh giới triển khai của mốc đầu, không phải giới hạn Chain của Yu-Gi-Oh!.

11 Phép đầu vào: Ookazi, Block Attack, Hammer Shot, Hinotama, Pot of Greed,
Fissure, Monster Reincarnation, Tribute to The Doomed, Earthquake,
Dian Keto the Cure Master và Smashing Ground. Giữ cách kích hoạt/tính hợp
lệ hiện có của các Phép này, từ tay hoặc Set, trong Main Phase hợp lệ.

| Thời điểm | Hành vi cần triển khai |
| --- | --- |
| Trước activation Magic Jammer | Kiểm đúng priority, không có decision đang chờ, lá úp ở sân người điều khiển và Set từ lượt trước; có một lá trong tay để trả cost; liên kết cuối đúng là Spell card activation hợp lệ |
| Khi activation | Bỏ đúng một lá từ tay làm cost, lật Counter Trap, thêm liên kết speed 3; không target lá bài và chưa phủ nhận/áp hiệu ứng của Phép ngay lúc này |
| Quyền phản hồi | Người vừa bị phản hồi có cơ hội trước. Chủ Phép có thể tự chain Magic Jammer sau khi đối thủ Pass. Hai Pass liên tiếp mới đóng Chain |
| Sau Counter Trap | Speed 1/2 không phản hồi được speed 3. Magic Jammer khác cũng không phản hồi Magic Jammer, vì điều kiện đòi activation của Spell Card; trong pool/scope này chỉ còn Pass |
| Khi xử lý | Liên kết 2 phủ nhận activation của Phép ở liên kết 1 rồi phá lá Phép. Bỏ qua toàn bộ plan của Phép bị phủ nhận, cleanup Counter Trap đúng một lần và kết thúc Chain trong cùng lệnh |
| Cost và quota | Chi phí của Phép gốc và Magic Jammer đều đã trả, không hoàn lại; không tiêu Normal Summon/Set quota |

Không hoàn chi phí không đồng nghĩa mọi lá bỏ làm cost đều không có
trigger. Trigger do bỏ bài là phần chưa hỗ trợ, cần review riêng khi thêm
các lá tương ứng.

FAQ cho phép Magic Jammer ở Damage Step. Mốc triển khai đầu không mở
Spell activation ở Damage Step, nên không có trường hợp đó trong scope;
không biến giới hạn engine thành luật cấm của lá bài. Quick-Play/Field/
Continuous/Equip/Ritual, các Counter Trap khác, protection/replacement,
SEGOC và Chain hỗn hợp tổng quát tiếp tục để ngoài phạm vi.

## Thay đổi kỹ thuật cần làm tiếp

1. Thêm schema review/binding riêng cho Counter Trap, pin đúng definition
   và format. Giữ review/handler Trap Hole hiện có. Chỉ thêm bundle Magic
   Jammer vào runtime inputs khi mọi phần cần thiết đã hoàn tất.
2. Thêm action phản hồi Counter Trap gồm lá nguồn, lá trả cost và tham chiếu
   liên kết Chain. Tên trường cụ thể sẽ chốt khi code; tham chiếu này là
   định danh liên kết đang phản hồi, không phải target của hiệu ứng.
   PlayerView cần handle liên kết tạm; server ánh xạ và kiểm lại link cuối,
   duel/version/priority. Không dùng index hay raw instance ID do client gửi.
3. Magic Jammer có targetRefs rỗng. UI hiển thị liên kết đang phản hồi và
   lá bỏ làm chi phí; giữ riêng lựa chọn cost, xác nhận và danh tính tay bài.
   Khi cost đã trả, lá ở Mộ trở thành thông tin công khai như engine hiện có.
4. Invariants chỉ nhận pattern hợp lệ đã duyệt; không nới mọi Chain hoặc
   chấp nhận tùy ý các cờ negated. Bổ sung dấu vết cost và liên kết cần phủ
   nhận, bảo đảm probe availableActions không thay state/history.
5. Đổi dispatch/resolver đúng pattern hai liên kết. Hiện pass() chọn
   resolver theo liên kết đầu; resolveSpell() có thể áp plan ngay và
   finishSpell() pop liên kết cuối. Chỉ push Counter Trap vào array rồi dùng
   resolver cũ sẽ xử lý sai. Cần đường resolve riêng, nguyên tử, không gọi
   planResolution của Phép đã bị phủ nhận hoặc tạo effect-choice của nó.
6. Tách sự kiện phủ nhận activation và phá lá Phép khỏi việc phá quái;
   PublicResolution/UI hiện có effect-destroyed đếm quái. Thêm fact công khai
   phù hợp; không gọi đây là damage hay giả rằng Phép đã resolve bình thường.
   Giữ event/history riêng tư ngoài allowlist. Mở lại cửa sổ sau cleanup.

Các mục trên là thiết kế cần triển khai, chưa phải API hoặc hành vi hiện có.
Không đổi giao thức chỉ bằng tài liệu này.

## Điều kiện kiểm thử trước khi mở runtime

Ma trận cơ bản dự kiến: 2 người điều khiển Phép × 2 nơi kích hoạt tay/Set
× 11 Phép × 2 phía dùng Magic Jammer (mình/đối thủ) = 88 kịch bản.
Đây là danh sách cần viết, chưa phải 88 test đã chạy.

- Magic Jammer Set cùng lượt, trên tay, sai priority, không đủ cost,
  decision đang chờ, link cũ hoặc link không phải Spell card activation:
  từ chối trước khi trả cost/lật bài; input, LP, zone, history giữ nguyên.
- Magic Jammer hợp lệ: cost trả một lần, liên kết/cost đúng, chỉ xử lý sau
  hai Pass; retry receipt không trả thêm cost hoặc phá lá hai lần. Lệnh mới
  dùng handle cũ, stale duel/version hoặc giả trường server bị từ chối.
- Pot of Greed với deck 0/1/2 khi bị phủ nhận: không bốc và không thua vì
  deck-out; Ookazi/Hinotama không gây sát thương kể cả khi lẽ ra lethal;
  Dian Keto không hồi LP.
- Fissure/Smashing Ground/Hammer Shot: không phá quái, không tạo lựa chọn
  effect-choice; Block Attack/Earthquake không đổi tư thế.
- Tribute to The Doomed/Monster Reincarnation: cost gốc vẫn ở Mộ, mục tiêu
  không bị phá hoặc lấy về. Lá bỏ cho Magic Jammer không tự kích hoạt FLIP
  hoặc gây sát thương chỉ vì nằm trong pool hỗ trợ.
- A/B cùng thấy Chain và kết quả công khai; tay/bài úp chưa kích hoạt giữ
  kín. Chọn cost và xem preview không gửi lệnh trước xác nhận. Đổi ghế,
  refresh và lỗi mạng không tự thanh toán hoặc xử lý lần hai.
- Hồi quy: Pass cả hai không dùng Magic Jammer vẫn resolve Phép cũ đúng;
  Trap Hole nhiều liên kết, FLIP, phase/battle, quota, deck A/B và nhập lỗi
  giữ nguyên. Browser trên Linux và Edge Windows CI phải có bằng chứng đủ.

## Kiểm tra của mốc review

Đã kiểm 15/15 trích đoạn có trong 7 nguồn đã tải sau chuẩn hóa khoảng
trắng; 15 evidence record hợp schema EvidenceSchema, raw hash/kích thước
khớp. Parsed definition fingerprint, format và danh sách 11 Phép khớp dữ
liệu hiện hành. Runtime inputs không tham chiếu hồ sơ thiết kế hoặc Magic
Jammer; capabilities JSON giữ nguyên so với artifact Windows mốc nhập.

Mốc này chỉ thêm hồ sơ nguồn/thiết kế và tài liệu. Không thêm test hiệu ứng,
không sửa mã sản phẩm, không chạy lại bộ kiểm thử game cho một hiệu ứng
chưa được code. Bằng chứng runtime gần nhất vẫn là 905 test, 54 bước và
44 browser report của [mốc nhập dữ liệu](../data/magic-jammer.md),
[CI 40481382302](https://github.com/xuanthao260604-sys/idc/actions/runs/40481382302).
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
