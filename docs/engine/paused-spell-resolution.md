# Context Phép tạm dừng — bước đầu cho chuỗi ba liên kết

**Mốc mới 31/10:** đã [mở pattern ba liên kết](three-link-counter.md) qua activation thật
và review Seven v2. Nội dung/kết quả bên dưới giữ mốc triển khai trước đó.

**Cập nhật 31/10:** [parent resolver ứng viên](counter-root-resolution.md)
đã nối journal với Phép gốc và cleanup; activation link 3 vẫn chưa mở.

Mốc trước: đã chuẩn bị [journal Counter độc lập](counter-continuation-journal.md).
Context Phép đơn và kết quả kiểm chứng bên dưới giữ scope ban đầu;
phần nối parent mới được ghi riêng ở cập nhật 31/10 ở trên.

Mốc 30/10/2026: đã thêm frame server cho Phép một liên kết đang chờ
lựa chọn khi xử lý Fissure, Smashing Ground hoặc Hammer Shot. Frame
được tạo trong hành động Pass thứ hai và tồn tại qua lựa chọn riêng
của người điều khiển Phép. Sau khi chọn hợp lệ, chỉ xử lý tiếp Phép gốc
một lần rồi cleanup đúng nguồn đó và xóa frame.

Đây là bước đầu của [kế hoạch Counter ba liên kết](../rules/counter-to-counter-review.md).
**Chưa mở Phép → Magic Jammer → Seven Tools** và chưa có frame lưu hai
Counter đã xử lý khi Phép gốc tạm dừng. Không dùng frame một link mới
để nhận thêm link bằng cách nới chain.length hoặc cleanupSourceIds.

## Thay đổi cụ thể

Trước đây effect-choice chỉ giữ một Chain link và danh sách trong
pendingDecision. Nay DuelState thêm spellResolution với biến thể
normal-spell-single-link-v1, stage effect-choice, gồm:

- Identity duel/registry, rootLinkId và rootSourceId chính xác.
- Tuple cleanupSourceIds chỉ có **một** nguồn là Phép gốc.
- Người chọn và danh sách lựa chọn lấy từ plan của board server.
- Fingerprint ràng buộc Chain, battle, turn, kết quả và toàn bộ
  cards/players. Không hash chính frame, decision hoặc state version.

Frame chỉ hợp lệ khi Chain một link là Normal Spell được registry hỗ
trợ, không negated, nguồn face-up đúng ô và snapshot activation, người
đi lượt ở Main1/Main2, hai Pass đã xong, không requested phase, priority
null, không pending trigger hoặc cleanup khác. Plan hiện hành phải là
choose-destruction; các Phép draw/heal/damage/cost/target không bị biến
thành một lựa chọn giả để dùng frame này.

Invariant so khớp schema chặt, root/cleanup identity, hash, plan tính
lại từ board tin cậy và pending decision. Sửa đồng thời cả danh sách
trong frame và pendingDecision để nhét quái úp/lá nguồn vào vẫn bị từ
chối, vì danh sách phải đúng plan server. Không coi hash là chữ ký xác
thực hoặc coi một state client tự tạo là state đáng tin cậy.

finishSpell xác định rõ link đầu gốc thay cho pop link cuối không có
identity guard. Khi trả lời, người chơi chỉ gửi decision/card handle
như trước; không gửi frame, stats, nguồn cleanup hoặc kết quả hiệu ứng.
Frame không tạo activation, không thu chi phí hoặc gọi lại resolver từ
đầu. Nạn nhân vào Mộ trước nguồn Phép; prefix Mộ và các zone/marker/quota
không liên quan được giữ nguyên.

prepareSpellResolution/assertSpellResolution và spellResolutionBoard
ở packages/engine/src/spell-resolution.ts. Hai loại context Phép và
[cleanup Trap](trap-cleanup-order.md) dùng chung resolution-fingerprint.ts.
Cách băm giữ nguyên trường/thứ tự serialize của bộ cleanup trước đó,
không thêm context đệ quy vào digest. stateVersion/eventSequence không
nằm trong digest; adapter vẫn kiểm viewer/version/handle riêng.

## Lifecycle, riêng tư và tương thích

Trận mới có spellResolution=null; activation và Pass đầu chưa tạo frame.
Frame chỉ xuất hiện khi thực sự cần chọn trong lúc xử lý. Trả lời hợp
lệ xóa frame sau phần hiệu ứng và trước cleanup; frame không còn trong
cửa sổ response mới. Magic Jammer phủ nhận activation trước đó sẽ bỏ qua
Phép, không tạo frame hoặc decision. Đầu hàng xóa frame/decision/Chain,
không tự phá quái hoặc gửi nguồn Phép vẫn còn trên sân.

Các luồng LP=0/bốc thất bại cũ vẫn kết thúc và cleanup một nguồn như
trước; chúng không dùng frame lựa chọn này. Terminal nhiều nguồn cho
chuỗi ba link vẫn cần triển khai/kiểm riêng, không suy từ bookkeeping
Phép một link thành luật mới cho mọi trường hợp sau kết thúc.

Không đổi PlayerView, protocol lệnh, UI hoặc public event facts.
Projection allowlist giữ frame/digest/raw IDs phía server; chỉ owner
nhận decision, ghế còn lại bị đình chỉ priority. Pass/phase/activation
không xen vào lựa chọn; đầu hàng vẫn được phép. Refresh xoay handle,
retry đúng command nhận receipt cũ và không xử lý lại.

Context round-trip JSON trong kiểm thử server. **Chưa có lưu trận hoặc
receipt qua restart, tải state client hay resume từ ổ đĩa.** Registry
capability version tăng thành two-link-counters-paused-spell-and-trap-cleanup-v3
để từ chối state contract cũ; format revision vẫn 4, review/binding và
saved deck không bị viết lại. Biến thể Counter tương lai cần version/
scope/gate riêng và invariant cho journal đã xử lý, không tái sử dụng
guard LP/source sống của giai đoạn xây Chain.

## Kiểm thử của mốc này

67 test mới trong tools/spell-resolution-frame.test.ts:

- 24 tổ hợp ba Phép × A/B × tay/Set × Main1/Main2. Dùng activation/Pass
  thật sau fixture ban đầu; giữ nguồn face-up khi chờ, chọn hai phía
  của tie, Hammer gồm quái của người dùng, resume đúng một lần.
- 25 dạng context hỏng: thiếu frame, root/cleanup sai, thêm nguồn/link,
  owner/options/hash/stage/duel/registry sai, board thay đổi, pending
  decision không khớp và sửa phối hợp cả hai danh sách.
- 10 dạng trả lời sai/thời điểm không hợp lệ không tiêu thụ frame.
- Ba Phép bị Magic Jammer phủ nhận không tạo frame; hai người có thể
  đầu hàng mà không xử lý tiếp; trận mới không giữ context cũ.
- JSON server snapshot round-trip; hai ghế dùng projection/handle thật,
  chặn raw/cross-viewer/stale handles và deduplicate receipt resume.

Test/helper không sửa ATK/DEF hoặc dữ liệu lá để tạo tie: dùng hai bản
Battle Ox có stats thật. Không dùng fixture Counter ba link rồi gọi đó
là luồng game đã mở. Phạm vi hiện có vẫn 112 loại/95 quái thường/17 hiệu
ứng/13 scope/19 bundle; các metadata nhập giữ riêng như trước.

Đối chiếu thêm phần transition duel.ts trước/sau, baseline 3d11555 và
source 8e849f27eab5fb4fee9000b76e9c96c00e4c0615, dùng cùng registry và
dependency hiện hành: 82 trace/324 lệnh trên 11 Phép, A/B, Magic của
đối thủ/tự phản hồi, choice hai phía, lethal và Pot deck 0/1/2. Có 12
decision và 8 terminal. Sau khi bỏ riêng trường spellResolution mới,
toàn ActionResult (state/events) bằng nhau; input không bị sửa, invariant
cũ/mới đạt. Đây là kiểm đối chiếu bổ sung, không cộng 82 thành unit test
hoặc coi là bằng chứng thực thi Counter ba link.

Tám probe A/B/tổ hợp owner Counter vẫn chặn link 3 trước trừ LP/lật
Seven Tools, không discovery action mới, rồi resolve Chain hai link cũ.
Không đổi review Seven Tools, manifest hoặc dữ liệu để mở tính năng sớm.

```sh
npx vitest run tools/spell-resolution-frame.test.ts
npm run validate:platform
```

## Bằng chứng và phần tiếp theo

Linux của source 8e849f27eab5fb4fee9000b76e9c96c00e4c0615 đạt 1325/1325
test trong 47 file, 72/72 bước và 62 browser report, Chromium 154.0.8037.57,
runtimeExceptions=0. Đã đọc report cùng tests/data/capabilities log tại
artifacts/platform-validation/2026-10-30T08-39-18-865Z-225212/report.json.
Không thêm browser mode cho field riêng phía server; các mode Fissure,
Smashing Ground, Hammer Shot, cleanup Trap và các hồi quy hiện có đạt.
Đã xác minh đủ 67 test mới và mỗi bước browser có đúng một report khớp
host/version; không dùng số bước cấu hình thay số bước thực sự đạt.

Toàn capabilities JSON bằng mốc trước: 112 supported/95 quái thường/
17 hiệu ứng/13 scope/19 snapshot. Report này không chứa hash registry;
registry revision đã đổi do tăng contract version, không suy rằng hash
vẫn cũ từ JSON bằng nhau. Hai trận tự nhiên vẫn seed 08: 16 lượt/339
lệnh/B thắng LP 0/4200 và seed 5e: 11 lượt/239 lệnh/B thắng LP 0/8000,
không sửa state khi chơi. Hai trận đó không dùng hai Counter; bằng chứng
Counter thuộc các mode có kiểm soát và unit/adapter.

Windows và Ubuntu CI đều đạt tại
[run 41027892018](https://github.com/xuanthao260604-sys/idc/actions/runs/41027892018),
đúng source 8e849f27eab5fb4fee9000b76e9c96c00e4c0615. Đã tải và đọc
artifact windows-validation-41027892018-1 cùng từng log tại
artifacts/ci-paused-spell-frame/2026-10-30T08-39-41-955Z-6084/report.json:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62.
Windows đạt 1325/1325 test trong 47 file, đủ 67 ca mới, 72/72 bước và
62/62 browser report, runtimeExceptions=0. Đã kiểm từng report khớp
host/version, đầy đủ các mode hồi quy; capabilities JSON và kết quả hai
trận tự nhiên bằng Linux và mốc trước. Report vẫn ghi
windows11DesktopVerified=false; không nhận đây là chạy trực tiếp desktop.

302/306 file đầu vào/mã sản phẩm cũ giữ nguyên byte. Bốn file cũ đổi là
duel.ts, registry.ts, chain-cleanup.ts và protocol/duel.ts; thêm hai
module server cùng test. Không đổi dữ liệu raw/generated/review/format,
manifest, package/lockfile, UI/artwork, starter hoặc saved deck.

Tiếp theo: biến thể frame giữ Magic Jammer đã bị phủ nhận/phá, Seven
Tools đã xử lý nhưng còn chờ cleanup, và Phép gốc còn hiệu lực; kiểm
journal chi phí lịch sử, nguồn đang ở Mộ/sân, tiếp tục lựa chọn root,
cleanup nhiều nguồn và terminal. Sau đó mới nối review phiên bản mới,
gate activation/discovery và kiểm thử đầy đủ để mở chuỗi ba liên kết.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
