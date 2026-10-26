# Kết quả Windows CI

> Mốc hiện hành: [giữ đúng ghế khi đọc deck](../beta/deck-read-guard.md), catalog 109; [run 40278994288](https://github.com/xuanthao260604-sys/idc/actions/runs/40278994288), commit da700d6.
> Windows/Ubuntu đạt; Windows: 809/809 test, 47/47 bước, 37 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40278994288-1: mở/kiểm tra/tải deck sai ghế chỉ nhận lỗi; giữ nháp, undo/redo, preview, bộ lọc và bàn đấu; chọn lại ghế đọc bình thường, deck A/B giữ nguyên. Không đổi engine/dữ liệu; Windows 11 desktop chưa chạy.

> Mốc trước: [báo cáo khả năng từ review đang hoạt động](../engine/capability-report.md), catalog 109; [run 40261376014](https://github.com/xuanthao260604-sys/idc/actions/runs/40261376014), commit 5530d78.
> Windows/Ubuntu đạt; Windows: 805/805 test, 47/47 bước, 37 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40261376014-1: capabilities JSON giống Linux, đủ 14 effect record/11 scope, giữ nhập/runtime riêng; thiếu hoặc lệch review không bị báo nhầm hỗ trợ. Không đổi engine/dữ liệu/deck cũ; Windows 11 desktop chưa chạy.

> Mốc trước: [trạng thái dữ liệu và hoạt động của từng lá](../beta/card-support.md), catalog 109; [run 40256826758](https://github.com/xuanthao260604-sys/idc/actions/runs/40256826758), commit 85cc626.
> Windows/Ubuntu đạt; Windows: 800/800 test, 47/47 bước, 37 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40256826758-1: trạng thái 109 lá tách 95 verified/14 pending với runtime, chỉ đọc và giữ kín lá úp. Không đổi engine/dữ liệu/deck cũ; Windows 11 desktop chưa chạy.

> Mốc trước: [kiểm tra ghế khi gửi lệnh/đọc bàn đấu](../beta/seat-guard.md), catalog 109; [run 40199836126](https://github.com/xuanthao260604-sys/idc/actions/runs/40199836126), commit 58a2228.
> Windows/Ubuntu đạt; Windows: 799/799 test, 47/47 bước, 37 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40199836126-1: đổi cookie không làm đầu hàng nhầm, refresh giữ tay/selection đang xem; chọn lại ghế thao tác được, receipt và deck A/B giữ nguyên. Không đổi engine/dữ liệu; Windows 11 desktop chưa chạy.

> Mốc trước: [bảo vệ tạo trận mới khi mất phản hồi](../beta/new-game-recovery.md), catalog 109; [run 40193216185](https://github.com/xuanthao260604-sys/idc/actions/runs/40193216185), commit bced07d.
> Windows/Ubuntu đạt; Windows: 791/791 test, 46/46 bước, 36 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40193216185-1: retry sau mất phản hồi giữ trận đã tạo, kiểm tra chỉ đọc, guard version/ghế và ba reset đồng thời đạt; deck A/B giữ nguyên. Không đổi engine/dữ liệu; Windows 11 desktop chưa chạy.

> Mốc trước: [bảng tổng kết trận](../beta/result-summary.md), catalog 109; [run 40190980631](https://github.com/xuanthao260604-sys/idc/actions/runs/40190980631), commit 1bdc19f.
> Windows/Ubuntu đạt; Windows: 784/784 test, 46/46 bước, 36 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40190980631-1: tổng kết đúng ở A/B khi hết LP, failed draw hoặc đầu hàng; Hủy/Escape giữ trận, xác nhận trận mới xóa tổng kết cũ và giữ deck A/B. Không đổi engine/dữ liệu; Windows 11 desktop chưa chạy.

> Mốc trước: [phân biệt các bản sao cùng tên](../beta/choice-identities.md), catalog 109; [run 40188941251](https://github.com/xuanthao260604-sys/idc/actions/runs/40188941251), commit 49b5b42.
> Windows/Ubuntu đạt; Windows: 784/784 test, 46/46 bước, 36 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40188941251-1: nhãn vị trí tay/Mộ/hiến tế rõ từng bản sao, đúng handle và đúng lá bị bỏ/lấy lại, Hủy giữ state và giữ kín bài úp. Không đổi engine/dữ liệu/deck cũ; Windows 11 desktop chưa chạy.

> Mốc trước: [điều khiển các hàng sân bằng bàn phím](../beta/field-keyboard.md), catalog 109; [run 40187155138](https://github.com/xuanthao260604-sys/idc/actions/runs/40187155138), commit 6760c9e.
> Windows/Ubuntu đạt; Windows: 784/784 test, 45/45 bước, 35 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40187155138-1: điều hướng hai hàng của cả A/B, bỏ qua ô trống, giữ focus, che bài úp và xác nhận mục tiêu riêng đạt. Không đổi engine/dữ liệu/deck cũ; Windows 11 desktop chưa chạy.

> Mốc trước: [chọn lá trực tiếp trong quyết định bắt buộc](../beta/decision-cards.md), catalog 109; [run 40105969342](https://github.com/xuanthao260604-sys/idc/actions/runs/40105969342), commit ca51771.
> Windows/Ubuntu đạt; Windows: 784/784 test, 44/44 bước, 34 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40105969342-1 sau khi cloud kết nối lại: đồng bộ sân/radio và tay/checkbox, giữ kín target úp, chỉ gửi khi xác nhận, giữ nháp khi lỗi và xóa cue sau decision đạt. Không đổi engine/dữ liệu/deck cũ; Windows 11 desktop chưa chạy.

> Mốc trước: [lọc lịch sử thao tác công khai](../beta/activity-filters.md), catalog 109; [run 40104493247](https://github.com/xuanthao260604-sys/idc/actions/runs/40104493247), commit ff80fbf.
> Windows/Ubuntu đạt; Windows: 784/784 test, 43/43 bước, 33 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40104493247-1: lọc theo lượt/Pass, giữ kết quả xử lý, cập nhật/reset và lịch sử 60 dòng của hai trận tự nhiên đạt. Không đổi engine/dữ liệu/deck cũ; Windows 11 desktop chưa chạy.

> Mốc trước: [tìm và lọc bài trong Mộ](../beta/graveyard-filters.md), catalog 109; [run 40103017434](https://github.com/xuanthao260604-sys/idc/actions/runs/40103017434), commit 361fc08.
> Windows/Ubuntu đạt; Windows: 784/784 test, 42/42 bước, 32 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40103017434-1: lọc tên/text/loại, giữ vị trí và bản sao, reset preview, hai ghế và Mộ trống đạt. Không đổi engine/dữ liệu/deck cũ; Windows 11 desktop chưa chạy.

> Mốc trước: [xem trước khi nhập file deck](../beta/deck-import-preview.md), catalog 109; [run 40102049702](https://github.com/xuanthao260604-sys/idc/actions/runs/40102049702), commit 3833fe2.
> Windows/Ubuntu đạt; Windows: 784/784 test, 41/41 bước, 31 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40102049702-1: preview file, Hủy/Escape giữ nháp, Áp dụng một bước undo, file trùng không đổi lịch sử và hai viewport đạt. Không đổi engine/dữ liệu/deck cũ; Windows 11 desktop chưa chạy.

> Mốc trước: [tải bản lưu vào bản nháp deck](../beta/deck-load-saved.md), catalog 109; [run 40100927033](https://github.com/xuanthao260604-sys/idc/actions/runs/40100927033), commit 3bee50f.
> Windows/Ubuntu đạt; Windows: 784/784 test, 41/41 bước, 31 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40100927033-1: tải có undo, bản nháp thiếu lá, tải trùng giữ redo, lỗi giữ nháp và lưu chủ động sau xung đột đạt. Không đổi engine/dữ liệu/deck cũ; Windows 11 desktop chưa chạy.

> Mốc trước: [xem thay đổi của bản nháp deck](../beta/deck-changes.md), catalog 109; [run 40100096853](https://github.com/xuanthao260604-sys/idc/actions/runs/40100096853), commit 7f11dfa.
> Windows/Ubuntu đạt; Windows: 784/784 test, 41/41 bước, 31 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40100096853-1: bảng số bản sao, chỉ đổi thứ tự, độc lập bộ lọc, undo/redo và baseline xác nhận mới đạt. Không đổi engine/dữ liệu/deck cũ; Windows 11 desktop chưa chạy.

> Mốc trước: [kiểm tra kết quả lưu deck](../beta/deck-save-check.md), catalog 109; [run 40099228529](https://github.com/xuanthao260604-sys/idc/actions/runs/40099228529), commit 6202db1.
> Windows/Ubuntu đạt; Windows: 784/784 test, 41/41 bước, 31 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40099228529-1: xác nhận lần lưu mất phản hồi, không lưu lặp, giữ bản nháp khi xung đột/đổi ghế và deck B độc lập đạt. Không đổi engine/dữ liệu; Windows 11 desktop chưa chạy.

> Mốc trước: [bảo vệ bản nháp deck khi đóng](../beta/deck-draft-guard.md), catalog 109; [run 40071557099](https://github.com/xuanthao260604-sys/idc/actions/runs/40071557099), commit 3dc1912.
> Windows/Ubuntu đạt; Windows: 784/784 test, 40/40 bước, 30 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40071557099-1: hủy Đóng/Escape giữ bài/lịch sử, undo/redo, lưu lỗi/thành công và baseline A/B đạt. Không đổi engine/dữ liệu; Windows 11 desktop chưa chạy.

> Mốc trước: [điều khiển tay bài bằng bàn phím](../beta/hand-keyboard.md), catalog 109; [run 40065731877](https://github.com/xuanthao260604-sys/idc/actions/runs/40065731877), commit 9189ed1.
> Windows/Ubuntu đạt; Windows: 784/784 test, 39/39 bước, 29 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40065731877-1: phím điều hướng/chọn bài, focus qua render, đúng bản sao khi triệu hồi, bài úp và deck A/B đạt. Không đổi engine/dữ liệu; Windows 11 desktop chưa chạy.

> Mốc trước: [sắp xếp tay bài](../beta/hand-sorting.md), catalog 109; [run 40064746587](https://github.com/xuanthao260604-sys/idc/actions/runs/40064746587), commit da55a7f.
> Windows/Ubuntu đạt; Windows: 784/784 test, 38/38 bước, 28 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40064746587-1: bàn phím, thứ tự bản sao, selection/command đúng lá, đổi ghế/trận và deck cũ đạt. Không đổi engine/dữ liệu; Windows 11 desktop chưa chạy.

> Mốc trước: [Faith bị đánh lật qua hotseat](../beta/faith-battle-hotseat.md), catalog 109; [run 40063069066](https://github.com/xuanthao260604-sys/idc/actions/runs/40063069066), commit be61a76.
> Windows/Ubuntu đạt; Windows: 784/784 test, 37/37 bước, 27 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40063069066-1: bốn ca A/B × 0/2 Phép trong Mộ, lựa chọn riêng, source cleanup và dùng Phép lượt sau đạt. Không đổi engine/dữ liệu/deck; Windows 11 desktop chưa chạy.

> Mốc trước: [rà soát tương tác Magician of Faith](../engine/magician-faith-interaction-audit.md), catalog 109; [run 40056955363](https://github.com/xuanthao260604-sys/idc/actions/runs/40056955363), commit a4d168d.
> Windows/Ubuntu đạt; Windows: 784/784 test, 33/33 bước, 23 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-40056955363-1: thêm 14 test tương tác A/B, không đổi engine/dữ liệu/deck. Windows 11 desktop chưa chạy.

> Mốc trước: [Magician of Faith](../engine/magician-of-faith.md), catalog 109; [run 39977194358](https://github.com/xuanthao260604-sys/idc/actions/runs/39977194358), commit 44f17be.
> Windows/Ubuntu đạt; Windows: 770/770 test, 33/33 bước, 23 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-39977194358-1: FLIP lấy Phép từ Mộ, dùng lại Pot, trận tự nhiên 109 và bảo toàn dữ liệu/deck cũ đạt. Snapshot lịch sử vẫn pending; Windows 11 desktop chưa chạy.

> Mốc trước: [hạn mức Normal Summon/Set](../beta/summon-quota.md), catalog 108; [run 39972739306](https://github.com/xuanthao260604-sys/idc/actions/runs/39972739306), commit 1369ce9.
> Windows/Ubuntu đạt; Windows: 740/740 test, 32/32 bước, 22 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-39972739306-1: 14 test mới A/B, bộ đếm công khai, Trap Hole không hoàn lượt và reset theo lượt đạt. Windows 11 desktop chưa chạy.

> Mốc trước: [đọc bài trong Chain](../beta/chain-card-previews.md), catalog 108; [run 39969387989](https://github.com/xuanthao260604-sys/idc/actions/runs/39969387989), commit 66304e0.
> Windows/Ubuntu đạt; Windows: 726/726 test, 32/32 bước, 22 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-39969387989-1: cửa sổ nguồn/target chỉ đọc, đóng/Escape xóa nội dung, giữ state và che bài úp đạt. Windows 11 desktop chưa chạy.

> Mốc trước: [bảng Chain đang xử lý](../beta/chain-view.md), catalog 108; [run 39966377745](https://github.com/xuanthao260604-sys/idc/actions/runs/39966377745), commit cc16ac8.
> Windows/Ubuntu đạt; Windows: 726/726 test, 32/32 bước, 22 browser report với Edge 155.0.4283.62, runtimeExceptions=0.
> Đã đọc artifact windows-validation-39966377745-1: hai Trap Hole trong Chain, thứ tự 2→1, Phép một link và giữ kín target úp đạt. Windows 11 desktop chưa chạy.

> Mốc trước: [hiển thị giao chiến](../beta/battle-cues.md), catalog 108; [run 39965022546](https://github.com/xuanthao260604-sys/idc/actions/runs/39965022546), commit 82f8f92.
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

> Mốc trước: [catalog 100](../data/classic-100.md), [run 39746863841](https://github.com/xuanthao260604-sys/idc/actions/runs/39746863841), commit fa6b773.
> 423/423 test, 21 bước, 11 browser run bằng Edge 154.0.4258.62; Windows/Ubuntu đều đạt.
> Windows 11 desktop chưa chạy. Các kết quả dưới đây giữ làm lịch sử.

> Mốc trước: [catalog 80](../data/classic-80.md), [run 39744582537](https://github.com/xuanthao260604-sys/idc/actions/runs/39744582537), commit 5ed6911.
> 380/380 test, 21 bước, 11 browser run bằng Edge 155.0.4283.62; Windows/Ubuntu đều đạt.
> Windows 11 desktop chưa chạy. Các kết quả dưới đây giữ làm lịch sử.

> Mốc trước: [catalog 70](../data/classic-70.md), [run 39742428389](https://github.com/xuanthao260604-sys/idc/actions/runs/39742428389), commit 9a3fadf.
> 357/357 test, 21 bước, 11 browser run bằng Edge 154.0.4258.62; Windows/Ubuntu đều đạt.
> Windows 11 desktop chưa chạy. Các kết quả dưới đây giữ làm lịch sử.

> Mốc trước: [catalog 60](../data/classic-60.md), [run 39740451524](https://github.com/xuanthao260604-sys/idc/actions/runs/39740451524), commit d7d1a74.
> 334/334 test, 21 bước, 11 browser run bằng Edge 155.0.4283.62; Windows/Ubuntu đều đạt.
> Windows 11 desktop chưa chạy. Các kết quả dưới đây giữ làm lịch sử.

> Mốc trước: [ba khung mặt trước](../beta/card-fronts.md), [run 39737883662](https://github.com/xuanthao260604-sys/idc/actions/runs/39737883662), commit 93e1191.
> 321/321 test, 21 bước, 11 browser run bằng Edge; 50 preview có sao theo dữ liệu. Windows/Ubuntu đều đạt.
> Windows 11 desktop chưa chạy.

> Mốc trước: [mặt sau chung do người dùng cung cấp](../beta/card-frames.md), [run 38881716115](https://github.com/xuanthao260604-sys/idc/actions/runs/38881716115), commit 70034db.
> 321/321 test, 21 bước, 11 browser run bằng Edge; Windows/Ubuntu đều đạt. Windows 11 desktop chưa chạy.

> Mốc trước: [catalog 50 lá](../data/classic-50.md), [run 38878802549](https://github.com/xuanthao260604-sys/idc/actions/runs/38878802549), commit c1c1d38.
> 321/321 test, 21/21 bước, 11 browser run bằng Edge 154.0.4258.62; Windows và Ubuntu đều đạt.
> Windows 11 desktop chưa chạy; các kết quả dưới đây là lịch sử.

> Mốc trước: [catalog 40 lá](../data/classic-40.md), [run 38877923439](https://github.com/xuanthao260604-sys/idc/actions/runs/38877923439), commit d902d0a.
> 308/308 test, 21/21 bước, 11 browser run bằng Edge 154.0.4258.62; Windows và Ubuntu đều đạt.
> Windows 11 desktop chưa chạy; các kết quả dưới đây là lịch sử.

> Mốc trước: [catalog 30 lá](../data/classic-30.md) đạt [run 38876718294](https://github.com/xuanthao260604-sys/idc/actions/runs/38876718294)
> trên commit c1a8f81: 295 test, 21 bước, 11 browser run. Windows 11 desktop chưa chạy.

> Kết quả tiếp theo: [mục xây deck](../beta/deck-builder.md) đã đạt Windows/Ubuntu CI
> ở [run 38874697590](https://github.com/xuanthao260604-sys/idc/actions/runs/38874697590), commit fc8bb52: 278 test, 19 bước,
> 9 browser run. Báo cáo bên dưới giữ mốc CI đầu tiên sau sửa newline.

**Đã đạt Windows CI và Ubuntu CI** trên commit
7294e60aa84a660a269b7cf5005caba68f3a1e57, nhánh work.
[Run có kết quả thật](https://github.com/xuanthao260604-sys/idc/actions/runs/38872877968).
Không phải kiểm chứng Windows 11 desktop hoặc bản beta đã phát hành.

## Môi trường và kết quả Windows

- Runner windows-latest, platform win32/x64, OS release 10.0.26100.
- Node 24.19.0; npm thực tế của runner 11.17.0 (cloud Linux dùng 11.9.0).
- Microsoft Edge Edg/154.0.4258.62, lấy version từ CDP thực.
- 267/267 test, 19 test file; typecheck, build, data check và CLI startup đạt.
- Tổng 18/18 bước của validate:platform đạt; 8 browser report, không runtime exception.
- Browser: đủ 5 effect, xem Mộ, A/B/ngẫu nhiên, bỏ bài, Pot còn 0/1/2 lá,
  hủy/đồng ý đầu hàng và tạo trận mới sau kết thúc.
- Trận browser tự nhiên: 16 lượt/339 lệnh, 15 attack, 4 decision, đủ 5 effect,
  B thắng với LP 0/4200. Không sửa state trong lúc chơi.
- Ubuntu job trong cùng run cũng đạt toàn bộ core checks đã cấu hình.

Đã tải artifact và đọc report JSON/test log để xác nhận platform, trạng thái từng bước,
số test, 8 browser report và windows11DesktopVerified=false; không suy kết quả từ cấu hình CI.
Artifact windows-validation-38872877968-1 chứa report cùng log; CI giữ 14 ngày.
Bản tải local ở artifacts/ci-windows-success/ bị Git bỏ qua. Link run/commit và tài liệu
này lưu lại kết quả, không khẳng định artifact được giữ vĩnh viễn.

## Lỗi đã phát hiện và sửa

[Run đầu](https://github.com/xuanthao260604-sys/idc/actions/runs/38872740517)
trên commit 3fb6b5d thất bại tại kiểm thử import giữ nguyên byte: checkout Windows tự
đổi LF thành CRLF, trong khi importer ghi JSON xác định bằng LF. Ubuntu đạt.

Thêm .gitattributes: text dùng LF ổn định giữa hai hệ điều hành; data/raw/** đặt -text
để snapshot content-addressed giữ nguyên byte. Không nới assertion so sánh byte,
không sửa checksum hoặc dữ liệu bài/hiệu ứng. 30 test importer đạt local trước push;
run Windows sau sửa đạt toàn bộ 267 test và các bước còn lại.

## Trạng thái bàn giao của mục

Đã hoàn tất phần chuẩn bị và kiểm chứng Windows tự động trong CI. Người dùng đã cho phép
commit/push work để thực hiện công việc này; chưa tạo release, installer hoặc bàn giao beta.
Chưa có môi trường Windows 11 desktop được cung cấp, nên kiểm tra trực tiếp trên máy
Windows 11 vẫn để **chưa chạy**, không ghi mục tương thích sản phẩm hoàn tất 100%.
Ca desktop, Chrome Windows riêng và thao tác touch/keyboard toàn diện chưa có bằng chứng.

Tài liệu chuẩn bị trước đây ghi “chưa chạy CI” là lịch sử; kết quả hiện hành ở tài liệu này.
