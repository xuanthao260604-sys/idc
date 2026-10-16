# Adapter lệnh bằng mã tạm

`createCommandAdapter(registry, initialState, receiptLimit?)` nằm ở packages/engine/src/command-adapter.ts.
Đây là thư viện đồng bộ trong bộ nhớ, chưa phải HTTP/Socket server hoặc xác thực session.
Mỗi trận giữ đúng một adapter, không tạo lại theo từng request.

## API phía server

- `getView(actorId)`: lấy PlayerView hiện tại. Giữ nguyên bộ handle khi chưa có action thành công.
- `refreshView(actorId)`: quay vòng handle của riêng người đó khi reconnect đã được xác thực bên ngoài.
- `submit(actorId, input)`: parse command, đổi handle thành internal intent, gọi applyAction,
  trả receipt chỉ gồm accepted/commandId/stateVersion/reason.

actorId do session/server tin cậy cung cấp, không nằm trong command người chơi.
Không có API trả DuelState, map handle hoặc raw event log cho client.
State được clone/freeze khi khởi tạo; các lệnh submit xử lý đồng bộ tuần tự trong một adapter.
Sau action thành công, xóa cả hai projection để lần getView kế tiếp tạo handle ở version mới.
Action bị từ chối không đổi state, version hoặc projection.

## Contract lệnh

Command strict gồm commandId, duelId, expectedStateVersion, action.
Mã/ID chuỗi tối đa 128 ký tự; tribute tối đa 5, decision options tối đa 80 (giới hạn kỹ thuật pilot).
Từ chối trường lạ ở mọi cấp; không cho gửi actorId, damage, winner hay state.

Protocol commands.ts thay placeholder `activate` chưa dùng bằng activate-spell (kèm slot)
và activate-trap (kèm targetHandle), phù hợp capability hiện tại. Không nhận effect handler ID/code.
set-spell-trap ánh xạ theo kind của bài đã resolve; Field zone hiện bị từ chối.
Target direct dùng giá trị dành riêng `direct`. Decision dùng các token từ PlayerView đúng người.

Biết handle không đồng nghĩa có quyền thao tác: engine tiếp tục kiểm tra owner/controller,
phase, priority, quota, target, cost và decision. Thông báo từ chối chỉ trả reason cố định,
không trả exception hoặc mô tả chứa dữ liệu riêng.

## Chống xử lý trùng

Receipt cache theo participant và commandId, so sánh payload sau strict parsing.
Gửi lại cùng lệnh trả receipt gốc kể cả khi state đã tiến thêm hoặc sau khi effect resolve;
không gọi lại engine. Cùng ID nhưng nội dung khác trả command-conflict.
Hai người có thể dùng cùng ID riêng. Cached rejection cũng giữ nguyên kết quả.

Cache mặc định tối đa 10000 receipt/trận; đầy thì từ chối lệnh mới bằng command-capacity,
không tự xóa receipt cũ rồi khiến retry có thể chạy lại. Receipt cũ vẫn truy xuất được.
Đây là giới hạn bộ nhớ cho pilot, chưa phải chính sách vận hành server lâu dài.
Dedup mất khi process/adapter bị tạo lại; chưa có persistence hoặc bảo đảm exactly-once qua restart.
Không khẳng định cache này thay cho session authentication, room routing hoặc chống spam mạng.

## Kiểm thử

15 test mới kiểm tra hai view tiến cùng version, summon qua handle, retry sau action sau đó,
JSON key order, ID trùng payload khác, ID theo người, stale/wrong duel, bốn dạng field injection,
cross-view/raw/stale handle, participant sai, handle không cấp quyền điều khiển quái đối thủ,
FLIP target úp/decision đúng người, cache capacity, Pot retry không draw hai lần,
Set Trap rồi đổi lượt thật và dùng Trap Hole qua handle.

Các scenario đầu vào đặc biệt được ghi rõ là fixture; sau khi adapter được tạo chỉ dùng submit/getView.
Đây là kiểm thử thư viện hai góc nhìn, chưa phải hai client qua mạng.
Tổng 221/221 test đạt trên Linux; typecheck/build, cards:check và mixed smoke đạt.
Dữ liệu bài gốc không thay đổi. Những giới hạn luật của pilot tiếp tục giữ nguyên.

Bước tiếp theo: bàn đấu beta dựa trên PlayerView và contract lệnh đã kiểm thử.
Server/session, reconnect qua mạng và triển khai online vẫn thuộc phần sau; không gửi state thô lên UI.

Bổ sung: adapter trả DuelClientView với activity allowlist tối đa 60 entry;
xem docs/beta/turn-guide-and-activity.md. Không trả raw engine events.

Discovery tùy chọn: getView/refreshView(actorId, true) có availableActions theo projection;
xem docs/beta/available-actions.md. Submit luôn kiểm tra lại, không tin hint do client gửi.
