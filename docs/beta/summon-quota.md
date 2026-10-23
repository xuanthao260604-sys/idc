# Hạn mức Normal Summon/Set trên bàn đấu

Bàn đấu thêm dòng người đang đi lượt và số Normal Summon/Set còn lại, ví dụ
Người chơi A · Normal Summon/Set còn 1/1 lượt. Lấy số đã dùng và hạn mức từ
engine qua PlayerView, không suy ra từ số quái còn trên sân hoặc lịch sử rút gọn.
Đổi seat vẫn hiển thị cùng bộ đếm của người đang đi lượt. Khi trận kết thúc ẩn
và xóa dòng này; màn chuyển máy tiếp tục che arena.

PlayerView thêm normalSummonQuota chỉ gồm playerId, used, limit và remaining
của người đang đi lượt. Đây là thông tin công khai về hành động đã dùng, không
có identity của bài úp, marker từng lá hoặc private state. Projection không sửa
state và đóng băng object như các phần khác. Không đổi luật engine, API hành
động, catalog 108, dữ liệu/review/artwork, starter hoặc deck đã lưu.

Normal Summon/Set và Tribute dùng chung hạn mức theo profile hiện tại; Flip
Summon riêng. Quái bị Trap Hole phá vẫn đã dùng Normal Summon; chuyển Main2
không đặt lại bộ đếm. Sang lượt mới, engine đặt lại cho người đi lượt tiếp theo.
Còn hạn mức không có nghĩa được hành động ngay: availableActions vẫn quyết định
theo phase/priority/ô trống/hiến tế và các điều kiện khác.

## Kiểm chứng

14 test mới đối xứng A/B trong tools/summon-quota.test.ts: hai góc nhìn cùng bộ
đếm, object chỉ có bốn field và frozen; Normal/Set/Tribute/Flip; bài Set không
lộ identity; Main2 không hoàn lại; lệnh thứ hai bị từ chối nguyên trạng; sang
lượt thật đặt lại rồi người kế tiếp triệu hồi; Trap Hole phá hết sân không hoàn
lượt. Fixture chỉ dựng trước hành động, sau đó dùng applyAction và kiểm invariant
sau từng lệnh hợp lệ, không sửa state đầu vào.

Browser --chain-view kiểm tra 1/1 → 0/1 sau triệu hồi và vẫn 0/1 sau hai Trap
Hole. Ca trận mới kiểm tra lại 1/1 cho đúng người đi trước. Hai trận tự nhiên
kiểm tra remaining=0 sau mỗi Normal/Set/Tribute và ẩn dòng khi kết thúc.

Typecheck và 14 test riêng đã đạt. Đang xác nhận toàn bộ Linux và Windows CI;
kết quả sẽ ghi sau khi đọc report.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
