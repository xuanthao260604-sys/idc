# C3a — Review phạm vi Counter hữu hạn trước gameplay

Ngày 10/11/2026; kế thừa `da61c010d9346ecd36d32108cf15d0e09afb70f2`.
C3a hoàn thành phần review thiết kế. C3b chưa triển khai; C3 và Chain beta
chưa hoàn tất. Gameplay tiếp tục dùng Seven review v5.

## Phạm vi và căn cứ

[Hồ sơ có cấu trúc](../../data/evidence/effects/bounded-counter-scope-review.json)
pin 14 định nghĩa: 11 Normal Spell của C1, Magic Jammer, Seven Tools và Trap
Hole. Có 14 nguồn, 30 trích dẫn, 12 quyết định phân biệt tổng hợp luật với
hợp đồng kỹ thuật. 29 bản ghi evidence kế thừa giữ nguyên cả nội dung/ngày;
trích dẫn mới về quyền hỏi đối phương tiếp tục Chain lấy từ trang in 32 của
rulebook v5. Trình kiểm tra đối chiếu byte/hash nguồn và văn bản trích dẫn;
việc diễn giải luật vẫn là review, không phải chứng minh bằng mã.

| Họ được review | Điều kiện |
| --- | --- |
| S → Magic Jammer → Seven^n | S thuộc đúng 11 pin; n = 0..6; tối đa 8 link |
| Trap Hole^k → Seven^n | k = 1..3; cùng một lần triệu hồi đối phương hợp lệ và cùng quái gốc; n = 0..6, chịu giới hạn ô/bản sao |

Mỗi người tối đa ba Seven, ba Trap Hole và năm ô Spell/Trap. Với prefix Trap
Hole dài 1/2/3, số chuỗi owner Seven hợp lệ lần lượt 69/69/34, tổng 172;
độ dài tối đa lần lượt 7/8/8. Họ Phép có 69 chuỗi owner cho mỗi Phép gốc và
owner Magic. Đây là bound của pool/grammar đã chọn, không phải luật giới
hạn Chain tám link. Chỉ xét Main1/Main2 và Normal/Tribute/Flip Summon trong
phạm vi C1; không mở Damage Step, SEGOC hoặc Chain hỗn hợp tổng quát.

Trap Hole là Speed 2: có thể nối prefix Trap Hole trước Counter, không nối
sau Seven/Magic Speed 3. Seven chỉ đáp trực tiếp lần kích hoạt lá Trap ở
link cuối; không dùng để phủ nhận Phép, hiệu ứng quái hoặc riêng một hiệu
ứng Trap đã hoạt động. Magic chỉ đáp Phép gốc. Bài Trap phải Set từ lượt
trước, còn source/target hợp lệ và đủ phí. Chủ sở hữu giống nhau được nối
khi đối phương nhường quyền; không bỏ bước hỏi/Pass để tự nhận priority.

Xử lý ngược thứ tự, mỗi Seven còn hiệu lực phủ nhận đúng activation Trap
ngay trước nó. Chẵn/lẻ chỉ là hệ quả của họ đơn giản, không thay thuật toán
LIFO. Nếu Seven phủ nhận Trap Hole cuối, Trap Hole trước đó còn hợp lệ vẫn
có thể phá quái. Mỗi Trap Hole được kiểm target độc lập; không hồi sinh hoặc
phá lần hai quái đã rời sân. Không mở response giữa quá trình resolution.

Mỗi Seven trả 1000 LP thật ngay activation, không hoàn phí khi bị negate.
Giữ quy tắc phí đang áp dụng: LP phải lớn hơn 1000 trước lần trả; ba phí từ
cùng owner cần ít nhất 3001 LP nếu chưa có biến động khác. Receipt lịch sử
không chứng minh board hiện tại vẫn khớp source; C3b phải kiểm cả hai.
Cleanup giữ nguyên card đã rời sân, cost/discard/victim đã vào Graveyard;
nguồn sống sót xử lý theo policy thứ tự/owner đã review của dự án. Resume
lựa chọn Phép gốc chỉ một lần; terminal/concede xóa context để không xử lý
lại. Đây có phần là hợp đồng kỹ thuật, không gán toàn bộ cho luật in 2005.

## Giới hạn bằng chứng

Hai PDF được tải lại ngày review và khớp hash/byte metadata trước:

- Rulebook v5 lưu trữ: `rulebook-v05.pdf`, 681725 byte,
  SHA-256 `d02c016334f65c98a9fe900ae0b2630a3de63f63e330426ab07c55d9466dc61a`.
- Rulebook hiện đại chính thức: `current-rulebook.pdf`, 3415528 byte,
  SHA-256 `82be14641b2b7940467034a5b14b0d4037835831866537738d34fd9df5a0f444`.

URL, locator, phân loại nguồn và giới hạn từng quyết định nằm trong hồ sơ.
Bản v5 trên Archive là nguồn lưu trữ, không tự xác thực một ruling TCG 2005
riêng cho chuỗi tám link. FAQ OCG hiện hành và nguồn cộng đồng về cleanup
chỉ hỗ trợ policy được áp dụng, không biến thành bằng chứng lịch sử chính
xác. Historical printed-text review vẫn pending; metadata nhập bài không
được nâng trạng thái bởi C3a.

Raw Trap Hole cũ được metadata trỏ tới nhưng không có trong checkout khôi
phục. Đã bổ sung snapshot HTML công khai mới theo hash
`6255c0545d75981eb8ffb112924fad483715f269e954f03e63e6a3484b85fe85`
(192242 byte), đối chiếu nguyên văn điều kiện/target; không ghi đè metadata
hay bundle cũ. PDF chỉ ở cache reviewer; HTML mới nằm trong data/raw.

## Gate đề xuất và công việc C3b

Đề xuất Seven revision 6, scope
`counter-trap-reviewed-bounded-patterns-v6`, continuation
`reviewed-bounded-counter-patterns-v6`. Chưa tạo
`data/reviews/seven-tools-v6.effects.json`, chưa đưa hồ sơ thiết kế vào
runtime manifest. Schema hiện tại từ chối đề xuất v6; v5 vẫn được chọn.
Không chép snapshot/journal ứng viên thành quyền kích hoạt gameplay.

Sáu nhóm kiểm tra còn mở trong hồ sơ:

1. Thêm schema/review gate v6 và kiểm pin/continuation; không mở scope ngoài grammar.
2. Nối live frame với source/link identity, summon occurrence, cost ledger và clock; giữ kiểm tra board hiện tại.
3. Activation/discovery/preview cùng điều kiện server, priority/Pass đúng, từ chối trước mutation; Set/copy/ô/LP đầy đủ.
4. Event, cleanup, pause/resume, terminal/concede và stale/retry không tạo xử lý hoặc trả phí hai lần.
5. Ma trận lệnh thật, adapter và UI A/B, owner, phase, tay/Set, LP biên, private/public handle và nhiều lượt.
6. Linux/Windows CI cùng source, đọc artifact/raw report, đối chiếu baseline và ghi rõ chưa kiểm Windows 11 desktop.

142 golden journey cũ phải tiếp tục có căn cứ so sánh. Nếu revision/frame
v6 làm metadata state đổi, cần hợp đồng baseline có phiên bản và giải thích
khác biệt; không tái sinh golden vô điều kiện rồi coi hồi quy đã đạt.
C3b gồm nhiều chu kỳ nhỏ; giữ ước lượng C3 tổng thể 2–4 ngày công từ lộ
trình, cập nhật khi hoàn thành tích hợp đầu tiên. Sau C3 là C4 audit nhiều
lượt, U1 bộ tạo bài riêng giới hạn, rồi W1 Windows 11 thực. Chưa đóng gói
hoặc bàn giao beta.

## Kiểm chứng C3a

`npm run typecheck` và `npm run build` đạt. Có thể chạy lại kiểm tra hồ sơ
với hai PDF tải từ URL trong hồ sơ, lưu đúng tên cache ở trên:

```sh
node dist/tools/check-bounded-counter-review.js /path/to/evidence-cache
```

Cần `pdftotext` (hoặc đường dẫn executable qua `YGO_PDFTOTEXT`) trên máy
reviewer; không thêm yêu cầu này cho người chơi. Checker không tải mạng,
không ghi catalog/review/state. Kết quả: 14 pin, 14 nguồn, 30 trích dẫn khớp,
29 evidence kế thừa nguyên vẹn, enumeration 69/69/34, bound 8; v5 còn active,
v6 chưa có file và chưa được schema chấp nhận. Thử sửa sai 12 loại trường
(runtime, pin/hash/quote, tham chiếu, grammar, baseline, path, ID trùng,
loại nguồn và revision) đều bị từ chối; input không bị thay đổi.

Chạy lại suite migration v5: **163/163 ca đạt**, gồm golden và guard đang
có; đây không phải test hiệu ứng cho scope mới. Positive live tests của
scope mới vẫn **not-run**. Capabilities runtime giữ nguyên baseline C2c.
Toàn bộ file có sẵn ngoài ba tài liệu chỉ dẫn được kiểm hash bảo toàn.

CI [42590265485](https://github.com/xuanthao260604-sys/idc/actions/runs/42590265485)
trên source `898b29c` là bằng chứng baseline C2c: 4832 test/63 file,
Windows 112 bước/102 report. Không gán kết quả ấy cho proposal v6 hoặc
source C3a. Không chạy lại full CI cho hồ sơ inactive và công cụ review này;
commit C3a dùng `[skip ci]`. Windows 11 desktop vẫn chưa được kiểm chứng.
