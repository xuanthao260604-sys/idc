# Kiểm thử trận pilot kết hợp qua API

Chạy từ checkout bằng `npm run engine:mixed-smoke`.
Driver nằm ở packages/engine/src/mixed-smoke.ts, CLI ở tools/engine-mixed-smoke.ts.
Đây là công cụ xác thực headless, không phải AI đối thủ, server hoặc giao diện sản phẩm.

## Cách chạy và điều kiện thành công

- Nạp bundle 20 lá và đủ hồ sơ Phép/FLIP/Trap; mọi review conflict vẫn chặn registry.
- Tạo deck hợp lệ 40 lá chứa cả 20 definitions, tôn trọng copy limit, gồm Pot of Greed tối đa 1.
- createDuel shuffle/deal theo seed kiểm thử cố định. Sau đó chỉ gửi applyAction, không sửa tay
  deck order, phase, LP, markers, location hoặc các snapshot trong trận; không dùng concession.
- Driver ưu tiên dùng Phép hợp lệ, Set Trap, Set/Flip effect monster, summon/tribute và attack.
  Chọn target theo option engine trả và trạng thái công khai; không đọc tay/deck đối thủ
  hoặc ATK/DEF của quái úp đối thủ để quyết định tấn công.
- Quyết định bắt buộc, priority, summon responses, Trap, Chain/pass và chuyển phase đều qua API.
- Giới hạn command/turn khiến vòng lặp bị kẹt thất bại rõ ràng. Action bị từ chối làm smoke thất bại.
- CLI chỉ đạt nếu kết thúc trận, kích hoạt đủ 5 definitions có effect, có return-to-hand,
  destruction và battle damage. Không hạ điều kiện để seed đầu tiên đạt.

Seed CLI là số 8 dạng hex 64 ký tự, được chọn sau khi thử các seed kiểm thử để đạt coverage.
Seed này không dùng cho trận người chơi. Không thay đổi RNG của engine hoặc can thiệp state để
bảo đảm rút được một lá cụ thể.

## Kết quả quan sát trên Linux

| Chỉ số | Kết quả |
|---|---:|
| Deck mỗi bên | 40 lá, 20 loại |
| Turn | 16 |
| Command được chấp nhận | 339 |
| Draw event | 28 |
| Kích hoạt Phép | 2 |
| Kích hoạt FLIP | 3 |
| Kích hoạt Trap | 1 |
| Return-to-hand | 2 |
| Effect destruction | 3 |
| Battle damage event | 12 |

Pot of Greed, Fissure, Hane-Hane, Man-Eater Bug và Trap Hole đều được kích hoạt.
Bên b thắng bằng life-points; LP cuối [0, 4200]. Đây không phải bằng chứng cả 20 loại đều được summon
hoặc mọi tương tác hiệu ứng đều đã xảy ra.

3 test mới:

1. Trận hoàn chỉnh seed 3 với các nhóm effect và conservation 80 instances.
2. Trận hoàn chỉnh seed 8, thêm điều kiện đủ cả 5 effect definitions.
3. Chạy seed 8 hai lần: final snapshot, report và toàn bộ event trace bằng nhau.

Mỗi trận kiểm tra stateVersion khớp số command, invariant cuối trận, snapshot frozen,
không còn Chain/trigger/decision và không thắng bằng concession. Test scenario biên trước đây
vẫn giữ riêng; các trận mới không dựng lại state giữa chừng.

Tổng hiện tại 196/196 test đạt; typecheck/build, cards:check, engine:mixed-smoke và vanilla smoke đạt.
Không cần network hoặc tải lại card data để chạy các lệnh này.

## Giới hạn và phần tiếp theo

Bộ smoke chứng minh các nhóm bài hiện có có thể cùng chạy trong trận, không thay thế kiểm thử
boundary/ruling. Chưa hỗ trợ mixed responder Chain tổng quát, negate, SEGOC tổng quát,
Special Summon, modifier/immunity/replacement hoặc mọi ngoại lệ. Chưa kiểm thử Windows thực tế.

Giai đoạn 4 tổng thể vẫn đang thực hiện. Bước tiếp theo là củng cố contract trạng thái/sự kiện
và player view để không lộ tay/deck/RNG, rồi xác định phạm vi bàn đấu beta. Không gửi DuelState
thô lên trình duyệt. Các giới hạn chi tiết nằm trong reviewed-spells.md, reviewed-flips.md,
reviewed-trap.md; dữ liệu import và capability engine tiếp tục được báo riêng.
