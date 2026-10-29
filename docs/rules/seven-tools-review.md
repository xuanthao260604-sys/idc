# Seven Tools — review thiết kế chi phí LP/phản hồi Bẫy — 29/10/2026

Cập nhật: đã có [triển khai và kiểm thử runtime](../engine/seven-tools.md)
bằng review hiệu ứng riêng. Nội dung bên dưới giữ trạng thái tại mốc
thiết kế trước triển khai; các mục “chưa chạy” không thay báo cáo hiện hành.

Đã đối chiếu nguồn và chốt phạm vi đầu tiên sau [mốc nhập](../data/seven-tools.md).
Đây là đầu vào triển khai, chưa phải hiệu ứng hoạt động. Không đổi engine,
giao thức, UI, profile format, review runtime hoặc deck. Tổng nhập giữ
112 loại/19 bundle; runtime giữ 111 loại/16 hiệu ứng/12 scope/18 bundle.

Hồ sơ data/evidence/effects/seven-tools-scope-review.json ghi
status=design-reviewed-not-enabled, runtimeEnabled=false,
implementationAndEffectTests=not-started, proposedScope=
counter-trap-trap-hole-activation-v1. Pin parsed definition Seven Tools
official:03819470, SHA-256
2dbc5c07956ac97d58b2f449898bf2d73bd0488578b9c69c0fadd5e468accbc0,
format goat-2005-08-17 revision 4. Đây là hash toàn định nghĩa đã parse,
khác fingerprint facts API của mốc nhập. Hồ sơ không nằm trong runtime inputs.

## Nguồn và giới hạn tin cậy

| Nguồn | Phần được áp dụng |
| --- | --- |
| [Konami English CID 4863](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4863&request_locale=en) | Current reference đã nhập: trả 1000 LP; phủ nhận activation của Trap Card và phá lá đó nếu phủ nhận thành công |
| [English rulebook v5 lưu trữ](https://archive.org/download/rulebook_v05/rulebook_v05.pdf) | Trang in 32: LIFO, phản hồi lá của mình sau khi đối thủ không phản hồi; trang 33: Normal Trap speed 2, Counter Trap speed 3; trang 35–36: phân biệt target/cost/effect, LP có thể là cost và không hoàn chi phí khi activation bị phủ nhận |
| [Rulebook chính thức hiện tại](https://www.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf) | Quy tắc chung phải Set Trap trước và chờ qua lượt Set, theo baseline Goat đã chọn; không gọi là rulebook năm 2005 |
| [Goat Basics](https://www.goatformat.com/basics.html) | Chính sách luật chung hiện hành và ngoại lệ Goat đã chọn; giữ lưu ý biên tập về thay đổi gần đây. Dùng snapshot tải 27/10, đọc lại tại chỗ 29/10, không giả là đã fetch mới |
| [Goat rulings4](https://www.goatformat.com/rulings4.html) | Imperial Order / Netrep Q&As ghi lời được gán cho Curtis Schultz, 23/12/2003: không được chọn trả LP làm LP thành 0. Injection Fairy Lily / Netrep Rulings có ví dụ phí activation 2000 không dùng được ở 2000 LP hoặc thấp hơn |
| [Goat rulings7](https://www.goatformat.com/rulings7.html) | SEVEN TOOLS OF THE BANDIT / Netrep Rulings: không phản hồi việc dùng effect của Continuous Trap đã được kích hoạt, ví dụ Ultimate Offering |
| [Konami FAQ Nhật CID 4863](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=4863&request_locale=ja) | Bổ sung OCG hiện tại, hiển thị 28/9/2017: trực tiếp chain Trap card activation của mình/đối thủ, phân biệt effect activation không kèm card activation; có thể dùng trong Damage Step |

Netrep trên trang cộng đồng là bản biên tập/chép lại, chưa xác thực bản tin
UDE gốc hoặc danh tính tác giả độc lập. Imperial Order/Lily là ví dụ quy
tắc chi phí, không phải ruling riêng ghi ngưỡng 1001 cho Seven Tools;
các lá ví dụ tiếp tục ngoài runtime. FAQ Nhật là bổ sung OCG hiện tại,
không phải văn bản TCG gốc năm 2005. Historical printed text vẫn pending;
không sửa metadata nhập hoặc tạo review hiệu ứng đang hoạt động.

Ngưỡng LP > 1000 là tổng hợp phí cố định 1000 từ card text với quy tắc
không trả LP về 0 đã đối chiếu bằng các ví dụ thời kỳ cũ. Vì vậy 1001 → 1
là ca cần hỗ trợ, còn 1000/999/1 phải từ chối trước khi trả phí/lật bài.
Đây chưa phải các ca đã chạy. Không mở cost reducer, phí theo nửa LP,
upkeep hoặc LP-payment/damage trigger bằng kết luận này.

Thiết kế không có lựa chọn card target: tham chiếu liên kết Trap đang
phản hồi khác với chọn mục tiêu lá bài. Đây là cách đọc ngữ nghĩa current
card text cùng bổ sung direct-chain và định nghĩa target trong v5; không
bịa một trích dẫn Konami nói nguyên văn “Seven Tools does not target”.

PDF v5 tải lại có 681725 byte, SHA-256
d02c016334f65c98a9fe900ae0b2630a3de63f63e330426ab07c55d9466dc61a,
khớp các mốc trước; tính nhất quán không phải chữ ký của nhà phát hành.
PDF hiện tại 3415528 byte, SHA-256
82be14641b2b7940467034a5b14b0d4037835831866537738d34fd9df5a0f444.
Chỉ giữ metadata/trích dẫn, không chép PDF vào repo. Ba HTML mới được giữ
nguyên byte trong data/raw; English card text và Goat Basics dùng lại
snapshot có trước. Không ghi đè source, overlay hoặc evidence cũ.

## Phạm vi đầu tiên

Pattern: **Trap Hole ở liên kết 1 → Seven Tools ở liên kết 2**. Trap Hole
phải đang là activation hợp lệ theo review cũ, đáp lại Normal/Tribute/
Flip Summon được engine hỗ trợ trong Main 1/Main 2. Giữ điều kiện ATK,
target và priority của Trap Hole. Không bắt đầu Seven Tools độc lập.

| Thời điểm | Hành vi cần triển khai |
| --- | --- |
| Trước activation | Đúng priority, không decision đang chờ; Seven Tools ở sân mình, Set từ lượt trước; LP mình > 1000; Chain chỉ có Trap Hole hợp lệ và đúng liên kết đang phản hồi |
| Khi activation | Trừ đúng 1000 LP do server quy định, lật Seven Tools, tạo liên kết speed 3; không bỏ bài từ tay, không chọn card target, chưa phủ nhận Trap Hole hoặc tác động quái lúc này |
| Quyền phản hồi | Chủ lá vừa bị phản hồi có cơ hội trước. Chủ Trap Hole có thể tự dùng Seven Tools sau khi đối thủ Pass. Tay rỗng không cản activation nếu các điều kiện khác hợp lệ |
| Khi hai bên Pass | Xử lý ngược trong cùng lệnh: phủ nhận activation Trap Hole, phá Trap Hole, bỏ qua plan phá quái của nó; Seven Tools được cleanup xuống Mộ đúng một lần |
| Sau xử lý | Quái được triệu hồi còn nguyên; Summon đã thành công, không gọi đây là negate Summon, không hoàn Normal quota hoặc xóa marker Summon/Flip; 1000 LP đã trả giữ nguyên, không trừ lần hai |

Hai liên kết là ranh giới dự án, không phải giới hạn Chain Yu-Gi-Oh!.
Seven Tools có thể phản hồi Counter Trap theo điều kiện thực của lá.
Normal Spell → Magic Jammer → Seven Tools, Trap Hole → Seven Tools →
Seven Tools, hoặc nhiều Trap Hole trước Seven Tools có thể hợp lệ khi
đủ điều kiện, nhưng chưa nằm trong phạm vi đầu tiên này. Magic Jammer
không phản hồi Seven Tools vì Seven Tools là Trap activation, không phải
Spell activation. Giữ nguyên nhánh Magic Jammer đang hoạt động và nhiều
Trap Hole không có Seven Tools trong hồi quy.

FAQ cho phép Damage Step; phạm vi đầu chỉ có Trap Hole sau Summon ở Main
nên không có input đó. Không biến giới hạn engine thành luật cấm Damage
Step của lá. Continuous Trap effect, các Bẫy khác, general mixed Chain,
negation/protection/replacement, SEGOC và trigger chi phí tiếp tục ngoài scope.

## Thiết kế kỹ thuật cần làm tiếp

1. Mở scope/binding LP-cost Counter riêng, pin definition/format/1000 LP.
   CounterReviewsSchema hiện chỉ nhận Magic Jammer/discard/Normal Spell;
   không dùng lại review này hoặc đổi Seven Tools thành Normal Trap.
2. Intent mới cho LP-cost Counter chỉ cần lá nguồn và Chain handle hiện
   hành. Không yêu cầu discard, không nhận target/amount/LP kết quả do
   client chỉ định. Tên action cụ thể sẽ chốt khi triển khai. Dùng ánh xạ
   handle và guard viewer/duel/version hiện có, kiểm lại link cuối tại server.
3. Tách cost journal/event LP với before/after/amount/controller/sequence;
   invariants phân nhánh chi phí bỏ bài và trả LP. Không giả card-discard
   event khi không có lá bỏ; không mở cờ negated tùy ý trong state.
   Mọi điều kiện phải được kiểm trước mutation đầu tiên.
4. Cần đường xử lý pattern Trap riêng. Dispatcher/resolver Counter hiện
   luôn đòi Normal Spell; chỉ push Seven Tools rồi dùng resolver này hoặc
   resolveTraps sẽ xử lý sai. Phủ nhận activation Trap Hole phải bỏ qua
   plan phá quái, cleanup hai nguồn đúng một lần và đóng cửa sổ cũ.
5. PublicResolution có fact chi phí LP, phủ nhận activation Bẫy và phá Bẫy
   riêng; không dùng effect-damage, spell-destroyed hoặc effect-destroyed
   đếm quái. Seven Tools cleanup không tự thành sự kiện phá Bẫy bởi hiệu ứng.
   LP đã trả là công khai, private choice/engine event vẫn theo allowlist.
6. Discovery thử transition bất biến từ own/public state và LP thật, không
   trả phí khi đọc. UI/guide/support label phân biệt phản hồi Bẫy của Seven
   Tools với phản hồi Phép của Magic Jammer. Preview LP trước/sau và Trap
   đang phản hồi, Hủy chỉ đọc, xác nhận mới gửi; không auto-pay/auto-Pass.
7. Chỉ thêm bundle/review mới vào runtime inputs sau khi hoàn tất code và
   kiểm thử. Giữ 19 bundle nhập, starter, saved deck A/B và artwork cũ.

Các mục trên là thiết kế, chưa phải API hoặc hành vi đã có.

## Kiểm thử cần có trước khi mở — CHƯA CHẠY

- Ma trận dự kiến 24 kịch bản: người triệu hồi A/B × Normal/Tribute/Flip
  × Main 1/Main 2 × Seven Tools của chủ Trap Hole/đối thủ. Kiểm quái sống,
  marker/quota giữ nguyên, phí trả ngay, effect chỉ phủ nhận sau hai Pass.
- LP 8000 → 7000, 1001 → 1; 1000/999/1 bị từ chối không mutation. Tay
  rỗng vẫn hợp lệ; phí không phát fact damage hoặc kết thúc trận giả.
- Cùng lượt Set, từ tay, sai priority, decision đang chờ, link cũ/giả,
  Chain không đúng pattern, activation effect Continuous Trap, Chain
  đã xử lý: từ chối trước cost/lật bài. Không tự hỗ trợ Counter-to-counter.
- Hai Pass cleanup nguyên tử; không gọi plan Trap Hole, không phá quái,
  không hoàn quota/LP; từ chối Trap Hole phản hồi muộn sau Chain đã đóng.
- Invariants giả LP-cost/source/link/speed/target/negated flag, drift
  review/scope/definition/format; giữ guard và resolver Magic Jammer cũ.
- Handle/receipt retry và refresh không trả LP lần hai; client không được
  chỉ định amount/LP/damage/target/discard, không lộ bài úp đối thủ.
- UI A/B gồm tự phản hồi, Hủy, phí còn 1 LP, thiếu phí, nguồn/Chain preview,
  LP-cost feedback khác effect-damage; hai ghế thấy facts công khai giống
  nhau. Kiểm Linux và Windows CI bằng report thực tế trước khi công bố.

## Kiểm chứng mốc review

Đã kiểm 7/7 hash và byte nguồn, 17/17 đoạn trích có trong nội dung thật sau
chỉ chuẩn hóa khoảng trắng, không sửa câu trích. Cả 17 EvidenceSchema và
4 quyết định được kiểm bằng schema hiện có; tham chiếu nguồn/trích đoạn
đầy đủ, parsed definition/format pin khớp. Đây là kiểm hồ sơ, không cộng
thành test hiệu ứng.

Đã so hash 339 file dữ liệu/code có trước: tất cả nguyên byte, gồm 19
bundle và các review/engine/UI cũ. Runtime inputs vẫn không nạp Seven
Tools hoặc hồ sơ thiết kế. Registry không có Seven Tools, chỉ một Counter
đang mở là Magic Jammer. Toàn capabilities JSON giống trước review và
artifact Windows mốc nhập: 111 supported/16 hiệu ứng/12 scope/18 snapshot;
tổng dữ liệu nhập vẫn 112/19 bundle, 95 verified/17 historical pending.

Không chạy lại bộ game chỉ cho hồ sơ chưa được nạp vào runtime. Bằng chứng
game gần nhất vẫn là [mốc nhập Seven Tools](../data/seven-tools.md): Linux
và Windows CI đạt 1060 test/42 file, 62 bước/52 browser report,
[CI 40813536667](https://github.com/xuanthao260604-sys/idc/actions/runs/40813536667)
trên fd04f28fc306d0dde712bb8b0ebdccd221980cf8. Không gọi đây là kiểm thử
Seven Tools phủ nhận Bẫy. Windows 11 desktop chưa thử trực tiếp; chưa đóng gói beta.
