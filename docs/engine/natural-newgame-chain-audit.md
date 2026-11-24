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
không ghi đè lịch sử trận cũ. Hai mode được thêm vào validation, artifact xác nhận
132 bước/122 report; giữ các bước cũ và timeout workflow 25 phút.

## Điểm dừng

Chốt C4b và CI/artifact rồi dừng. Chưa coi các họ/nhánh khác hoặc checklist
đóng Chain là đã hoàn tất: còn audit new-game họ Phép/Counter, các nhánh
terminal/rejection và hồi quy/bảo toàn dữ liệu ở source chốt cuối. C4 tổng
thể vẫn ước lượng 2–3 ngày công cần cập nhật theo lỗi thực tế. Sau đóng
Chain giữ bộ tạo bài riêng và Windows 11 desktop thực; chưa đóng gói hoặc
bàn giao beta, không dùng runner thay cho desktop W1.

## Bằng chứng

Code `a9a3aea5b03d44cdf2151f8c60414b7c52af274c` tại [CI 45353563068](https://github.com/xuanthao260604-sys/idc/actions/runs/45353563068), attempt 1.
Ubuntu job `138305684815`, Windows job `138305685397` đều completed/success.
Đã đọc log Ubuntu: checkout SHA khớp code; **6932/6932 test/74 file**,
typecheck, cards:check/build và vanilla/mixed smoke đạt. Local đạt cùng
**6932/6932 test/74 file**, typecheck, cards:check/build và hai smoke.
Mười test mới gồm tám trace engine/adapter song song và hai ca HTTP disk;
73 suite cũ giữ số ca, 163 migration case/142 golden nguyên byte.

Linux local chạy đủ hai mode natural-chain-a/b, Chrome/154.0.8037.57,
95/99 lệnh trước reset, Chain [8,2], năm phí, lượt cuối 4 và runtimeExceptions=0.
Không chạy lại bộ 132 bước đầy đủ trên Linux local trong chu kỳ này;
Ubuntu CI không chạy browser tổng hợp. Không lấy số Windows điền Linux.

Artifact `windows-validation-45353563068-1`, ID `14903106161`;
SHA-256 ZIP khớp metadata GitHub:
`37534f02f2ac7876925581aaa8c9cd20236dc7b6f38597d7456f91c39a4ca549`.
Report `2026-11-24T08-09-03-524Z-10100/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0,
npm 11.17.0, Edg/157.0.4341.60: **6932/6932 test/74 file,
132/132 bước, 122/122 browser report**, runtimeExceptions=0.

Đã đọc đủ 132 raw step log, đối chiếu mọi JSON browser/report/platform.
So baseline C4a `windows-validation-45347734575-1`, source `691a2bf`:
giữ đủ 130 bước và 120 browser facts cũ khi bỏ riêng browserVersion;
capabilities.log nguyên byte. Hai report mới Windows khớp Linux khi bỏ
platform/browserVersion, gồm seed/deck đã chọn, LP 8000, [8,2], 95/99 lệnh,
Set/Draw thật, concede owner/non-owner, reset và bảo toàn deck. ZIP baseline
cũng khớp metadata đã lưu; không ghép evidence khác source.

Hash xác nhận engine/protocol, UI/server, dữ liệu/review/evidence,
ảnh/frame/back, deck nguồn, mọi test cũ và golden nguyên byte. README giữ
prefix cũ; capability default v6 không đổi. Chỉ thêm fixture/test/browser
audit, store test riêng, hai mode validation và tài liệu. Không thay luật
hoặc review để làm hành trình đi qua.

Lúc viết harness đã sửa driver theo hợp đồng có sẵn: Pass cửa sổ sau Draw
đầu tiên, kiểm private key theo key chính xác (không dò chuỗi trong handle
ngẫu nhiên), replay request đúng seat sau reset, collector chấp nhận HTTP
rejection không có view. Không đổi engine/invariant hoặc bypass gameplay.
Commit chốt sau CI chỉ cập nhật tài liệu [skip ci]; evidence code thuộc
`a9a3aea`.

Dừng ở C4b. Đây là createDuel nguyên vẹn với seed và deck order đầu vào
được chọn để tái lập, không phải mẫu ngẫu nhiên bất kỳ. C4/Chain còn mở:
còn new-game họ Phép/Counter, terminal/rejection khác và checklist cuối.
Sau đóng Chain giữ bộ tạo bài riêng rồi Windows 11 desktop thực.
Report windows11DesktopVerified=false; chưa đóng gói/bàn giao beta.
