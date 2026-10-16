Mốc hiện tại: [catalog 50](classic-50.md), thêm batch độc lập `classic-10c`; các mốc 40/30/20 bên dưới là lịch sử.

Mốc hiện tại: [catalog 40](classic-40.md), thêm batch độc lập `classic-10b`; nội dung 30/20 dưới đây là lịch sử.

# Quy trình nhập dữ liệu — Giai đoạn 3

> Cập nhật: đã thêm [lô classic-10](classic-30.md) riêng để runtime có 30 lá.
> Tài liệu mốc 20 lá bên dưới giữ lịch sử. CLI nhận batch pilot/classic-10;
> cards:check chạy cả hai, không thay raw/generated/review của pilot khi nhập lô mới.

## Trạng thái đã xác nhận

Đã mở rộng pilot từ 11 lên **20 lá khác tên**: 15 quái thú thường, 2 quái thú FLIP,
2 Phép và 1 Bẫy. Nguồn Konami, mã bản in và ngày phát hành có trong [danh sách pilot](pilot-20.md).
15 lá vanilla được đối chiếu dữ liệu; 5 lá có hiệu ứng còn chờ review text/ruling lịch sử.
Snapshot nhập vẫn giữ trạng thái implementation/testing của lần nhập. Từ Giai đoạn 4A,
engine có capability riêng cho 15 vanilla; 5 lá hiệu ứng chưa hỗ trợ, chưa có giao diện chơi.
Xem ../engine/vanilla-core.md để phân biệt metadata nhập và capability engine.

15 vanilla có tổng hạn mức 45 bản theo định dạng, đủ về số lượng để xây bộ bài 40 lá
cho các bước engine/đấu thử sau này; chưa tạo deck builder hoặc tuyên bố đã đấu thử.
Mục tiêu lâu dài 80–100 lá và bài tự tạo vẫn là giai đoạn mở rộng.

## Nguồn và phạm vi tin cậy

| Nguồn | Dùng cho | Không tự chứng minh |
|---|---|---|
| https://ygoprodeck.com/api-guide/ và API v7 | JSON tên, passcode, type, stats, text tham khảo, set metadata | Ngày/khu vực phát hành chính xác, text/ruling năm 2005, quyền sử dụng ảnh |
| https://www.db.yugioh-card.com/yugiohdb/card_search.action | Đối chiếu danh tính, chỉ số, text hiện tại và hàng bản in có ngày/code cụ thể | Text hiện tại là nguyên văn năm 2005 hoặc ruling lịch sử đã đúng |
| https://www.goatformat.com/cardpool.html | Định dạng đã chọn, LOB/SDK/SDY/MRD thuộc tập set được xét, list giới hạn tháng 4/2005 | Mọi card của một prefix hoặc mọi promo tự hợp lệ mà không review |

API guide đã đọc: yêu cầu lưu dữ liệu cục bộ, giới hạn 20 request/giây, cache khoảng 2 ngày,
không hotlink ảnh liên tục. CLI chỉ gửi một request batch khi gọi fetch; import/check không gọi mạng.
Các thông tin như giá, lượt xem, date API và cờ format không tự quyết định luật/copy limit.
Quan sát nghiên cứu ban đầu có ngày API bất thường ở một ứng viên ngoài pilot; vì vậy không
sử dụng `misc_info.tcg_date` làm bằng chứng phát hành. Pipeline giữ nó riêng để đối chiếu.

Từng lá dùng bản in gốc LOB/SDK/SDY/MRD, code không có hậu tố châu Âu/reprint hiện đại và
ngày Konami trước 17/8/2005. Feral Imp được đối chiếu SDY; Saggi the Dark Clown đối chiếu MRD,
không tự gán chúng vào SDK theo ký ức/anime. Thông tin này được lưu trong evidence của từng lá.
HTML checksum là dấu vết bản tải đã review, không phải chữ ký của Konami. Các file evidence là
bản trích cấu trúc của lần đọc; khi cần refresh evidence phải đọc lại trang chính thức và review diff.

## Các lớp file

```text
data/import/pilot.manifest.json       # Danh sách yêu cầu, tên kỳ vọng và Konami CID
data/import/pilot.receipt.json        # URL/ngày tải/hash của raw đang chọn
data/import/pilot-11.baseline.json    # Tham chiếu snapshot 11 lá thật ban đầu
data/raw/ygoprodeck/<sha256>.json     # Body JSON nguyên trạng, không ghi đè
data/evidence/konami/<cid>.json       # Trích nguồn chính thức + hash HTML + bản in đã đọc
data/reviews/pilot.overlays.json      # Chỉnh tay và review, không bị fetch/import ghi đè
data/generated/pilot.json            # Bundle sinh ra; không chỉnh tay
```

ID ổn định dùng `official:<passcode-8-chữ-số>`, không dựa vào slug/tên có thể đổi.
Tên và CID cũng phải khớp manifest; lấy nhầm passcode sang lá khác là lỗi, không được nhập im lặng.
Snapshot 11 lá và snapshot 20 lá đều được giữ; test kiểm tra cả 11 danh tính/fingerprint cũ vẫn hiện diện.

## Lệnh từ thư mục checkout

```sh
npm ci
npm run typecheck
npm test
npm run cards:check
```

Các lệnh trên dùng snapshot đã lưu, không tải bài hoặc ảnh từ mạng. Node 24.19.0, npm 11.9.0.
`cards:check` tự build công cụ rồi tái tính bundle và so sánh; dữ liệu sinh bị sửa hoặc lỗi thời sẽ thất bại.
Các script dùng Node, không yêu cầu Bash để chạy trên Windows. Hiện đã xác thực trên Linux;
Windows 11 cần kiểm thử thực tế riêng, chưa tuyên bố đã kiểm thử.

Muốn tái sinh bundle từ dữ liệu đã review:

```sh
npm run cards:import
```

Muốn chủ động refresh nguồn API:

```sh
npm run cards:fetch
npm run cards:import
npm run cards:check
```

Fetch tải đúng các passcode trong manifest bằng một request, timeout 20 giây, giữ TLS/proxy chuẩn.
`--use-env-proxy` dùng proxy môi trường khi có; không thay credential hoặc tắt xác minh TLS.
Fetch không tự review, không sửa overlay, không thay bundle. Snapshot mới có hash khác được lưu riêng.
Receipt chỉ đổi sau khi response hợp lệ và snapshot được lưu thành công.
Không cần secret/API key cho workflow hiện tại.

## Quy tắc merge, xung đột và lỗi

1. Kiểm tra checksum raw, schema response, đủ đúng danh sách yêu cầu; từ chối trùng ID/tên,
   thiếu chỉ số, type chưa hỗ trợ hoặc sai name/CID.
2. Normalize dữ liệu; kiểm tra fingerprint của facts với overlay đã review. Không đưa giá/lượt xem
   vào fingerprint, để thay đổi không liên quan không làm mất review.
3. Nếu facts thay đổi, dừng với `Review conflict`; không tự đổi fingerprint để làm lệnh qua.
   Giữ raw mới, overlay cũ và bundle cuối hợp lệ; đọc diff và đối chiếu nguồn trước khi sửa overlay.
4. Áp patch text đã review, so sánh với evidence Konami. Hiện có patch Dark Magician và Trap Hole;
   hai patch chỉ sửa text tham khảo hiện tại, không tự trở thành text lịch sử hoặc effect code.
5. Kiểm tra bản in được review, prefix có nguồn, code xuất hiện ở upstream, ngày không quá cutoff;
   chỉ sau đó mới gắn copy limit từ list Goat. Unlisted không tự hợp lệ chỉ nhờ vắng tên trong banlist.
6. Kiểm tra toàn batch trước khi ghi. Khi cập nhật bundle cũ, không được bỏ lá cũ hoặc thay dữ liệu
   có ý nghĩa mà không tăng revision. Metadata nguồn có thể cập nhật mà không đổi nghĩa lá.
7. Ghi bundle bằng file tạm rồi rename. Lỗi parse/checksum/review không thay bundle hoặc overlay.
   Test có mô phỏng raw hỏng, review conflict, HTTP 503 và cache hỏng; cache cũ không bị ghi đè.

Không có tự động hóa review thủ công. Người review phải cập nhật evidence có nguồn, patch nếu cần,
fingerprint sau khi thực sự đối chiếu, và tăng revision khi thay nội dung đã phát hành.
Không sửa trực tiếp `data/generated/pilot.json`. Import luôn giữ `implementation=not-started`,
`testing=not-run`, `effects=[]`; trạng thái engine phải có cơ chế tích hợp riêng ở Giai đoạn 4,
không chỉnh bundle tay rồi mong import giữ lại các chỉnh sửa ngoài quy trình.
Các đảm bảo kiểm thử ở đây là các lỗi đầu vào/nguồn đã mô phỏng; chưa kiểm thử mất điện hoặc lỗi filesystem thực.

## Hiệu ứng và hình ảnh

`textBasis=current-reference` phân biệt text hiện tại với văn bản năm 2005. Văn bản không phải logic.
5 lá có hiệu ứng chưa được đưa vào pool chơi được trước khi hoàn tất review lịch sử, handler và test riêng.
Ruling tham khảo đã đọc cho Man-Eater Bug: https://www.goatformat.com/rulings5.html;
Trap Hole: https://www.goatformat.com/rulings7.html; Fissure: https://www.goatformat.com/rulings3.html.
Đọc một đoạn ruling không đủ để tự nâng trạng thái toàn bộ lá lên verified.

Raw có metadata URL ảnh do API trả về; bước này không tải, hotlink hoặc đóng gói hình ảnh.
Bản giao diện ban đầu có thể dùng khung bài/tài nguyên tự tạo; hình có quyền sử dụng xác định
hoặc do người dùng cung cấp sẽ được tích hợp qua quy trình riêng. Không cần ảnh để kiểm thử dữ liệu/engine.

## Kết quả kiểm tra của mốc Giai đoạn 3

- 80/80 test đạt: schema luật/bài, list, pipeline và CLI; không có test gameplay trong con số này.
- TypeScript và build đạt; cards:check khớp bundle 20 lá đã lưu.
- Các test offline nhập hai lần cho output giống nhau, giữ patch và không gọi mạng.
- 20 evidence Konami; checksum cả hai raw snapshot khớp tên file.
- 15 dữ liệu vanilla verified; 5 historical review pending; 0 implemented, 0 tested effects, 0 playable.

Từ Giai đoạn 4A tổng suite là 132 test (52 engine mới + 80 trước đó); snapshot/overlay nhập không bị sửa
để tự nâng trạng thái hỗ trợ. Báo cáo engine:smoke tách riêng capability và kết quả đấu vanilla.
