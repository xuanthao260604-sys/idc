> Mục hiện tại: [rà soát tương tác Mộ](../engine/graveyard-interaction-audit.md), catalog 106; kiểm chứng recovery với FLIP, Trap Hole và chi phí bỏ bài. Đã đạt Linux và Windows CI: 630 test, 28 bước, 18 browser report. Snapshot lịch sử vẫn pending; Windows 11 desktop chưa chạy.

> Mốc trước: [Tribute to The Doomed](../engine/tribute-doomed.md), catalog 105; thêm chi phí bỏ bài và target khi kích hoạt. Đã đạt Linux và Windows CI: 579 test, 26 bước, 16 browser report. Snapshot lịch sử vẫn pending; Windows 11 desktop chưa chạy.

> Mốc trước: [Hammer Shot](../engine/hammer-shot.md), catalog runtime 104; batch riêng hammer-shot. Đã đạt Linux và Windows CI: 519 test, 25 bước, 15 browser report. Trạng thái lịch sử vẫn pending; Windows 11 desktop chưa chạy.

Catalog hiện tại 102 loại, có [hai Phép thay đổi LP](../engine/life-point-spells.md). Starter/deck cũ giữ nguyên; các mốc dưới đây là lịch sử.

> Mốc trước: [Smashing Ground](../engine/smashing-ground.md), catalog runtime 103; batch riêng defense-spell, snapshot lịch sử vẫn pending. Đã đạt Linux và Windows CI: 488 test, 24 bước, 14 browser report. Windows 11 desktop chưa chạy.

Catalog runtime hiện tại gồm 100 loại; starter/deck đã lưu giữ nguyên. Xem [tổng kết mốc 100](../milestones/catalog-100.md).

Catalog runtime hiện tại gồm 80 loại; starter/deck đã lưu giữ nguyên. Xem [mốc dữ liệu 80](../data/classic-80.md).

Catalog runtime hiện tại gồm 70 loại; starter/deck đã lưu giữ nguyên. Xem [mốc dữ liệu 70](../data/classic-70.md).

Catalog runtime hiện tại gồm 60 loại; starter/deck đã lưu giữ nguyên. Xem [mốc dữ liệu 60](../data/classic-60.md).

Catalog runtime hiện tại gồm 50 loại; deck mặc định giữ 40 lá. Xem [mốc dữ liệu 50](../data/classic-50.md).

Catalog runtime hiện tại gồm 40 loại; xem [mốc dữ liệu 40](../data/classic-40.md). Các số 30/20 bên dưới mô tả mốc trước.

# Bàn đấu beta trên cùng máy

> Cập nhật catalog: ứng dụng hiện hợp nhất pilot 20 và classic-10 thành 30 loại.
> Deck cũ giữ nguyên; deck mẫu mới 40 lá có đủ 30 loại. Xem ../data/classic-30.md.
> Các số 20 và các mốc test bên dưới ghi giai đoạn khởi tạo hotseat.

Đã có giao diện tại apps/beta/public, server Node ở tools/beta-server.ts và CLI tools/beta.ts.
Bản đầu dùng hai người thay phiên trên cùng máy, một trận trong bộ nhớ. Không có tài khoản,
đấu online, AI hoặc lưu trận khi dừng process. Chọn seat là chức năng chuyển góc nhìn cố ý,
không phải xác thực bảo mật giữa hai tài khoản.

## Chạy trên Windows 11

Cài Node.js 24, mở PowerShell tại thư mục checkout của dự án, rồi chạy:

```powershell
npm ci
npm run beta
```

Mở địa chỉ do terminal in trong trình duyệt trên **chính máy đó**. Mặc định port 3000,
server chỉ bind 127.0.0.1. Dừng bằng Ctrl+C. Không cần Bash, database hoặc cài Chromium để dùng.
Nếu port bận, trong PowerShell có thể đặt trước `$env:YGO_BETA_PORT = "3001"`.
Cloud chạy Linux không làm thay đổi các lệnh npm này; hiện chưa kiểm thử Windows thực tế.
Chạy server trên cloud không có nghĩa nó tự xuất hiện trong trình duyệt máy Windows của bạn.
Không có preview cloud công khai hoặc triển khai Internet ở bước này.

## Cách thử

1. Chọn Người chơi A. A bắt đầu với 6 lá, B có 5, theo Goat first-turn draw.
2. Cửa sổ phản hồi có priority hiển thị ở giữa sân. Nhấn Pass khi không phản hồi;
   dùng Đổi người chơi để chuyển máy cho người có priority, rồi pass từ góc nhìn của họ.
3. Người đang đi lượt chuyển Draw → Standby → Main 1 bằng các nút điều khiển.
   Request chuyển phase cũng cần đối thủ pass trước khi phase đổi.
4. Chọn bài trên tay, xem tên/chỉ số/text và chọn Triệu hồi/Úp/Kích hoạt.
   Hộp thoại cho chọn ô, tribute hoặc target. Engine kiểm tra luật, UI không tự cấp quyền.
5. Chọn quái trên sân để Flip Summon/đổi tư thế/attack. Trong Battle chọn quái đối thủ
   hoặc direct khi sân đối thủ không có quái. Phần lựa chọn bắt buộc hiện riêng đúng người.
6. Trap Hole phải được Set ở lượt trước và dùng trong đúng summon-response khi có priority.
   Khi không muốn phản hồi, dùng Pass. Không có tự động bỏ qua response của đối thủ.
7. Kết thúc hiển thị người thắng và LP. Trận mới mở hộp xác nhận chọn A/B/ngẫu nhiên đi trước; chỉ thay trận trong bộ nhớ khi gửi thành công. Hủy giữ nguyên trận hiện tại.

Trong phạm vi hiện tại có 20 definitions, deck mặc định hợp lệ 40 lá chứa cả 20 loại,
tôn trọng copy limit (Pot of Greed tối đa 1). Luật và các giới hạn chi tiết ở docs/engine.
Tên/text bài giữ nguồn hiện tại; không bịa bản dịch hoặc hiệu ứng. Hình minh họa đang là ký hiệu
và khung tạm, chưa tải artwork chính thức. Có bố cục desktop và màn hình nhỏ, tên dài có thể xuống dòng.

## Ranh giới dữ liệu

Trình duyệt chỉ nhận catalog công khai và PlayerView. Không nhận DuelState, deck order,
raw instance IDs, RNG hoặc raw event log. Mã bài tạm chuyển qua command adapter.
HTTP xác định seat từ cookie HttpOnly/SameSite=Strict; payload không được tự khai actorId.
Đổi seat quay vòng cookie/handle. Hộp chuyển máy che sân và tay trước khi chọn góc nhìn mới.
Người dùng cùng máy vẫn có thể chọn bất kỳ seat, đây là giới hạn hotseat được nêu rõ.

Server chỉ phục vụ ba static assets cho phép, từ chối truy cập source/data trực tiếp,
kiểm tra Host/Origin, JSON content type và body tối đa 16KB. Không dùng CORS mở.
Những biện pháp này không biến demo thành dịch vụ online: chưa có auth, room routing,
persistence, reconnect qua mạng, giám sát hoặc chính sách public deployment.
Toàn bộ source/lockfile/dependencies cũ được giữ; không thêm dependency frontend mới.

## Kiểm chứng đã thực hiện

- 225/225 test: giữ 221 test cũ, thêm 4 HTTP integration test bằng listener loopback thật:
  static/catalog, private view/cookie, command/dedup/actor injection, origin/seat/JSON/body bounds.
- Node syntax check cho app.js, typecheck và build đạt; cards:check vẫn giữ 20 lá/snapshot cũ.
- Chromium headless thực sự tải trang, tạo trận mới, chọn A/B, kiểm tra tay 6/5,
  pass/chuyển Standby/Main1, chọn bài và Normal Summon qua hộp thoại. Không có runtime exception.
- Chụp và xem bố cục desktop 1440px và viewport 390px; đã chỉnh kích thước ô và chữ nhỏ.
- Đã có kiểm thử Chromium dùng chuột/hộp thoại cho đủ 5 effect trong scenario dựng trước khi
  server khởi tạo; xem browser-effects.md.
- Đã bổ sung trận tự nhiên từ opening hand tới LP win qua UI: browser-natural-duel.md;
  16 turn, 339 command, đủ 5 effect. Không sửa state và không dùng concession.
  Chưa kiểm thử Windows thật, touch/keyboard toàn diện hoặc hai máy qua mạng.

Các lệnh kiểm tra từ checkout:

```sh
node --check apps/beta/public/app.js
npm run typecheck
npm test
npm run cards:check
npm run engine:mixed-smoke
```

Đã thêm nhãn lựa chọn theo người chơi/zone/ô, radio cho một target và khóa nút sai Main/Battle
window. Engine vẫn kiểm tra quota/target/luật. Đã hoàn tất kiểm thử một trận tự nhiên qua UI; tiếp theo là hoàn thiện hướng dẫn phản hồi
và trải nghiệm dùng thử. Chưa coi beta là game hoàn thiện.

Cập nhật mới: [bảng hướng dẫn lượt và lịch sử công khai](turn-guide-and-activity.md);
tổng kiểm thử hiện tại 228. Các số 225 bên trên ghi mốc khởi tạo beta.

Cập nhật tiếp: [availableActions từ engine](available-actions.md), 233 test;
khóa quota/slot/target và xác nhận tribute đúng tổ hợp. Dừng/chạy lại server khi cập nhật code.

Mốc 255 test: [kết quả hiệu ứng/chiến đấu công khai](public-resolution-feedback.md).
Trạng thái hiện hành: [mốc tổng hợp hotseat](../milestones/hotseat-20.md), 263 test.

Xem Mộ mở cửa sổ chỉ đọc riêng, chọn lá để đọc nội dung ngay trong cửa sổ;
xem [chi tiết và kiểm thử](graveyard-viewer.md).
