# Chọn thứ tự cleanup cho Chain Trap Hole — 30/10/2026

Đã nối [bộ cleanup](chain-cleanup-foundation.md) vào nhánh nhiều Trap Hole
đang được hỗ trợ. Trước đây engine tự thêm Bẫy vào Mộ theo thứ tự LIFO.
Nay hiệu ứng vẫn xử lý LIFO, phá quái đúng một lần; các nguồn Bẫy còn
face-up trên sân cho đến khi owner xác nhận thứ tự thêm vào Mộ.

**Không mở Phép → Magic Jammer → Seven Tools**, Counter phản hồi Counter
hoặc prefix nhiều Trap Hole trước Seven Tools. Quyền kích hoạt và các
review hiệu ứng giữ nguyên; đây là tích hợp luật cleanup vào một nhánh
đã có, không phải thêm lá/hiệu ứng mới.

## Rà soát phạm vi và căn cứ

[Hồ sơ Trap Hole hiện có](reviewed-trap.md) cho phép nhiều Trap cùng
phản hồi một Normal/Tribute/Flip Summon đối phương, Spell Speed 2, quái
ngửa ATK ≥1000, xử lý LIFO và cleanup sau mọi link. Đã kiểm lại handler,
review data/reviews/pilot.trap-effects.json và test hai Trap trước khi
thay đổi. Bài Set cùng lượt, Summon của mình, sai target/window vẫn bị chặn.

Thứ tự cleanup áp dụng [kết luận tổng hợp 7 nguồn/10 trích đoạn](../rules/chain-cleanup-order-review.md),
giữ nguyên giới hạn nguồn: FAQ Konami về owner lựa chọn trực tiếp nói
đến nhiều lá cùng một hiệu ứng; cleanup đồng thời ở cuối Chain và quyền
owner tổng quát có thêm nguồn cộng đồng để tổng hợp theo policy Goat
của dự án. Không khẳng định có một FAQ TCG 2005 gốc xác nhận đúng ví dụ
nhiều Trap Hole. Không lấy thông tin mới hoặc sửa văn bản hiệu ứng.

Mộ có trước là prefix giữ nguyên. Nạn nhân đã bị phá vào Mộ khi hiệu ứng
xử lý; không gộp vào nhóm nguồn cleanup hoặc phá lại khi chọn thứ tự.
Mỗi owner chỉ chọn nhóm của mình; một nguồn mỗi Mộ không cần lựa chọn
thứ tự chung. Chuỗi source gửi đồng thời chỉ tạo một event cleanup,
không mở cửa sổ phản hồi giữa từng lá.

## Context và quyết định phía server

DuelState thêm chainCleanup, mặc định null. Khi Trap-only Chain xử lý:

1. Duyệt link từ cuối về đầu, áp dụng các hiệu ứng như trước. Giữ các
   link đã xử lý trong state.chain để pin provenance của nguồn chờ cleanup.
2. Tạo frame từ đúng các nguồn đó. Nếu owner có nhiều nguồn, dừng ở
   timing resolving/priority null và pendingDecision kind cleanup-order.
3. Chỉ owner trả lời qua answer-decision; adapter chuyển handle riêng
   của đúng viewer/version sang hoán vị raw IDs ở phía server.
4. Chỉ sau khi mọi nhóm đã chọn hợp lệ mới lắp board patch, phát một
   sent-to-graveyard/trap-cleanup, xóa Chain/context/decision và phát
   chain-resolved. Không xử lý lại hiệu ứng hoặc tính lại cost.

Invariant ràng buộc frame live với Chain 2–5 link chỉ gồm Trap Hole,
đúng controller đối phương, nguồn face-up đã Set trước lượt hiện tại,
snapshot nguồn và target location thống nhất ở sân người đang đi lượt, quái đã ở Mộ,
source list đúng thứ tự pin từ Chain. Frame hash/nhóm owner và pending
decision phải khớp; context không được tồn tại ở cửa sổ khác hoặc sau
kết thúc. Frame hỏng bị chặn trước transition, không được serialize sang
client. Không coi kiểm invariant là xác thực một state do client gửi.

Trong lúc chờ, chỉ còn quyết định bắt buộc hoặc đầu hàng; Pass, chuyển
phase, kích hoạt mới không thể xen vào. Đầu hàng xóa context/Chain và
decision, giữ nạn nhân đã vào Mộ, không tự gửi các nguồn còn trên sân
hoặc giả lập thêm hiệu ứng sau kết thúc.

Context có thể round-trip JSON trong kiểm thử server. **Chưa có lưu
trận/receipt qua restart hoặc resume từ ổ đĩa.** Registry capability
version tăng thành two-link-counters-trap-cleanup-owner-order-v2 để state
với contract cũ không được nhận nhầm; format revision vẫn 4. Saved deck
không bị viết lại. PlayerView vẫn là allowlist cũ; chỉ thêm giá trị kind
cleanup-order vào decision của owner, không đưa frame/digest/raw ID ra ngoài.

## Giao diện

Hộp Lựa chọn bắt buộc hiện danh sách theo thứ tự thêm vào Mộ, chỉ rõ lá
cuối sẽ ở trên cùng; hai Trap Hole cùng tên có nhãn ô riêng. Mặc định
hiện một thứ tự để sửa và xem lại, **chưa gửi lệnh** cho đến khi nhấn
Xác nhận thứ tự vào Mộ. Dùng Lên/Xuống hoặc Alt+↑/↓ ở dòng có tiêu điểm;
đọc bài không đổi state hoặc thứ tự.

Sắp xếp chỉ đổi draft. Lỗi mạng trước khi gửi giữ draft và nguồn trên
sân; không tự gửi lại lệnh. Đổi ghế xóa draft riêng, ghế còn lại không
nhận decision. Hướng dẫn nói rõ hiệu ứng đã xong và đang chờ cleanup.
Không dùng checkbox chọn tập hợp để thay cho danh sách có thứ tự.

## Kiểm thử và ranh giới bằng chứng

51 test mới trong tools/trap-cleanup-order.test.ts:

- 24 tổ hợp A/B × Normal/Tribute/Flip × Main1/Main2 × hai thứ tự, qua
  action thật. Kiểm LIFO, một nạn nhân, giữ nguồn face-up khi chờ, đúng
  prefix/quota/LP/zone, cleanup và chain-resolved đúng một lần.
- Ba bản Trap đã kích hoạt thật nhận đủ sáu hoán vị trong một test.
- Thiếu/trùng/thừa/ngoài nhóm, sai người/decision/version, Pass hoặc
  kích hoạt mới không sửa board. 14 kiểu state/frame hỏng bị từ chối.
- Đầu hàng xóa context; owner-only projection, raw ID/frame không lộ,
  handle refresh làm lệnh cũ hết hiệu lực, receipt retry không gửi lần hai.
- Round-trip server snapshot hợp lệ; trận mới có context null.

Test hai Trap cũ được sửa để kiểm rõ điểm dừng và trả lời quyết định.
53 ca module cleanup độc lập giữ nguyên. Không cộng các hoán vị bên
trong một test thành nhiều test, không suy ra hỗ trợ Chain ba Counter.

Hai browser mode --cleanup-order=a/b chuẩn bị fixture trước khi server
khởi động, rồi dùng mouse/UI thật để Summon, kích hoạt hai Trap và Pass.
Kiểm cả thứ tự mặc định/đảo, payload gửi giữ đúng hoán vị, mouse/Alt-key,
xem bài, xác nhận riêng, lỗi mạng trước gửi, đổi ghế xóa draft, riêng tư,
retry đúng receipt, prefix Mộ và saved deck A/B không đổi, khung hẹp 390px.
Không thêm endpoint sửa state hoặc test flag vào beta CLI.

Ca Chain view và hai ca hướng dẫn phản hồi được cập nhật để xác nhận
cleanup qua UI. Lượt validation đầu dừng tại response-guide-a vì ca cũ
còn giả định auto-cleanup; không tính lượt đó là đạt. Bản sửa chỉ thay
kịch bản để thực hiện quyết định mới, không bỏ assertion hoặc sửa luật.

```sh
npx vitest run tools/trap-cleanup-order.test.ts
npm run build
node tools/beta-browser-smoke.mjs --cleanup-order=a
node tools/beta-browser-smoke.mjs --cleanup-order=b
npm run validate:platform
```

## Kết quả kiểm chứng

Bản cuối source 8775d965b9cc7c34b69e68dc2295a78cb0153a29 đạt trên Linux:
1258/1258 test trong 46 file, 72/72 bước và 62 browser report,
Chromium 154.0.8037.57, runtimeExceptions=0. Đã đọc report và log tại
artifacts/platform-validation/2026-10-30T08-03-59-177Z-212754/report.json.
Từng bước browser có đúng một report, khớp host và có phiên bản trình
duyệt. Có đủ 51 test mới, 53 test module cleanup cũ và hai report mới với
mọi cờ kiểm chứng. Không tính lượt validation cũ bị dừng là đạt.

Toàn bộ capabilities JSON giống mốc trước: 112 supported/95 normal
monsters/17 hiệu ứng/13 scope/19 snapshot. Report này không chứa hash
registry; registry revision có thay đổi do version contract được tăng,
không suy từ JSON bằng nhau rằng revision vẫn cũ. Hai trận tự nhiên giữ
seed 08: 16 lượt/339 lệnh/B thắng LP 0/4200 và seed 5e: 11 lượt/239
lệnh/B thắng LP 0/8000, không sửa state khi chơi. Hai trận này không dùng
hai Counter; bằng chứng Counter nằm ở mode có kiểm soát và unit/adapter.

Windows và Ubuntu CI đều đạt tại
[run 41023950655](https://github.com/xuanthao260604-sys/idc/actions/runs/41023950655),
đúng source 8775d965b9cc7c34b69e68dc2295a78cb0153a29. Đã tải/đọc artifact
windows-validation-41023950655-1 và từng log tại
artifacts/ci-trap-cleanup-order/2026-10-30T08-04-23-152Z-6208/report.json:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62.
Đạt 1258/1258 test trong 46 file, 72/72 bước, 62/62 browser report,
runtimeExceptions=0. Đã kiểm đủ 51 test mới, 53 test module cũ và mọi cờ
của hai mode cleanup A/B; từng report khớp host/version. Capabilities
JSON và kết quả hai trận tự nhiên bằng Linux và mốc trước. Report giữ
windows11DesktopVerified=false.

CI source đầu 3a9315f tại run 41023691291 bị dừng ở hướng dẫn phản hồi
cũ giống Linux; source 8775d96 sửa bước xác nhận của kịch bản đó. Chỉ
run bản cuối và artifact đã đọc ở trên được tính là đạt toàn matrix.

299/306 file đầu vào/mã sản phẩm cũ giữ nguyên byte; bảy file cũ đổi là
engine/protocol/UI cùng test Trap liên quan. Toàn bộ data/raw, bundle,
review, format, starter/deck, artwork, package/lockfile và manifest giữ
nguyên. Runtime vẫn 112 loại/95 quái thường/17 hiệu ứng/13 scope/19 bundle;
metadata nhập và hồ sơ review hiệu ứng không đổi.

Tám probe A/B/tổ hợp chủ Counter vẫn chặn link 3 trước trả LP/lật Seven
Tools, rồi xử lý hai link cũ. Chưa có context giữ Counter đã xử lý qua
lựa chọn hiệu ứng Phép gốc; đó cùng resolver và review phiên bản mới là
phần tiếp theo của chuỗi ba liên kết. Windows 11 desktop chưa thử trực
tiếp; chưa đóng gói, bàn giao beta hoặc mở trận online.
