# Bộ cleanup cuối Chain phía server — 30/10/2026

Cập nhật: [context và hộp chọn thứ tự](trap-cleanup-order.md) đã được nối
vào Chain chỉ gồm nhiều Trap Hole. Nội dung dưới đây giữ kết quả mốc xây
bộ nền ban đầu; chuỗi Phép → Magic Jammer → Seven Tools vẫn chưa mở.

Đã triển khai bộ xử lý chuyển các nguồn Spell/Trap còn lại vào Mộ như
một batch, dựa trên [kết luận nguồn về quyền chọn thứ tự](../rules/chain-cleanup-order-review.md).
Đây là phần nền của [thiết kế Counter ba liên kết](../rules/counter-to-counter-review.md).
**Chuỗi ba liên kết và giao diện chọn thứ tự chưa được mở.**

## Phần đã nối vào game và phần còn độc lập

| Phần | Trạng thái |
| --- | --- |
| Phép một link gửi nguồn của mình vào Mộ sau xử lý | Dùng bộ cleanup mới; hành vi/sự kiện giữ nguyên |
| Magic Jammer/Seven Tools trong hai pattern hai link cũ | Nguồn bị phủ nhận/phá vào Mộ trước; Counter còn lại dùng cleanup một nguồn mới |
| Chuẩn bị batch, phân nhóm owner, nhận hoán vị, tạo board patch nhiều nguồn | Có module và kiểm thử độc lập; chưa được gọi từ handler nhiều nguồn |
| Lưu frame qua quyết định bắt buộc, projection handle và quyết định sắp thứ tự | Chưa triển khai trong DuelState/adapter |
| Resolver Phép → Magic Jammer → Seven Tools | Chưa triển khai; kích hoạt link 3 vẫn bị từ chối |
| Hộp chọn thứ tự có bàn phím và browser test tương ứng | Chưa triển khai |
| Các Chain nhiều Trap Hole cũ | Giữ handler cũ, cần audit riêng trước khi thay cleanup |

Runtime vẫn 112 loại/17 hiệu ứng/13 scope/19 snapshot; không thay review,
manifest hoặc capability version. Bộ mới không tự cho phép một Chain,
không suy hiệu ứng từ tên lá, không nâng metadata nhập pending thành verified.

## Hợp đồng module nội bộ

packages/engine/src/chain-cleanup.ts có bốn thao tác thuần:

1. prepareChainCleanup nhận các nguồn còn trên sân do resolver tin cậy
   cung cấp sau khi mọi hiệu ứng/lựa chọn đã xử lý xong. Chỉ chấp nhận
   nguồn Spell thường hoặc Trap thường/Counter được registry hỗ trợ,
   face-up, đúng ô, xuất hiện đúng một lần trong các zone.
2. chainCleanupDecision trả nhóm owner tiếp theo còn cần chọn. Một nguồn
   mỗi Mộ không cần lựa chọn chung; nhiều nguồn cùng owner yêu cầu hoán
   vị đủ/duy nhất của chính nhóm đó. Thứ tự tuple người chơi chỉ dùng để
   lên lịch hỏi, không tạo thứ tự luật giữa hai Mộ.
3. orderChainCleanup ghi hoán vị hợp lệ vào frame mới, không sửa bài,
   LP, Mộ, frame cũ hoặc phát sự kiện. Chặn người khác trả lời, thiếu,
   trùng, thừa, lá Mộ cũ và nguồn ngoài nhóm. Chưa cho trả lời nhóm sau
   khi nhóm trước còn chờ.
4. commitChainCleanup chỉ trả patch cards/players sau khi mọi owner đã
   chọn xong. Mộ cũ là prefix giữ nguyên; thêm nguồn theo đúng hoán vị,
   lá thêm sau nằm trên cùng. Bài về Mộ owner, kể cả controller khác owner.

Toàn bộ nguồn và lựa chọn được kiểm trước chuyển động đầu tiên. Patch
không làm lại cost, không phá bởi hiệu ứng, không tạo response window,
không chuyển lá cost/nạn nhân/link đã bị phá lần nữa. Caller chịu trách
nhiệm lắp patch, ghi **một** sự kiện đồng thời và đóng Chain; module không
phát từng nguồn thành các lệnh riêng. Nhánh đã nối hiện chỉ có một nguồn,
giữ nguyên event reason spell-cleanup/counter-trap-cleanup và sự kiện
chain-resolved sau đó.

Frame và patch được freeze; card/zone đầu vào không bị sửa. Fingerprint
ràng buộc duel/format/registry, lượt, Chain, battle, kết quả và toàn bộ
cards/players. Board, thứ tự Mộ cũ hoặc ngữ cảnh Chain thay đổi sẽ làm
frame bị từ chối; áp dụng lại vào board đã nhận patch cũng bị chặn.
stateVersion/eventSequence không nằm trong digest: tích hợp quyết định
sau này vẫn phải kiểm version/handle tại adapter và quản lý frame server.
Fingerprint **không phải chữ ký xác thực**, không thay xác thực transport.

Frame, digest và raw IDs là dữ liệu server nội bộ, không phải payload
client hoặc field mới của PlayerView. Module không tự xác minh nguồn đã
xử lý hiệu ứng xong hoặc có thuộc pattern được duyệt hay không; resolver
phải cung cấp provenance từ frame xử lý tin cậy. Kiểm cấu trúc frame
không biến frame client tự tạo thành hợp lệ.

Luồng Phép cũ có cleanup sau khi LP về 0 hoặc bốc thất bại. Nhánh
terminal-single-source giữ đúng bookkeeping đó, chỉ cho một nguồn,
không mở lựa chọn sau trận. Cleanup nhiều nguồn khi kết thúc hoặc đầu
hàng vẫn phải được thiết kế trong resolver ba link; không tự chọn thay
owner để mở rộng quy tắc terminal.

## Kiểm thử

53 ca tools/chain-cleanup.test.ts gồm:

- Hai hoán vị đối xứng A/B; khác chủ không hỏi; owner khác controller.
- Hai chủ cùng cần chọn: chưa có patch khi chỉ một chủ xác nhận.
- Giữ nguyên prefix Mộ có cost, Counter đã phá và nạn nhân; các zone,
  LP, quota, marker và bài không liên quan giữ nguyên.
- Thiếu/trùng/thừa/sai chủ, frame hỏng, đổi nguồn/Chain/battle/lượt/LP,
  và cố dùng lại sau commit đều bị từ chối trước khi thay board.
- Đủ 120 hoán vị của năm nguồn trong **một ca**; không cộng thành 120
  test hoặc suy thành hỗ trợ Chain năm link.
- Dian Keto thực sự hồi đúng một lần; Ookazi gây LP=0 và Pot thất bại
  khi bốc vẫn cleanup nguồn đúng một lần, kết thúc không giữ decision.
- Không tự cleanup cho concession/effect/simultaneous-loss; frame được
  deserialize không bị freeze ngược vào đối tượng đầu vào của bên gọi.

Fixture nhiều nguồn chỉ chuẩn bị một board trung gian tin cậy cho module,
không phải một Chain ba link đã được tạo/chạy bằng hành động game.
Ba ca integration cuối dùng activation/Pass thật sau fixture ban đầu.

Ngoài suite, đã đối chiếu trực tiếp engine baseline a477757 với source
07466050938b0b84bdff12dbc4af146688a4ee17: 82 trace/324 lệnh trên 11 Phép,
hai ghế, không Counter/Magic đối thủ/Magic tự phản hồi, hai phía tie
choice, lethal damage và Pot deck 0/1/2. Có 12 decision và 8 terminal;
toàn bộ ActionResult (state + events) bằng nhau sau từng lệnh, input
giữ nguyên, invariants cũ/mới đạt. Đây là đối chiếu thủ công bổ sung,
không cộng 82 vào tổng test tự động hoặc coi là kiểm thử link 3.

Tám probe A/B với các tổ hợp chủ Magic/Seven tiếp tục chặn link 3 trước
trả LP/lật nguồn; không có available action tương ứng, Chain hai link
cũ vẫn xử lý xong. Không sửa dữ liệu để giả lập review hiệu ứng mới.

```sh
npx vitest run tools/chain-cleanup.test.ts
npm run validate:platform
```

## Bằng chứng nền tảng

Linux đạt 1207/1207 test trong 45 file, 70/70 bước và 60 browser report,
Chromium 154.0.8037.57, runtimeExceptions=0. Đã đọc từng report cùng
tests/data/capabilities log tại
artifacts/platform-validation/2026-10-30T07-30-49-405Z-196818/report.json.
Lượt npm test trong sandbox trước đó bị EPERM khi listen localhost;
không tính lượt bị chặn đó là đạt. Lượt đầy đủ ngoài sandbox nêu trên đạt.

Bản đầu c8c2ce7 đã đạt Linux và Windows CI tại
[run 41019615162](https://github.com/xuanthao260604-sys/idc/actions/runs/41019615162),
1203 test/45 file, 70 bước/60 browser report. Đã tải/đọc artifact
artifacts/ci-chain-cleanup-initial/2026-10-30T07-22-15-212Z-7780/report.json,
kiểm cả tests/data/capabilities log, Edge 155.0.4283.62. Bốn ca và hai
chỉnh sửa cuối thuộc source 0746605, được kiểm chứng riêng dưới đây.

Bản cuối 07466050938b0b84bdff12dbc4af146688a4ee17 đạt cả hai job của
[run 41020534465](https://github.com/xuanthao260604-sys/idc/actions/runs/41020534465).
Đã tải/đọc artifact windows-validation-41020534465-1 và từng log tại
artifacts/ci-chain-cleanup-final/2026-10-30T07-31-06-468Z-3688/report.json:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62.
Windows đạt 1207/1207 test trong 45 file, có đủ 53 ca cleanup,
70/70 bước và 60/60 browser report, runtimeExceptions=0. Mỗi bước
browser có đúng một report, khớp host và có phiên bản trình duyệt.

Toàn bộ capabilities JSON bằng Linux và artifact Windows trước refactor:
112 supported/95 quái thường/17 hiệu ứng/13 scope/19 snapshot, hai Counter
trong scope cũ; các trạng thái nhập không đổi. Hai trận tự nhiên giữ seed
08: 16 lượt/339 lệnh/B thắng LP 0/4200 và seed 5e: 11 lượt/239 lệnh/B
thắng LP 0/8000; không sửa state trong trận. Hai trận này không dùng hai
Counter, nên bằng chứng Counter nằm ở mode kiểm soát và unit/adapter.
Report vẫn ghi windows11DesktopVerified=false.

304/305 file đầu vào/mã sản phẩm có trước giữ nguyên byte; file cũ đổi
duy nhất là packages/engine/src/duel.ts để nối cleanup một nguồn. Không
đổi data/raw, bundle, review, format, starter/saved deck, artwork, UI,
protocol, dependency hoặc lockfile. Các nguồn trong hồ sơ cleanup vẫn
đạt hash/byte/trích đoạn. Import lỗi không ghi đè dữ liệu cũ.

Bước tiếp theo: persisted resolution context, quyết định owner có handle
riêng, UI sắp thứ tự, resolver ba link và review version mới; sau đó mới
mở capability với unit/adapter/browser/Linux/Windows đầy đủ. Windows 11
desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
