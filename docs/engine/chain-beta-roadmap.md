# Lộ trình Chain, bộ tạo bài riêng và Windows 11

Ngày lập: 09/11/2026. Trạng thái: đề xuất phạm vi và ước lượng, chưa phải
review luật hoặc bằng chứng đã triển khai. Hoàn thành từng mốc rồi dừng báo
cáo; không tự mở rộng sang mốc khác khi hướng thực hiện chưa rõ.

## Điểm xuất phát đã xác nhận

Nhánh work ở `11b7272`, cha trực tiếp là `ae2d567`. Commit chốt chỉ sửa
bốn file tài liệu. CI `42198431280` chạy source `ae2d567`, Windows/Ubuntu
thành công: 3603 test/60 file; artifact Windows đạt 112 bước/102 browser
report, không runtime exception. Chi tiết và giới hạn nguồn Linux tại
[audit Trap Hole bốn liên kết](trap-four-interaction-audit.md).
Không chạy lại audit đã hoàn thành chỉ để khởi động lộ trình này.

Runtime có 112 định nghĩa, 95 quái thường và 17 lá hiệu ứng trong 13 scope.
Đây không phải 112 hiệu ứng đã triển khai. Dữ liệu nhập 95 verified và
17 historical pending giữ độc lập với review/runtime/test. Chain hiện hỗ
trợ các pattern được pin tới bốn liên kết; chưa có Chain tổng quát.
Windows CI không thay thế Windows 11 desktop thực tế.

C1 đã hoàn tất phần thiết kế tại [ma trận Chain beta](chain-beta-scope.md):
giữ pool hiện có, tổng quát hóa S → Magic Jammer → Seven và prefix Trap Hole
→ Seven trong giới hạn copy/zone; gồm trường hợp nhiều Trap Hole trước Seven.
Bound suy từ các họ này là tối đa tám link, không phải giới hạn luật chung.
Các tổ hợp mới chưa mở; v5 vẫn active, phải qua candidate/review trước C3.

## Mốc cần hoàn thành

Thời gian dưới đây là ngày công tập trung, khoảng 6–8 giờ/ngày, gồm sửa lỗi,
kiểm thử và báo cáo từng mốc. Không phải thời gian chạy CI hoặc cam kết lịch.

| Mốc | Nội dung và đầu ra | Điều kiện hoàn thành | Ước lượng |
| --- | --- | --- | --- |
| C1 — Chốt phạm vi Chain beta | Ma trận cửa sổ, speed, root/response, số bản sao hợp lệ và pattern cho pool được chọn; phân biệt phần hiện có/phải bổ sung/ngoài beta. Đánh giá giới hạn bốn link và cách tiến tới dispatcher dùng chung. | Có danh sách pattern và ca từ chối cụ thể, căn cứ luật đủ cho phần mới, tiêu chí nghiệm thu được chốt trước thay engine. | 1–2 ngày |
| C2 — Nền tảng xử lý dùng chung | Thiết kế và triển khai từng phần dispatcher/resume/cleanup thay sự phụ thuộc vào từng độ dài Chain, giữ adapter và review gate. Duy trì các pattern cũ trong lúc chuyển đổi. | Test LIFO, hai Pass/priority, cost không hoàn, activation/effect negation tách biệt, source/link identity, pause/resume một lần và terminal/concede đạt; không bật capability chưa review. | 3–5 ngày |
| C3 — Nối phạm vi beta | Mở đúng các tổ hợp đã chốt ở C1 bằng hành động thật; discovery, preview, quyết định riêng tư và public facts cùng phản ánh khả năng server. | Ma trận A/B, cùng/khác chủ, LP biên, Main1/Main2, tay/Set, stale/retry/handle và cleanup đạt; kiểm chuỗi dài hơn bốn chỉ khi C1 duyệt và fixture tuân thủ giới hạn bản sao. | 2–4 ngày |
| C4 — Audit và đóng Chain beta | Hành trình nhiều lượt qua các pattern C1, hồi quy pool cũ, lỗi nhập bảo toàn dữ liệu/deck, toàn bộ bộ kiểm chứng Linux và Windows CI. | Đạt checklist đóng Chain bên dưới; report/log khớp cùng source SHA, ghi rõ phần chưa hỗ trợ. | 2–3 ngày |
| U1 — Bộ tạo bài riêng giới hạn | Namespace custom, revision, nhập/sửa/lưu/xuất tên, ảnh và thuộc tính; chỉ chọn mẫu hiệu ứng đã có handler/review. Kiểm tra file lỗi và dùng deck custom riêng. | Lưu/mở lại đúng; lỗi không phá dữ liệu/deck cũ; không eval văn bản hoặc mã tải lên; bài custom không tự xuất hiện trong pool chính thức. | 4–7 ngày |
| W1 — Kiểm chứng Windows 11 | Chạy đúng source trên Windows 11 desktop: khởi động, đường dẫn Unicode/khoảng trắng, Edge/Chrome, seat/privacy, deck/custom save/restart và các hành trình Chain đại diện. | Có report tự động và checklist thao tác thực tế, OS/browser/source rõ; sửa xong lỗi chặn. Cần môi trường Windows 11 thực. | 1–3 ngày khi có môi trường |
| B1 — Chốt khả năng bàn giao beta | Tổng hợp phạm vi, hạn chế, hướng dẫn chạy/sao lưu và danh sách lỗi còn lại. | C4, U1, W1 đạt nếu bộ tạo bài riêng nằm trong beta đích; người dùng yêu cầu đóng gói/bàn giao thì mới thực hiện phần đó. | 1–2 ngày, chưa gồm đóng gói |

Thứ tự đề xuất: C1 → C2 → C3 → C4 → U1 → W1 → B1. Kiểm thử Windows CI
duy trì trong các mốc code, không đợi W1 mới xét tương thích Windows.
Mốc C1 phải quyết định phần nào thực sự cần tổng quát hóa; ước lượng C2/C3
sẽ cập nhật sau khi thiết kế được chốt. Không mặc định thêm Quick-Play hoặc
lá mới để chứng minh Chain: mọi lá/pattern mới cần review riêng.

## Điều kiện kết thúc phần Chain

“Đóng Chain beta” là đạt trọn phạm vi C1 đã chốt, không phải hoàn thành mọi
luật Chain của Yu-Gi-Oh!. Chỉ đóng C4 khi đồng thời đạt:

1. Có ma trận capability có phiên bản; mọi pattern được công bố đều có
   activation/resolution thực, còn pattern ngoài scope bị từ chối trước
   mutation. Không dùng số lượng test hoặc một chuỗi rất dài làm tiêu chí duy nhất.
2. Timing/priority/speed, LIFO, phí, nguồn/target, negate và cleanup đúng
   căn cứ được review cho từng pattern; không mở response giữa resolution.
3. Quyết định pause/resume, retry/stale, link/handle cũ, kết thúc trận và
   tạo trận mới không làm trả phí/xử lý hai lần hoặc giữ context cũ.
4. UI và PlayerView thống nhất với server; không lộ tay/deck/bài úp hoặc
   journal nội bộ; hủy preview không thay state.
5. Có test engine, adapter/HTTP và UI thật, gồm hành trình nhiều lượt;
   test fixture ban đầu được ghi riêng với trận tự nhiên.
6. Toàn bộ kiểm chứng bắt buộc trên Linux và Windows CI đạt cùng source
   cuối; đọc artifact, đối chiếu raw log/report và giải thích mọi khác biệt
   với baseline. Số test/bước/report cập nhật theo thực tế, không hứa giữ số cũ.
7. Không còn lỗi đã biết chặn phạm vi C1; dữ liệu/review cũ, khung/mặt sau
   và deck lưu được bảo toàn. Các giới hạn còn lại được ghi rõ trong báo cáo.

SEGOC tổng quát, Trigger mới giữa/sau Chain, Damage Step nâng cao,
modifier/replacement, Continuous/Quick-Play, summon-negation và các nhóm
hiệu ứng ngoài pool không tự thuộc phạm vi beta này. C1 phải liệt kê chính
xác ngoại lệ nào cần có. Nếu yêu cầu beta đổi thành tương thích đầy đủ Goat,
phải mở lại phạm vi/ước lượng; không coi C4 là đã đạt mục tiêu đó.

## Beta và mục tiêu sau Chain

C4 là điểm kết thúc phần Chain để chuyển sang bộ tạo bài riêng. Nó chưa
cho phép đóng gói hay bàn giao beta. Lộ trình đề xuất giữ bộ tạo bài riêng
giới hạn trong beta đích; đây là lựa chọn phạm vi cần chốt ở C1, không phải
khẳng định editor hiện đã có hoặc mọi hiệu ứng tự tạo đều chạy được.

U1 dùng mẫu hiệu ứng đã hỗ trợ. Thêm cơ chế hiệu ứng mới là công việc riêng,
cần handler/review/test mới và không nằm trong ước lượng editor ban đầu.
Thay toàn bộ bài và hình ảnh bằng nội dung riêng là giai đoạn U2 sau đó:
ước lượng kỹ thuật sơ bộ 2–5 ngày nếu đã có đủ dữ liệu/ảnh hợp lệ và chỉ
dùng mẫu đã hỗ trợ; thời gian sáng tác, cung cấp nội dung và viết hiệu ứng
mới chưa thể ước lượng khi chưa biết số lượng. Không xóa catalog cũ để thay
nội dung; chuẩn bị bộ nội dung riêng có revision và chuyển đổi có kiểm tra.
Khung/mặt sau người dùng cung cấp được giữ, chỉ thay theo yêu cầu rõ ràng.

Windows 11 là nền tảng cuối xuyên suốt. W1 là gate bắt buộc trước bàn giao;
nếu chưa có môi trường thì ghi bị chặn, không dùng Windows runner để đánh
dấu desktop đã kiểm chứng. Không yêu cầu người dùng nhận beta để bù việc
chưa kiểm chứng của môi trường phát triển. Online/auth/lưu trận, AI,
Fusion/Ritual hoặc toàn bộ luật Goat không tự được thêm vào beta hotseat này.

## Tổng thời gian và điểm cập nhật

- Đóng phần Chain C1–C4: **8–14 ngày công** (khoảng 2–3 tuần làm việc).
- Chain → editor giới hạn → Windows 11 → báo cáo sẵn sàng beta:
  **14–26 ngày công** tổng cộng (khoảng 3–6 tuần làm việc).
- Dự phòng 25–35% cho thiết kế lại/lỗi liên nền tảng: nên lập lịch tổng
  **18–35 ngày công**, khoảng 4–7 tuần làm việc.

Các khoảng trên chưa gồm chờ nguồn luật, CI queue, quyền/máy Windows 11,
phản hồi phạm vi, sáng tác nội dung U2 hoặc đóng gói/phân phối. Không gán
ngày phát hành khi các phụ thuộc chưa sẵn sàng. C1 cần rà soát lại khoảng
ước lượng theo code thực; C4/U1/W1 đều có điểm dừng báo cáo riêng. Nếu
thay scope hoặc xuất hiện lỗi nền tảng, báo tác động trước khi đổi hướng.

Việc tiếp theo sau C1: C2a — validator graph và ledger ứng viên theo
[ma trận đã lập](chain-beta-scope.md), chưa bật activation mới. C2–C4 còn
ước lượng 7–12 ngày công. Tài liệu này chưa thay review active, capability
hay engine. Chu kỳ làm việc lấy 30 phút làm mốc dừng; nếu đang dở tác vụ
tại mốc đó thì hoàn thành tác vụ ấy rồi dừng báo cáo, không mở mục mới.
