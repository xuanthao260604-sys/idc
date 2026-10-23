# Kiểm thử giao diện bằng trình duyệt trên Windows

> Mốc hiện hành: [hiển thị giao chiến](../beta/battle-cues.md), catalog 108; [run 39965022546](https://github.com/xuanthao260604-sys/idc/actions/runs/39965022546), commit 82f8f92.
> Windows/Ubuntu đạt; Windows: 726/726 test, 31/31 bước, 21 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-39965022546-1: attacker/target, tấn công trực tiếp, đổi góc nhìn và giữ kín bài úp đạt. Windows 11 desktop chưa chạy.

> Mốc trước: [phím tắt sửa deck](../beta/deck-history-shortcuts.md), catalog 108; [run 39962411614](https://github.com/xuanthao260604-sys/idc/actions/runs/39962411614), commit 1c17ecd.
> Windows/Ubuntu đạt; Windows: 726/726 test, 31/31 bước, 21 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-39962411614-1: Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z đúng, ô tìm kiếm giữ undo/redo văn bản gốc. Windows 11 desktop chưa chạy.

> Mốc trước: [Hoàn tác/Làm lại deck](../beta/deck-undo-redo.md), catalog 108; [run 39959852093](https://github.com/xuanthao260604-sys/idc/actions/runs/39959852093), commit 9a4e510.
> Windows/Ubuntu đạt; Windows: 726/726 test, 31/31 bước, 21 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-39959852093-1: lịch sử 50 bước, default/import undo-redo, lỗi giữ lịch sử và mở lại reset đạt. Windows 11 desktop chưa chạy.

> Mốc trước: [giữ vị trí bàn phím khi sửa deck](../beta/deck-keyboard-focus.md), catalog 108; [run 39958158114](https://github.com/xuanthao260604-sys/idc/actions/runs/39958158114), commit 2799108.
> Windows/Ubuntu đạt; Windows: 726/726 test, 31/31 bước, 21 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-39958158114-1: Enter/Space/Tab giữ focus, đạt giới hạn/bỏ hàng/danh sách trống có vị trí tiếp tục phù hợp. Windows 11 desktop chưa chạy.

> Mốc trước: [sắp xếp danh sách deck](../beta/deck-sorting.md), catalog 108; [run 39956787294](https://github.com/xuanthao260604-sys/idc/actions/runs/39956787294), commit 7b9da24.
> Windows/Ubuntu đạt; Windows: 726/726 test, 31/31 bước, 21 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-39956787294-1: năm chế độ sắp xếp kết hợp bộ lọc đạt, không đổi thứ tự bản nháp/deck. Windows 11 desktop chưa chạy.

> Mốc trước: [thống kê và lọc deck](../beta/deck-overview.md), catalog 108; [run 39954467903](https://github.com/xuanthao260604-sys/idc/actions/runs/39954467903), commit da4e3ed.
> Windows/Ubuntu đạt; Windows: 726/726 test, 31/31 bước, 21 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-39954467903-1: bộ lọc có-trong-deck, thống kê bản sao, thêm/bớt/khôi phục và bố cục 1440/390 đạt; không đổi engine/dữ liệu. Windows 11 desktop chưa chạy.

> Mốc trước: [rà soát tương tác Earthquake](../engine/earthquake-interaction-audit.md), catalog 108; [run 39953358379](https://github.com/xuanthao260604-sys/idc/actions/runs/39953358379), commit 909c2bc.
> Windows/Ubuntu đạt; Windows: 726/726 test, 30/30 bước, 20 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Thêm 14 test tương tác phá quái/đổi tư thế/chiến đấu cho A/B; không đổi engine hoặc dữ liệu. Đã đọc artifact windows-validation-39953358379-1; Windows 11 desktop chưa chạy.

> Mốc trước: [Earthquake](../engine/earthquake.md), catalog 108; [run 39949979799](https://github.com/xuanthao260604-sys/idc/actions/runs/39949979799), commit af56b17.
> Windows/Ubuntu đạt; Windows: 712/712 test, 30/30 bước, 20 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-39949979799-1; đổi tư thế đồng thời hai sân và trận tự nhiên có Earthquake đạt. Dữ liệu/deck cũ giữ nguyên; Windows 11 desktop chưa chạy.

> Mốc trước: [rà soát tương tác đổi tư thế](../engine/position-interaction-audit.md), catalog 107; [run 39929849389](https://github.com/xuanthao260604-sys/idc/actions/runs/39929849389), commit 9c03e1b.
> Windows/Ubuntu đạt; Windows: 686/686 test, 29/29 bước, 19 browser report với Edge 154.0.4258.62, runtimeExceptions=0.
> Thêm 10 test Block Attack với Hammer Shot/Fissure/Smashing Ground; không đổi engine hoặc dữ liệu. Windows 11 desktop chưa chạy.

> Mốc trước: [Block Attack](../engine/block-attack.md), catalog 107; [run 39893924635](https://github.com/xuanthao260604-sys/idc/actions/runs/39893924635), commit 519693f.
> Windows/Ubuntu đạt; Windows: 676/676 test, 29/29 bước, 19 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Hiệu ứng đổi tư thế và trận tự nhiên có lá mới đạt; dữ liệu/deck cũ bảo toàn. Windows 11 desktop chưa chạy.

> Mốc trước: [xem trước quái hiến tế](../beta/tribute-previews.md), catalog 106; [run 39889656197](https://github.com/xuanthao260604-sys/idc/actions/runs/39889656197), commit f000669.
> Windows/Ubuntu đạt; Windows: 644/644 test, 28/28 bước, 18 browser report với Edge 154.0.4258.62, runtimeExceptions=0.
> Set cần 1 hiến tế/hủy và Gaia cần 2 hiến tế đạt; bỏ tích cập nhật preview, quái úp giữ riêng theo viewer. Windows 11 desktop chưa chạy.

> Mốc trước: [giữ lựa chọn khi lỗi mạng](../beta/decision-retry.md), catalog 106; [run 39887932439](https://github.com/xuanthao260604-sys/idc/actions/runs/39887932439), commit 0571823.
> Windows/Ubuntu đạt; Windows: 644/644 test, 28/28 bước, 18 browser report với Edge 154.0.4258.62, runtimeExceptions=0.
> Checkbox/radio giữ nháp khi offline; đổi seat xóa nháp, mất phản hồi không bỏ bài lần hai. Windows 11 desktop chưa chạy.

> Mốc trước: [đọc bài trong lựa chọn bắt buộc](../beta/decision-previews.md), catalog 106; [run 39793189856](https://github.com/xuanthao260604-sys/idc/actions/runs/39793189856), commit ef9b807.
> Windows/Ubuntu đạt; Windows: 644/644 test, 28/28 bước, 18 browser report với Edge 154.0.4258.62, runtimeExceptions=0.
> FLIP/Hammer Shot/discard đọc đúng bài, giữ ô chọn; Escape xóa preview. Windows 11 desktop chưa chạy.

> Mốc trước: [xem trước chi phí/mục tiêu](../beta/choice-previews.md), catalog 106; [run 39791352732](https://github.com/xuanthao260604-sys/idc/actions/runs/39791352732), commit b68f4f1.
> Windows/Ubuntu đều đạt; Windows: 644/644 test, 28/28 bước, 18 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Preview theo PlayerView; đổi cost cập nhật target, chuyển sang bài úp xóa mặt trước cũ. Windows 11 desktop chưa chạy.

> Mốc trước: [gợi ý lá có thao tác](../beta/actionable-cards.md), catalog 106; [run 39789853873](https://github.com/xuanthao260604-sys/idc/actions/runs/39789853873), commit 59a190c.
> Windows/Ubuntu đều đạt; Windows: 644/644 test, 28/28 bước, 18 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Gợi ý theo availableActions, chỉ bài của viewer; Main/Chain/Trap/Battle/FLIP/end được kiểm chứng. Windows 11 desktop chưa chạy.

> Mốc trước: [xuất/nhập file deck](../beta/deck-files.md), catalog 106; [run 39786648331](https://github.com/xuanthao260604-sys/idc/actions/runs/39786648331), commit 2d9b758.
> Windows/Ubuntu đều đạt; Windows: 644/644 test, 28/28 bước, 18 browser report với Edge 154.0.4258.62, runtimeExceptions=0.
> Tải/nhập file thật đạt; nhập lỗi giữ bản nháp, nhập thành công cần Lưu mới áp dụng. Windows 11 desktop chưa chạy.

> Mốc trước: [rà soát tương tác Mộ](../engine/graveyard-interaction-audit.md), catalog 106; [run 39784037637](https://github.com/xuanthao260604-sys/idc/actions/runs/39784037637), commit dfe09fe.
> Windows/Ubuntu đều đạt; Windows: 630/630 test, 28/28 bước, 18 browser report với Edge 154.0.4258.62, runtimeExceptions=0.
> Thêm 10 test tương tác recovery/FLIP/Trap Hole/chi phí; không đổi engine hoặc dữ liệu bài. Windows 11 desktop chưa chạy.

> Mốc trước: [Monster Reincarnation](../engine/monster-reincarnation.md), catalog 106; [run 39781536781](https://github.com/xuanthao260604-sys/idc/actions/runs/39781536781), commit 3504b9b.
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
