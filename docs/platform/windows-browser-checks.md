# Kiểm thử giao diện bằng trình duyệt trên Windows

> Mốc hiện hành: [Monster Reincarnation](../engine/monster-reincarnation.md), catalog 106; [run 39781536781](https://github.com/xuanthao260604-sys/idc/actions/runs/39781536781), commit 3504b9b.
> Windows/Ubuntu đều đạt; Windows: 620/620 test, 28/28 bước, 18 browser report với Edge 154.0.4258.62, không có runtime exception.
> Đủ 106 preview; trả quái cũ/trả quái vừa bỏ làm chi phí và trận tự nhiên đều đạt. Windows 11 desktop chưa chạy.

> Mốc trước: [Tribute to The Doomed](../engine/tribute-doomed.md), catalog 105; [run 39778095511](https://github.com/xuanthao260604-sys/idc/actions/runs/39778095511), commit c4fe6f1.
> Windows/Ubuntu đều đạt; Windows: 579/579 test, 26/26 bước, 16 browser report với Edge 154.0.4258.62, không có runtime exception.
> Đủ 105 preview; ca hủy/trả chi phí/target úp và trận tự nhiên dùng lá mới đều đạt. Windows 11 desktop chưa chạy.

> Mốc trước: [Hammer Shot](../engine/hammer-shot.md), catalog 104; [run 39774628060](https://github.com/xuanthao260604-sys/idc/actions/runs/39774628060), commit 2ebf56f.
> Windows/Ubuntu đều đạt; Windows: 519/519 test, 25/25 bước, 15 browser report với Edge 155.0.4283.62, không có runtime exception.
> Đủ 104 preview; ca hòa ATK giữa hai sân và trận tự nhiên dùng Hammer Shot đều đạt. Windows 11 desktop chưa chạy.

> Mốc trước: [Smashing Ground](../engine/smashing-ground.md), catalog 103; [run 39756279907](https://github.com/xuanthao260604-sys/idc/actions/runs/39756279907), commit 90176b6.
> Windows/Ubuntu đều đạt; Windows: 488/488 test, 24/24 bước, 14 browser report với Edge 155.0.4283.62, không có runtime exception.
> Đủ 103 preview; ca hòa DEF và trận tự nhiên dùng Smashing Ground đều đạt. Windows 11 desktop chưa chạy.

> Mốc trước: [rà soát lệnh LP](../engine/life-point-command-audit.md), [run 39753236857](https://github.com/xuanthao260604-sys/idc/actions/runs/39753236857), commit dc25a98.
> Windows/Ubuntu đều đạt; Windows: 467/467 test, 23/23 bước, 13 browser report với Edge 154.0.4258.62, không có runtime exception.
> Catalog 102 và scope hiệu ứng giữ nguyên; Windows 11 desktop chưa chạy.

> Mốc trước 22/10/2026: [hai Phép thay đổi LP](../engine/life-point-spells.md), catalog 102; [run 39750638222](https://github.com/xuanthao260604-sys/idc/actions/runs/39750638222), commit eb5e7af.
> Windows và Ubuntu đều đạt; Windows: 456/456 test, 23/23 bước, 13 browser run bằng Edge 154.0.4258.62, không có runtime exception.
> Xác nhận hồi LP, sát thương kết thúc trận, 102 preview và trận tự nhiên dùng cả hai lá mới. Windows 11 desktop chưa chạy.

> Mốc trước: [catalog 100](../data/classic-100.md) đạt Windows CI: 423 test, 21 bước, 11 browser run bằng Edge 154.0.4258.62; đủ 100 preview khớp dữ liệu.

> Mốc trước: [catalog 80](../data/classic-80.md) đạt Windows CI: 380 test, 21 bước, 11 browser run bằng Edge 155.0.4283.62; đủ 80 preview khớp dữ liệu.

> Mốc trước: [catalog 70](../data/classic-70.md) đạt Windows CI: 357 test, 21 bước, 11 browser run bằng Edge 154.0.4258.62; đủ 70 preview khớp dữ liệu.

> Mốc trước: [catalog 60](../data/classic-60.md) đạt Windows CI: 334 test, 21 bước, 11 browser run bằng Edge 155.0.4283.62; đủ 60 preview khớp dữ liệu.

> Mốc trước: [ba khung mặt trước](../beta/card-fronts.md) đạt Windows CI, 50 preview khớp loại/sao/chỉ số; 321 test, 21 bước, 11 browser run.

> Mặt sau chung đã đạt Windows CI: [bằng chứng và giới hạn](../beta/card-frames.md), 321 test/21 bước/11 browser run bằng Edge.

> Mốc trước: [catalog 50](../data/classic-50.md) đã đạt 321 test, 21 bước, 11 browser run bằng Edge trên Windows CI.
> Windows 11 desktop chưa chạy. Các mốc bên dưới giữ lại làm lịch sử.

> Cập nhật 16/10/2026: [Windows CI đã đạt](windows-ci-result.md) trên commit 7294e60,
> gồm 267 test và 8 browser run bằng Edge. Windows 11 desktop chưa chạy.
> Các đoạn “chưa chạy CI” bên dưới ghi lịch sử chuẩn bị trước run này.

Windows 11 vẫn là nền tảng sản phẩm chính. Thay đổi này chuẩn bị kiểm thử bằng trình duyệt cài sẵn,
không yêu cầu người dùng nhận beta, cài Linux/WSL, tải Chromium hoặc chạy thử vào lúc này.

## Tìm và khởi động browser

Bộ regression dùng tools/browser-executable.ts. Trên Windows, tự tìm Edge trước, rồi Chrome
trong Program Files (x86), Program Files, LocalAppData và PATH. Xử lý tên biến môi trường không
phân biệt hoa thường. YGO_CHROMIUM vẫn có thể chỉ định executable riêng; override sai gây lỗi,
không âm thầm chuyển sang một browser khác.

Đường dẫn có khoảng trắng/Unicode được truyền nguyên một argument với spawn, không qua shell.
Không ghép chuỗi lệnh hoặc yêu cầu Bash/which trên Windows. Browser test không cài phần mềm.
Linux vẫn tìm Chromium/Chrome theo PATH; nhánh macOS không phải mục tiêu kiểm chứng hiện tại.

Các cờ no-sandbox/disable-dev-shm-usage chỉ dành cho Linux cloud; không truyền vào Windows.
Profile tạm riêng và DevTools chỉ dùng loopback. Khi xong, gửi Browser.close để nhả profile/file
trước khi dọn thư mục; nếu browser không đóng mới dùng kill dự phòng. Không chờ exit vô hạn khi
process không spawn được hoặc đã thoát. Báo cáo ghi platform, browser và version từ CDP thực.

Bộ browser regression cũng đọc tài nguyên theo project root, không theo thư mục terminal.
Đây chỉ là công cụ kiểm thử; người chơi bình thường không cần bật DevTools hay đặt biến browser.

## CI

Windows job chạy validate:platform; report tách từng bước browser sau:

1. beta:browser-smoke: 5 hiệu ứng qua controls trong scenario đã kiểm soát.
2. beta:browser-duel: trận tự nhiên từ chia bài đến LP win, không sửa state trong lúc đấu.
3. beta:browser-setup: tạo/hủy trận, chọn A/B/ngẫu nhiên.
4. beta:browser-discard: chọn đúng số lá, giữ kín quyết định và chuyển lượt.
5. beta:browser-deck-out: Pot với deck còn 0/1/2 lá.
6. beta:browser-concede: hủy/đồng ý đầu hàng, tạo trận mới sau kết thúc.

Không skip hoặc thay bằng test rỗng khi thiếu browser; step thất bại và báo lỗi tìm executable.
Chưa trigger workflow/GitHub run trong phiên này. Cấu hình job không phải bằng chứng Windows CI
đã xanh. Windows runner của GitHub cũng không thay thế kiểm tra Windows 11 desktop trước phát hành.

## Kết quả hiện tại

- 244/244 test thư viện/HTTP đạt trên Linux; thêm 6 test logic tìm browser/đường dẫn/tham số.
- Typecheck, build, cards:check và syntax check đạt.
- Chromium Linux chạy lại cả 5 hiệu ứng và trận tự nhiên; report ghi platform/version thực.
- Full duel vẫn 16 lượt/339 command, 15 attack, 4 decision, B thắng LP [0,4200], đủ 5 effect,
  không có runtime exception.
- Các test tạo candidate đường dẫn Windows chỉ xác minh logic, chưa thực thi Windows filesystem,
  Edge/Chrome Windows hoặc Windows 11. Không gộp chúng vào bằng chứng “đã chạy Windows”.

Chưa đóng gói, phát hành, push hoặc yêu cầu người dùng tự kiểm thử. Tiếp tục phát triển game;
những xác minh Windows chưa có được giữ thành tiêu chí trước bàn giao.

Các số test 244 bên trên ghi mốc chuẩn bị browser Windows ban đầu. Kết quả hiện tại
xem [mốc tổng hợp](../milestones/hotseat-20.md); kế tiếp là windows-verification-next.md.

CI Windows hiện thu report/log qua upload-artifact, giữ 14 ngày và chỉ chạy sau khi
workflow được trigger. Không có run Windows trong phiên này.

Đã bổ sung browser-deck-builder vào validate:platform để kiểm tra editor/lưu A-B/
không sửa trận hiện tại và dùng deck khi reset; xem ../beta/deck-builder.md.

Mục xây deck đã đạt Edge Windows ở [run 38874697590](https://github.com/xuanthao260604-sys/idc/actions/runs/38874697590),
278 test, 19 bước và 9 browser run. Chi tiết ../beta/deck-builder.md.

Đã thêm expanded-catalog và expanded-duel vào cùng bộ validate:platform. Mốc catalog 30
đã đạt 295 test, 21 bước, 11 browser run trên Edge Windows; xem ../data/classic-30.md.
