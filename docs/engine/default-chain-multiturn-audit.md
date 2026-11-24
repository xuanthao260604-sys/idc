# C4a — audit nhiều lượt đầu tiên trên default v6

Ngày 24/11/2026. Kế thừa default v6 `f553737`, báo cáo `fadd3b3`.
Đây là một phần C4, chưa đóng Chain/beta. Không sửa engine, protocol, UI,
server, dữ liệu bài, review/evidence, ảnh hoặc deck nguồn.

## Hành trình

Fixture chỉ chuẩn bị board ban đầu ở lượt 3, LP 4001/3001 và deck hợp lệ
40 lá mỗi người. Mỗi owner đúng ba Seven; năm ô S/T đầy lúc đầu. Có sẵn
Faith úp từ lượt trước. Chỉ sắp deck đầu vào để lượt 5 rút Skull Servant;
lần rút thật vẫn đi qua phase Draw. Không đổi state/receipt giữa hành trình.
Đây chưa phải trận bắt đầu từ new-game/shuffle thông thường, cũng không
phải bằng chứng hoàn thành toàn bộ ma trận C4.

| Lượt | Lệnh và kết quả |
| --- | --- |
| 3 | Triệu hồi Battle Ox; ba Trap Hole rồi năm Seven, tám link. Người triệu hồi trả ba phí, đối thủ hai phí. Quái bị phá đúng một lần; hai owner chọn cleanup riêng. Còn 1001 LP mỗi người. |
| 3 | Reincarnation bỏ Hane-Hane, lấy lại đúng Battle Ox. Summon lần nữa bị từ chối vì quota; cost/discard không kích hoạt FLIP. |
| 4 | Đối thủ Set Magic và Seven thứ ba thật vào ô vừa giải phóng, rồi triệu hồi Battle Ox của họ. Hai Trap Hole của người đầu tạo Chain mới. Seven vừa Set bị chặn trước phí/lật nguồn. Quái bị phá một lần; cleanup/context không dùng lại Chain cũ. |
| 5 | Cùng Battle Ox được triệu hồi lại hợp lệ sau reset quota. Tribute bỏ Skull Servant vừa rút để phá chính quái đó. Flip Faith lấy lại đúng Reincarnation đã dùng ở lượt 3. |
| 5 | Reincarnation có discard mới Man-Eater Bug/target GY hiện tại; Magic đáp Phép, rồi cùng owner Magic dùng Seven cuối sau khi đối phương nhường quyền. Phí thứ sáu trả thật: 1001→1. Root Phép tiếp tục một lần, Battle Ox trở về tay. Quota vẫn dùng rồi nên Summon tiếp bị chặn. |
| 5 | Ookazi gây sát thương thật kết thúc trận. Người đầu còn 1001 LP, đối thủ 0; frame/decision/Chain không còn treo. |

Ba Chain chính dài `[8,2,3]`, root/link ID riêng. LP theo vai trò:
4001/3001 → 3001/3001 → 3001/2001 → 2001/2001 → 2001/1001 →
1001/1001 → 1001/1 → 1001/0. Không hoàn phí. Bốn discard là chi phí
Reincarnation hai lần, Tribute và Magic; chỉ Faith được kích hoạt FLIP.

## Kiểm bảo vệ

Tám test mới: hai ghế × Main1/Main2 ban đầu × natural/reverse cleanup.
Mỗi ca chạy cùng trace engine và command adapter theo từng lệnh, kiểm input
bất biến, clock +1, invariant, tay/LP giữa hai đường và receipt retry.
Chỉ có tám test, không đếm riêng engine/adapter thành 16 ca.

Lưu frame/receipt của Chain tám link để kiểm lịch sử phí không bị viết lại;
frame đó không được dùng làm binding hiện tại. Gắn frame cũ vào Chain mới
bị invariant từ chối. Decision/option, Summon handle và Counter intent cũ
không làm đổi state mới; retry command ID cũ vẫn trả cùng receipt nhưng
view là state hiện hành. Không lộ frame/snapshot/digest; decision riêng
từng owner, thứ tự Mộ kiểm sau commit đủ owner, không kiểm quá sớm.

Hai mode browser `--default-audit=a|b` dùng loader mặc định thật, UI/HTTP
thật sau setup: 84 lệnh thành công, lượt 3–5, hai cách xếp thứ tự đại diện.
Thu activity từ response từng command vào Map trước giới hạn 60 mục;
kiểm đủ lịch sử phí/discard/phá/quay về tay/sát thương và facts chung hai
ghế. Deck A/B giữ nguyên. Thêm hai mode vào validation; artifact đúng source đã xác nhận 130 bước/
120 browser report, không bỏ bước cũ hoặc đổi timeout workflow 25 phút.

Trong lúc viết harness đã sửa kỳ vọng cleanup để đợi cả hai owner commit,
đóng cửa sổ phản hồi Summon trước Phép kế tiếp, và dùng Set Trap cho Magic.
Không sửa luật/engine hoặc bỏ guard để qua các trường hợp đó.

## Điểm dừng

Chốt C4a và artifact rồi dừng. C4 còn audit các họ/nhánh chưa phủ, trận
new-game tự nhiên không sửa board, reset/concede/terminal và bảo toàn dữ
liệu/deck trong cùng source cuối, cùng checklist đóng Chain ở roadmap.
Ước lượng C4 tổng thể 2–3 ngày công cần cập nhật khi có lỗi; chưa đóng
Chain. Sau Chain giữ bộ tạo bài riêng và Windows 11 desktop thực; chưa
đóng gói/bàn giao beta hoặc dùng Windows runner thay desktop W1.

## Bằng chứng

Code `691a2bfe86666acb38fb051dd5d13d4adb242d92` tại [CI 45347734575](https://github.com/xuanthao260604-sys/idc/actions/runs/45347734575), attempt 1.
Ubuntu job `138286279690`, Windows job `138286280063` đều completed/success.
Đã đọc log Ubuntu: checkout SHA khớp code; **6922/6922 test/73 file**,
typecheck, cards:check/build và vanilla/mixed smoke đạt. Local đạt cùng
**6922/6922 test/73 file**, typecheck, cards:check/build và hai smoke.
Tám test mới là tám trace có engine/adapter song song; 72 suite cũ giữ số
ca, 163 migration case/142 golden không đổi hoặc tái sinh.

Linux local chạy đủ hai mode default-audit-a/b, Chrome/154.0.8037.57,
84 lệnh mỗi mode, Chain [8,2,3], sáu phí, lượt cuối 5 và runtimeExceptions=0.
Không chạy lại bộ 130 bước đầy đủ trên Linux local trong chu kỳ này;
Ubuntu CI không chạy browser tổng hợp. Không lấy số Windows điền Linux.

Artifact `windows-validation-45347734575-1`, ID `14900395939`;
SHA-256 ZIP khớp metadata GitHub:
`1692c78dc5bb7007dc4c3052808206e9b1b513c2739916ab6e87060ff72d47b4`.
Report `2026-11-24T07-24-50-606Z-8744/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0,
npm 11.17.0, Edg/157.0.4341.60: **6922/6922 test/73 file,
130/130 bước, 120/120 browser report**, runtimeExceptions=0.

Đã đọc đủ 130 raw step log, đối chiếu mọi JSON browser/report/platform.
So baseline default-v6 `windows-validation-45337089591-1`, source `f553737`:
giữ đủ 128 bước và 118 browser facts cũ khi bỏ riêng browserVersion;
capabilities.log nguyên byte. Hai report audit mới Windows khớp Linux
khi bỏ platform/browserVersion, gồm 84 lệnh và toàn bộ timeline LP. ZIP
baseline cũng khớp metadata đã lưu; không ghép evidence khác source.

Hash sau hồi quy xác nhận engine/protocol, UI/server, dữ liệu/review/
evidence, ảnh/frame/back, deck nguồn, mọi test cũ và golden nguyên byte.
README giữ prefix cũ; capability default v6 không đổi. Chỉ thêm fixture/
test/browser audit, hai mode validation và tài liệu. Không thay luật hoặc
review để làm hành trình đi qua.

Các lỗi lúc viết harness là kiểm thứ tự Mộ trước commit đủ owner, dùng
Set Spell cho Magic (là Trap) và bỏ qua cửa sổ phản hồi sau Summon trước
Phép kế tiếp. Đã sửa driver/expectation theo hợp đồng hiện có; không nới
invariant hoặc sửa engine. Source cuối đạt như trên. Commit chốt sau CI
chỉ cập nhật tài liệu [skip ci]; bằng chứng code thuộc `691a2bf`.

Dừng ở C4a. Kết quả này là hành trình thật sau fixture turn 3, không phải
trận new-game tự nhiên và chưa đủ checklist đóng toàn bộ Chain. C4 còn
các họ/nhánh khác, new-game, reset/concede/terminal và bảo toàn dữ liệu ở
source cuối. Sau khi đóng Chain mới tới bộ tạo bài riêng rồi Windows 11
desktop thực. Report windows11DesktopVerified=false; chưa đóng gói hoặc
bàn giao beta.
