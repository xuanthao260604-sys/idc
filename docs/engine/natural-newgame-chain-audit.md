# C4b — new-game seeded, Set/rút thật, concede/reset

Ngày 24/11/2026. Kế thừa C4a `691a2bf`, báo cáo `2361f8f`.
Default vẫn v6; chưa đóng toàn bộ C4 hoặc Chain/beta.

## Đầu vào và giới hạn

`naturalChainStart` trả nguyên object freeze từ `createDuel`: lượt 1/Draw,
LP 8000, board/Mộ trống, quota khởi tạo chuẩn. Không clone rồi sửa zone,
LP, lượt, phase, quota, marker, RNG, Chain hoặc receipt. Test so toàn bộ
state với một lần createDuel mới dùng cùng input.

Hai deck 40 lá hợp lệ được chọn trước khi tạo trận, mỗi người ba Seven/ba
Trap Hole. Dùng seed cố định và nghịch đảo hoán vị shuffle để chọn thứ tự
deck đầu vào tái lập được tay/rút. Engine vẫn chạy shuffle HMAC, deal và
Draw bình thường. Đây là **new-game deterministic với đầu vào đã chọn**,
không phải mẫu ngẫu nhiên bất kỳ hay kiểm phân bố xác suất. Seed không được
thêm vào HTTP/beta CLI và không gửi cho client; không có endpoint sửa state.

Actor mở đầu có ba Seven/hai Trap và Skull Servant sau lần rút đầu; đối
thủ có ba Trap/hai Seven. Battle Ox được rút thật ở lượt 2/3, Seven cuối
được rút ở lượt 4. Mọi nguồn dùng sau đó đều được Set qua lệnh trong trận.
Deck test lưu ở store riêng/in-memory hoặc thư mục tạm, không dùng thư
mục deck thật của người dùng.

## Hành trình

| Lượt | Các thao tác thật |
| --- | --- |
| 1 | Hai Pass cho draw response, sang Standby/Main; actor Set ba Seven và hai Trap vào năm ô. |
| 2 | Đối thủ rút Battle Ox, Set ba Trap và hai Seven, giữ quái trên tay. |
| 3 | Actor rút Battle Ox, Summon hợp lệ. Ba Trap → năm Seven tạo tám link; hai owner cleanup. LP theo vai trò còn 5000/6000; quái bị phá đúng một lần. |
| 4 | Đối thủ rút Seven thứ ba, Set thật rồi Summon quái đã rút ở lượt 2. Hai Trap cũ tạo Chain mới. Seven vừa Set bị từ chối trước phí/lật nguồn. |
| 4 | Sau resolution, pending cleanup có hai Trap của actor. Hủy đầu hàng không đổi state; xác nhận đầu hàng từ owner hoặc non-owner xóa frame/decision/Chain nhưng giữ các nguồn đang chờ trên sân, không hoàn phí. |
| Reset | Nhập deck lỗi không đổi deck/state; hủy Trận mới giữ kết quả. Reset qua UI/API tạo duelId mới, lượt 1/8000 LP/board trống; request cũ không tác động trận mới. Deck A/B và file lưu giữ nguyên, lệnh mới vẫn được nhận. |

Tám test trace: hai actor × Main1/Main2 ở Chain lượt 3 × owner/non-owner
concede. Mỗi trace chạy engine và command adapter song song từng lệnh,
kiểm clock/input/invariant, private keys và receipt. Hai ca HTTP thêm kiểm
store A/B trên đĩa tạm, import lỗi, reset retry, receipt cũ và giữ nguyên
byte file. Tổng mười test mới, không tính engine/adapter thành ca riêng.

Hai browser `--natural-chain=a|b` đi qua DOM/UI/HTTP thật. Mode A Main1 và
owner concede; B Main2 và non-owner concede. Có 95/99 lệnh trước reset,
Chain `[8,2]`, năm phí, tất cả Set/Draw thực hiện trong trận. Activity được
thu theo duelId/stateVersion trước giới hạn 60 mục; command mới sau reset
không ghi đè lịch sử trận cũ. Hai mode được thêm vào validation, dự kiến
132 bước/122 report; giữ các bước cũ và timeout workflow 25 phút.

## Điểm dừng

Chốt C4b và CI/artifact rồi dừng. Chưa coi các họ/nhánh khác hoặc checklist
đóng Chain là đã hoàn tất: còn audit new-game họ Phép/Counter, các nhánh
terminal/rejection và hồi quy/bảo toàn dữ liệu ở source chốt cuối. C4 tổng
thể vẫn ước lượng 2–3 ngày công cần cập nhật theo lỗi thực tế. Sau đóng
Chain giữ bộ tạo bài riêng và Windows 11 desktop thực; chưa đóng gói hoặc
bàn giao beta, không dùng runner thay cho desktop W1.

## Bằng chứng

Đang chốt hồi quy và CI đúng source; số dự kiến chưa là kết quả nghiệm thu.
