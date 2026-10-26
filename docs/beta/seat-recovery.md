# Thử lại chuyển người chơi khi mất kết nối — 26/10/2026

Màn chọn A/B trước đây dùng alert riêng khi yêu cầu đổi người chơi lỗi.
Thông báo nay nằm ngay trong màn chọn ghế, có hướng dẫn thử lại và lỗi
kết nối bằng tiếng Việt. Sau lỗi, tiêu điểm trở về nút vừa chọn để có thể
thử lại bằng bàn phím; giữ cơ chế Escape không đóng màn chuyển máy.

Trong lúc chờ, hai nút A/B bị khóa, dialog có aria-busy và dòng trạng thái
ghi người chơi đang mở. Giao diện chỉ nhận phản hồi có viewerId khớp ghế
đã chọn; sau đó mới đóng hộp và bỏ lớp che bàn đấu. Phản hồi lỗi, mất phản
hồi hoặc sai viewerId giữ nguyên PlayerView trước đó và tiếp tục che
arena/thông tin bài. Hết chờ mở lại nút, xóa dòng đang tải; mở màn chuyển
máy lần sau xóa thông báo lỗi cũ. Handoff đang bận hoặc đã mở không được
mở thêm lần nữa.

Nếu server đã đổi cookie nhưng phản hồi mất, người chơi có thể chọn lại
ghế mong muốn. Đây là yêu cầu chọn góc nhìn mới, không gửi lại lệnh đấu,
không tạo trận hoặc sửa deck. Chọn lá, nháp quyết định và cách sắp xếp tay
vẫn được đặt lại khi chuyển máy theo hành vi đã có. Không khôi phục nháp
riêng của người trước vào góc nhìn mới.

Đây vẫn là hotseat cùng máy: người chơi chủ động chọn A/B, chưa có tài
khoản hoặc xác thực online. Lớp che là hành vi hiển thị khi chuyển máy,
không xóa PlayerView đã nhận khỏi bộ nhớ trình duyệt. Không thay server,
engine, dữ liệu bài, review, luật, artwork hoặc định dạng deck.

## Kiểm chứng

Mở rộng ca --seat-guard hiện có, dùng trận mới bình thường, không sửa
state trong lúc chơi. Chạy cả A→B và B→A:

- Offline trước request: lỗi trong màn chọn ghế, không alert; PlayerView
  giữ nguyên, arena và aside vẫn hidden, nút được mở lại và focus đúng.
- Server đổi cookie thật rồi test làm mất riêng phản hồi: UI giữ view cũ
  và lớp che; đọc server xác nhận đã ở ghế mới nhưng duelId/version không đổi.
- Test thay viewerId trong một phản hồi thật: UI từ chối nhận và vẫn che bàn.
- Giữ một phản hồi thật để kiểm lúc đang chờ: hai nút khóa, aria-busy=true,
  có trạng thái đang mở; click lại không gửi request thứ hai, Escape không
  làm hiện bàn. Thả phản hồi mở đúng tay bài của ghế được chọn.
- Sau phục hồi, version, các vùng công khai và activity giữ nguyên; không
  có lệnh /api/command hoặc native alert trong các ca thử lại ghế.
  Các kiểm tra cũ về guard lệnh, đọc deck và bảo toàn A/B tiếp tục chạy.
- Kiểm bounds và chụp/xem bố cục 1440px/390px: lỗi xuống dòng trong dialog,
  không tràn ngang; tay bài/thông tin riêng không hiện phía sau màn chọn ghế.

Syntax/build và ca trình duyệt riêng đạt trên Linux/Chromium 154.0.8037.57,
runtimeExceptions=0. Không thêm unit test hoặc browser invocation. Bộ tổng
hợp Linux đạt 829/829 test trong 35 file, 47/47 bước, 37 browser report,
tổng runtimeExceptions=0. Đã đọc report
artifacts/platform-validation/2026-10-26T12-24-01-969Z-195357/report.json:
đủ bằng chứng từng bước, ca seat-guard có năm cờ chuyển ghế mới; các kiểm
tra bảo toàn deck và hai trận tự nhiên vẫn đạt. Capabilities JSON giống
mốc trước. Windows CI đang được kiểm tra; chưa dùng Linux xác nhận Windows.

Catalog giữ 109 loại; trạng thái nhập và khả năng runtime vẫn tách riêng.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
