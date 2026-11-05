# Ứng viên Trap Hole → Seven → Seven → Seven

Mốc 05/11/2026: thêm thành phần ứng viên và ledger riêng cho ba khoản phí.
**Chưa mở pattern này trong game.** Registry/review active vẫn là Seven v4;
chỉ pattern Phép → Magic Jammer → Seven → Seven có bốn activation thật.
Không thêm DuelState field, API, PlayerView, UI hoặc review v5.

| Liên kết | Kết quả ứng viên khi xử lý từ cuối về đầu |
| --- | --- |
| 4: Seven thứ ba | Phủ nhận activation và phá Seven thứ hai ở link 3 |
| 3: Seven thứ hai | Bỏ qua; Seven thứ nhất không bị phủ nhận |
| 2: Seven thứ nhất | Phủ nhận activation và phá Trap Hole ở link 1 |
| 1: Trap Hole | Bỏ qua; quái vừa được triệu hồi sống sót, giữ nguyên quota/markers |
| Cleanup | Seven thứ nhất và thứ ba vào Mộ; dùng foundation theo owner, giữ prefix Mộ và thứ tự owner chọn |

Ba khoản 1000 LP đã trả được giữ nguyên dù hai activation bị phủ nhận.
Mỗi khoản cần LP >1000: cùng người trả ba lần cần tối thiểu 3001; chia 2+1
cần 2001 và 1001. Đây là phép tính, không phải quotation/ruling mới.

Kết quả thiết kế tổng hợp từ [review Seven](../rules/seven-tools-review.md),
[Counter phản hồi Counter](../rules/counter-to-counter-review.md),
[cleanup](../rules/chain-cleanup-order-review.md) và các hồ sơ hiện có.
Không thêm trích dẫn/ngày truy cập hoặc tuyên bố có ví dụ TCG 2005 riêng.
Các evidence, review v1–v4 và dữ liệu nhập giữ nguyên.

## Ranh giới thành phần

- `three-seven-lp-cost-ledger.ts` có version 2/kind riêng, đúng ba receipt;
  schema v1 vẫn nhận tối đa hai. Chia sẻ kiểm tra nguồn/cost và phép tính,
  không tự trừ LP, phát event, di chuyển bài hay cho phép activation mới.
  History kiểm schema/hash, thứ tự, danh tính và số dư nối tiếp từng người;
  current binding còn kiểm board, clock, turn và LP hiện hành.
- `trap-three-seven-candidate.ts` kiểm bốn nguồn, pin định nghĩa, earlier Set,
  graph/direct response, triệu hồi gốc và các vùng bài. Trả atomic board patch
  phá Seven thứ hai trước Trap Hole, journal và hai nguồn cleanup còn lại.
  `steps` là mô tả thành phần, không phải game events.
- Root validator kiểm nguồn gốc lịch sử cùng nguồn đã bị phá trên board thật;
  không dựng lại LP hoặc board giả để vượt guard của engine.
- Journal/hash chỉ giúp phát hiện drift trong checkpoint do server giữ,
  không xác thực state client hoặc chứng minh mọi board đề xuất là hợp lệ.
- Fixture chạy thật Summon → Trap Hole → Seven → Seven, thử link thứ tư và
  xác nhận bị từ chối/giữ nguyên state; chỉ sau đó mới mô hình hóa receipt
  thứ ba để thử ứng viên. Engine invariants vẫn từ chối các candidate state.
- Cleanup được gọi trực tiếp như kiểm thử foundation; chưa có lệnh live,
  pending decision riêng hoặc hành trình browser cho pattern này.

## Kiểm chứng

197 ca mới trong `tools/trap-three-seven-candidate.test.ts`:
96 ca hai ghế × tám cách chia controller × normal/tribute/flip × Main1/Main2
(kèm hai thứ tự cleanup khi cùng owner), 32 ca ledger với LP tối thiểu/8000,
33 ca đầu vào lỗi và atomicity, 20 ca schema/history đã tính lại hash,
16 ca checkpoint drift gồm sai graph/cost/occurrence. Có JSON roundtrip,
không hoàn phí, không sửa/freeze đầu vào và v1/v2 không nhận chéo.

Kết quả tổng hợp Linux/Windows và source CI sẽ được ghi sau khi chạy xong.
Chưa kiểm thử Windows 11 desktop; chưa đóng gói hoặc phát hành beta.

Tiếp theo: rà soát phạm vi rồi nối đúng pattern vào activation, invariant,
parent continuation/cleanup, adapter/UI và kiểm thử live riêng. Chưa hỗ trợ
Counter link 5, SEGOC, Damage Step hoặc Chain hỗn hợp tổng quát.
