# Review Counter phản hồi Counter — 30/10/2026

**Cập nhật 31/10:** [parent resolver ứng viên](../engine/counter-root-resolution.md)
đã nối journal với Phép gốc và cleanup; activation link 3 vẫn chưa mở.

Cập nhật: [review bổ sung về thứ tự cleanup](chain-cleanup-order-review.md)
đã chốt quyết định bằng tổng hợp nguồn. Phần pending trong hồ sơ JSON và
nội dung dưới đây giữ trạng thái của mốc rà soát đầu, không thay kết luận
bổ sung. Đã có [bộ cleanup phía server](../engine/chain-cleanup-foundation.md)
và [lựa chọn thứ tự cho Chain nhiều Trap Hole](../engine/trap-cleanup-order.md).
Đã nối [context Phép một liên kết tạm dừng](../engine/paused-spell-resolution.md)
vào luồng cũ và chuẩn bị [journal Counter độc lập](../engine/counter-continuation-journal.md).
Biến thể parent frame có Counter đã xử lý và chuỗi ba liên kết ở hồ sơ
này vẫn chưa được mở.

Đã đối chiếu luật chính và đề xuất thiết kế cho phạm vi tiếp theo sau
[rà soát Seven Tools](../engine/seven-tools-interaction-audit.md):
**Normal Spell → Magic Jammer → Seven Tools**. Đây là review thiết kế;
chuỗi ba liên kết chưa được mở hoặc kiểm thử hiệu ứng trong runtime.
Thứ tự đưa hai nguồn cùng chủ vào Mộ ở cuối Chain còn cần nguồn xác
nhận trước triển khai; hồ sơ ghi rõ pending, không tự chọn quy tắc.

Hồ sơ data/evidence/effects/counter-to-counter-scope-review.json ghi
design-reviewed-not-enabled, runtimeEnabled=false,
implementationAndEffectTests=not-started, proposedScope=
counter-trap-normal-spell-magic-jammer-seven-tools-three-link-v1.
Giữ runtime 112 loại/17 hiệu ứng/13 scope/19 snapshot; dữ liệu nhập vẫn
112 loại/19 bundle, 95 verified/17 historical pending. Các review hiệu
ứng cũ, profile revision 4 và deck A/B giữ nguyên.

## Căn cứ và giới hạn nguồn

9 nguồn/20 trích đoạn, mỗi đoạn có URL, ngày truy cập, loại nguồn,
locator và lý do áp dụng trong hồ sơ. Đã kiểm nội dung thật, không chỉ
lưu URL. Không xác nhận nguyên văn bản in 2002/2005 của hai Counter.

| Nguồn | Điều được dùng |
| --- | --- |
| [Rulebook v5 lưu trữ](https://archive.org/download/rulebook_v05/rulebook_v05.pdf) | Trang in 32 có sơ đồ Counter Trap phản hồi Counter Trap, LIFO và quyền phản hồi lá mình sau đối thủ Pass; trang 33 chỉ speed 3 phản hồi speed 3; trang 35–36 tách cost/effect và không hoàn cost khi activation bị phủ nhận |
| [Rulebook chính thức hiện tại](https://www.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf) | Trang 30 điều kiện Set Trap; trang 47 ví dụ Seven Tools ở link 3 phủ nhận Trap link 2, rồi Phép link 1 vẫn xử lý. Ví dụ dùng Heavy Storm/Threatening Roar, không phải Magic Jammer; các lá ví dụ chưa được nhập hoặc mở hiệu ứng |
| [Rulebook Nhật Master Rule 2020](https://www.yugioh-card.com/japan/howto/data/rulebook_masterrule20200401_ver1.0.pdf) | Trang in 61 có đúng cặp Magic Jammer → Seven Tools, với Phép gốc Mystical Space Typhoon; đọc trực tiếp ảnh PDF sheet 31. MST là Quick-Play, vẫn ngoài runtime; nguồn OCG hiện tại, không phải bằng chứng TCG gốc 2005 |
| [Seven Tools English CID 4863](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4863&request_locale=en) | Phí 1000 LP, phản hồi Trap Card activation, phủ nhận activation và phá lá đó nếu thành công; dùng snapshot nhập 29/10, đọc lại tại chỗ 30/10 |
| [Magic Jammer English CID 4862](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4862&request_locale=en) | Bỏ một lá, phủ nhận Spell Card activation; snapshot nhập 27/10, đọc lại tại chỗ 30/10. Magic Jammer vẫn là Trap activation khi chính nó được kích hoạt |
| [Seven Tools FAQ Nhật](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=4863&request_locale=ja) | Tải mới 30/10; bổ sung hiển thị 28/9/2017: trực tiếp chain activation Trap của mình/đối thủ, không phải effect của Trap đã hoạt động. Là OCG hiện tại, không gọi là TCG gốc năm 2005 |
| [Goat rulings7](https://www.goatformat.com/rulings7.html) | Mục Seven Tools phân biệt card/effect activation; Stamping Destruction / Individual Card FAQs ghi Spell/Trap còn trên sân đến hết Chain, trừ khi bị hiệu ứng phá trong Chain. Bản chép cộng đồng, chưa xác thực bản tin UDE gốc; Stamping Destruction chưa được mở |
| [Goat rulings4](https://www.goatformat.com/rulings4.html) | Ví dụ Imperial Order/Lily về chi phí không trả LP về 0; kết hợp text Seven Tools để giữ ngưỡng >1000, không bịa ruling riêng ghi 1001 cho lá |
| [Goat Basics](https://www.goatformat.com/basics.html) | Quy ước baseline hiện hành/ngoại lệ Goat đã chọn. Giữ ngày snapshot 27/10 và lưu ý biên tập, không nhận là tải mới ngày 30/10 |

Kết luận về Magic Jammer → Seven Tools là tổng hợp card text, direct-chain
và sơ đồ speed 3 thời kỳ cũ. Ví dụ hiện tại củng cố việc link 1 tiếp tục,
không được trình bày như một ví dụ chính thức dùng đúng một trong 11 Normal Spell của runtime. Rulebook Nhật bổ sung ví dụ rõ cặp Counter này, với root MST thuộc loại Quick-Play.
Không chọn card target là cách đọc ngữ nghĩa card text/direct-chain đã
review; không tạo câu trích giả nói nguyên văn Seven Tools không target.

Hai PDF tải lại ngày 30/10 khớp byte/hash mốc trước: v5 681725 byte,
SHA-256 d02c016334f65c98a9fe900ae0b2630a3de63f63e330426ab07c55d9466dc61a;
rulebook hiện tại 3415528 byte,
82be14641b2b7940467034a5b14b0d4037835831866537738d34fd9df5a0f444.
Hash chỉ chứng minh bản tải nhất quán, không phải chữ ký nhà phát hành.
PDF giữ ở workspace tạm; FAQ HTML mới giữ nguyên 90399 byte với SHA-256
545a051cce1558bf400d50d9cbb1c4588528ad99d371059bc93e037eb72bbdbd
trong data/raw/konami, không ghi đè snapshot 29/10.
Rulebook Nhật tải mới có 16797779 byte, SHA-256
d8fd0165bc5aa92880f934993de8b472b426dcb07b3588f3bbf2ddceaae0e8d6.
Trang 61 chứa ảnh nên được render/đọc trực tiếp; hồ sơ ghi phương pháp
manual-visual và hash ảnh, không nhận là đã trích text/OCR tự động.

## Hành vi đã chốt cho triển khai

Link 1 là một trong 11 Normal Spell hiện có, từ tay hoặc Set, trong Main
1/Main 2. Hồ sơ giữ fingerprint/revision của từng Phép và hai Counter;
không tự hỗ trợ một Spell mới chỉ vì có loại Normal Spell. Magic Jammer
ở link 2 phải đã qua các guard nguồn, cost, priority và liên kết hiện có.

| Thời điểm | Yêu cầu |
| --- | --- |
| Trước link 3 | Seven Tools ở sân mình, Set từ lượt trước, đúng priority, không decision; LP >1000; prefix đúng Phép → Magic Jammer, tham chiếu link cuối hiện hành |
| Kích hoạt link 3 | Trả đúng 1000 LP, lật bài, tạo link speed 3; không discard, không card target, chưa phủ nhận hoặc phá gì; reset hai Pass |
| Phản hồi lá mình | Chủ Magic Jammer có thể dùng Seven Tools của mình sau đối thủ Pass; tay rỗng không cản phí LP. Chủ Phép có cơ hội phản hồi Magic Jammer trước |
| Link 3 xử lý | Phủ nhận activation Magic Jammer link 2 và phá Magic Jammer; không phủ nhận Phép link 1, không hoàn discard/LP/cost Phép |
| Bỏ qua link 2 | Không chạy hiệu ứng Magic Jammer, không phá Phép link 1; không tạo lại một activation của Phép hoặc thu phí mới |
| Link 1 xử lý | Dùng đúng resolver cũ một lần, gồm cost/target đã chọn và các lựa chọn lúc xử lý. Không tự hoàn Normal quota hoặc đổi thành một lần kích hoạt mới |
| Kết thúc Chain | Seven Tools được đưa xuống Mộ bằng cleanup đúng một lần; phân biệt với Magic Jammer bị phá bởi hiệu ứng. Không phát thêm fact trap-destroyed cho cleanup |

Nếu root là Phép gây damage/heal, LP có thể thay đổi sau phí Seven Tools.
Ví dụ cùng chủ trả 1000 rồi Dian Keto hồi 1000 là hai hành vi riêng, không
phải refund. Nếu root là Smashing Ground/Hammer Shot với nhiều lựa chọn,
giữ Seven Tools face-up trong khi chờ effect-choice; chỉ hoàn cleanup khi
toàn Chain xong. Người có decision mới được chọn; không mở response mới
giữa các link hoặc auto-chọn thay người chơi.

Giới hạn ba liên kết là giới hạn dự án. Trap Hole → Seven Tools → Seven
Tools có thể hợp lệ theo luật, nhưng chưa thuộc lần mở đầu này. Đặc biệt
nếu cùng người trả hai phí, journal của phí trước không còn bằng LP hiện
tại; không được mở bằng cách chỉ bỏ điều kiện chain.length. Magic Jammer
không đáp lại Seven Tools vì đó là Trap activation, không phải Spell.
Chưa mở link 4+, prefix nhiều Trap Hole, mixed Chain tổng quát, Damage
Step input, Continuous Trap effect, protection/replacement hoặc SEGOC.

## Những resolver gốc phải giữ nguyên

Đây là bản đồ code đang có, không phải hiệu ứng mới hoặc kiểm thử Chain
ba liên kết đã đạt. Các pin trong hồ sơ giữ đúng 11 định nghĩa hiện tại.

| Phép | Luồng gốc cần tiếp tục sau khi Magic Jammer bị phủ nhận |
| --- | --- |
| Pot of Greed | Bốc hai lần, xử lý riêng thiếu deck 0/1/2 và required-draw loss; không bốc lại khi retry |
| Hinotama / Ookazi | 500 / 800 sát thương khi xử lý, gồm lethal; phí LP của Seven Tools vẫn là cost riêng |
| Dian Keto the Cure Master | Hồi 1000 khi xử lý; không diễn giải thay đổi LP thành refund Seven Tools |
| Fissure | Quái face-up đối thủ có ATK thấp nhất; giữ lựa chọn tie ở effect-choice |
| Smashing Ground | Quái face-up đối thủ có DEF cao nhất; giữ lựa chọn tie ở effect-choice |
| Hammer Shot | Quái face-up Attack Position có ATK cao nhất ở cả hai sân; giữ lựa chọn tie |
| Tribute to The Doomed | Giữ lá đã discard/target từ activation gốc, không discard lại; phá target khi xử lý |
| Monster Reincarnation | Giữ discard/target Mộ mình; lấy đúng lá về tay khi xử lý, không kích hoạt lại |
| Block Attack | Giữ target đối thủ từ activation gốc, đổi về Defense khi xử lý theo guard hiện tại |
| Earthquake | Đổi toàn bộ quái face-up Attack Position hợp lệ, không tạo choice trung gian |

## Khoảng cách với code hiện tại

Đã đọc engine/protocol/adapter/projection hiện có trước khi chọn thiết kế:

- Counter gate/invariants và resolver đang nhận hai link; LP Counter
  chỉ nhận prefix Trap Hole. Quy tắc này đang đúng với phạm vi đã mở.
- pass chỉ gọi resolveCounterChain cho Chain hai link. Chỉ tăng giới hạn
  sẽ đưa Chain ba link vào đường xử lý sai.
- finishSpell đang pop link cuối rồi đóng Chain. Với ba link chưa được
  tách trạng thái xử lý, nó có thể cleanup nhầm nguồn hoặc đóng quá sớm.
- resolving/effect-choice invariant hiện giữ một link. Cần trạng thái
  server riêng để giữ các link đã xử lý và nguồn còn chờ cleanup khi root
  dừng ở lựa chọn; không nhét cờ negated tùy ý vào state do client gửi.
- Cost journal hiện so afterLP với LP hiện tại khi Chain đang xây. Journal
  của link đã xử lý phải giữ ý nghĩa lịch sử nếu root hồi/gây damage;
  không tái sử dụng kiểm tra đó một cách máy móc cho trạng thái đang xử lý.

Thiết kế ưu tiên là một resolution frame phía server: nhận đúng prefix
đã kiểm tra, lưu link 2/3 đã xử lý và nguồn Seven Tools chờ cleanup, giữ
root trong Chain lúc effect-choice. Frame chỉ hợp lệ trong xử lý/lựa
chọn root; không cho nó tồn tại khi Chain đã đóng hoặc ở trận mới. Đây
là hợp đồng đề xuất, chưa phải trường/API đang tồn tại trong DuelState.

LP=0, failed required draw và concession cần nhánh terminal rõ ràng.
Giữ chính sách kết thúc trận hiện có, xóa context còn chờ và không phát
thêm hiệu ứng/refund giả. Cleanup nội bộ sau terminal phải được kiểm
riêng; không trình bày bookkeeping của game như một luật cho mọi trường
hợp sau khi Duel kết thúc. Không để pending choice/frame lọt qua restart.

### Điểm chưa đủ căn cứ

Nguồn Stamping Destruction đã kiểm chứng thời điểm Chain-end cleanup,
nhưng không nói thứ tự tương đối của root Spell và Seven Tools nếu cả
hai cùng chủ. Rulebook hiện tại yêu cầu giữ thứ tự Mộ, cũng không đủ để
tự suy ra thứ tự gửi hai nguồn này. Cần xác minh có lựa chọn thứ tự nào
phải cung cấp và thời điểm áp dụng; không gán vòng lặp cleanup của engine
thành luật Yu-Gi-Oh!. Đây là openImplementationChecks trong hồ sơ và là
điều kiện phải giải quyết trước bật review/runtime mới. Chưa tìm được
nguồn đủ rõ trong các tài liệu đã đọc; không suy việc này từ kết quả
tìm kiếm rỗng hoặc nguồn không truy cập được.

## Công việc và điều kiện hoàn tất — CHƯA TRIỂN KHAI

1. Tạo review Seven Tools phiên bản mới, pin card/format và hai pattern
   cụ thể: Trap Hole → Seven Tools cũ; Normal Spell → Magic Jammer →
   Seven Tools mới. Giữ file review cũ, manifest chỉ chọn một review
   đang hoạt động cho mỗi lá; gate scope/registry revision phải đổi rõ.
2. Kiểm prefix/link cuối trên server trước trả phí. Action chỉ mang
   card/chain handle; không nhận amount, kết quả LP, index hoặc target.
   Magic Jammer vẫn chỉ kích hoạt trực tiếp sau Spell activation.
3. Thêm frame/dispatcher/resolver/cleanup và đường effect-choice tiếp tục;
   giữ guard kiểu nguồn, snapshot, thứ tự cost, owner và link identity.
   Không trả LP/discard lần nữa khi resume hoặc retry.
4. AvailableActions chỉ mở link 3 sau probe bất biến đã qua gate mới.
   Projection theo allowlist; không serialize frame/raw journal hoặc
   bài úp đối thủ. UI preview đúng Magic Jammer đang phản hồi và phí LP;
   Hủy không trả phí. Fact phủ nhận Bẫy tách khỏi kết quả Phép gốc.
5. Kiểm ma trận A/B, Magic Jammer của chủ Phép/đối thủ, Seven Tools của
   chủ Magic Jammer/đối thủ, Main1/Main2, Spell tay/Set. Chạy đủ 11 plan:
   draw 0/1/2, damage lethal, heal, cost/target, vị trí và lựa chọn tie.
6. Kiểm LP 1001/1000, tay rỗng, cùng lượt Set, sai priority/handle/link
   cuối; link 4 và các pattern chưa mở bị chặn trước mutation. Hai Pass,
   choice riêng tư, terminal/concede, cleanup một lần, receipt/refresh,
   frame giả, review drift và saved deck phải có kiểm thử riêng.
7. Giữ hồi quy hai Counter cũ/nhiều Trap Hole không Counter, import lỗi
   bảo toàn byte, rồi đọc report Linux và Windows CI thực tế. Chỉ khi
   code và kiểm thử đạt mới đổi manifest/review đang hoạt động.

Các mục trên là kế hoạch triển khai, không phải kiểm thử đã chạy.

## Kiểm chứng của mốc review

Đã kiểm 9/9 hash/kích thước. 19 trích đoạn được tìm trong text nguồn
sau chỉ chuẩn hóa khoảng trắng; parser giữ từ liền qua inline HTML.
Một đoạn Nhật được đối chiếu trực tiếp trên ảnh trang PDF 61, ghi riêng
manual-visual. Cả 20 EvidenceSchema và 4 DecisionSchema đạt, tham chiếu nguồn/trích đoạn đầy
đủ. Kiểm 13 fingerprint toàn định nghĩa (hai Counter và 11 Phép), cùng
format/review pin. Đây là kiểm hồ sơ, không cộng thành test hiệu ứng.

297 file đầu vào/code có trước giữ nguyên byte, gồm raw/evidence cũ,
19 bundle, các review đang hoạt động, manifest, package/lockfile,
engine/protocol/UI sản phẩm. Chỉ thêm hồ sơ thiết kế và snapshot FAQ mới;
không ghi đè dữ liệu/deck hoặc tải artwork.

Tám probe A/B × chủ Magic Jammer × chủ Seven Tools xác nhận runtime hiện
tại vẫn từ chối link 3, không trừ LP/lật Seven Tools, không discovery
một action mới; hai Pass vẫn xử lý Magic Jammer hai link cũ. Đây là kiểm
gate từ chối trước/sau thêm hồ sơ, không phải tám ca hiệu ứng ba link.
Hồ sơ không nằm trong manifest runtime và bị active CounterReviewsSchema
từ chối; không thể dùng nó thay file review hiệu ứng đang hoạt động.

Đã build và so toàn capabilities JSON trước/sau: giống nhau, đồng thời
khớp artifact Windows của mốc audit trước. Runtime vẫn 112/17 hiệu ứng/
13 scope/19 snapshot. Không chạy lại toàn bộ game chỉ cho dữ liệu review
không được nạp. Kiểm chứng gameplay gần nhất vẫn là
[CI 40989836603](https://github.com/xuanthao260604-sys/idc/actions/runs/40989836603)
trên 91bb6a6d9398ac3a7f2b2c8924c405d663b5d78d: Linux và Windows CI đạt
1154 test/44 file, 70 bước/60 browser report. Đây không phải bằng chứng
chuỗi ba liên kết đã hoạt động.

Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
