# Sắp xếp danh sách khi xây deck

Thêm lựa chọn Thứ tự catalog, Tên A–Z, Cấp sao giảm dần, ATK giảm dần và Số bản
sao giảm dần vào màn xây deck. Kết hợp với tìm kiếm, loại bài và Có trong deck.
Sắp xếp bản sao chỉ tính bản nháp đang sửa và tự cập nhật sau thêm/bớt bài.

Quái có cấp sao/ATK được xếp trước Phép/Bẫy trong hai chế độ tương ứng; ATK 0
vẫn là chỉ số hợp lệ. Khi bằng giá trị, xếp theo tên tiếng Anh rồi ID để thứ tự
ổn định. Chế độ catalog phục hồi thứ tự danh sách ban đầu. Không đổi mảng bài
trong bản nháp, file xuất, dữ liệu lưu hoặc thứ tự bộ bài trong trận. Mở lại màn
xây deck hoặc đổi người chơi trở về chế độ catalog như các bộ lọc khác.

Bố cục bộ lọc thành hai cột trên desktop và một cột trên màn hẹp. Không đổi API,
engine, giới hạn deck, dữ liệu/review/artwork, số 108 loại hoặc 13 hiệu ứng trong
scope hiện hành. Không có dữ liệu tự suy luận từ text bài.

## Kiểm chứng

Mở rộng ca browser --deck-overview: so thứ tự DOM với dữ liệu catalog cho đủ năm
chế độ; kiểm tra Blue-Eyes White Dragon đứng đầu cấp sao/ATK, Phép/Bẫy xuống cuối;
khôi phục thứ tự catalog và giữ nguyên toàn mảng bản nháp. Thêm bản sao rồi lọc
Có trong deck, kiểm tra lá có hai bản đứng đầu, kết hợp Quái/cấp sao. Giữ kiểm tra
preview, thống kê, bỏ bản cuối/thêm lại/default, đóng không lưu và reset A/B.
Các ảnh Chromium 1440×1000 và 390×844 đã được xem, không tràn ngang.

Linux đạt typecheck, 726/726 test trong 33 file; 31/31 bước validation và
21 browser report với Chromium 154.0.8037.57, tổng runtimeExceptions=0.
Ca deck-overview cuối có thêm kiểm tra cụ thể quái đứng đầu và Phép/Bẫy ở cuối
cũng đạt khi chạy riêng.

Windows và Ubuntu CI [run 39956787294](https://github.com/xuanthao260604-sys/idc/actions/runs/39956787294)
đạt trên source commit 7b9da241ba91e2824b25bba7142f8a2bef7ac4cf. Đã tải và đọc
artifact windows-validation-39956787294-1: win32 x64, OS 10.0.26100,
Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62. Windows đạt 726/726 test
trong 33 file, 31/31 bước, 21 browser report; tổng runtimeExceptions=0.
Ca deck-overview ghi đủ năm sortModes và sortingPreservesDeckOrder=true;
report ghi windows11DesktopVerified=false.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
