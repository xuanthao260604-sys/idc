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
ghế. Deck A/B giữ nguyên. Thêm hai mode vào validation, dự kiến 130 bước/
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

Đang chốt hồi quy và CI đúng source; số dự kiến chưa là kết quả nghiệm thu.
