# Ứng viên Trap Hole → Seven → Seven → Seven

**Mốc tiếp nối 05/11:** đã [mở activation thật](trap-three-seven-live.md)
qua review v5. Nội dung và bằng chứng bên dưới giữ mốc ứng viên ở gate v4;
197 ca cũ không được đổi thành bằng chứng gameplay mới.

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

Hồi quy local đầy đủ đạt 3327/3327 test trong 58 file, typecheck, build,
19 bundle check và Node ESM probe. So sánh từng suite với mốc trước: 57
suite cũ giữ nguyên số ca; chỉ thêm suite ứng viên 197 ca. Capabilities
khớp hoàn toàn mốc v4: 112 định nghĩa, 95 quái thường, 17 hiệu ứng, 13 scope
và 19 snapshot. Snapshot 316 file data/app/packages và cấu hình đầu vào
chỉ đổi hai helper engine; dữ liệu,
review/evidence, ứng dụng, ảnh khung và đầu vào catalog giữ nguyên byte.

Browser Linux local đạt 102/102 bước, 92 report, runtimeExceptions=0:
`artifacts/platform-validation/2026-11-05T03-54-30-116Z-188698/report.json`.
Chrome 154.0.8037.57, Node 24.19.0, npm 11.9.0, OS 6.18.57 x64.
Đã đọc log từng bước, so report với JSON browser gốc trong log và đối chiếu
facts/capabilities/từng suite với mốc audit trước (`dae6ad6`, CI 41794125965).
Tất cả facts cũ giữ nguyên sau khi bỏ trường nhận diện trình duyệt/platform.
Hai trận tự nhiên vẫn có 339/239 lệnh, 16/11 lượt và winner B; chúng không
sử dụng Counter, không được tính là bằng chứng activation ứng viên mới.

Source CI: `63d60a5213e762d0c6cdb4d5898b936cd8903a24`.
Ubuntu CI đã thành công, log riêng xác nhận 3327/3327 test trong 58 file.
[CI 41964600663](https://github.com/xuanthao260604-sys/idc/actions/runs/41964600663)
đã thành công ở cả Windows và Ubuntu. Windows artifact
`windows-validation-41964600663-1`, report đã tải:
`artifacts/ci-trap-three-seven-candidate/2026-11-05T03-56-05-777Z-2032/report.json`.

| Kiểm chứng | Linux local | Windows CI |
| --- | --- | --- |
| Test / file | 3327 / 58 | 3327 / 58 |
| Bước / browser report | 102 / 92 | 102 / 92 |
| Runtime exceptions | 0 | 0 |
| Browser | Chrome 154.0.8037.57 | Edge 156.0.4314.56 |
| Node / npm | 24.19.0 / 11.9.0 | 24.19.0 / 11.17.0 |
| OS / kiến trúc | 6.18.57 / x64 | win32 10.0.26100 / x64 |

Windows cũng đã đối chiếu đầy đủ log từng bước, raw browser JSON,
capabilities và số ca từng suite với mốc trước; tất cả facts cũ giữ nguyên.
197 ca mới là bằng chứng thành phần ứng viên/ledger, không phải 197 ca
activation live mới. 92 report trình duyệt kiểm gameplay hiện hành; không
có mode UI mới cho Trap Hole bốn liên kết. Artifact/log nằm ngoài Git,
được CI giữ theo chính sách 14 ngày của workflow hiện có.
Chưa kiểm thử Windows 11 desktop; chưa đóng gói hoặc phát hành beta.

Tiếp theo: rà soát phạm vi rồi nối đúng pattern vào activation, invariant,
parent continuation/cleanup, adapter/UI và kiểm thử live riêng. Chưa hỗ trợ
Counter link 5, SEGOC, Damage Step hoặc Chain hỗn hợp tổng quát.
