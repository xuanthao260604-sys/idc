# Rà soát tương tác Magic Jammer — 28/10/2026

Bổ sung kiểm thử sau [mốc mở Counter Trap](magic-jammer.md), giữ nguyên
catalog 111 loại/16 hiệu ứng, 12 scope và 18 snapshot. Không đổi engine,
giao thức, UI sản phẩm, dữ liệu nhập, review, deck mẫu hoặc artwork.
Mục này kiểm tra việc dùng các hiệu ứng đã mở liên tiếp sau khi phủ nhận;
không mở thêm lá bài hoặc luật.

## Cơ sở và phạm vi

Dùng các review hiện hành trong data/reviews/magic-jammer.effects.json,
magician-faith.effects.json, ookazi.effects.json, tribute-doomed.effects.json,
reincarnation.effects.json và các review FLIP/Phép của pilot, LP.
Mỗi review vẫn pin definition và format revision 4. Cơ sở phủ nhận,
chi phí và thời điểm Set ghi tại [review nguồn Magic Jammer](../rules/magic-jammer-review.md).
Không lấy dữ liệu mới hoặc tự chuyển văn bản thành hiệu ứng.

Magic Jammer chỉ xử lý pattern Normal Spell + Counter đã duyệt. Sau đó
Faith và Phép được lấy lại dùng các Chain mới độc lập. Phủ nhận activation
cũ không gắn một cờ vô hiệu vĩnh viễn lên lá đã về Mộ/tay. Phép cần trả
chi phí phải trả lại cho activation mới; chi phí của activation trước vẫn
ở Mộ. FLIP đòi sự kiện lật phù hợp; bỏ quái FLIP từ tay làm cost không
đáp ứng điều kiện đó. Không suy rộng thành mọi trigger bỏ bài đều bị cấm.

Chưa mở Counter Trap khác, Chain hỗn hợp/phủ nhận tổng quát, SEGOC,
Quick-Play, protection hoặc replacement. Metadata nhập và historical text
pending giữ nguyên; kết quả runtime không nâng các cờ snapshot nhập.

## Kịch bản bổ sung

20 ca tools/magic-jammer-interactions.test.ts, đối xứng A/B:

| Kịch bản | Kết quả được kiểm tra |
| --- | --- |
| Ookazi bị phủ nhận → Faith lấy lại → dùng từ tay hoặc Set | Không gây sát thương ở activation cũ hoặc khi lấy về; activation mới có link sạch và chỉ gây 800 khi xử lý; bản ở Mộ đối thủ giữ nguyên |
| Tribute to The Doomed/Monster Reincarnation bị phủ nhận → Faith lấy lại → dùng mới | Mục tiêu ban đầu giữ nguyên, cost cũ không hoàn lại và không được tái dùng từ Mộ; cost mới trả một lần, mục tiêu chỉ di chuyển khi activation mới xử lý |
| Bỏ Faith/Hane-Hane/Man-Eater Bug cho Magic Jammer | Không tự FLIP, không tạo decision/trigger hoặc tác động quái/LP; cost đến đúng Mộ chủ sở hữu |
| Bỏ Ookazi cho Counter → đến Main lượt chủ lá → Faith lấy lại | Không gây sát thương do bỏ bài/lấy lại; không Flip Summon trong lượt đối thủ; lượt hợp lệ mới lấy lại và kích hoạt Phép riêng |
| Set Magic Jammer bằng action thật | Cùng lượt Set bị từ chối không trả cost/lật bài; sang lượt đối thủ có thể phản hồi Phép mới |
| Handle/receipt sau lấy lại Phép | Handle Phép cũ bị từ chối; retry receipt Counter cũ không đụng Chain mới hoặc trả cost lần hai; lệnh mới dùng handle Counter/Chain cũ bị từ chối, public facts A/B giống nhau |

Fixture chỉ chuẩn bị trước hành động đầu/tạo adapter. Từ đó mỗi bước
engine kiểm invariants và input không bị sửa; chuyển lượt qua action,
không gán lại phase hoặc state. Kiểm lựa chọn Faith loại Phép của đối thủ
và Trap khỏi danh sách; gửi lựa chọn sai giữ nguyên decision/state.
Adapter kiểm retry trong bộ nhớ, chưa phải chống lặp qua restart/online.

Hai browser mode --magic-jammer-interactions=a/b thao tác UI/HTTP thật:
Tribute to The Doomed bỏ Ookazi, chọn Battle Ox; đối thủ dùng Magic Jammer
bỏ Magician of Faith. Sau hai Pass, Battle Ox còn nguyên, Ookazi/Faith
đã trả vẫn ở Mộ, không sát thương hoặc decision FLIP. Faith trên sân chủ
Phép Flip Summon, chọn Tribute to The Doomed trong hai Phép ở Mộ mình;
đối thủ không thấy lựa chọn. Lấy lại không tự xử lý Phép. Activation mới
bỏ Skull Servant, lại chọn Battle Ox và chỉ phá nó sau hai Pass.

Kiểm preview cost/target/source, Chain lần lượt dài 2/1/1, LP 8000/8000,
deck không bốc, không dùng Normal quota; nguồn Phép/Bẫy và từng lá trả
cost đến Mộ đúng một lần ở cuối kịch bản, facts phân biệt phủ nhận Phép
với phá quái và giống ở hai ghế.
Saved deck A/B giữ nguyên. Fixture mới tách khỏi setup sân mặc định,
không sửa state sau khởi động server hoặc thêm test mode cho beta CLI.

## Kết quả

Linux đạt 1050/1050 test trong 41 file, 60/60 bước validation và 50 browser
report bằng Chromium 154.0.8037.57, runtimeExceptions=0. Đã đọc report tại
artifacts/platform-validation/2026-10-28T07-01-33-337Z-31860/report.json;
kiểm mỗi bước browser có đúng một report, khớp host và có version.
Đã đọc log đủ 20 ca audit mới, 122 ca Counter gốc, cả hai browser mode
tương tác và bốn mode Counter gốc. Tất cả cờ kết quả hai mode audit đạt.

18 bundle nhập giữ 111 định nghĩa/95 verified/16 historical pending.
Toàn capabilities JSON giống mốc Counter trước: runtime 111 loại,
16 hiệu ứng/12 scope, 18 snapshot; Magic Jammer vẫn có review Counter
riêng, metadata nhập pending/not-started/not-run. Không có diff trong
data, packages hoặc apps. Hai trận tự nhiên giữ kết quả: pilot 16 lượt/
339 lệnh, B thắng LP 0/4200; expanded 13 lượt/263 lệnh, A thắng LP 6300/0.
Trận expanded dùng Earthquake/Faith; bằng chứng Magic Jammer nằm ở các
fixture Counter và audit, không gán cho trận tự nhiên khi chưa dùng nó.

Windows và Ubuntu CI đã đạt trên source commit
5cf0b44466d53db9f5e8f14ddec4a26a3fad8c77,
[run 40647620101](https://github.com/xuanthao260604-sys/idc/actions/runs/40647620101).
Đã tải/đọc artifact windows-validation-40647620101-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62. Windows đạt 1050/1050 test (41 file), 60/60 bước,
50 browser report; từng bước browser có đúng một report khớp host/version,
runtimeExceptions=0. Đã đọc log đủ 20 ca mới, 122 ca Counter gốc,
18 bundle/111 lá, hai report audit A/B và bốn report Counter gốc.
Tất cả cờ audit đạt, Chain dài lần lượt 2/1/1, LP giữ 8000/8000.

Toàn capabilities JSON giống Linux và mốc Counter trước. Hai trận tự
nhiên có kết quả giống Linux. Report ghi windows11DesktopVerified=false tại
artifacts/ci-magic-jammer-interactions/2026-10-28T07-03-41-226Z-8664/report.json.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
