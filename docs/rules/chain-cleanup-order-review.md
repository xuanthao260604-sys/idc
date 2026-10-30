# Chốt thứ tự cleanup ở cuối Chain — 30/10/2026

Cập nhật triển khai: đã có [bộ cleanup phía server](../engine/chain-cleanup-foundation.md)
với kiểm thử độc lập và [tích hợp lựa chọn vào Chain nhiều Trap Hole](../engine/trap-cleanup-order.md).
Hồ sơ nguồn dưới đây giữ kết quả của mốc review; chuỗi Phép → Magic Jammer
→ Seven Tools vẫn chưa mở.

Đã giải quyết điểm nguồn còn mở trong [thiết kế ba liên kết](counter-to-counter-review.md).
**Các nguồn còn lại được gửi vào Mộ đồng thời ở cuối Chain, gom theo chủ
sở hữu; mỗi chủ chọn thứ tự các lá của mình.** Bài đã nằm trong Mộ giữ
nguyên thứ tự. Đây là quyết định tổng hợp nguồn theo baseline Goat đã
chọn, không phải câu trích TCG 2005 ghi đúng ví dụ đang triển khai.

Hồ sơ mới data/evidence/effects/counter-chain-cleanup-order-review.json
giữ design-reviewed-not-enabled, runtimeEnabled=false,
implementationAndEffectTests=not-started. Nó bổ sung kết luận cho
same-owner-chain-end-graveyard-order; hồ sơ review trước vẫn giữ nguyên
byte và trạng thái lịch sử. Chưa có xử lý ba link hoặc hộp chọn thứ tự
trong game. Runtime vẫn 112 loại/17 hiệu ứng/13 scope.

## Nguồn và phép tổng hợp

| Nguồn | Điều xác nhận và giới hạn |
| --- | --- |
| [Konami FAQ 206](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=206&request_locale=ja) | Nhiều lá được gửi đồng thời trong **một hiệu ứng**: chủ sở hữu chọn thứ tự. Không mô tả trực tiếp cleanup do luật ở cuối Chain; không tự gọi câu này là ruling về cleanup |
| [Konami FAQ 11538](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=11538&request_locale=ja) | Không đổi lại thứ tự bài đã được gửi vào Mộ, tiếp tục chơi theo thứ tự chúng được gửi |
| [Konami FAQ 6880](https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=6880&request_locale=ja) | Ví dụ nhiều Counter Trap: nguồn chưa bị loại còn trên sân đến hết Chain, rồi mới xuống Mộ; Counter bị phủ nhận/phá đã rời sân trong Chain. Không nhập Minerva hoặc các lá ví dụ, không áp dụng trigger của chúng |
| [Card Labo, bài giải thích Chain](https://www.c-labo.jp/blog/176900/) | Nguồn cộng đồng/cửa hàng ghi rõ các Spell/Trap đã dùng được gửi **đồng thời bởi luật** khi Chain kết thúc; không phải tài liệu Konami hay nguồn TCG 2005 đã xác thực |
| [Yu-Gi-Oh! Card Wiki — Graveyard](https://yugioh-wiki.net/index.php?%CA%E8%C3%CF) | FAQ cộng đồng nêu quy tắc tổng quát: nhiều lá gửi đồng thời thì chủ sở hữu quyết định thứ tự, dù hiệu ứng do mình hay đối thủ kích hoạt. Chú thích 10/01/07 là ngày do cộng đồng ghi, chưa xác thực độc lập; không dùng ví dụ Xyz/equip/game máy trong trang |
| [Goat rulings7](https://www.goatformat.com/rulings7.html) | Snapshot cũ, Stamping Destruction / Individual Card FAQs: nguồn Spell/Trap ở sân đến hết Chain, trừ khi bị hiệu ứng phá trước. Bản chép cộng đồng, không gọi là bản tin UDE nguyên gốc |
| [Goat Basics](https://www.goatformat.com/basics.html) | Baseline hiện hành và ngoại lệ Goat đã chọn. Dùng lại snapshot 27/10, không nhận là vừa tải mới |

FAQ 206/11538 hiển thị 24/3/2017, FAQ 6880 hiển thị 28/9/2017; đều là
OCG hiện tại, không được nâng thành historical-official. Quyết định dự
án kết hợp quy tắc owner-order tổng quát của wiki và câu xác nhận
cleanup đồng thời của Card Labo với các điểm chính thức nêu trên và
nguồn Goat cũ. Không khẳng định có một FAQ Konami duy nhất trả lời đúng
Phép → Magic Jammer → Seven Tools. Nếu có nguồn lịch sử mâu thuẫn sau
này, mở lại review theo quy trình disputed/revision của dự án.

FAQ 206 còn nói lá đang thực hiện hiệu ứng được gửi sau các nạn nhân
của hiệu ứng, ví dụ Dark Hole. Câu đó **không chứng minh Phép link 1 phải
đứng cuối mọi nguồn Spell/Trap của một Chain nhiều link**. Không dùng
thứ tự trong ví dụ một hiệu ứng để bỏ quyền chọn batch cleanup.

## Áp dụng cho pattern đã chọn

Với Normal Spell → Magic Jammer → Seven Tools:

1. Chi phí Phép gốc và discard của Magic Jammer đã vào Mộ lúc activation,
   giữ nguyên vị trí và không hoàn lại.
2. Seven Tools xử lý ở link 3: Magic Jammer bị phủ nhận/phá và vào đúng
   Mộ chủ sở hữu ngay lúc đó. Lá này không nằm trong batch cleanup sau.
3. Link 2 bị bỏ qua. Phép link 1 tiếp tục xử lý đúng một lần, gồm lựa chọn
   trong lúc xử lý nếu có; nạn nhân/chi phí đã vào Mộ không đổi vị trí.
4. Khi các hiệu ứng đã xong, batch cleanup còn Phép gốc và Seven Tools.
   Khác chủ: mỗi Mộ nhận một lá, không cần hỏi thứ tự. Cùng chủ: người
   đó được chọn một trong hai thứ tự. Ghi batch như một lần gửi đồng thời,
   không chia thành hai cửa sổ để đối thủ phản hồi xen vào.

| Trường hợp | Thứ tự cần bảo toàn |
| --- | --- |
| A sở hữu Phép và Seven Tools; B sở hữu Magic Jammer | Batch của A được chọn Phép → Seven hoặc Seven → Phép. Magic Jammer đã ở Mộ B trước đó |
| Phép và Seven Tools khác chủ | Mỗi chủ nhận một nguồn, không phát sinh lựa chọn thứ tự chung giữa hai Mộ |
| Chủ Phép tự dùng Magic Jammer, rồi tự dùng Seven Tools sau các Pass hợp lệ | Discard và Magic Jammer đã bị phá giữ nguyên thứ tự cũ; chỉ hai nguồn cuối được hoán vị trong batch mới |
| Root phá quái bằng Tribute to The Doomed | Nạn nhân vào Mộ lúc hiệu ứng xử lý; không gộp nạn nhân hoặc lá cost vào batch nguồn cuối Chain |
| Root dừng ở lựa chọn Fissure/Smashing Ground/Hammer Shot | Chưa cleanup nguồn khi chờ chọn; sau lựa chọn mới hoàn tất batch và hỏi thứ tự nếu cần |

“Phép → Seven” trong bảng là thứ tự thêm lần lượt, lá thêm sau nằm trên
cùng; đây không phải sắp xếp lại toàn Mộ. Quyền thuộc owner, không tự trao
cho controller của hiệu ứng hoặc người đang có priority. Không mở editor
Mộ hoặc khả năng đổi thứ tự tùy ý trong game.

## Hợp đồng triển khai tiếp theo — chưa có trong runtime

- Giữ context nguồn chờ cleanup phía server qua các lựa chọn xử lý root.
  Không dùng tên lá làm identity hoặc đặt context mới trong dữ liệu gửi
  từ client. Frame/context phải hết khi Chain đóng, concession hoặc tạo trận mới.
- Khi một chủ có hai nguồn cần sắp thứ tự, yêu cầu hoán vị đủ/duy nhất của
  chính batch đó. Chặn thiếu/trùng/thừa lá, nguồn của đối thủ, raw ID,
  handle cũ hoặc lựa chọn của ghế khác trước khi gửi bất kỳ nguồn nào.
- answer-decision hiện có thể mang mảng optionIds theo thứ tự, nhưng
  decision kind, invariants, projection và UI phải được mở rõ. Checkbox
  chọn một tập hợp chưa đủ cho lựa chọn thứ tự; cần UI có thứ tự thật và
  điều khiển bằng bàn phím. Đây chưa phải API hoặc giao diện đã hoạt động.
- Chỉ chủ batch được trả lời; toàn batch chưa áp dụng khi đang chọn.
  Không Pass, kích hoạt mới hoặc dựng Chain xen giữa các nguồn cleanup.
  Mộ sau xác nhận là công khai; không serialize raw frame/journal hoặc
  bài úp không liên quan sang PlayerView.
- Cleanup không phải phá bởi hiệu ứng: không cộng fact trap-destroyed /
  spell-destroyed hoặc làm lại LP/discard. Retry receipt không append
  nguồn lần hai, không mở lại lựa chọn, không đổi thứ tự đã xác nhận.
- LP=0, failed draw và concession cần xử lý terminal riêng, không giữ
  decision chờ sau khi Duel đã kết thúc. Không diễn giải bookkeeping của
  terminal snapshot thành một hành động luật mới sau trận.

Các ca chấp nhận cần có: hai hoán vị A/B, khác chủ không hỏi, root có
cost/target/choice/damage/heal/draw, private decision, stale handle,
receipt retry, context giả, nguồn vào Mộ trước batch và terminal. Chưa
chạy những ca hiệu ứng này. Những pattern nhiều Trap Hole cũ cần audit
riêng; mốc nguồn này không tự sửa thứ tự của handler đang hoạt động.

## Kiểm chứng

Đã kiểm 7/7 hash/kích thước raw và 10/10 trích đoạn trong nội dung thật,
chỉ chuẩn hóa khoảng trắng, không sửa câu trích. Cả 10 EvidenceSchema
và 2 DecisionSchema đạt; tham chiếu đúng open check trong hồ sơ trước,
13 fingerprint định nghĩa ở mốc đó vẫn khớp. Đây là kiểm bằng chứng và
thiết kế, không cộng vào số test hiệu ứng của game.

299 file đầu vào/mã sản phẩm có trước giữ nguyên byte, gồm hai hồ sơ
review trước, raw/evidence cũ, 19 bundle, review runtime, manifest,
package/lockfile, engine/protocol và UI. Thêm năm snapshot HTML mới và
hồ sơ bổ sung riêng, không tải artwork hoặc ghi đè dữ liệu/deck.

Toàn capabilities JSON giống mốc trước và artifact Windows đã đọc:
112 supported/17 hiệu ứng/13 scope/19 snapshot, hai Counter Trap trong
phạm vi cũ. Hồ sơ mới không nằm trong manifest và không phải một review
runtime hợp lệ. Tám probe A/B/chủ Counter vẫn chặn link 3 trước trả LP,
giữ Seven Tools úp, rồi xử lý hai link cũ đúng; không gọi đây là kiểm thử
hoán vị cleanup hoặc chuỗi ba link đã chạy.

Không chạy lại toàn bộ game cho hồ sơ chưa nạp vào runtime. Kiểm chứng
gameplay gần nhất vẫn là Linux và Windows CI: 1154 test/44 file,
70 bước/60 browser report trên source 91bb6a6d9398ac3a7f2b2c8924c405d663b5d78d,
[run 40989836603](https://github.com/xuanthao260604-sys/idc/actions/runs/40989836603).
Bước tiếp theo là triển khai context/lựa chọn/resolver và các kiểm thử
của phạm vi ba link; kết luận nguồn này không tự mở hiệu ứng.

Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
