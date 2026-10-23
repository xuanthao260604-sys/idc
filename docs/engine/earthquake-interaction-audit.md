# Rà soát tương tác Earthquake

Sau mốc [Earthquake](earthquake.md), thêm 14 test đối xứng cho A/B trong
tools/earthquake.test.ts, nâng file này từ 23 lên 37 test. Không đổi engine,
catalog 108 loại, dữ liệu, review, artwork hoặc deck. Snapshot lịch sử và khả năng
runtime tiếp tục tách riêng.

| Chuỗi hành động | Điều được kiểm chứng |
| --- | --- |
| Earthquake → Hammer Shot / Block Attack | Toàn sân không còn quái tấn công: từ chối activation nguyên trạng; vẫn có thể Set Phép |
| Earthquake → Fissure | Quái ngửa phòng thủ vẫn được xét theo ATK; Hane-Hane ATK 450 bị phá, không tự kích hoạt FLIP |
| Earthquake → Smashing Ground | Vẫn xét DEF, phá Mystical Elf DEF 2000; không đổi ATK thành DEF hoặc chọn bài úp |
| Earthquake với Giant Soldier of Stone → Smashing Ground | Giữ đúng hai lựa chọn đồng DEF 2000; chỉ phá quái được chọn |
| Earthquake → đổi Battle Ox thủ công sang ATK → Hammer Shot | Chỉ Battle Ox của người dùng là quái tấn công; chính nó bị phá |
| Earthquake → đổi Battle Ox sang ATK → đánh Hane-Hane ngửa DEF | Dùng phòng thủ, không trừ LP hoặc lật/kích hoạt FLIP lại; ghi nhận lượt tấn công |
| Earthquake → lượt đối thủ → đổi Celtic Guardian sang ATK | Chủ quái còn quyền đổi tư thế thủ công và quota Normal; lần đổi thủ công thứ hai bị từ chối |

Fixture chỉ dựng trước hành động. Sau đó mọi thay đổi qua applyAction, kiểm tra
invariant sau từng lệnh hợp lệ và kiểm tra state đầu vào không bị sửa. Các Chain
được xử lý riêng rồi đóng cửa sổ phản hồi; đây không phải Chain nhiều link.
Nguồn và phạm vi đã duyệt giữ ở tài liệu Earthquake, Fissure, Hammer Shot,
Smashing Ground và Block Attack; không thêm ruling hoặc mở Trigger/SEGOC mới.

## Kiểm chứng

Linux đạt typecheck và toàn bộ 726/726 test trong 33 file; riêng Earthquake
37/37 test. Không chạy lại browser Linux vì không đổi logic sản phẩm hoặc UI;
báo cáo browser triển khai giữ tại mốc Earthquake. Đang xác nhận Windows CI.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
