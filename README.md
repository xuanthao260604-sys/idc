# YGO Classic Duel

Game đấu bài hai người theo Goat Format Bắc Mỹ: cutoff 17/8/2005, banlist TCG tháng 4/2005.
**Windows 11 là nền tảng sản phẩm chính.** Cloud/Linux dùng phát triển và kiểm thử;
đã đạt Windows CI bằng Edge; chưa kiểm tra trực tiếp Windows 11 desktop. Chưa đóng gói hoặc bàn giao beta.

## Tiến độ hiện tại

Đã có bàn đấu hotseat hai người thay phiên cùng máy, catalog 106 loại và deck mẫu hợp lệ 40 lá; deck A/B tự xây vẫn được giữ.
Core hỗ trợ 95 quái thường; 11 hiệu ứng Pot of Greed, Fissure, Trap Hole, Hane-Hane, Man-Eater Bug,
Hinotama, Dian Keto the Cure Master, Smashing Ground, Hammer Shot, Tribute to The Doomed và Monster Reincarnation được mở bằng hồ sơ review và kiểm thử trong scope giới hạn.

Đã hoàn tất [hotseat nội bộ 20 lá](docs/milestones/hotseat-20.md) và [xây/lưu deck A/B](docs/beta/deck-builder.md) trong scope giới hạn.
Đã kiểm chứng [hai Phép thay đổi LP](docs/engine/life-point-spells.md) trên Linux và Windows CI; còn ca Windows 11 desktop chưa chạy.
Không coi việc cấu hình CI Windows hoặc chạy Linux là đã kiểm chứng Windows.

620/620 test đạt trên Linux và Windows CI cho catalog 106.
28/28 bước validation và 18 browser run đạt bằng Edge trên Windows CI; chi tiết tại [Monster Reincarnation](docs/engine/monster-reincarnation.md).
Browser regression tính riêng: xây/lưu deck, 5 hiệu ứng, xem Mộ, tạo trận A/B/ngẫu nhiên, bỏ bài,
Pot với deck 0/1/2 lá, đầu hàng/hủy và tạo trận sau kết thúc, trận tự nhiên đầy đủ.
Kết quả tổng hợp và giới hạn tại tài liệu mốc; đây không phải game hoàn tất mọi luật Yu-Gi-Oh!.

Đã nhận bộ khung người dùng: [mặt sau chung](docs/beta/card-frames.md) được dùng cho bài úp của cả ba loại.
Đã ghép [ba khung mặt trước](docs/beta/card-fronts.md), hàng sao và chỉ số lấy từ dữ liệu; ảnh minh họa từng lá sẽ bổ sung sau.

Đã có [tổng kết mốc 100](docs/milestones/catalog-100.md), nêu rõ khả năng hiện có và phần còn thiếu.

## Chạy và phát triển

Node 24.19.0; npm 11.9.0 trên cloud và 11.17.0 trên Windows CI là các phiên bản đã kiểm tra. Lệnh npm dùng chung Windows/Linux,
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
không phải runtime capability. Lô classic-10 riêng bổ sung 10 normal verified; tổng catalog có 25 verified data và 5 pending lịch sử. Không sửa bundle tay để nâng trạng thái.
`cards:import` nhập offline; `cards:fetch` chỉ dùng khi chủ động refresh nguồn.

Runtime hợp nhất hai bundle, nạp đủ hồ sơ review để mở 30 definitions trong scope. Xem
[Phép](docs/engine/reviewed-spells.md), [FLIP](docs/engine/reviewed-flips.md),
[Trap Hole](docs/engine/reviewed-trap.md) và [core vanilla](docs/engine/vanilla-core.md).
Các tài liệu mốc cũ giữ số test/phạm vi tại thời điểm viết, không thay báo cáo hiện hành.

[PlayerView](docs/engine/player-view.md) giữ kín tay/deck/bài úp đối thủ;
[adapter](docs/engine/command-adapter.md) dùng mã tạm, kiểm tra lệnh và chống xử lý trùng
trong bộ nhớ. Đã có xây/lưu deck riêng A/B. Chưa có online/auth, lưu trận, artwork chính thức hoặc custom editor.
Chưa có Chain hỗn hợp/negate/SEGOC/modifier/replacement tổng quát, Special/Fusion/Ritual Summon
hoặc mọi tương tác bài. Bài tự tạo giữ ở [kế hoạch mở rộng](docs/architecture/001-foundation.md).

`npm run validate:platform` chạy bộ kiểm chứng tổng hợp, ghi report JSON và log từng bước
vào artifacts/platform-validation/ (Git bỏ qua). Lỗi dừng ngay, phần còn lại ghi chưa chạy.
Windows CI đã chạy cùng lệnh, đạt 28/28 bước và giữ artifact; report Linux vẫn chỉ xác nhận Linux.

## Kiểm thử giao diện

Các lệnh cần Edge/Chrome/Chromium đã cài; người chơi bình thường không cần automation.

```sh
npm run beta:browser-smoke
npm run beta:browser-deck-builder
npm run beta:browser-expanded
npm run beta:browser-expanded-duel
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

Đã hoàn tất [xây/lưu deck](docs/beta/deck-builder.md); đã hoàn tất [mở rộng 20 → 30](docs/data/classic-30.md).
Online và trình tạo bài riêng là các mục chưa triển khai. Nhánh work đã được commit/push theo phép người dùng; chưa phát hành beta.

Đã bổ sung `npm run beta:startup-smoke` để kiểm tra lỗi cổng, cwd Unicode, HTTP/lệnh
và dừng/khởi động lại process. Xem [điểm dừng phần chuẩn bị Windows](docs/platform/beta-startup-check.md).

Xây deck lưu riêng cho A/B và dùng khi tạo trận mới; sửa deck không đổi trận đang chơi.
Deck được lưu local qua restart, còn trận đấu vẫn chỉ trong bộ nhớ.

Catalog runtime hợp nhất pilot 20 và classic-10; giữ nguyên định nghĩa/hồ sơ hiệu ứng cũ.
