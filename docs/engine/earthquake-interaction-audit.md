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
báo cáo browser triển khai giữ tại mốc Earthquake.

Windows và Ubuntu CI đạt trên source commit 909c2bc55ef4016a839718eaf4efed3af27bc94e:
[run 39953358379](https://github.com/xuanthao260604-sys/idc/actions/runs/39953358379).
Đã tải và đọc artifact windows-validation-39953358379-1: win32 x64,
OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62.
Windows đạt 726/726 test trong 33 file, 30/30 bước validation và 20 browser report,
tổng runtimeExceptions=0; windows11DesktopVerified=false.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
