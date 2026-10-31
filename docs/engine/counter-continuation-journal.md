# Journal Counter đã xử lý — thành phần độc lập

**Mốc mới 31/10:** đã [mở pattern ba liên kết](three-link-counter.md) qua activation thật
và review Seven v2. Nội dung/kết quả bên dưới giữ mốc triển khai trước đó.

**Cập nhật 31/10:** đã [nối parent resolver](counter-root-resolution.md) để xử lý
root và tiếp tục choice/cleanup qua engine/adapter. Chưa mở activation link 3.
Các mô tả “chưa được game gọi” bên dưới ghi scope tại mốc 30/10 ban đầu.
Journal nay có thêm capturedStateVersion; parent kiểm đồng hồ/version.

Mốc 30/10/2026: thêm packages/engine/src/counter-continuation.ts cho
phần tiếp theo của [chuỗi ba liên kết](../rules/counter-to-counter-review.md).
Thành phần này giữ receipt của Magic Jammer bị phủ nhận/phá, Seven Tools
đã xử lý nhưng còn trên sân, và Phép gốc vẫn còn hiệu lực.

**Chưa được gọi từ game.** Không thay activation, availableActions,
registry/review đang hoạt động, DuelState hoặc UI. Chuỗi Phép → Magic
Jammer → Seven Tools vẫn bị chặn; các test bên dưới kiểm một thành phần
với input trung gian tin cậy, không phải các activation đã được engine
chấp nhận hoặc luồng ba link đã chạy qua giao diện.

## Phần đã triển khai

prepareCounterContinuation nhận ba receipt có cost **đã trả trước đó**.
Nó kiểm đúng graph root → Magic → Seven, nguồn/snapshot/Set turn, danh
tính link và trình tự cost; sau đó trả:

- Board patch đưa Magic Jammer vào Mộ owner, giữ nguyên prefix Mộ,
  original root, Seven Tools, LP, tay/deck/quái và mọi cost đã trả.
- activeRoot là activation Phép gốc, không tạo một lần activation mới.
- Journal đóng băng hai Counter đã xử lý: Magic có activationNegated,
  destroyed/skipped; Seven có resolved-awaiting-cleanup. Cleanup chỉ còn
  hai nguồn Phép gốc và Seven, không gồm Magic, lá discard hoặc nạn nhân.

Không trả phí LP/discard, không gọi hiệu ứng Phép, không phát event,
không quyết định winner, không mở response/choice hoặc gửi batch cuối
Chain. Parent resolver tương lai phải lắp patch, phát đúng sự kiện và
tiếp tục root. Kết quả là một thành phần/patch, **không phải DuelState
ổn định có thể đưa vào adapter hiện tại**. Test xác nhận engine hiện tại
vẫn từ chối cả input ba link và snapshot trung gian chưa có parent frame.
Patch/journal là dữ liệu server; chỉ projection allowlist PlayerView
được gửi cho người chơi, không serialize trực tiếp board patch.

Pins gồm đúng 11 Normal Spell và hai Counter từ hồ sơ thiết kế đã đóng
băng; so toàn definition SHA, format revision 4 và registry identity.
Test so map 13 pins với hồ sơ nguồn để không tự nhận thêm Spell chỉ vì
có subtype Normal. Không cập nhật metadata nhập hoặc diễn giải text để
tạo hiệu ứng. Receipt Seven dùng identity ứng viên riêng
pay-1000-negate-magic-jammer-activation-v1; đây **không** phải handler
Trap Hole-only đang hoạt động hoặc một review runtime mới.

## Chi phí lịch sử và checkpoint

Journal giữ nguyên root/Magic/Seven receipt, snapshot nguồn lúc activation,
discard events, LP payment, thứ tự event và binding board. Kiểm cost
1000, beforeLP >1000, afterLP=beforeLP−1000, Magic bỏ một lá và cost root
(nếu có) xảy ra trước Magic, rồi đến Seven. Lá discard hai lần không
được trùng cùng một instance. Tại entry, các discard ở đúng Mộ và LP
hiện tại phải bằng LP ngay sau payment; không tạo receipt giả để tự trả.

Sau đó receipt là **lịch sử**, không bắt afterLP cũ bằng LP sau hiệu ứng:

| Sau khi root xử lý | Journal giữ gì |
| --- | --- |
| Seven trả 1000 từ 1001 còn 1, Dian Keto hồi 1000 | LP mới 1001, receipt vẫn beforeLP=1001/afterLP=1; hồi là hiệu ứng riêng, không refund hoặc trả lại cost |
| Monster Reincarnation lấy lại quái đã bỏ làm cost của chính nó | Receipt discard giữ nguyên dù lá hiện về tay hợp lệ; không yêu cầu mọi cost card phải ở Mộ mãi mãi |
| Fissure/Smashing Ground/Hammer Shot cần chọn trong lúc xử lý | Magic ở Mộ, Seven còn face-up, root giữ identity gốc và chỉ tiếp tục một lần |

checkpointCounterContinuation cho phép before-root → root-choice hoặc
cleanup, và root-choice → cleanup. Khi chờ lựa chọn phải đúng plan tính
từ board server và pending decision của root; chưa xong decision thì
không sang cleanup. Stage cleanup không mở lại. Mỗi checkpoint bind
board mới, pin Magic ở Mộ đúng owner, root/Seven vẫn nguyên nguồn, Chain
chỉ giữ root, priority đình chỉ và không có terminal.

**Checkpoint chỉ dành cho root resolver tin cậy sau khi nó áp dụng
hiệu ứng đã duyệt.** Nó không chứng minh một board tùy ý do client hoặc
caller đề xuất là transition hiệu ứng hợp lệ. Parent phải kiểm toàn bộ
invariant, thực thi đúng plan, quản lý decision/version và receipt retry.
Parent cũng phải kiểm đồng hồ event/version hiện hành; journal pin thứ
tự receipt tại capture, không thay kiểm chứng toàn bộ event stream.
Hash integrity/binding phát hiện journal hoặc board bị đổi, không phải
chữ ký xác thực và không biến journal client gửi lên thành đáng tin cậy.

Không checkpoint sau LP=0, failed draw hoặc concession; không giả lập
cleanup sau trận. Terminal nhiều nguồn cần được xử lý riêng ở parent.
Không để context một Phép với cleanup tuple một nguồn tự nhận thêm Seven;
biến thể parent frame mới phải giữ journal và hai nguồn cleanup rõ ràng.

## Kiểm thử

120 test mới trong tools/counter-continuation.test.ts:

- 88 input: 11 root × A/B × chủ Magic của mình/đối thủ × chủ Seven của
  mình/đối thủ. Kiểm patch chỉ phá Magic, giữ nguyên root/cost/quái/LP,
  đúng Mộ, journal source identity và JSON round-trip.
- Map pins đúng hồ sơ nguồn; Dian Keto thay đổi LP sau payment; Monster
  Reincarnation trả quái cost về tay; ba plan tie chờ choice rồi cleanup.
- 12 input sai bị chặn trước trả patch; 7 journal hỏng bị phát hiện;
  3 terminal và 4 trạng thái đình chỉ sai không được checkpoint.

Fixture trung gian chuẩn bị trước khi gọi thành phần, dùng definition,
ATK/DEF và amount thật. Các ca thay đổi sau root dùng plan hiện có làm
căn cứ và mô phỏng phần việc của parent; chúng không phải kiểm thử root
resolver ba link đã tích hợp. Module không thay thế guard activation
hoặc toàn bộ engine invariant, không cấp quyền kích hoạt Counter.

```sh
npx vitest run tools/counter-continuation.test.ts
npm run typecheck
npm test
npm run cards:check
```

## Bằng chứng kiểm chứng

Linux đạt 1445/1445 test trong 48 file, gồm đủ 120 ca mới; typecheck,
build và check 19 bundle đạt: 112 nhập, 95 verified data, 17 historical
pending. Đã import module JS build bằng Node thực, đủ 13 pins. Tám probe
A/B/owner vẫn chặn link 3 trước trừ LP/lật Seven và xử lý hai link cũ.

Không lặp full browser Linux cho module chưa được nạp vào runtime.
Full Linux gameplay gần nhất vẫn source 8e849f2: 72/72 bước, 62 browser
report, 1325 test/47 file tại
artifacts/platform-validation/2026-10-30T08-39-18-865Z-225212/report.json.
Không gộp log unit mới vào report cũ hoặc nói report cũ chạy 1445 test.
Mã runtime, protocol/UI và dữ liệu đang dùng giống byte mốc đó.

Windows và Ubuntu CI đều đạt trên source
7789067d2c51ccdfb203a59eb37edaf1925699e2 tại
[run 41031342862](https://github.com/xuanthao260604-sys/idc/actions/runs/41031342862).
Đã tải/đọc artifact windows-validation-41031342862-1 cùng từng log tại
artifacts/ci-counter-continuation/2026-10-30T09-09-43-132Z-6568/report.json:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62.
Windows đạt 1445/1445 test trong 48 file, đủ 120 ca mới, 72/72 bước và
62/62 browser report, runtimeExceptions=0. Mỗi bước browser có đúng một
report khớp host/version. Capabilities JSON bằng mốc Linux đầy đủ trước
đó và kết quả hai trận tự nhiên giữ nguyên seed 08/5e, LP 0/4200 và
0/8000. Hai trận đó không dùng Counter; bằng chứng journal là unit test
độc lập, không suy từ browser gameplay của các scope cũ.
Report vẫn ghi windows11DesktopVerified=false.

308 file đầu vào/mã sản phẩm cũ giữ nguyên byte: engine đang hoạt động,
protocol/UI, raw/generated/review/format, artwork, starter/deck,
manifest, package và lockfile. Không tải dữ liệu hoặc artwork mới.
Runtime vẫn 112 loại/95 quái thường/17 hiệu ứng/13 scope/19 snapshot;
review Seven Tools và trạng thái metadata nhập không được nâng sớm.

## Phần tiếp theo

Nối journal vào biến thể parent frame của root, gồm tạm dừng lựa chọn,
resume và cleanup hai nguồn bằng UI đã có; kiểm cost lịch sử, source
đã ở Mộ/sân và terminal. Sau đó nối review/version/gate mới, discovery,
preview và matrix engine/adapter/browser để mở đúng pattern ba link.
Chưa mở link 4+, Seven phản hồi Seven, mixed Chain tổng quát hoặc SEGOC.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
