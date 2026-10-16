# ADR 001 — Nền tảng và ranh giới hệ thống

Trạng thái: chấp nhận cho bản nền. Dự án mới, không kế thừa code/dữ liệu dự án khác.

- TypeScript, npm workspaces; Node 24.19.0 và npm 11.9.0 là môi trường đã kiểm tra.
- React/Vite và Node/Socket.IO là lựa chọn cho giai đoạn giao diện/online; chưa cài hoặc triển khai.
- Engine độc lập với giao diện, transport và lưu trữ. Server xác minh mọi command.
- Dữ liệu bài dùng Zod kiểm tra lúc chạy; kiểu TypeScript không đủ để xác thực input.
- SQLite chỉ bổ sung khi có nhu cầu lưu bộ bài/phòng. Chưa có database.
- Không dùng đường dẫn shell Linux trong script npm dùng chung Windows/Linux.
- Checkout cloud đã được cô lập; dùng checkout hiện có, không tạo worktree nếu người dùng không yêu cầu.

## Hợp đồng trạng thái engine dự kiến (chưa triển khai)

DuelState: duelId, formatId + revision, stateVersion, turnNumber, activePlayerId,
phase, players, chain, pendingDecision, RNG state phía server, result.
PlayerState: playerId, LP, orderedDeck, hand, monsterZones[5], spellTrapZones[5],
fieldZone, graveyard, banished, fusionDeck, normalSummonsUsed.
CardInstance: instanceId riêng mỗi bản sao, definitionId + revision, ownerId,
controllerId, zone, position, counters, turn markers, appliedModifiers.

Không dùng definitionId làm instanceId. Fusion Deck là tên lịch sử của vùng bài dung hợp;
chưa hỗ trợ triệu hồi Fusion trong engine bản nhỏ. Bài Ritual/Fusion cần schema bổ sung trước khi nhập.

Command: commandId, duelId, expectedStateVersion, action, payload. Server gắn playerId
bằng session đã xác thực, không tin playerId tự khai trong payload.
Server kiểm tra lượt, quyền, cost, target, timing; command gửi trùng không thực thi hai lần.
Snapshot gửi client là PlayerView đã lọc bí mật, không serialize DuelState trực tiếp.
Deck/tay đối thủ chỉ lộ số lượng; bài úp không lộ definitionId. Visibility của Mộ,
bài bị loại, lựa chọn và replay phải do luật/hiệu ứng quyết định.

## Bài tự tạo — yêu cầu đã lưu, triển khai sau

- Có namespace custom riêng, revision và trạng thái kiểm thử.
- Giao diện tương lai nhận tên, ảnh, sao, thuộc tính, ATK/DEF và loại bài phù hợp.
- Mẫu hiệu ứng có tham số dùng các handler đã được kiểm duyệt.
- Hiệu ứng mới dùng module TypeScript và test, không eval văn bản hoặc chạy code tải lên từ người chơi.
- Người dùng có thể yêu cầu trợ lý viết/hướng dẫn hoàn thiện module.
- Phòng chính thức loại custom; phòng custom cần thống nhất bộ định nghĩa và phiên bản.
- Chưa tạo editor, chưa triển khai effect handler ở bước nền.

## Git

Giữ nhánh work hiện tại, không tự reset/đổi nhánh/push. Commit theo mốc sau kiểm tra.
Đề xuất main ổn định, feat/... theo phần việc. Commit lockfile, không commit secret,
node_modules hay output build. Chưa tạo commit trong lần khởi tạo này.

## Yêu cầu nền tảng đã xác nhận

Windows 11 là đích chạy sản phẩm chính; Linux/cloud chỉ là môi trường phát triển hiện tại.
Không yêu cầu người dùng Linux/WSL. Theo dõi kiểm chứng thực tế và CI riêng tại
docs/platform/windows11.md. Người dùng hiện chưa cần nhận hoặc tự test beta.
