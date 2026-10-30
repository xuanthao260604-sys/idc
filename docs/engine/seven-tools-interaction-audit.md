# Rà soát tương tác Seven Tools — 30/10/2026

Công việc tiếp theo đã có [review thiết kế chuỗi Counter ba liên kết](../rules/counter-to-counter-review.md).
Review mới chưa mở runtime; kết quả triển khai và kiểm thử dưới đây giữ nguyên.

Bổ sung kiểm thử sau [mốc mở Seven Tools](seven-tools.md). Giữ nguyên
engine, protocol, giao diện sản phẩm và dữ liệu: runtime 112 loại gồm
95 quái thường/17 lá hiệu ứng, 13 scope, 19 snapshot. Mục này kiểm việc
dùng liên tiếp các hiệu ứng đã được mở; không mở thêm lá hoặc luật Chain.

## Cơ sở và giới hạn

Dùng review riêng của Seven Tools, Magic Jammer, Dian Keto, Ookazi,
Hinotama và các hiệu ứng FLIP hiện có. Các review vẫn pin định nghĩa và
format revision 4. [Review nguồn Seven Tools](../rules/seven-tools-review.md)
giữ căn cứ trả 1000 LP, cần LP > 1000, điều kiện Set và direct-chain;
không lấy dữ liệu mới hoặc tự suy hiệu ứng từ tên/loại lá bài.

Trap Hole → Seven Tools vẫn chỉ là một pattern hai liên kết. Phép hồi LP,
Magic Jammer và sát thương ở đây chạy trong những Chain mới đã được hỗ trợ,
sau khi Chain cũ đóng. Không gọi việc dùng Magic Jammer ở Chain sau là
phản hồi Seven Tools hoặc mở Chain hỗn hợp. Chi phí LP giữ nguyên đã trả;
hồi LP là hiệu ứng riêng, không phải hoàn lại cost.

Chưa mở Counter-to-counter, prefix nhiều Trap Hole trước Seven Tools,
Damage Step input, cost reducer/payment trigger, SEGOC, protection hoặc
replacement. Không sửa metadata nhập pending/not-started/not-run để
đánh dấu hiệu ứng hoạt động; khả năng runtime tiếp tục ghi riêng.

## Kịch bản kiểm thử

16 ca tools/seven-tools-interactions.test.ts, đối xứng A/B:

| Kịch bản | Kết quả được kiểm tra |
| --- | --- |
| Trả phí còn 1 LP → Dian Keto → Flip Summon và Seven Tools thứ hai | Hồi chỉ khi Phép xử lý: 1 → 1001; Chain mới trả đúng 1000 về 1, hai quái còn nguyên, marker/quota giữ nguyên, không được Normal Summon lần hai |
| Magic Jammer phủ nhận Dian Keto | LP vẫn 1; Seven Tools kế tiếp bị chặn trước lật/trả phí, Trap Hole mới vẫn phá quái Flip Summon; quái được cứu trước đó giữ nguyên |
| Ở 1 LP, tự dùng Magic Jammer ở Chain mới, bỏ Faith/Hane-Hane/Man-Eater Bug | Chỉ trả chi phí bỏ bài, không trừ LP lần nữa hoặc hoàn LP cũ; không FLIP/decision/trigger, Hinotama bị phủ nhận không gây sát thương |
| Sang lượt đối thủ, Ookazi nhắm người còn 1 LP | Không thua do trả cost; activation và Pass đầu chưa gây sát thương, chỉ xử lý hiệu ứng mới gây 800 và đưa LP về 0/kết thúc trận |
| Faith lấy lại Dian Keto đã dùng | Loại Seven Tools, Trap Hole mình và đối thủ khỏi lựa chọn; lấy về tay không tự hồi LP hoặc hoàn phí; dùng lại Phép mới hồi, Seven Tools tiếp theo có journal LP mới |
| Receipt/handle cũ ở Chain sau | Retry cost cũ trả receipt cũ, không đụng Chain hồi/Trap mới hoặc trả lần hai; handle cũ trong lệnh mới bị từ chối; hai ghế thấy cùng facts |

Fixture chỉ chuẩn bị trước hành động đầu. Mỗi transition kiểm invariants
và input không bị sửa; chuyển lượt/phase bằng action thật. Kiểm cleanup
nguồn/cost ở đúng Mộ, đúng một lần. Chống lặp thuộc adapter trong bộ nhớ,
chưa phải lưu receipt qua restart hoặc xác thực online.

Hai browser mode --seven-tools-interactions=a/b thao tác mouse/UI thật:

1. Normal Summon Battle Ox, Trap Hole, Seven Tools: 1001 → 1.
2. Dian Keto xử lý trong Chain mới: 1 → 1001.
3. Flip Summon Celtic Guardian, Trap Hole thứ hai, Seven Tools thứ hai:
   trả về 1; thử Hủy trước xác nhận giữ nguyên LP/state version.
4. Tự kích hoạt Hinotama, sau đối thủ Pass dùng Magic Jammer bỏ Man-Eater
   Bug: không FLIP hoặc sát thương, LP vẫn 1; cả hai quái giữ nguyên.
5. Chuyển lượt qua phase thật, đối thủ dùng Ookazi: chỉ khi xử lý mới
   gây 800, LP về 0 và kết thúc trận. Chi phí hai lần trước vẫn là hai
   fact lp-cost riêng, không cộng thành effect-damage.

Kiểm Chain lần lượt dài 2/1/2/2/1, không reset Normal quota, LP hồi/phí
đúng thời điểm, không dùng link/cost cũ. Không bốc bài trong các Chain;
chuyển lượt bốc bài theo engine. Saved deck A/B không đổi; lịch sử công
khai và kết quả trận giống ở cả hai ghế. Không thêm endpoint sửa state
hoặc test mode cho beta CLI, không sửa state sau khi server bắt đầu.

```sh
npm run beta:browser-seven-tools-interactions
npm run validate:platform
```

## Kết quả

Linux đạt 1154/1154 test trong 44 file, 70/70 bước và 60 browser report
bằng Chromium 154.0.8037.57, runtimeExceptions=0. Đã đọc report/log tại
artifacts/platform-validation/2026-10-30T02-07-05-088Z-163757/report.json.
Mỗi bước browser có đúng một report, khớp host/version. Log có đủ 16 ca
mới, 74 ca Seven Tools gốc và 122 ca Magic Jammer; cả hai browser mode
mới có đủ cờ kiểm chứng, LP timeline 1001/1/1001/1/0 và Chain 2/1/2/2/1.
Các mode Counter gốc, audit Magic Jammer và guide vẫn đạt.

Check đủ 19 bundle/112 lá/95 verified/17 historical pending. Toàn bộ
capabilities JSON giống artifact Windows của mốc Seven Tools trước đó:
112 supported/17 hiệu ứng/13 scope/19 snapshot, gồm hai Counter Trap,
metadata nhập Seven Tools vẫn pending/not-started/not-run. Không đổi
registry revision hoặc dùng trạng thái nhập thay bằng chứng runtime.

Hai trận tự nhiên giữ kết quả: pilot seed 08, 16 lượt/339 lệnh, B thắng
LP 0/4200; expanded seed 5e, 11 lượt/239 lệnh, B thắng LP 0/8000. Không
sửa state khi chơi. Trận expanded vẫn dùng Faith; chưa dùng Seven Tools
hoặc Magic Jammer trong hai trận này. Bằng chứng Counter thuộc các mode
có kiểm soát và unit/adapter tests, không suy từ kết quả trận tự nhiên.

Windows và Ubuntu CI đạt trên source commit
91bb6a6d9398ac3a7f2b2c8924c405d663b5d78d,
[run 40989836603](https://github.com/xuanthao260604-sys/idc/actions/runs/40989836603).
Đã tải/đọc artifact windows-validation-40989836603-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62. Windows đạt 1154/1154 test trong 44 file,
70/70 bước và 60 browser report, runtimeExceptions=0. Report tại
artifacts/ci-seven-tools-interactions/2026-10-30T02-07-55-646Z-7264/report.json.
Từng bước browser có đúng một report khớp host/version. Đã kiểm 16 ca
mới và đủ cờ hai mode A/B, cùng sáu mode Seven Tools gốc, bốn mode Magic
Jammer, hai mode audit Magic Jammer và hai mode hướng dẫn phản hồi.
Toàn capabilities JSON và kết quả hai trận tự nhiên giống Linux và mốc
trước. Report vẫn ghi windows11DesktopVerified=false.

294 file dữ liệu/engine/protocol/giao diện sản phẩm có trước được so hash
và giữ nguyên byte. Không thay review nguồn, 19 bundle, starter, saved
deck, artwork, dependencies/lockfile hoặc format revision. Import lỗi
vẫn giữ dữ liệu/deck theo các ca nhập hồi quy; mục này không chạy fetch
hoặc thay bằng văn bản/hiệu ứng tự tạo.

Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
