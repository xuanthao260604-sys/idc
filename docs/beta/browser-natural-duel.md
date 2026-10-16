# Trận tự nhiên hoàn chỉnh qua giao diện

Chạy hồi quy tùy chọn khi máy có Chromium:

```sh
npm run beta:browser-duel
```

Dùng chung harness tools/beta-browser-smoke.mjs với cờ --full-duel. Script tự start server/browser
ở port và profile tạm, rồi dừng/xóa tài nguyên khi hoàn tất. Không cần chạy beta trước.
Nếu executable không phải chromium, đặt YGO_CHROMIUM thành đường dẫn tương ứng.
Không cần Chromium để chơi beta hoặc chạy 225 test thư viện/HTTP.

## Điều kiện đầu vào

Chỉ gọi createDuel với deck hợp lệ 40 lá chứa đủ 20 definitions cho mỗi người, người đi trước A,
seed kiểm thử cố định 8 dạng hex 64 ký tự. Định danh/seed khớp API mixed smoke để có thể đối chiếu.
Lấy nguyên snapshot khởi tạo: không chuyển bài vào tay/sân, không đổi phase/turn/LP,
không can thiệp thứ tự deck/markers giữa hoặc trước các bước chơi. Nhánh move fixture của
browser-effects.md bị bỏ qua hoàn toàn trong chế độ này.

Seed cố định chỉ dành cho script regression, không thay RNG hoặc seed của CLI beta bình thường.
Server nhận state từ createDuel qua constructor tin cậy; không có endpoint hoặc giao diện chỉnh state.
Đây là trận được điều khiển bằng chính sách test đơn giản, không phải trận của hai người thật
hoặc AI sản phẩm, và không chứng minh chất lượng chiến thuật.

## Cách thao tác

- Chọn A/B qua hộp chuyển máy; xác nhận tay đầu 6/5 từ hai view thực.
- Chỉ đọc PlayerView/catalog công khai của người đang cầm máy. Không đọc server state,
  deck order hoặc chỉ số quái úp đối thủ để chọn attack.
- Mouse events qua Chrome DevTools Protocol chọn bài, nút, checkbox/radio và xác nhận hộp thoại.
  Form select chọn ô/target; không gọi command() trong page để thay cho controls.
- Dùng Phép, Set Trap, Set/Flip quái FLIP, triệu hồi/tribute, attack, đáp lại Trap,
  pass/chuyển phase, quyết định bắt buộc và bỏ bài cuối lượt qua UI → HTTP → adapter → engine.
- Chính sách test nhớ quota/attack/Set turn từ chính các thao tác đã thực hiện, không nhận markers
  bí mật từ engine. Sau khi chuyển góc nhìn phải đọc lại decision, vì discard chỉ hiện cho đúng người.
- Mọi action phải tăng version; bị từ chối, control bị khóa bất ngờ, hết thời gian hoặc vòng lặp
  vượt giới hạn đều làm script thất bại. Không dùng concession/reset để hoàn thành trận.

## Kết quả đã quan sát trên Linux/Chromium

| Chỉ số | Kết quả |
|---|---:|
| Turn | 16 |
| Command được chấp nhận | 339 |
| Attack được tuyên bố | 15 |
| Decision bắt buộc được trả lời | 4 |
| LP cuối A / B | 0 / 4200 |

Pot of Greed, Fissure, Hane-Hane, Man-Eater Bug và Trap Hole đều xuất hiện trong luồng kích hoạt
qua controls. B thắng bằng life-points. UI có thông báo người thắng; Chain/decision cuối trống;
version cuối khớp số command. Không có JavaScript runtime exception.
Kết quả turn/command/LP cũng khớp trận mixed API cùng seed; đây là đối chiếu quan sát,
không hardcode số turn hay LP vào thuật toán chơi.

225/225 test thư viện/HTTP, typecheck, build, syntax check và cards:check vẫn đạt.
Browser effect fixture regression vẫn đạt riêng sau khi bổ sung chế độ full duel.
Hai browser checks không được cộng vào số test Vitest.

## Giới hạn

Đây là một seed cố định trên Chromium Linux, không phải coverage mọi opening hand, mọi bài hoặc
mọi tương tác. Kiểm thử scenario và boundary trước đó vẫn cần giữ. Chưa test Windows thật,
Safari/Firefox, touch/accessibility toàn diện, hai máy hoặc mạng mất kết nối.
Luật pilot vẫn thiếu general mixed Chain/negate/SEGOC/modifier/replacement/Special Summon.
Hotseat không phải xác thực tài khoản; server/receipt chưa có persistence qua restart.

Bản bàn đấu beta đã có bằng chứng hoàn tất một trận tự nhiên. Bước tiếp theo là cải thiện
hướng dẫn phản hồi/khả năng quan sát trận và thu phản hồi dùng thử; chưa tuyên bố game hoàn chỉnh
hoặc chuyển sang triển khai online khi chưa chuẩn bị các ranh giới còn thiếu.

Browser discovery hiện tự tìm Edge/Chrome trên Windows; không bắt buộc tên executable chromium.
Xem docs/platform/windows-browser-checks.md; chưa có kết quả Windows thực tế.
