# Pot of Greed và failed draw — 16/10/2026

Đối chiếu hồ sơ pilot.spell-effects.json và data/evidence/effects/basics.json trước khi
kiểm thử. Nguồn cộng đồng Goat https://www.goatformat.com/basics.html ghi:
“in Goat Format, you can always activate an effect that will deck a player out.”
Không trình bày đây là nguồn UDE gốc; không áp điều kiện kích hoạt hiện đại vào format đã chọn.
Hiệu ứng bốc 2 lấy từ hồ sơ text chính thức, trạng thái historical printed-text vẫn tách riêng.

| Deck trước khi giải quyết Pot | Thực bốc | Kết quả |
| --- | --- | --- |
| 0 | 0 | Người dùng Pot thua vì failed-draw |
| 1 | 1 | Người dùng Pot thua khi cần bốc lá thứ hai |
| 2 | 2 | Deck còn 0 nhưng chưa thua; chưa có lần bốc thất bại |

Không phát hiện lỗi gameplay trong ba nhánh này, không sửa luật/handler hoặc dữ liệu bài.
Bổ sung `npm run beta:browser-deck-out`, chạy riêng cả ba scenario bằng Chromium:
fixture chỉ được dựng trước khi server bắt đầu; activation, pass và chuyển góc nhìn dùng UI.
Không thêm seed/state endpoint vào beta. Kiểm tra số lá trên tay, deck, Pot xuống Mộ và
public draw count chỉ ghi số lá thực bốc. Khi thua, kiểm tra reason, hướng dẫn, Pass/đầu hàng
bị khóa, không còn phase action hoặc availableActions; B cũng nhận cùng kết quả.

Cả ba scenario đạt trên Chromium/Linux, không có runtime exception. Windows CI có bước riêng
nhưng chưa chạy; chưa xác nhận Windows 11 thực tế. Đây là regression test với fixture,
không phải ba trận tự nhiên hoặc bằng chứng hoàn tất toàn bộ luật bốc bài/Chain.
