# Báo cáo khả năng lấy từ review đang hoạt động — 26/10/2026

Lệnh `npm run engine:capabilities` trước đây giữ danh sách scope viết cố
định. Catalog đã mở Block Attack, Earthquake và Magician of Faith nhưng
báo cáo chưa có ba phạm vi tương ứng.

Báo cáo nay đọc lại catalog bằng loader thật: kiểm schema review, format,
dấu SHA của định nghĩa và registry như lúc ứng dụng khởi động. Chỉ các
binding đang hoạt động trong registry mới được đưa vào reviewedEffects;
không suy ra hỗ trợ từ số lá đã nhập hoặc cờ implementation/testing của
snapshot. Scope lấy từ các record này, bỏ trùng và sắp xếp ổn định.

Kết quả hiện tại: 109 định nghĩa được hỗ trợ trong phạm vi giới hạn,
95 quái thường và 14 lá hiệu ứng (10 Phép, 3 FLIP, 1 Bẫy), thuộc 11 scope.
Bổ sung đúng ba scope còn thiếu:

- Block Attack: normal-spell-target-position-single-link-v1.
- Earthquake: normal-spell-all-position-single-link-v1.
- Magician of Faith: flip-own-graveyard-spell-single-link-v1.

Mỗi reviewedEffects record có cardId, tên, nhóm hiệu ứng, scope, trạng thái
và revision review, definitionSha256, cùng importedStatus tách riêng.
14 lá vẫn có trạng thái nhập pending/not-started/not-run như snapshot cũ;
reviewed-for-supported-scope là trạng thái review runtime, không phải cờ
đã hoàn tất mọi hiệu ứng/kiểm thử trong dữ liệu nhập. Giữ importedSnapshots
của đủ 16 bundle và các trường báo cáo cũ; thêm bảng record truy vết.

Loader trả effectReviews đã parse cho công cụ nội bộ. Server vẫn chỉ xuất
projection catalog đang có; không đưa hồ sơ review hoặc SHA lên UI. Không
đổi dữ liệu, review, handler, định dạng deck hoặc giao diện. Không mở thêm
lá hoặc nâng phạm vi gameplay chỉ vì sửa báo cáo.

Nếu review thiếu, registry không mở hiệu ứng đó: báo cáo ghi unsupportedIds
và không nhận scope của lá bị chặn. Review sai scope hoặc lệch SHA làm
báo cáo thất bại trước khi in JSON kết quả, không tự sửa file đầu vào.
Đây là kiểm kê khả năng đã được review trong scope, không phải bộ chứng
minh mọi card ruling, Chain hỗn hợp/negate, SEGOC/modifier/replacement hoặc
trạng thái tương thích Windows 11 desktop.

## Kiểm chứng

Thêm 5 test vào runtime-catalog.test.ts (48 → 53):

- Đủ 11 scope và 14 record, mỗi record ghép đúng review, tên và SHA của
  định nghĩa; giữ các trường số lượng/danh sách cũ và không có unsupportedIds.
- Giữ riêng importedSnapshots của 16 bundle và trạng thái pending/not-started/
  not-run của 14 lá; báo cáo lặp cho cùng đầu vào giữ nguyên nội dung.
- Trong bản sao dữ liệu ở thư mục tạm, bỏ review Faith: giữ imported=1,
  supportedDefinitions giảm còn 108, record còn 13, scope Faith mất và
  unsupportedIds có Faith. Không sửa bundle đã nhập.
- Trong bản sao tạm, làm sai scope review hoặc đổi text khiến lệch SHA:
  báo cáo bị từ chối, các file đầu vào còn nguyên byte sau lỗi.

Typecheck, build/lệnh báo cáo và 53 test catalog riêng đã đạt trên Linux.
Đang chạy bộ tổng hợp Linux; Windows CI chưa xác minh source mới.
Giữ 47 bước validation và 37 browser report, không thêm browser invocation.

Không đổi catalog 109, facts/effect/review, artwork, starter hay deck cũ.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
