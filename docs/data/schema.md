# Hợp đồng dữ liệu bài v1

Schema thực thi: packages/card-data/src/schema.ts.
Hỗ trợ normal-monster, effect-monster, spell, trap. Fusion/Ritual monster và chỉ số ?
cần mở rộng schema có kiểm thử trước khi nhập các lá tương ứng.

- id ổn định, tách official/custom; revision tăng khi đổi nghĩa dữ liệu.
- passcode là chuỗi 8 chữ số, không dùng số để tránh mất số 0 đầu; không bắt buộc nếu nguồn chưa có.
- sources lưu URL, ngày truy cập, phạm vi và ghi chú. Pilot hiện có 20 lá với nguồn API, trích Konami và bằng chứng bản in; xem pipeline.md và pilot-20.md.
- verification, implementation, testing độc lập; các cờ tự khai không thay cho review/CI.
- legality gắn formatId, evidence và maxCopies; mặc định thao tác nhập phải dùng unverified.
- effects tham chiếu handler condition/cost/target/resolution và parameters có cấu trúc.
  Hiệu ứng ignition/trigger speed 1, quick speed 2; activation Spell/Trap theo subtype.
  Continuous/replacement là passive descriptor, không có spellSpeed/cost/target.
  Passive replacement mô tả quy tắc thay thế; hiệu ứng activated tạo replacement vẫn dùng activated descriptor.
  Các handler ID phải được registry engine đối chiếu trong giai đoạn 4; schema không thực thi chúng.
- text chỉ phục vụ hiển thị. Không parse/eval text thành hiệu ứng tự động.
  textBasis phân biệt current-reference/historical-reviewed/custom; importer hiện chỉ tạo current-reference.
- artwork có trạng thái quyền sử dụng, không tự tải/phân phối ảnh trong bước này.

Giai đoạn 3 đã xây workflow: lưu raw import riêng, normalize, validate theo lô, rồi merge overlay thủ công
đã xác minh; không ghi đè overlay bằng lần fetch mới. Log xung đột, nguồn và revision.
Phân biệt nguồn dữ liệu hiện tại và bằng chứng text/release/ruling lịch sử.
Bản đầu thử nhóm 10–20 lá có nguồn; chỉ mở rộng khi pipeline và kiểm thử phù hợp.

Trạng thái trận đấu và thông điệp: packages/protocol/src/duel.ts và commands.ts.
Đây là interface TypeScript, chưa có runtime validator cho input mạng hoặc server thực thi.
Giai đoạn 6 phải validate input và lọc PlayerView; không tin JSON chỉ vì đã ép kiểu.
