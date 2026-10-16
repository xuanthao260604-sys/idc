# YGO Classic Duel

Game đấu bài hai người theo Goat Format Bắc Mỹ: cutoff 17/8/2005, banlist TCG tháng 4/2005.
**Windows 11 là nền tảng sản phẩm chính.** Cloud/Linux dùng phát triển và kiểm thử;
chưa xác nhận chạy Windows 11 thực tế. Chưa đóng gói hoặc bàn giao beta.

## Tiến độ hiện tại

Đã có bàn đấu hotseat hai người thay phiên cùng máy, dùng deck hợp lệ 40 lá chứa 20 loại.
Core hỗ trợ 15 quái thường; 5 hiệu ứng Pot of Greed, Fissure, Trap Hole, Hane-Hane và
Man-Eater Bug được mở bằng hồ sơ review và kiểm thử trong scope giới hạn.

Mục đang chốt: [hoàn thiện hotseat nội bộ 20 lá](docs/milestones/hotseat-20.md).
Mục kế tiếp: [kiểm chứng Windows](docs/platform/windows-verification-next.md).
Không coi việc cấu hình CI Windows hoặc chạy Linux là đã kiểm chứng Windows.

267/267 test thư viện/pipeline/HTTP/công cụ đạt trên Linux, gồm 9 HTTP integration test.
Browser regression tính riêng: 5 hiệu ứng, xem Mộ, tạo trận A/B/ngẫu nhiên, bỏ bài,
Pot với deck 0/1/2 lá, đầu hàng/hủy và tạo trận sau kết thúc, trận tự nhiên đầy đủ.
Kết quả tổng hợp và giới hạn tại tài liệu mốc; đây không phải game hoàn tất mọi luật Yu-Gi-Oh!.

## Chạy và phát triển

Node 24.19.0, npm 11.9.0 là phiên bản đã kiểm tra. Lệnh npm dùng chung Windows/Linux,
không yêu cầu Bash/WSL. Không cần secret/database. Cache ở .npm-cache trong checkout.

```sh
npm run environment:check
npm ci
npm run typecheck
npm test
npm run cards:check
npm run engine:capabilities
npm run engine:mixed-smoke
```

Bàn đấu nội bộ chạy bằng `npm run beta`, server chỉ nghe loopback. Trên máy chạy ứng dụng,
mở địa chỉ terminal in ra bằng trình duyệt. Không có preview cloud công khai.
Hướng dẫn: [bàn đấu](docs/beta/local-board.md), [Windows 11](docs/platform/windows11.md).
Người dùng chưa cần nhận beta hoặc tự kiểm thử ở thời điểm này.

## Phạm vi và dữ liệu

[Pipeline nhập](docs/data/pipeline.md) bảo vệ dữ liệu cũ khi nhập lại lỗi, giữ raw/evidence/overlay
riêng. [Pilot 20 lá](docs/data/pilot-20.md) có snapshot 15 verified và 5 historical printed-text
pending. Các số implemented/tested/playable=0 trong snapshot nhập là metadata lần nhập,
không phải runtime capability. Không sửa bundle tay để nâng trạng thái.
`cards:import` nhập offline; `cards:fetch` chỉ dùng khi chủ động refresh nguồn.

Registry nạp đủ hồ sơ review mới mở cả 20 definitions trong scope. Xem
[Phép](docs/engine/reviewed-spells.md), [FLIP](docs/engine/reviewed-flips.md),
[Trap Hole](docs/engine/reviewed-trap.md) và [core vanilla](docs/engine/vanilla-core.md).
Các tài liệu mốc cũ giữ số test/phạm vi tại thời điểm viết, không thay báo cáo hiện hành.

[PlayerView](docs/engine/player-view.md) giữ kín tay/deck/bài úp đối thủ;
[adapter](docs/engine/command-adapter.md) dùng mã tạm, kiểm tra lệnh và chống xử lý trùng
trong bộ nhớ. Chưa có online/auth, lưu trận, xây deck, artwork chính thức hoặc custom editor.
Chưa có Chain hỗn hợp/negate/SEGOC/modifier/replacement tổng quát, Special/Fusion/Ritual Summon
hoặc mọi tương tác bài. Bài tự tạo giữ ở [kế hoạch mở rộng](docs/architecture/001-foundation.md).

`npm run validate:platform` chạy bộ kiểm chứng tổng hợp, ghi report JSON và log từng bước
vào artifacts/platform-validation/ (Git bỏ qua). Lỗi dừng ngay, phần còn lại ghi chưa chạy.
Report Linux không xác nhận Windows; Windows CI được cấu hình dùng cùng lệnh và giữ artifact.

## Kiểm thử giao diện

Các lệnh cần Edge/Chrome/Chromium đã cài; người chơi bình thường không cần automation.

```sh
npm run beta:browser-smoke
npm run beta:browser-setup
npm run beta:browser-discard
npm run beta:browser-deck-out
npm run beta:browser-concede
npm run beta:browser-duel
```

Xem [Windows browser checks](docs/platform/windows-browser-checks.md),
[trận tự nhiên](docs/beta/browser-natural-duel.md),
[quyền thao tác/lịch sử](docs/beta/turn-guide-and-activity.md),
[lựa chọn hợp lệ](docs/beta/available-actions.md),
[feedback công khai](docs/beta/public-resolution-feedback.md),
[tạo trận](docs/beta/new-game-setup.md), [bỏ bài](docs/beta/end-turn-discard.md),
[Pot/deck-out](docs/beta/pot-deck-out.md), [đầu hàng](docs/beta/concede-and-restart.md),
[xem Mộ](docs/beta/graveyard-viewer.md).

## Các mục sau

Sau kiểm chứng Windows và chốt điều kiện bàn giao nội bộ mới mở xây deck/mở rộng catalog.
Online và trình tạo bài riêng là các mục chưa triển khai. Không tự push/publish/phát hành.

Đã bổ sung `npm run beta:startup-smoke` để kiểm tra lỗi cổng, cwd Unicode, HTTP/lệnh
và dừng/khởi động lại process. Xem [điểm dừng phần chuẩn bị Windows](docs/platform/beta-startup-check.md).
