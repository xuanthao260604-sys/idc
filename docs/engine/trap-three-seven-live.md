# Trap Hole → Seven → Seven → Seven trong game

Mốc 05/11/2026: review Seven v5 mở đúng pattern bốn liên kết này, giữ tất cả
pattern của v4. Đây là activation/cost/priority thật qua engine, adapter và UI;
[197 ca ứng viên](trap-three-seven-candidate.md) vẫn giữ registry v4 và không
được đổi thành bằng chứng activation live. Các review v1–v4 giữ nguyên byte.

| Xử lý LIFO | Kết quả |
| --- | --- |
| Seven thứ ba | Phủ nhận activation/phá Seven thứ hai; bỏ qua link bị phủ nhận |
| Seven thứ nhất | Tiếp tục phủ nhận activation/phá Trap Hole; bỏ qua Trap Hole |
| Quái được triệu hồi | Sống sót, giữ quota và markers của normal/tribute/flip Summon |
| Cleanup | Seven thứ nhất và thứ ba, theo owner; cùng owner chọn đủ thứ tự, khác owner tự commit |

Ba lần trả phí 1000 LP diễn ra lúc kích hoạt, luôn cần LP >1000. Cùng payer
cần 3001 trước ba khoản; chia 2+1 cần 2001 và 1001 (phép tính, không phải
quotation mới). Không hoàn phí khi activation bị phủ nhận. Nếu khoản thứ ba
không trả được, không lật lá/không trừ LP; chuỗi ba liên kết vẫn xử lý như cũ,
Seven thứ hai phủ nhận Seven thứ nhất rồi Trap Hole phá quái.

Review v5 tổng hợp evidence đã có về Seven, direct response, Spell Speed 3,
LIFO, cost và cleanup. Không thêm quotation/ngày truy cập, không tuyên bố có
ví dụ TCG 2005 riêng cho bốn link. Dữ liệu nhập 112 định nghĩa vẫn tách khỏi
17 hiệu ứng runtime; trạng thái nhập 95 verified / 17 historical pending và
implemented/tested/playable=0 không tự nâng cấp.

## Đường chạy và ranh giới

- Gate v5 chỉ nhận Trap Hole → Seven → Seven trước khi thêm Seven cuối;
  source phải Set từ lượt trước, có priority và phản hồi đúng liên kết cuối.
  Không mở Counter thứ năm, generic mixed Chain, SEGOC hoặc Damage Step.
- Ledger v2 nhận đúng ba receipt đã trả; v1 giữ tối đa hai. Checkpoint live có
  kind/effect ID riêng, kiểm graph/pin/zone/LP/summon trước atomic board patch.
  Candidate API/ID cũ không được nhận vào game.
- `trapThreeSevenResolution` là journal riêng phía server trong lúc chờ cleanup;
  invariant kiểm board/history, tám event xử lý và quyết định owner chính xác.
  Không ghép frame với Spell/Counter parent khác; cleanup/đầu hàng xóa context.
- PlayerView chỉ chiếu nguồn còn lại đã resolved, không giữ phản hồi đến link
  đã mất; journal, receipt LP, sourceAtActivation và hash không lộ ra client.
- UI dùng thao tác Phản hồi Bẫy/preview và cleanup sẵn có. Không thêm endpoint
  sửa state, test flag trong beta hoặc action mới cho client. Adapter giữ
  latest-link discovery, handle theo viewer/version và receipt idempotent.

## Kiểm thử và bằng chứng

236 ca live mới: 192 tổ hợp hai ghế/tám cách chia controller/ba kiểu triệu hồi/
Main1–Main2/LP tối thiểu hoặc 8000; ba ngưỡng LP bị chặn;
năm intent sai bị từ chối trước khi trả phí/lật bài; mười building-state
forgery; 13 paused-frame drift; sáu review drift; gate v3/v4; đầu hàng mỗi ghế;
liên kết thứ năm; và adapter stale/wrong-link/receipt/privacy cho hai ghế.

Sáu luồng browser mới `--trap-four=a|b:same|split|blocked` bắt đầu từ setup
board duy nhất. Mọi triệu hồi, Trap Hole, ba Seven, pass và cleanup đều dùng
UI/lệnh thật. Kiểm preview link 3/LP, hủy không đổi state, hai kích thước màn
hình, trả lại cùng receipt, owner privacy, quái/quota, lịch sử hai ghế và deck
lưu không đổi. Các lá Seven cùng tên được phân biệt bằng ID trong test engine;
browser xác nhận hộp thứ tự và kết quả công khai, không coi tên giống nhau là
bằng chứng danh tính hai instance trong Mộ.

Linux local đạt 3563/3563 test trong 59 file, typecheck, build, 19 bundle
check, 108/108 bước và 98 report trình duyệt, runtimeExceptions=0. Report:
`artifacts/platform-validation/2026-11-05T06-56-02-644Z-218901/report.json`.
Chrome 154.0.8037.57; Node 24.19.0; npm 11.9.0; Linux 6.18.57 x64.
Đã đọc log mỗi bước và đối chiếu raw browser JSON với từng report; facts của
92 luồng cũ và số ca của cả 58 suite cũ khớp mốc `63d60a5` (CI 41964600663).
Hai trận tự nhiên giữ 339/239 lệnh, 16/11 lượt, winner B và LP [0,4200]/[0,8000];
chúng không dùng Counter, không được tính là bằng chứng cho chuỗi mới.

Đối chiếu capabilities chỉ có bốn trường dự kiến thay đổi: scope Seven trong
danh sách scope và trong reviewedEffects, continuation, reviewRevision=5.
Vẫn 112 định nghĩa, 95 quái thường, 17 hiệu ứng, 13 scope và 19 snapshot.
Trong snapshot 318 file cũ, mọi file data/review/evidence và ảnh khung giữ
nguyên byte; đổi 13 file engine/protocol, câu hướng dẫn Seven trong app và
đầu vào catalog để chọn review v5. Thêm v5; toàn bộ 40 evidence giữ đúng v4,
không sửa hồ sơ cũ. Các kiểm thử reimport lỗi cũ vẫn chạy, không mất dữ liệu.

Source CI: `e2c3abd3823d6d2ee9838426cfec7c3584f744ff`.
Ubuntu CI đã thành công; log xác nhận đúng 3563 test trong 59 file.
[CI 41983918290](https://github.com/xuanthao260604-sys/idc/actions/runs/41983918290)
đã thành công ở cả Ubuntu và Windows. Artifact Windows:
`windows-validation-41983918290-1`, report đã tải và đọc:
`artifacts/ci-trap-four-live/2026-11-05T06-58-21-583Z-6484/report.json`.

| Kiểm chứng | Linux local | Windows CI |
| --- | --- | --- |
| Test / file | 3563 / 59 | 3563 / 59 |
| Bước / browser report | 108 / 98 | 108 / 98 |
| Runtime exceptions | 0 | 0 |
| Browser | Chrome 154.0.8037.57 | Edge 156.0.4314.58 |
| Node / npm | 24.19.0 / 11.9.0 | 24.19.0 / 11.17.0 |
| OS / kiến trúc | 6.18.57 / x64 | win32 10.0.26100 / x64 |

Đã đọc log cả 108 bước Windows, đối chiếu raw JSON với 98 report, kiểm riêng
sáu mode mới (LP timeline, quái/quota, nhánh chặn và owner cleanup), 92 luồng
cũ, từng suite, 19 bundle và capabilities. Kết quả tương đương Linux: facts
cũ giữ nguyên, chỉ bốn trường capabilities Seven nêu trên thay đổi. Kiểm tra
SHA sau toàn bộ lượt local xác nhận mọi file data/review cũ và ảnh khung vẫn
nguyên byte. Artifact/log nằm ngoài Git và được workflow giữ 14 ngày.

Mốc tiếp theo có thể audit tương tác chuỗi mới qua nhiều lượt. Chưa mở Counter
link 5 hoặc coi phần Chain tổng quát đã hoàn tất.
Chưa kiểm thử trực tiếp Windows 11 desktop; chưa đóng gói hoặc phát hành beta.
