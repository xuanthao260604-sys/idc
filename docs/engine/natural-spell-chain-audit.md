# C4c — new-game Pot → Magic → Seven và dùng lại qua Faith

Ngày 24/11/2026. Kế thừa C4b `a9a3aea`, báo cáo `a012fdd`.
Default v6 giữ nguyên. Mục này audit riêng Pot of Greed trong họ Phép;
không coi một root là đã audit hết 11 Phép hoặc đóng toàn bộ C4/Chain.

## Đầu vào và hành trình

`naturalSpellStart` trả nguyên object frozen từ createDuel: stateVersion 0,
lượt 1/Draw, LP 8000, sân/Mộ trống. Test so cả state với createDuel mới dùng
cùng input. Seed cố định và nghịch đảo shuffle chọn thứ tự hai deck hợp lệ
40 lá trước khởi tạo. Đây là đầu vào deterministic được chọn để tái lập,
không phải mẫu ngẫu nhiên bất kỳ hoặc kiểm phân bố. Engine chạy shuffle,
deal/Draw chuẩn; không sửa state sau tạo trận, không thêm endpoint seed.
Mỗi deck có ba Seven, hai Magic, một Pot, một Faith và ba Skull Servant;
phần còn lại là các quái thường trong dữ liệu đã nhập.

| Lượt | Thao tác qua engine/adapter hoặc DOM/UI/HTTP thật |
| --- | --- |
| 1 | Pass cửa sổ Draw, actor Set ba Seven và Set Faith thật, dùng quota Normal Set. |
| 2 | Đối thủ rút thật, Set Magic và hai/ba Seven; giữ Skull làm cost. |
| 3 | Actor kích hoạt Pot từ tay ở ô trống; đối thủ Magic, bỏ Skull. Năm Seven cho Chain 7 link: Magic bị phủ nhận, Pot rút hai. Sáu Seven cho 8 link: Magic tiếp tục, Pot bị phủ nhận và không rút. |
| 4 | Đối thủ Set Magic thứ hai. Nhánh lẻ rút/Set Seven cuối; nhánh chẵn đã dùng hết sáu Seven ở Chain trước. Không tạo thêm bản sao. |
| 5 | Flip Summon Faith, chọn đúng Pot trong Mộ mình, lấy cùng instance về tay. Kích hoạt mới, root/link/handle mới, Magic thứ hai bỏ Skull khác. Nhánh lẻ dùng Seven cuối thành Chain 3, Pot rút hai; nhánh chẵn Chain 2, Pot bị phủ nhận lần nữa. |

Cả hai nhánh có sáu phí Seven thật, hai discard Magic riêng, không hoàn
cost của activation bị phủ nhận. LP cuối A/B 5000/5000, không có kết quả
kết thúc trận; frame/decision/Chain đều được dọn. Pot về Mộ đúng một bản;
Faith không bị lật do discard hoặc thao tác giả lập.

## Ma trận và bảo vệ

16 trace: hai actor × Main1/Main2 ở lượt 3 × hai nhánh chẵn/lẻ × hai thứ tự
cleanup. Mỗi trace chạy raw engine và command adapter song song từng lệnh,
kiểm input không đổi, stateVersion, invariant, LP, quyền riêng của decision,
private keys, Mộ giữ thứ tự owner chọn và phí/discard đúng số. Retry receipt
Magic đầu trả cùng outcome nhưng không đổi state mới; intent mới dùng
handle nguồn/cost/root hoặc decision/cleanup cũ bị từ chối không thu phí.
Faith lấy cùng Pot, không chèn lá mới hay sửa zone giữa hai Chain.

Hai browser `--natural-spell=a|b`: A Main1/nhánh lẻ, B Main2/nhánh chẵn.
Các tổ hợp actor/phase/parity còn lại có trong 16 trace engine/adapter,
không tính là đã chạy UI. Deck test dùng store in-memory riêng; saved A/B
giữ nguyên. Thu activity theo duelId/stateVersion trước giới hạn 60 mục,
kiểm sáu phí/hai discard, public history hai ghế và runtime exception.
Hai mode mới thêm vào validation, artifact xác nhận 134 bước/124 browser report;
không bỏ các bước cũ, giữ timeout workflow 25 phút.

## Điểm dừng và phần còn lại

Chốt C4c/CI/artifact rồi dừng. C4 còn root có lựa chọn/chi phí riêng,
terminal/rejection chưa có hành trình nhiều lượt tương đương và checklist
đóng cuối; coverage thành phần C3 vẫn tách khỏi audit new-game này.
Ước lượng C4 tổng thể vẫn 2–3 ngày công, cập nhật theo lỗi tìm được.
Sau đóng Chain giữ U1 bộ tạo bài riêng rồi Windows 11 desktop thực.
Chưa đóng gói/bàn giao beta; Windows runner không thay desktop W1.

## Bằng chứng

Code `b80c7301b6705d6ac016362c3c2d0d259a2efc1e` tại [CI 45361921064](https://github.com/xuanthao260604-sys/idc/actions/runs/45361921064), attempt 1.
Ubuntu job `138333851890`, Windows job `138333851445` đều completed/success;
đã đọc log checkout SHA khớp code ở cả hai job. Ubuntu đạt **6948/6948
test/75 file**, typecheck, cards:check/build và vanilla/mixed smoke. Local
đạt cùng **6948/6948 test/75 file**, typecheck, cards:check/build và hai smoke.
Mười sáu trace mới mỗi ca mirror engine/adapter, không tính đôi số test;
74 suite cũ giữ số ca, 163 migration case/142 golden nguyên byte.

Linux local chạy hai mode natural-spell-a/b trên Chrome/154.0.8037.57,
99/102 lệnh, Chain [7,3]/[8,2], sáu phí/hai discard, lượt cuối 5,
LP A/B 5000/5000, runtimeExceptions=0. Không chạy lại bộ 134 bước tổng
hợp trên Linux local; Ubuntu CI không chạy browser tổng hợp. Không lấy
số Windows làm số nghiệm thu Linux.

Artifact `windows-validation-45361921064-1`, ID `14905559590`;
SHA-256 ZIP khớp metadata GitHub:
`e9fabcfd8d3153cc5c6a41f082e013fd2e2c0a39c2d4d976ae18c97faa519f2d`.
Report `2026-11-24T09-06-16-002Z-7492/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0,
npm 11.17.0, Edg/157.0.4341.60: **6948/6948 test/75 file,
134/134 bước, 124/124 browser report**, runtimeExceptions=0.

Đã đọc đủ 134 raw step log và đối chiếu mọi JSON browser với report,
expected count, platform/version/exception. So baseline C4b
`windows-validation-45353563068-1`, source `a9a3aea`: đủ 132 bước và
122 browser facts cũ giữ nguyên khi bỏ riêng browserVersion;
capabilities.log nguyên byte. ZIP baseline khớp metadata đã lưu. Hai report
mới Windows khớp Linux khi bỏ platform/browserVersion, gồm parity, số lệnh,
LP, rút 4/0 lá hiệu ứng, Faith lấy cùng Pot, stale handle/receipt và deck.
Không ghép evidence khác source.

Hash xác nhận engine/protocol, UI/server, dữ liệu/review/evidence,
ảnh/frame/back, deck nguồn, test cũ và golden nguyên byte. README giữ
prefix cũ; capability default v6 không đổi. Chỉ thêm fixture/test/browser
audit, hai mode validation và tài liệu; không đổi luật hoặc review.
Lúc viết driver đã sửa slot Phép sang ô trống (ba Seven chiếm ô 0–2),
và expectation thời điểm rút Magic thứ hai theo từng input parity.
Source cuối không sửa board/LP/quota/zone để đi qua các bước.
Commit chốt sau CI chỉ tài liệu [skip ci]; evidence code thuộc `b80c730`.

Dừng ở C4c, riêng root Pot of Greed với đầu vào deterministic đã chọn.
Không coi đã audit new-game đủ 11 Phép, đóng C4/Chain hoặc beta. Mục tiếp
là root có lựa chọn/chi phí riêng và checklist terminal/rejection cuối;
sau đóng Chain vẫn U1 bộ tạo bài riêng rồi Windows 11 desktop thực.
Report windows11DesktopVerified=false; chưa đóng gói/bàn giao beta.
