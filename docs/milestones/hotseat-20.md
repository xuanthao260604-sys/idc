# Mốc hotseat nội bộ 20 lá — 16/10/2026

Mục tiêu của mốc: có trận hotseat dùng bộ pilot, thao tác rõ ràng và kiểm chứng được
trong scope hiện tại. Đây không phải hoàn tất Yu-Gi-Oh!, beta bàn giao hoặc xác nhận Windows.

## Phạm vi chốt

- 20 definitions, deck mặc định hợp lệ 40 lá; 15 normal và 5 effect qua hồ sơ review.
- Luồng lượt, summon/tribute/position/battle, hand limit, draw loss và concession.
- Pot/Fissure một link, FLIP bắt buộc một link, Trap Hole với Chain Trap phản hồi
  cùng sự kiện summon. Các scope cụ thể nằm trong docs/engine/reviewed-*.md.
- PlayerView che tay/deck/bài úp đối thủ, mã tạm theo viewer/version; adapter
  kiểm tra lệnh, chống xử lý trùng và không commit action thất bại.
- UI hướng dẫn quyền thao tác, lựa chọn hợp lệ, quyết định bắt buộc, lịch sử công khai,
  xem Mộ với preview, tạo trận mới A/B/ngẫu nhiên và kết quả trận.
- Import giữ dữ liệu cũ khi lỗi. Snapshot nhập: 15 verified, 5 historical printed-text
  pending; trạng thái đó không bị nâng tay theo runtime capability.

## Kiểm chứng tổng hợp

Đã hoàn tất bộ kiểm tra tổng hợp trên Linux/x64, Node 24.19.0,
Chromium Chrome/154.0.8037.57:

| Kiểm tra | Kết quả |
| --- | --- |
| Environment preflight, JS syntax, typecheck, build | Đạt |
| Vitest | 263/263, 18 file, không skip |
| cards:check | 20 imported; snapshot 15 verified/5 pending giữ nguyên |
| engine:capabilities | 20 supported trong scope; không còn unsupported ID khi nạp đủ review |
| Vanilla API smoke | 8 lượt, 150 lệnh, B thắng LP 0/8000 |
| Mixed API smoke | 16 lượt, 339 lệnh, đủ 5 effect, B thắng LP 0/4200 |
| Browser effect + Mộ | Đủ 5 effect; Mộ trống, preview text, thứ tự, chỉ đọc hai phía |
| Browser new game | Hủy giữ trận; A/B/ngẫu nhiên đúng tay 6/5 |
| Browser discard | Tay 8 → bỏ 2 → còn 6 → lượt B; decision riêng và guide đúng |
| Browser Pot | 3 run deck 0/1/2; actual draw count và failed-draw đúng |
| Browser concede | Hủy không đổi trận; đồng ý thua; tạo trận mới sau kết thúc |
| Browser natural full duel | 16 lượt/339 lệnh, 15 attack, 4 decision, đủ 5 effect; LP 0/4200 |

Cả 8 browser run không có runtime exception. Sau bộ tổng hợp, sửa riêng một nhãn cũ
trong engine:capabilities từ “no UI/online” sang giới hạn đúng “no online multiplayer
or persistent matches”; typecheck/build/capability CLI được kiểm tra lại.
Không thay engine, dữ liệu bài hoặc hiệu ứng trong lần chốt này.

**Trạng thái: chốt mốc hoàn thiện hotseat nội bộ trong scope đã nêu.**
Windows CI và Windows 11 desktop chưa chạy; không có kết quả Windows để báo đạt.
Browser regression không cộng vào số test Vitest; các fixture chỉ dựng trước server,
không chỉnh state trong lúc chơi. Full natural duel là bằng chứng riêng.

## Những giới hạn giữ nguyên

Chưa có Chain hỗn hợp/negate/SEGOC tổng quát, replay do hiệu ứng thay sân ở Battle Step,
modifier/immunity/replacement, Special/Fusion/Ritual Summon hoặc toàn bộ card rulings.
Không có artwork chính thức, online/auth, database/lưu trận, deck builder hoặc custom editor.
Không cam kết 20 lá đã đúng mọi tương tác ngoài scope. Các review nguồn cộng đồng
không được mô tả là tài liệu UDE gốc đã xác thực.

## Điểm chuyển mục

Sau khi bộ kiểm tra tổng hợp đạt, chốt mục hoàn thiện hotseat nội bộ trong scope,
chuyển sang [kiểm chứng Windows](../platform/windows-verification-next.md).
Mục Windows chưa hoàn tất: không có Windows runtime trong workspace này.
Không mở thêm tính năng/bài, không phát hành và không yêu cầu người dùng tự test ở mốc này.

Sau mốc hotseat: đã thêm công cụ validate:platform với report/log; tổng test hiện tại
267 (4 test mới cho báo cáo). Kết quả Windows vẫn chưa có; xem tài liệu mục kế tiếp.

Cập nhật: [Windows CI đã đạt](../platform/windows-ci-result.md) trên commit 7294e60,
267 test và 18 bước. Windows 11 desktop vẫn chưa chạy; không đồng nhất hai mốc.
