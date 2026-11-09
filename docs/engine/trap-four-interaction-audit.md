# Audit Trap Hole bốn liên kết qua nhiều lượt

Mốc 06/11/2026: rà soát pattern đã mở ở
[review v5](trap-three-seven-live.md). Không thay engine/protocol, UI sản phẩm,
review, dữ liệu bài, ảnh hoặc deck mẫu; không mở link thứ năm hay luật mới.

## Hành trình được kiểm tra

| Thời điểm | Tương tác thật |
| --- | --- |
| Lượt 3 | Triệu hồi Battle Ox; Trap Hole → Seven → Seven → Seven, quái sống sót; ba phí giữ nguyên |
| Sau chuỗi đầu | Tribute to The Doomed bỏ Man-Eater Bug để phá chính Battle Ox; Monster Reincarnation bỏ Hane-Hane lấy lại đúng quái đó; Summon lần nữa bị chặn vì quota |
| Hồi LP | Hai người hồi từ 1 LP bằng Dian Keto; người sẽ trả hai phí ở chuỗi sau cần hai lần hồi. Magic Jammer có thể phủ nhận lần hồi thứ hai, dù người kích hoạt Magic đang ở 1 LP |
| Lượt 4 | Úp Trap Hole thứ hai thật vào ô vừa được giải phóng; không sửa board giữa hành trình |
| Lượt 5 | Flip Magician of Faith lấy lại cùng Monster Reincarnation; triệu hồi lại Battle Ox. Người trả hai phí của chuỗi sau đổi so với chuỗi đầu |
| Hồi đủ | Chuỗi thứ hai có bốn link, ba phí mới, quái sống; không cho Monster Reincarnation lấy một quái đang ở trên sân và không bỏ phí cho ý định bị từ chối |
| Hồi bị phủ nhận | Thiếu LP cho Seven cuối, giữ lá úp/không trả phí; chuỗi còn ba link và Trap Hole phá quái. Reincarnation dùng lại với discard khác, link ID mới, rồi trả quái về tay |
| Kết thúc | Ookazi gây sát thương thật ở lượt 5; winner là người triệu hồi, LP còn lại 1, đối thủ 0 |

Fixture chỉ chuẩn bị vị trí ban đầu từ các định nghĩa đã nhập. Mỗi người có
tối đa ba Seven; cả hai chuỗi dùng tổng cộng đúng sáu instance, không thêm
bản sao vượt giới hạn để tạo tình huống thử. Phép phá quái có thể chọn quái
của chính người kích hoạt theo handler đã duyệt; không bịa hiệu ứng mới.
Discard Man-Eater Bug/Hane-Hane không tự kích hoạt FLIP; Faith chỉ kích hoạt
khi Flip Summon thật.

## Bảo vệ trạng thái và lịch sử

- Mỗi bước kiểm input không đổi, invariant và LP; cùng trạng thái được chạy
  qua engine và adapter. Ledger ba phí đầu vẫn là history hợp lệ sau hồi LP,
  nhưng không được dùng như binding của board/LP hiện hành hoặc parent mới.
- Cleanup giữ Mộ cũ, source đúng một lần và thứ tự owner chọn. Owner có thể
  đổi giữa hai chuỗi; decision/option cũ bị từ chối nếu có pause thứ hai.
- Handle Summon cũ không dùng lại được sau cùng quái về tay. Retry command
  cũ trả cùng receipt nhưng không trừ phí/đổi state mới; một intent mới dùng
  handle cũ bị từ chối. Journal/receipt LP/source snapshot không lộ qua view.
- Bộ browser thu activity sau từng command trước khi giới hạn 60 mục cắt
  phần đầu, rồi kiểm tổng phí/hồi/discard/phá/quay về tay. Hai ghế vẫn thấy
  cùng facts công khai; deck A/B lưu giữ nguyên.

40 ca mới: hai ghế × hai cách chia người trả hai phí × Main1/Main2 × hai
thứ tự cleanup × hồi đủ/bị phủ nhận =32 ca engine; tám ca adapter ghế/người
trả phí/nhánh hồi. Bốn browser mode `--trap-four-interactions=a|b:heal|negated`
bao phủ hai ghế và cả hai nhánh. Chỉ dùng hành động/HTTP/UI thật sau setup.

Bộ tổng hợp tăng 108→112 bước và 98→102 browser report. Timeout CI tăng
20→25 phút vì thêm bốn hành trình dài và bộ kiểm thử nhiều lượt; không bỏ
bước cũ, không giảm phạm vi kiểm chứng Windows.

## Kết quả và đối chiếu bằng chứng

Chốt báo cáo ngày 09/11/2026 cho source
`ae2d567c96b864d4a947987f8f900187c85ef054` tại
[CI 42198431280](https://github.com/xuanthao260604-sys/idc/actions/runs/42198431280),
attempt 1. Windows job `127827429137` và Ubuntu job `127827429488` đều
completed/success. Log Ubuntu xác nhận **3603/3603 test trong 60 file**,
gồm đủ 40 ca `tools/trap-four-interactions.test.ts`; typecheck, data/build,
vanilla và mixed smoke đều đạt. Ubuntu CI không chạy bộ browser tổng hợp.

Local/Linux đã đạt 3603 test/60 file, 112/112 bước và 102 browser report
theo mốc bàn giao tiếp tục dự án. Phiên chốt báo cáo này không chạy lại bộ
Linux và không có report local của mốc đó trong checkout phục hồi; số Linux
không được dùng thay bằng chứng Windows.

Đã tải artifact `windows-validation-42198431280-1`, ID `13494287410`,
và kiểm SHA-256 ZIP khớp metadata GitHub:
`dee987d070968fb0b648266aae8c332e46f33d970ce6bf8e2c970b78b30c614d`.
Report bên trong: `2026-11-06T09-54-04-861Z-2636/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 156.0.4314.56: **3603/3603 test trong 60 file, 112/112 bước,
102/102 browser report**, runtimeExceptions=0. Đã đọc đủ 112 step log;
JSON từng browser log khớp report, mỗi bước đúng một report, đúng nền tảng
và phiên bản. Không ghép bằng chứng từ run khác.

| Mode | Hai Chain chính | Phí Seven | Lệnh chấp nhận | LP cuối A/B | Từ chối cleanup cũ ở pause thứ hai |
| --- | --- | --- | --- | --- | --- |
| a:heal | [4,4] | 6 | 80 | [1,0] | Có |
| a:negated | [4,3] | 5 | 84 | [1,0] | Không có pause thứ hai |
| b:heal | [4,4] | 6 | 80 | [0,1] | Có |
| b:negated | [4,3] | 5 | 85 | [0,1] | Có |

Bốn mode đều kết thúc lượt 5, đổi người trả hai phí, lấy lại/triệu hồi lại
cùng quái, Faith lấy lại Phép, giữ phí đã trả và chặn Summon handle cũ.
Nhánh phủ nhận hồi chặn Seven cuối do thiếu LP, không bỏ phí cho lệnh lỗi,
rồi trả chi phí Reincarnation mới. Retry receipt giữ nguyên state mới;
public facts hai ghế giống nhau, history được thu trước giới hạn 60,
saved deck A/B không đổi và fixture chỉ dùng lúc setup.
Riêng `a:negated`, `oldCleanupRejected=false` ghi nhận không thực hiện phép
thử đó vì chuỗi sau không cần quyết định cleanup; không coi cờ này là một
ca từ chối đã chạy. Các mode còn lại kiểm lệnh cleanup cũ tại pause mới.

Đối chiếu artifact baseline `windows-validation-41983918290-1`
(source `e2c3abd`, ID `13395678783`): đủ 98 browser report cũ giữ nguyên
facts khi bỏ riêng `browserVersion` (Edge baseline 156.0.4314.58,
run mới 156.0.4314.56); `capabilities.log` giống nguyên byte.
Runtime vẫn 112 định nghĩa, 95 quái thường, 17 hiệu ứng/13 scope;
19 bundle và trạng thái nhập 95 verified/17 historical pending giữ nguyên.
Hai trận tự nhiên giữ seed 08: 16 lượt/339 lệnh/LP [0,4200] và seed 5e:
11 lượt/239 lệnh/LP [0,8000], không sửa state giữa trận. Chúng là hồi quy
riêng, không thay thế bốn hành trình audit có fixture.

Thay đổi chốt báo cáo chỉ ở tài liệu. Engine/protocol, UI sản phẩm,
dữ liệu/review/evidence, hình ảnh và deck được giữ nguyên so với source
đã kiểm chứng. Audit hoàn tất trong scope v5 hiện có; vẫn chặn link thứ năm,
chưa có Chain hỗn hợp/negate/SEGOC/modifier/replacement tổng quát.
Report Windows vẫn ghi `windows11DesktopVerified=false`.
Chưa kiểm thử Windows 11 desktop; chưa đóng gói hoặc phát hành beta.
