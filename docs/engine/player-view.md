# Góc nhìn riêng của người chơi

`createPlayerProjection(registry, state, viewerId)` là API **phía server**. Chỉ gửi `.view`
cho trình duyệt; không gửi DuelState, raw event log hoặc registry nội bộ.
viewerId phải lấy từ session đã xác thực, không tin giá trị người chơi tự gửi.
Hiện chưa có HTTP/Socket.IO server, xác thực session hoặc transport command adapter.

## Dữ liệu được phép hiển thị

PlayerView dùng allowlist, không spread CardInstance/PlayerState/DuelState/ChainLink.

- Tay của mình có definition ID/revision và mã tạm; tay đối thủ chỉ có số lượng.
- Deck/Fusion Deck chỉ có số lượng; không có thứ tự hoặc mã từng lá.
- Quái và Spell/Trap ngửa hiện định nghĩa. Bài úp do mình kiểm soát hiện định nghĩa cho mình;
  bài úp đối thủ chỉ có mã tạm và tư thế. Mộ ngửa công khai; bài úp trong zone hỗ trợ vẫn theo
  visibility, không tự lộ định nghĩa vì nằm trong một danh sách.
- Hiện LP, turn/phase, priority/window, Chain source/target qua mã tạm, battle context và kết quả.
- Decision chỉ cho người có quyền chọn, thay cả decision ID và option instance IDs bằng mã tạm.
  Lựa chọn target là quái úp không tự reveal định nghĩa của nó.
- Không có RNG/seed/privateState, raw instance ID, counters/markers nội bộ, last relevant events,
  cost events, Trigger queue hoặc source snapshot. Không expose handler code/IDs.

Các reference Chain/battle/decision nằm ngoài zone có thể hiển thị bị từ chối (fail closed);
chưa hỗ trợ search/reveal decision trong deck, viewer spectator hay cơ chế reveal đặc biệt.
Không tự đổi bài kín thành công khai sau khi trận kết thúc.

## Mã tạm và ánh xạ phía server

Handle là 24 byte ngẫu nhiên crypto, không suy từ ID/định nghĩa. Mỗi lần projection tạo bộ mới
cho đúng viewer và stateVersion, kể cả reconnect ở cùng version. Không giữ handle qua hide/shuffle.
Một card trong cùng view dùng cùng handle cho zone/Chain/decision/battle.

Envelope trả thêm resolveCardHandle và resolveDecision; các map chỉ trong closure phía server.
Resolver kiểm tra viewer, duel ID, stateVersion và registry revision; không nhận handle của view
khác, mã raw hoặc option không thuộc decision. Nó chỉ dịch handle thành intent, không thay state.
applyAction vẫn phải kiểm tra toàn bộ luật/timing/quyền/chi phí/lựa chọn trước khi thực thi.
Biết handle của quái đối thủ không cấp quyền summon/đổi tư thế quái đó.

Adapter tương lai cần giữ projection đang dùng cho session, xử lý command tuần tự, kiểm tra
expectedStateVersion, ánh xạ intent rồi gọi applyAction. Khi state đổi, gửi view mới và thay map cũ.
Client không được dùng handle của snapshot trước để thao tác với snapshot mới. Command dedup,
payload validation, rate limits và reconnect authentication còn chưa triển khai.

Mã tạm đổi thường xuyên là lựa chọn đơn giản cho beta; UI về sau phải dựng lại từ snapshot.
Chúng không thể xóa ký ức của người chơi về lá từng được thấy hoặc giấu thông tin luật công khai
như vị trí/quá trình Set một lá. Không tuyên bố chống mọi suy luận từ lịch sử gameplay.

## Kiểm thử đã chạy

10 test mới: own/opponent hand, kiểm tra không serialize ID/RNG/private fields,
own/opponent Set monster và Trap, face-up/grave, invalid viewer/cross-view/cross-version handles,
đổi hidden identity/deck order không đổi nội dung quan sát sau khi bỏ token ngẫu nhiên,
decision chỉ đúng người/ánh xạ option, target bài úp, không mutate state,
projection hai bên sau full mixed duel, Chain hiển thị không chứa source snapshot/link ID nội bộ.

Tổng 206/206 test đạt trên Linux; typecheck/build, cards:check và mixed smoke đạt.
Các test projection là unit/integration phía thư viện; chưa phải kiểm thử hai trình duyệt hoặc network.
Dữ liệu bài gốc và status import được giữ nguyên.

Đã bổ sung [adapter lệnh](command-adapter.md), có strict validation và dedup trong bộ nhớ.
Tiếp theo là bàn đấu beta; online/session/reconnect qua mạng chưa hoàn thành.

Khi có pending decision, priorityPlayer công khai là null (quyền phản hồi tạm dừng).
Không dùng priority nội bộ còn lưu trong phase để hướng dẫn đối thủ Pass. Nội dung
decision vẫn chỉ có ở view của người phải trả lời; xem ../beta/end-turn-discard.md.
