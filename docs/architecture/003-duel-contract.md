# ADR 003 — Hợp đồng trận đấu cho engine và server

Trạng thái: hợp đồng thiết kế Giai đoạn 2. Từ Giai đoạn 4A đã có reducer vanilla ở packages/engine;
đã có hiệu ứng pilot theo scope, mixed smoke và PlayerView phía thư viện. Server/session/dedup còn chưa có.
Xem docs/engine/player-view.md và docs/engine/mixed-duel-smoke.md.
Các yêu cầu session/dedup/reconnect dưới đây còn là thiết kế cho Giai đoạn 6.
Kiểu dữ liệu: packages/protocol/src/duel.ts và commands.ts.

## Trạng thái chính thức

- DuelState chỉ ở server: hai người, format ID/revision và card registry revision cố định suốt trận.
- Mỗi bản sao bài có instance ID; định nghĩa bài có ID/revision riêng.
- owner không đổi khi control thay đổi; lưu summonedBy độc lập để xét đổi tư thế kiểu Goat.
- Deck top ở index 0. Monster/Spell-Trap mỗi bên đúng 5 slot, Field riêng.
- Trap monster dùng location đặc biệt và giữ đồng thời hai slot; không tạo hai instance bài.
- Sau mỗi command thành công phải kiểm tra invariants: không mất/nhân bản instance, vị trí và index
  thống nhất, owner/controller hợp lệ, không truy cập định nghĩa chưa được hỗ trợ.
- Event có sequence và simultaneousGroup; lưu sự kiện cost/tribute trước summon, snapshot khi Trigger
  phát sinh, last relevant events và Trigger đang chờ. Không gộp các sự kiện nối tiếp thành đồng thời.
- ChainLink tách activationNegated và effectNegated, source snapshot, target refs và cost events.
- Modifier tách printed stats, dependency vào source và hiệu lực sau resolution; expiry không chỉ là
  số lượt mơ hồ mà gồm lượt/phase/boundary. Không xóa mọi hiệu ứng khi source rời sân.
- Battle có 6 damage timing, quota Chain thông thường và replay riêng.

## Commands và tính nguyên tử

Client chỉ gửi intent + commandId + expectedStateVersion. Session xác định playerId.
Không chấp nhận damage, winner hay resulting state do client tính.
Core vanilla đã có runtime validator cho request nội bộ và kiểm tra state invariants.
Các interface TypeScript không tự kiểm tra input mạng; khi triển khai server phải bổ sung validator
transport/session/handle, không ép kiểu JSON trực tiếp và không tin actorId do client gửi.

Trước activation: xác minh quyền, window, condition, khả năng trả cost và target theo ruling.
Các bước chọn cost/target dùng pendingDecision: server cấp option ID, ràng buộc đúng người/cửa sổ,
khóa hành động xung đột; chỉ khi chọn hợp lệ mới commit activation/cost/target nguyên tử.
Chi phí hợp lệ đã commit không hoàn khi bị negate. Lựa chọn trong resolution có thể tạo decision
mới nhưng không mở response Chain chen ngang resolution.

Cache outcome theo duel/player/commandId và hash payload. Gửi lại cùng command trả outcome cũ;
cùng ID mà payload khác phải bị từ chối. Command version cũ bị từ chối, không replay lên snapshot mới.
Nên xử lý command tuần tự từng phòng. RNG nằm ở server, ghi replay nội bộ đủ tái hiện nhưng không
lộ seed hoặc thứ tự deck trong player view. Chỉ RNG dành cho test mới dùng seed cố định công khai.

## PlayerView và reconnect

Không serialize DuelState thẳng cho client. PlayerView là allowlist rõ ràng:
selfHand; opponentHandCount; số lượng Deck/Fusion Deck; các slot đã lọc visibility;
Mộ và banished theo chính sách hiển thị; decision chỉ gửi người được quyền trả lời.
Bài úp của chính mình có thể hiện định nghĩa cho chủ; bài úp đối thủ không có definition/passcode,
handler, counter bí mật, target choices hoặc internal instance ID.

Handle do server cấp, không dùng hash của card ID. Khi hide/shuffle phải tránh liên kết handle cũ
để đoán bài kín. Log server đầy đủ tách log public; replay đầy đủ chỉ công bố theo chính sách sau trận.
Hiệu ứng yêu cầu reveal có cửa sổ/khán giả riêng, không đổi vùng kín thành public vĩnh viễn.
Reconnect xác thực lại session, tạo PlayerView mới tại version hiện tại; không gửi raw event log.

## Ranh giới bản đầu

Single duel, nhóm bài nhỏ đã xác minh, không AI hoặc match/side decking.
Fusion/Ritual, Trap Monster/Union và hiệu ứng nâng cao chỉ vào pool chơi được khi schema/handler/test
đã đủ; hợp đồng dữ liệu chừa chỗ cho chúng, chưa tuyên bố hỗ trợ gameplay.
Nguồn luật mô tả đầy đủ hơn pool pilot. Giai đoạn 3 chọn bài dựa trên khả năng triển khai có kiểm thử.

## Ca kiểm thử bắt buộc về sau — CHƯA CHẠY

- Hai client không đọc được tay/deck/định nghĩa bài úp của nhau.
- Gửi trùng command không trả cost hoặc bốc bài hai lần.
- Stale version và command sai người bị từ chối mà không đổi state.
- Reconnect nhận cùng version/góc nhìn đúng quyền; không lộ deck/RNG.
- Trap monster chiếm hai slot nhưng chỉ có một instance.
- Trigger giữ snapshot source đúng thời điểm và không phụ thuộc object đã bị mutate.

## Bổ sung hợp đồng từ Giai đoạn 4A

DuelState có eventSequence cho event order; timing có action-response và requestedPhase để
chờ phản hồi trước chuyển phase. Core dùng snapshot clone/freeze và pin registry revision.
Chưa có event-log persistence. PlayerView và effect handlers pilot đã có ở các bước tiếp theo,
với scope trong docs/engine; không coi là engine mọi luật.

## Cập nhật kiểm thử PlayerView

Projection phía thư viện đã được kiểm thử 10 ca, gồm che tay/deck/bài úp/RNG, mã tạm theo viewer/version
và lựa chọn đúng người. Checklist hai client/reconnect/session/dedup ở trên vẫn chưa chạy trên network.

## Cập nhật adapter lệnh

Đã có strict input validation, handle mapping và dedup trong một adapter bộ nhớ, kiểm thử 15 ca.
Xem docs/engine/command-adapter.md. Các yêu cầu network/session/persistence ở trên còn chưa có.
