# Kiểm thử 5 hiệu ứng bằng giao diện Chromium

Có lệnh hồi quy tùy chọn:

```sh
npm run beta:browser-smoke
```

Cần Chromium được cài sẵn và gọi bằng `chromium`, hoặc đặt YGO_CHROMIUM thành đường dẫn executable.
Không cần Chromium để chơi beta hoặc chạy npm test. Script không cài thêm package, không tải browser,
không cần service chạy sẵn. Nó build, mở server loopback ở port ngẫu nhiên, mở Chromium headless,
kiểm thử rồi đóng browser/server và xóa profile tạm. Chỉ đã thực thi trên Linux hiện tại.

Script tools/beta-browser-smoke.mjs dùng Chrome DevTools Protocol và thao tác mouse thực qua
Input.dispatchMouseEvent; chọn trong hộp thoại bằng DOM form control. Không gọi command(),
applyAction hoặc endpoint thay state từ browser để giả thao tác người dùng.

## Điều kiện đầu vào và phạm vi

Trước khi start server, script tạo deck40 từ catalog thật, tôn trọng copy limit, rồi dựng scenario
bằng cách di chuyển các instance thật tới hand/zone hợp lệ. State được assert invariants.
Server nhận fixture qua tham số constructor tin cậy, không qua HTTP; CLI beta bình thường không
có chế độ sửa state, seed hoặc endpoint fixture. Reset vẫn tạo trận mới bình thường.
Sau khi server bắt đầu, mọi diễn biến đều qua controls → HTTP → command adapter → engine.

Đây là scenario tích hợp kiểm thử, **không** phải trận tự nhiên từ bốc tay đầu hoặc game đã hoàn tất.
Full mixed duel qua API vẫn được kiểm thử riêng. Không nhập các fixture vào card-data/generated.

## Những gì được xác nhận

- Khi nhìn từ A, sân úp đối thủ không chứa tên Hane-Hane, Man-Eater Bug hoặc Trap Hole.
- Pot of Greed kích hoạt qua hộp thoại, hai phía pass, hand tăng đúng net +1.
- Trong post-chain response, nút Main bị khóa cho tới khi cả hai nhường quyền.
- Fissure phá Mystical Elf ngửa; bỏ qua hai FLIP monster đang úp.
- Normal Summon Battle Ox bằng hộp thoại; đối thủ chờ priority rồi dùng Trap Hole qua hộp chọn target.
  Battle Ox xuống Mộ; Trap được cleanup.
- Request Battle và cho đối thủ pass; La Jinn đánh Hane-Hane úp. Sau calculation,
  B chọn La Jinn, Hane trả nó về tay, rồi Hane xuống Mộ do battle.
- Celtic Guardian đánh Man-Eater Bug úp; B chọn Celtic Guardian, Bug phá nó rồi xuống Mộ do battle.
- Target decision hiển thị tên người chơi, loại zone và số ô; choice đơn dùng radio.
- Không có JavaScript runtime exception trong luồng thành công; thao tác thất bại khiến script trả exit khác 0.

## Cải thiện UI đi kèm

Nhãn cũ “Bài úp · 1” không đủ xác định vị trí, nay có dạng
“Người chơi B · Quái ô 2 — Bài úp”, vẫn không lộ danh tính.
Nút Main và tấn công khóa khi sai turn/phase/window hoặc đang quyết định; Trap có điều kiện
priority/window riêng. Đây chỉ là gợi ý dựa trên thông tin công khai; engine vẫn xác minh
Set turn, ATK, quota, tribute, target và các điều kiện đầy đủ trong scope.
Các nút hành động khóa trong lúc đang gửi lệnh. Không thay luật hoặc hiệu ứng để làm UI test qua.

225/225 test thư viện/HTTP vẫn đạt, cùng typecheck, build, cards:check và syntax check app.js.
Browser regression là phép kiểm riêng, không cộng 5 luồng vào số test Vitest.

Đã bổ sung [trận tự nhiên hoàn chỉnh](browser-natural-duel.md) với lệnh beta:browser-duel;
scenario effect ở tài liệu này vẫn là phép kiểm biên riêng.

Browser discovery hiện tự tìm Edge/Chrome trên Windows; không bắt buộc tên executable chromium.
Xem docs/platform/windows-browser-checks.md; chưa có kết quả Windows thực tế.
