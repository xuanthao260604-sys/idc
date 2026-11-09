# C2b — Dispatcher LIFO và journal ứng viên

Ngày 09/11/2026, tiếp nối [C2a graph/ledger](bounded-counter-candidate.md)
và [ma trận C1](chain-beta-scope.md). Đã triển khai interpreter thành phần
cho S, S → M → V^n và T^k → V^n. Đây **chưa phải activation live**;
không đổi gate v5, protocol, manifest, review, UI hoặc dispatcher gameplay.

## Xử lý thành phần

`packages/engine/src/bounded-counter-dispatcher.ts` chỉ nhận snapshot ứng
viên đã có nguồn/cost receipt, ở resolving sau hai Passes. Nó gọi validator
C2a, capture ledger khi có Seven, clone input rồi duyệt link từ trên xuống:

- Counter còn hiệu lực phủ nhận activation/phá đúng nguồn link ngay trước;
  nguồn vào Mộ tại bước đó. Link bị phủ nhận được ghi skip và không xử lý.
- M còn hiệu lực phủ nhận S. Nếu M bị phủ nhận, S dùng `planResolution`
  hiện có cho đúng 11 Phép đã pin; không diễn giải text hoặc tạo effect mới.
- Nhiều T được xử lý độc lập. Seven phủ nhận T cuối không phủ nhận T trước;
  T trước vẫn có thể phá cùng quái, các T còn lại no-op khi target đã rời sân.
- Chi phí đã có trong entry không trả lại hoặc thu lần nữa. Root plan có
  draw từng lá/required-draw loss, damage/heal, target/return/position và
  lựa chọn tie đúng handler hiện có. Root target không được là lá chỉ vừa
  bị discard bởi activation M về sau; đó là lịch sử chọn target bất khả thi.

Output là state thành phần và journal riêng. Không có endpoint, command mới
hoặc field journal mới trong DuelState/PlayerView. Trace nội bộ mô tả
resolve/negate/skip/movement, **không phải EngineEvent hoặc lịch sử công khai**.
Clock thành phần phục vụ checkpoint/replay, không thay hợp đồng event/receipt
của adapter. C2c phải nối kernel vào event/state machine thực và giữ baseline.

## Pause, resume và kết thúc

Journal giữ entry clone bất biến, ledger lịch sử, answers, stage/cursor,
trace, survivor set và fingerprint. Các stage là root-choice, cleanup,
done hoặc terminal. Hash không xác thực client. Assert còn chạy lại đầy
đủ transition từ entry và answers, so toàn bộ state/journal, gồm decision,
clock, source/target, LP và owner order; không chỉ tin checksum đã reseal.
Full entry là lựa chọn cho thành phần tham chiếu; chưa cam kết dùng nguyên
định dạng này trong frame gameplay hoặc đưa nó qua network.

Root choice chỉ được đúng người trả lời, giữ đúng option list và xử lý
root một lần. Không mở Chain chen giữa lựa chọn. Resume luôn tính từ entry
đã trả phí, không cộng heal/draw hoặc LP cost lên state đã xử lý lần nữa.
Không freeze input của caller; output có clone/freeze riêng, hỗ trợ JSON
round-trip. Checkpoint đã kết thúc không được nhận answer mới.

Survivor sources được đưa cho primitive cleanup hiện có. Owner chọn đúng
hoán vị của batch mình; nếu cả hai owner cần chọn thì chờ đủ cả hai trước
commit bất kỳ nguồn nào. Retry từ cùng checkpoint tin cậy cho cùng output
thuần; **không phải dịch vụ dedup receipt**. Caller tương lai phải giữ frame
mới nhất và adapter tiếp tục kiểm session/version/commandId/handles.

LP=0 hoặc failed draw kết thúc ngay, không tiếp tục draw/cleanup nhiều
nguồn hay hỏi owner sau trận. Trường hợp S đơn giữ terminal-single-source
cleanup đã có; trường hợp parent nhiều nguồn giữ survivor trên sân theo
chính sách hiện hành. Concede khi đang root-choice/cleanup xóa Chain,
decision/cleanup context, giữ phí và board đã xử lý; không commit batch mới.

## Oracle và bằng chứng kiểm thử

`tools/fixtures/bounded-counter-oracle.ts` là oracle chỉ dùng trong test:
giảm biểu thức bằng cách loại Counter cùng activation bị nó hủy, rồi xử
lý biểu thức còn lại. Không import dispatcher/graph/ledger/board primitives;
không dùng parity làm thuật toán production. Oracle được đối chiếu thứ tự
resolve/negate với trace của candidate, còn board/target kiểm riêng.

542 ca mới trong `tools/bounded-counter-dispatcher.test.ts`:

- 172 phân bổ T-prefix và 276 tổ hợp S/M/owner Seven cho oracle, với tất
  cả độ dài khả thi; cùng quái không bị phá hai lần, source mỗi instance
  vào Mộ đúng một lần, input/LP phí và Mộ cũ được giữ.
- 44 tổ hợp 11 Phép × 1/2/5/6 Seven, đủ nhánh odd/even và chuỗi tám link.
- 22 phép đối chiếu A/B cho hiệu ứng root với resolver S đơn hiện có bằng
  checkpoint tham chiếu riêng. So LP/result, tay/deck, quái/quota, non-source
  cards và Mộ; loại các nguồn Chain khỏi so sánh cleanup vì hai parent khác.
  Đây là kiểm resolver thành phần, không phải kích hoạt Counter thật.
- Tie choice Fissure/Smashing Ground/Hammer Shot, draw từ deck 0/1/2,
  terminal nguồn đơn/nhiều nguồn, hai batch owner, root và cleanup concession.
- LP/source/target/clock/decision/journal drift, reseal vẫn bị phát hiện,
  choice sai người/thiếu/trùng/stale, root target đến từ discard về sau,
  numeric overflow và checkpoint đã kết thúc. JSON round-trip, output bất
  biến, caller không bị freeze và không trả phí/resolve root lần nữa.

Fixtures vẫn là snapshot/receipt synthetic của C2a; không thêm API sửa bàn
đấu hoặc flag test vào beta. Candidate paused state bị invariant gameplay
v5 từ chối. Bộ active v5 chưa mở họ mới hoặc link Counter thứ năm.

## Kiểm chứng

Linux local đạt typecheck, build, cards:check đủ 19 bundle và **4669/4669
test trong 62 file**, gồm 542 ca C2b mới và 524 ca C2a giữ nguyên. Capability
JSON bằng mốc C2a; 320 file cũ trong snapshot data/apps/packages/manifest/
package/lock giữ nguyên byte. Không sửa module C2a, review hoặc gameplay.

Source: `71ba7e2d370bf84f4d68e380bd268778957edeef`.
[CI 42566580506](https://github.com/xuanthao260604-sys/idc/actions/runs/42566580506),
attempt 1, completed/success ở Ubuntu job `128994271757` và Windows job
`128994272061`. Đã đọc log Ubuntu: 4669 test/62 file, đủ 542 ca mới;
typecheck/data/build/vanilla/mixed smoke đều đạt.

Artifact `windows-validation-42566580506-1`, ID `13652621016`, đã tải và
kiểm SHA-256 ZIP bằng metadata GitHub:
`9ab89069661d9d335cb87138cd4d20e4789333188e146b1b764529a95db7c04e`.
Report `2026-11-09T05-19-58-298Z-2368/report.json`: win32/x64,
OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 156.0.4314.58.
Windows đạt **4669/4669 test trong 62 file, 112/112 bước, 102/102 browser
report**, runtimeExceptions=0; windows11DesktopVerified=false.

Đã đọc đủ 112 step log, kiểm mỗi browser step đúng một JSON khớp report
và đúng host/version. So artifact C2a `windows-validation-42563079635-1`:
61 suite cũ giữ nguyên số ca, suite mới đúng 542 ca; facts của 102 browser
report giữ nguyên khi bỏ riêng browserVersion (cả hai run đều Edge
156.0.4314.58), `capabilities.log` giống nguyên byte. Vẫn 112 định nghĩa,
95 quái thường/17 hiệu ứng/13 scope/19 snapshot; dữ liệu nhập 95 verified /
17 historical pending không thay đổi. Không ghép log/report từ run khác.

Không dùng số ca thành phần mới làm bằng chứng activation live. Không chạy
browser Linux lại cho module chưa nối; số browser Linux cũ không được gán
cho source mới. Browser Windows ở đây là hồi quy gameplay v5. Commit chốt
sau CI chỉ sửa tài liệu; bằng chứng code thuộc `71ba7e2`. Windows 11 desktop
chưa chạy, chưa đóng gói hoặc bàn giao beta.

## Điểm dừng và việc tiếp theo

Các ràng buộc bàn giao từ C2b sang C2c:

- Live effect ID của Seven v5 khác ID ứng viên. Phải phân loại prefix bằng
  gate active trước khi chuẩn hóa nội bộ hoặc gọi kernel; không chuyển
  Chain bất kỳ sang ID ứng viên để lách review/activation guard.
- Interpreter ứng viên tự tăng clock và phát trace riêng. Khi tích hợp,
  applyAction/adapter vẫn sở hữu version/receipt và pipeline EngineEvent;
  không chép nguyên output thành transition live rồi tăng version lần nữa.
- Survivor list ứng viên theo thứ tự nguồn ban đầu, còn một số resolver
  cũ đưa options theo thứ tự xử lý. Giữ đúng owner/default option order,
  decision identity và public facts của pattern cũ khi thay phần chung;
  không coi permutation có cùng tập nguồn là UI hồi quy đã tương đương.
- Journal entry đầy đủ chỉ ở server/thành phần; projection cần allowlist,
  không đưa journal/LP receipt/snapshot kín ra PlayerView. Frame cũ và
  candidate API/ID lịch sử tiếp tục tách khỏi frame live.
- Giữ chính sách terminal một nguồn/nhiều nguồn và xóa context khi concede;
  không hỏi cleanup sau trận hoặc hoàn phí để làm snapshot trông gọn hơn.

C2b dừng ở dispatcher/journal **ứng viên**. Mục tiếp theo C2c: tích hợp phần
dùng chung cho các pattern cũ, event/fact mapping, frame lifecycle và adapter
trong khi v5 vẫn chặn pattern mới. C3 mới review/gate/activation/discovery/UI
cho phạm vi mới; C4 mới đóng Chain beta. Sau đó giữ mục tiêu editor giới hạn
và Windows 11 desktop. Chưa đóng gói hoặc bàn giao beta.
