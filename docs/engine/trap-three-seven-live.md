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

Kết quả tổng hợp và CI sẽ được ghi sau khi kiểm chứng hoàn tất.
Chưa kiểm thử trực tiếp Windows 11 desktop; chưa đóng gói hoặc phát hành beta.
