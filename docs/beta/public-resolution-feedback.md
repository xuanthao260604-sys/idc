# Phản hồi kết quả hiệu ứng và chiến đấu

Bàn đấu hiển thị kết quả công khai sau khi lệnh thực sự được engine chấp nhận:

- Số lá bốc thành công và người được bốc; không gửi tên, mã hoặc thứ tự lá.
- Người nhận sát thương chiến đấu và lượng damage thực tế trong event.
- Số quái bị phá bởi battle/effect, không đếm thêm lần gửi xuống Mộ.
- Số bài trở về tay theo owner, số bài bỏ cuối lượt và quái tribute.

Thông báo hiện ở phần trạng thái và dưới thao tác tương ứng trong lịch sử. Hiệu ứng thường
resolve khi pass, nên không suy người nhận từ actor của lệnh pass. Ghi nhận ngay entry của
version thực sự xử lý; command retry trả receipt cũ, không tạo entry hoặc hiệu ứng mới.

## Ranh giới riêng tư

packages/engine/src/public-resolution.ts đọc allowlist event kinds, tạo object mới chỉ có kind,
count hoặc playerId/amount. PublicActivity.resolution là optional; entry không có kết quả này
vẫn giữ schema thao tác cũ. Không spread event hoặc CardInstance. Không có source/target/card ID,
card name, handler ID, snapshots, decision options, secret metadata hoặc RNG trong tóm tắt.

Return-to-hand lấy owner hợp lệ từ state sau xử lý, không dùng người kích hoạt làm người nhận.
Draw count dựa trên successful draw events, không suy từ text hoặc số lá mà effect định bốc:
ếu bốc được 1 lá rồi failed draw, chỉ ghi bốc 1 lá; kết quả thua vẫn do engine quyết định.
Event không được hỗ trợ hoặc recipient/amount không hợp lệ không được echo ra view.

Các count có thể được gộp trong cùng command để đọc dễ hơn; không tuyên bố các event đã xảy ra
đồng thời. Đây không phải raw event log, replay hoặc cơ chế lưu/khôi phục trận. Scope hiện tại
chỉ có các effect phá quái, chưa dùng nhãn này để hỗ trợ card-destruction tùy ý.

Pure action discovery không gọi đoạn ghi activity này: những lần probe không tạo thông báo.
History vẫn giữ tối đa 60 thao tác, cùng chính sách viewer/handle cũ.

## Kiểm thử

6 unit test mới: draw count và privacy, damage/battle destruction không đếm cleanup hai lần,
return đúng owner, destruction/discard/tribute, invalid/unsupported input, partial draw trước loss.
Test adapter Pot được mở rộng: có đúng một draw summary, retry không đổi history/hand/version.
Tổng 250/250 test thư viện/HTTP đạt trên Linux, cùng typecheck/build/syntax/cards:check.

Chromium regression kiểm tra status thực hiển thị “bốc 2 lá”, effect destruction, Hane return,
Man-Eater Bug destruction và không lộ tên bài trong history. Full natural duel vẫn đạt
16 lượt/339 command, đủ 5 effect, LP [0,4200], có dòng damage trong lịch sử, không runtime exception.
Hai browser checks tính riêng với Vitest. Windows 11 vẫn là nền tảng sản phẩm chính;
Windows CI/desktop thực tế chưa được chạy trong môi trường này.

Không thay card data/ruling để tạo thông báo. Chưa phát hành/gửi beta cho người dùng.
