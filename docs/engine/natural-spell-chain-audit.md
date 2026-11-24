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
Hai mode mới thêm vào validation, dự kiến 134 bước/124 browser report;
không bỏ các bước cũ, giữ timeout workflow 25 phút.

## Điểm dừng và phần còn lại

Chốt C4c/CI/artifact rồi dừng. C4 còn root có lựa chọn/chi phí riêng,
terminal/rejection chưa có hành trình nhiều lượt tương đương và checklist
đóng cuối; coverage thành phần C3 vẫn tách khỏi audit new-game này.
Ước lượng C4 tổng thể vẫn 2–3 ngày công, cập nhật theo lỗi tìm được.
Sau đóng Chain giữ U1 bộ tạo bài riêng rồi Windows 11 desktop thực.
Chưa đóng gói/bàn giao beta; Windows runner không thay desktop W1.

## Bằng chứng

Đang chốt hồi quy và CI đúng source; số dự kiến chưa là kết quả nghiệm thu.
