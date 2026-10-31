# Trap Hole → Seven Tools → Seven Tools

**Mốc tiếp nối:** đã bổ sung [audit tương tác qua nhiều lượt](seven-response-interaction-audit.md)
cho phục hồi quái/Phép, đổi payer và phủ nhận hồi LP. Nội dung/kết quả bên
dưới giữ mốc mở pattern ban đầu; engine/review không đổi trong audit.

Mốc 31/10/2026: đã mở đúng pattern ba liên kết này bằng activation thật,
review Seven revision 3 và resolver riêng. Giữ hai pattern Counter hai liên
kết và 11 Phép thường → Magic Jammer → Seven Tools đã triển khai.
Không mở Counter thứ tư hoặc Chain hỗn hợp tổng quát.

## Hành vi

Trap Hole phản hồi Normal/Tribute/Flip Summon hợp lệ trong Main Phase 1/2.
Seven thứ nhất phản hồi trực tiếp Trap Hole; Seven thứ hai phản hồi trực tiếp
Seven thứ nhất. Hai Counter phải được Set từ lượt trước, đúng priority,
Spell Speed 3 và từng người trả có LP >1000 tại lần kích hoạt của mình.
Nếu tự nối vào lá vừa kích hoạt, đối thủ phải nhường phản hồi trước.

| Người trả | LP trước Chain | Sau Seven thứ nhất | Sau Seven thứ hai |
| --- | --- | --- | --- |
| Cùng một người | 2001 | 1001 | 1 |
| Hai người | Mỗi người 1001 | Người trả thứ nhất còn 1 | Người trả thứ hai còn 1 |

2001 là phép tính từ hai lần trả 1000 và giữ LP >0, không phải một ruling
mới. LP bằng 1000 ở lần thứ hai bị chặn trước khi trừ phí hoặc lật nguồn.
Người chơi vẫn có thể Pass để xử lý Chain hai link cũ.

Sau hai Pass, xử lý từ liên kết cuối:

1. Seven thứ hai phủ nhận activation và phá Seven thứ nhất. Lá bị phá vào
   Mộ chủ sở hữu ngay; bỏ qua hiệu ứng của nó, không hoàn phí đã trả.
2. Trap Hole tiếp tục một lần, phá đúng quái đã chọn khi kích hoạt. Summon
   và quota triệu hồi không được hoàn lại.
3. Trap Hole và Seven thứ hai vẫn ở sân đến cleanup cuối Chain. Khi cùng
   vào một Mộ, chủ sở hữu chọn thứ tự; khi khác Mộ, tự cleanup. Không đổi
   thứ tự các lá đã nằm trong Mộ, gồm Seven thứ nhất và quái vừa bị phá.

## Review và giới hạn nguồn

Manifest dùng data/reviews/seven-tools-v3.effects.json, revision 3, scope
counter-trap-reviewed-three-link-patterns-v3, continuation
reviewed-three-link-counter-patterns-v3. Registry capability version:
reviewed-three-link-seven-response-v6. Schema buộc card/revision/scope/
continuation đúng cặp; không nạp hai review cùng lá. V1/v2 được giữ nguyên.

Review v3 giữ nguyên 40 evidence record của v2, không thêm quotation hay
ngày truy cập mới. Cơ sở là điều kiện kích hoạt khi một Trap Card được kích
hoạt, luật Speed 3 phản hồi Speed 3, phản hồi trực tiếp, LIFO và không hoàn
cost. Kết luận Seven phản hồi Seven là tổng hợp các nguồn đó, **không phải
trích một FAQ TCG 2005 riêng cho cặp Seven–Seven**. Các giới hạn của nguồn
hiện đại/OCG/bản chép cộng đồng và chính sách cleanup vẫn như
[review Counter](../rules/counter-to-counter-review.md) và
[review cleanup](../rules/chain-cleanup-order-review.md).

Giữ nguyên SHA definition Seven
2dbc5c07956ac97d58b2f449898bf2d73bd0488578b9c69c0fadd5e468accbc0
và Trap Hole
6bde121e8b1b4409e34d907b2d9e9d5ba5df93676a46507d205cd6d96372d35d.
Không sửa raw/generated/import, metadata lịch sử, artwork, khung hoặc deck.
Catalog vẫn 112 definition, 95 quái thường, 17 hiệu ứng, 13 scope, 19 snapshot.
95 verified data và 17 historical pending giữ nguyên; review runtime không
tự nâng trạng thái nhập thành implemented/tested/playable.

## Trạng thái riêng phía server

trap-counter-continuation.ts kiểm graph, nguồn/snapshot, Summon gốc, hai
receipt LP đã trả và board trước xử lý. Dùng ledger đã chuẩn bị ở
[mốc trước](seven-lp-cost-ledger.md); không trả phí lần nữa khi resolve.
Sau khi nguồn Seven và quái bị phá, trusted resolver tạo
trapCounterResolution riêng, pin graph đã xử lý, lịch sử LP, board và cleanup.
Hash integrity phát hiện drift; không phải chữ ký cho state từ client.

Frame chỉ sống khi chờ owner chọn thứ tự cleanup; xóa khi cleanup hoặc đầu
hàng. Nó không chồng lên frame Phép/Normal Spell Counter cũ. PlayerView chỉ
hiện thông tin công khai và quyết định của đúng ghế, đánh dấu root đã xử lý,
không lộ ledger/frame/snapshot nội bộ hoặc giữ handle mục tiêu lịch sử.
API vẫn nhận các intent cũ; không thêm endpoint sửa state.

## Kiểm thử mới

tools/seven-response.test.ts có 128 ca:

- 96 tổ hợp A/B × controller hai Counter × Normal/Tribute/Flip Summon ×
  Main Phase 1/2 × thứ tự cleanup. Tất cả activation chạy bằng lệnh thật.
- Ngưỡng LP, latest-link, priority, nguồn từ tay/Set cùng lượt, input thêm,
  drift review, gate v2, lệnh sai không đổi state và Counter thứ tư bị chặn
  dù có nguồn Set/LP hợp lệ.
- Frame cleanup bị sửa, history/context/board sai, JSON round-trip, đầu
  hàng khi đang chờ cleanup và kiểm membership/Mộ không trùng.
- Adapter A/B: handle link mới nhất, handle cũ/sai, retry không trả thêm phí,
  quyết định riêng, cleanup một lần và không lộ frame/ledger.

58 ca ledger cũ dùng registry v2 để giữ kiểm thử ứng viên chưa được gate đó
cho phép. Các suite Phép → Magic → Seven và hai-link vẫn được chạy hồi quy.

Sáu browser mode seven-response-[a|b]-[split|same|blocked] đi qua UI thật:
hai payer, cùng payer và thiếu LP lần thứ hai. Bao gồm Normal/Tribute/Flip,
hai Main Phase, tự phản hồi sau Pass, preview link mới nhất, Hủy chỉ đọc,
retry chi phí, không có Counter thứ tư, cleanup riêng/automatic, dữ liệu hai
ghế đồng nhất và deck đã lưu không đổi. Bốn mode kích hoạt Counter thứ hai
kiểm dialog ở 1440/390px; hai mode blocked không tính là kiểm dialog đó.
Fixture chỉ đặt bàn ban đầu, không chỉnh state giữa các lệnh.

## Bằng chứng kiểm chứng

Source kiểm chứng: bbd22fd5494953de9fab0e44f2705d9833970124.
Ubuntu và Windows CI đều đạt tại
[run 41205351538](https://github.com/xuanthao260604-sys/idc/actions/runs/41205351538).
Đã tải artifact windows-validation-41205351538-1 và đọc report/từng log:
artifacts/ci-seven-response/2026-10-31T13-23-56-598Z-6208/report.json.
Windows win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62: **2431/2431 test, 53 file, 90/90 bước, 80/80 browser
report**, runtimeExceptions=0. Có đủ 128 ca mới và sáu mode Seven phản hồi
Seven, mỗi bước browser có một report đúng host và phiên bản browser.
Report vẫn windows11DesktopVerified=false; chưa thử Windows 11 desktop.

Linux cũng đạt **2431/2431 test, 53 file, 90/90 bước, 80/80 browser report**,
Chrome 154.0.8037.57, Node 24.19.0, npm 11.9.0, runtimeExceptions=0:
artifacts/platform-validation/2026-10-31T13-32-00-363Z-358565/report.json.
Đã đối chiếu từng bước/report, đủ sáu mode mới và các suite/luồng cũ;
capabilities JSON của Windows và Linux bằng nhau. Dùng report này trên mã
cuối, không ghép log unit/build mới vào report cũ. Lượt gọi sandbox trước
đó thoát 1 tại bước test nhưng không có stdout/stderr; không tính là đạt.
Đã chạy lại trọn bộ với quyền chạy loopback/browser và lấy report đạt trên.

Hai trận tự nhiên giữ baseline trên cả hai hệ: pilot seed 08, 16 lượt,
339 lệnh, LP [0,4200]; expanded seed 5e, 11 lượt, 239 lệnh, LP [0,8000].
Cả hai không chỉnh state giữa trận và không phát sinh Counter; không dùng
chúng làm bằng chứng tự nhiên cho pattern Seven mới.

Đã so capabilities với mốc ledger: chỉ đổi review/scope/continuation Seven
sang v3 và mô tả giới hạn hai pattern ba link; tất cả trạng thái nhập và
thông số catalog khác bằng baseline. Kiểm SHA-256 của 311 file đầu vào/mã
sản phẩm cũ: 301 nguyên vẹn, 10 thay đổi đúng mã/manifest dự kiến, không file
data/ cũ nào đổi. Review v3 là file mới; 40 evidence record bằng nguyên v2.

## Còn lại

Chưa mở Counter link 4+, Phép → Magic → Seven → Seven, nhiều Trap Hole rồi
Counter, generic mixed Chain, SEGOC, Damage Step, Continuous Trap effect,
protection/replacement hoặc giảm chi phí. Hai trận tự nhiên cũ không phát
sinh Counter; bằng chứng mới đến từ unit/adapter và browser có setup kiểm
soát. Chưa có online/lưu trận, bộ tạo bài riêng hoặc bản đóng gói Windows.
Windows 11 desktop vẫn cần thử trực tiếp ở mốc sản phẩm sau.
