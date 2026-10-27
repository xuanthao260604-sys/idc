# YGO Classic Duel

Game đấu bài hai người theo Goat Format Bắc Mỹ: cutoff 17/8/2005, banlist TCG tháng 4/2005.
**Windows 11 là nền tảng sản phẩm chính.** Cloud/Linux dùng phát triển và kiểm thử;
đã đạt Windows CI bằng Edge; chưa kiểm tra trực tiếp Windows 11 desktop. Chưa đóng gói hoặc bàn giao beta.

## Tiến độ hiện tại

Đã có bàn đấu hotseat hai người thay phiên cùng máy, catalog 110 loại và deck mẫu hợp lệ 40 lá; deck A/B tự xây vẫn được giữ.
Core hỗ trợ 95 quái thường; 15 hiệu ứng Pot of Greed, Fissure, Trap Hole, Hane-Hane, Man-Eater Bug,
Hinotama, Dian Keto the Cure Master, Smashing Ground, Hammer Shot, Tribute to The Doomed, Monster Reincarnation, Block Attack, Earthquake, Magician of Faith và Ookazi được mở bằng hồ sơ review và kiểm thử trong scope giới hạn.

Đã hoàn tất [hotseat nội bộ 20 lá](docs/milestones/hotseat-20.md) và [xây/lưu deck A/B](docs/beta/deck-builder.md) trong scope giới hạn.
Đã kiểm chứng [hai Phép thay đổi LP](docs/engine/life-point-spells.md) trên Linux và Windows CI; còn ca Windows 11 desktop chưa chạy.
Không coi việc cấu hình CI Windows hoặc chạy Linux là đã kiểm chứng Windows.

Mốc kiểm chứng trước: 848/848 test, 48/48 bước và 38 browser run đạt trên Linux và Windows CI.
Mục hiện tại: [mở hiệu ứng Ookazi](docs/engine/ookazi.md), đang kiểm chứng bộ tổng hợp mới.
Dữ liệu nhập và catalog runtime đều 110 lá; trạng thái nhập vẫn tách riêng review/runtime.
Browser regression tính riêng: xây/lưu deck, 5 hiệu ứng, xem Mộ, tạo trận A/B/ngẫu nhiên, bỏ bài,
Pot với deck 0/1/2 lá, đầu hàng/hủy và tạo trận sau kết thúc, trận tự nhiên đầy đủ.
Kết quả tổng hợp và giới hạn tại tài liệu mốc; đây không phải game hoàn tất mọi luật Yu-Gi-Oh!.

Đã nhận bộ khung người dùng: [mặt sau chung](docs/beta/card-frames.md) được dùng cho bài úp của cả ba loại.
Đã ghép [ba khung mặt trước](docs/beta/card-fronts.md), hàng sao và chỉ số lấy từ dữ liệu; ảnh minh họa từng lá sẽ bổ sung sau.

Đã mở [hiệu ứng Ookazi](docs/engine/ookazi.md): 800 sát thương hiệu ứng cho đối thủ khi link xử lý, từ tay hoặc bài úp của mình; dùng review riêng. [Dữ liệu nguồn](docs/data/ookazi.md) và văn bản lịch sử pending giữ nguyên, không tự nâng trạng thái nhập.

Đã thêm [bảng hành động trong lượt của quái mình](docs/beta/monster-activity.md): ghi nhận triệu hồi/Set, đổi tư thế thủ công và tuyên bố tấn công từ engine; chỉ đọc cho quái trên sân của viewer, không thay quyền thao tác.

Đã thêm [phục hồi chuyển người chơi khi lỗi mạng](docs/beta/seat-recovery.md): thông báo ngay trong màn chọn A/B, khóa nút khi chờ và giữ bàn đấu che kín đến khi mở đúng góc nhìn; thử lại không gửi lệnh đấu.

Đã siết [bằng chứng kiểm thử trình duyệt](docs/platform/browser-evidence.md): exit 0 vẫn bị từ chối nếu thiếu/trùng report, sai nền tảng, thiếu phiên bản hoặc có lỗi runtime; đọc đủ UTF-8 và dòng cuối không newline.

Đã sửa [kiểm tra đầu vào trước khởi động](docs/platform/catalog-preflight.md): dùng chung danh sách 17 bundle/12 file review với bộ nạp, phát hiện sáu file bị bỏ sót và từ chối thư mục đặt nhầm chỗ file; không tự sửa dữ liệu.

Đã thêm [giữ đúng ghế khi đọc deck](docs/beta/deck-read-guard.md): mở/kiểm tra/tải deck từ chối tại server khi cookie đổi ghế ở cửa sổ khác; lỗi giữ nguyên nháp và lịch sử.

Đã sửa [báo cáo khả năng thực thi](docs/engine/capability-report.md): lấy phạm vi từ review đang hoạt động, ghi đủ 15 hiệu ứng/11 scope và giữ trạng thái nhập riêng.

Đã thêm [trạng thái dữ liệu và hoạt động của từng lá](docs/beta/card-support.md): tách đối chiếu dữ liệu, loại văn bản và khả năng đang mở; chỉ hiện cho lá đã biết danh tính.

Đã thêm [kiểm tra ghế khi gửi lệnh/đọc bàn đấu](docs/beta/seat-guard.md): cookie đổi ở cửa sổ khác không làm đầu hàng nhầm hoặc nhận tay bài ghế kia; chọn lại ghế để tiếp tục.

Đã thêm [bảo vệ tạo trận mới khi mất phản hồi](docs/beta/new-game-recovery.md): từ chối xác nhận từ trận/phiên bản/ghế cũ; kiểm tra chỉ đọc để tải lại bàn đấu hiện tại.

Đã thêm [bảng tổng kết trận](docs/beta/result-summary.md): kết quả, lý do, lượt cuối và số liệu công khai A/B; mở trận mới có xác nhận, Hủy giữ nguyên kết quả.

Đã sửa [lựa chọn các bản sao cùng tên](docs/beta/choice-identities.md): vị trí tay/Mộ và ô hiến tế rõ ràng, giữ đúng bản sao sau sắp xếp và gửi handle của lá đã chọn.

Đã thêm [điều khiển các hàng sân bằng bàn phím](docs/beta/field-keyboard.md): ←/→ và Home/End bỏ qua ô trống, Enter/Space chọn bài, giữ kín bài úp và xác nhận riêng cho quyết định.

Đã thêm [chọn lá trực tiếp trong quyết định bắt buộc](docs/beta/decision-cards.md): nhấn lá hợp lệ trên tay/sân để chọn nháp, đồng bộ radio/checkbox, giữ kín bài úp và vẫn cần xác nhận.

Đã thêm [lọc lịch sử công khai](docs/beta/activity-filters.md): theo lượt, ẩn Pass không có kết quả nhưng giữ Pass xử lý hiệu ứng; có nhãn phase và không đổi dữ liệu gốc.

Đã thêm [tìm và lọc bài trong Mộ](docs/beta/graveyard-filters.md): theo tên/nội dung và Quái/Phép/Bẫy, giữ thứ tự gốc và từng bản sao, chỉ đổi cách hiển thị.

Đã thêm [xem trước khi nhập file deck](docs/beta/deck-import-preview.md): đọc thay đổi trước khi Áp dụng; Hủy/Escape giữ nguyên nháp, nhập thành công vẫn cần Lưu deck.

Đã thêm [tải bản lưu vào bản nháp](docs/beta/deck-load-saved.md): lấy bản mới nhất sau xung đột, có Hoàn tác lấy lại bản sửa; tải lỗi giữ nguyên nháp và không tự lưu.

Đã thêm [bảng thay đổi bản nháp deck](docs/beta/deck-changes.md): số bản sao trước/sau theo baseline đã xác nhận, không bị bộ lọc catalog che mất; theo đúng undo/redo và xác nhận lưu.

Đã thêm [kiểm tra kết quả lưu deck](docs/beta/deck-save-check.md): xác nhận bản nháp đã được lưu khi mất phản hồi, giữ bản sửa nếu khác và không tự gửi lại lệnh lưu.

Đã thêm [bảo vệ bản nháp deck khi đóng](docs/beta/deck-draft-guard.md): Đóng/Escape hỏi trước khi bỏ thay đổi; hủy giữ bài và lịch sử, lưu lỗi vẫn bảo toàn bản sửa.

Đã thêm [điều khiển tay bài bằng bàn phím](docs/beta/hand-keyboard.md): ←/→ và Home/End để di chuyển, Enter/Space để chọn; giữ tiêu điểm sau khi đọc bài.

Đã thêm [sắp xếp tay bài](docs/beta/hand-sorting.md): theo thứ tự nhận, tên, loại hoặc cấp sao; giữ đúng bản sao đang chọn, chỉ đổi hiển thị.

Đã bổ sung [kiểm thử Faith bị đánh lật qua hotseat](docs/beta/faith-battle-hotseat.md): A/B có hoặc không có Phép trong Mộ, lựa chọn riêng và dùng Phép ở Main lượt sau.

Đã bổ sung [rà soát tương tác Magician of Faith](docs/engine/magician-faith-interaction-audit.md): Phép có chi phí, thời điểm dùng bài lấy lại, Earthquake và đưa Faith về tay để úp lại.

Đã thêm [Magician of Faith](docs/engine/magician-of-faith.md): FLIP chọn một Phép trong Mộ mình và lấy về tay khi xử lý; có thể dùng Phép lấy lại ở Main hợp lệ.

Đã thêm [hạn mức Normal Summon/Set](docs/beta/summon-quota.md) trên bàn đấu: lấy từ engine, không hoàn lượt khi quái bị phá và phân biệt Flip Summon.

Đã thêm [đọc lá nguồn/mục tiêu trong Chain](docs/beta/chain-card-previews.md): cửa sổ chỉ đọc, đóng/Escape xóa preview và giữ kín bài úp.

Đã thêm [bảng Chain đang xử lý](docs/beta/chain-view.md): số liên kết, lá nguồn, tốc độ và mục tiêu theo góc nhìn; sắp theo thứ tự xử lý.

Đã thêm [hiển thị đòn tấn công đang xử lý](docs/beta/battle-cues.md): đánh dấu quái tấn công/mục tiêu, mô tả trực tiếp và giữ kín bài úp theo góc nhìn.

Đã có [phím tắt sửa deck trên Windows](docs/beta/deck-history-shortcuts.md): Ctrl+Z, Ctrl+Y và Ctrl+Shift+Z; giữ thao tác văn bản gốc trong ô tìm kiếm.

Đã thêm [Hoàn tác/Làm lại bản nháp deck](docs/beta/deck-undo-redo.md): áp dụng cả nhập file và deck mẫu, lưu tối đa 50 bước trong lần mở hiện tại.

Đã sửa [mất vị trí bàn phím khi sửa deck](docs/beta/deck-keyboard-focus.md): thêm/bớt bằng Enter/Space giữ đúng lá, đạt giới hạn hoặc bỏ hàng có vị trí tiếp tục phù hợp.

Đã thêm [sắp xếp danh sách deck](docs/beta/deck-sorting.md): theo tên, cấp sao, ATK hoặc số bản sao; chỉ đổi cách hiển thị.

Đã thêm [thống kê và lọc bài trong deck](docs/beta/deck-overview.md): đếm Quái/Phép/Bẫy theo số bản sao, xem riêng bài đang dùng và kết hợp tìm kiếm.

Đã bổ sung [rà soát tương tác Earthquake](docs/engine/earthquake-interaction-audit.md): Phép phá quái, lựa chọn đồng DEF, chiến đấu và quyền đổi tư thế của hai người chơi.

Đã thêm [Earthquake](docs/engine/earthquake.md): chuyển đồng thời quái ngửa tấn công trên cả hai sân sang phòng thủ; không target, không lật bài úp.

Đã thêm [Block Attack](docs/engine/block-attack.md): chọn quái ngửa tấn công của đối thủ và chuyển phòng thủ khi hiệu ứng xử lý; không tiêu lượt đổi tư thế thủ công.

Đã có [xem trước quái hiến tế](docs/beta/tribute-previews.md), đếm số đã chọn và đọc lại nội dung trước khi xác nhận Normal Summon/Set.

Đã sửa [mất lựa chọn khi lỗi mạng](docs/beta/decision-retry.md); giữ nháp đúng quyết định và không xử lý bỏ bài hai lần khi mất phản hồi.

Đã có [đọc bài trong lựa chọn bắt buộc](docs/beta/decision-previews.md): xem nội dung mà không tự chọn bài hoặc gửi quyết định.

Đã có [xem trước chi phí và mục tiêu](docs/beta/choice-previews.md) trong hộp xác nhận, giữ kín bài úp của đối thủ.

Đã có [gợi ý lá có thao tác hợp lệ](docs/beta/actionable-cards.md), theo quyền thao tác do engine xác nhận và góc nhìn hiện tại.

Đã có [xuất/nhập file deck JSON](docs/beta/deck-files.md): nhập vào bản nháp, kiểm tra rồi lưu; file lỗi giữ nguyên deck cũ.

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
riêng. Hiện có 17 bundle với 110 định nghĩa: 95 verified data và 15 pending rà soát văn bản lịch sử.
Các số implemented/tested/playable=0 trong snapshot nhập là metadata lần nhập;
runtime mở riêng 95 quái thường và 14 lá hiệu ứng qua review/kiểm thử trong scope giới hạn từ 16 bundle;
batch Ookazi chưa cấp cho runtime. Reimport Ookazi lỗi giữ cả 17 bundle và deck A/B nguyên byte. `cards:import` nhập offline,
`cards:fetch` chỉ dùng khi chủ động refresh nguồn.

Xem [Phép](docs/engine/reviewed-spells.md), [FLIP](docs/engine/reviewed-flips.md),
[Trap Hole](docs/engine/reviewed-trap.md), [Block Attack](docs/engine/block-attack.md) và
[core vanilla](docs/engine/vanilla-core.md). Các tài liệu mốc cũ giữ số test/phạm vi tại
thời điểm viết, không thay báo cáo hiện hành.

[PlayerView](docs/engine/player-view.md) giữ kín tay/deck/bài úp đối thủ;
[adapter](docs/engine/command-adapter.md) dùng mã tạm, kiểm tra lệnh và chống xử lý trùng
trong bộ nhớ. Đã có xây/lưu deck riêng A/B. Chưa có online/auth, lưu trận, artwork chính thức hoặc custom editor.
Chưa có Chain hỗn hợp/negate/SEGOC/modifier/replacement tổng quát, Special/Fusion/Ritual Summon
hoặc mọi tương tác bài. Bài tự tạo giữ ở [kế hoạch mở rộng](docs/architecture/001-foundation.md).

`npm run validate:platform` chạy bộ kiểm chứng tổng hợp, ghi report JSON và log từng bước
vào artifacts/platform-validation/ (Git bỏ qua). Lỗi dừng ngay, phần còn lại ghi chưa chạy.
Windows CI đã chạy cùng lệnh, đạt 48/48 bước và giữ artifact; report Linux vẫn chỉ xác nhận Linux.

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
