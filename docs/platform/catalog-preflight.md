# Kiểm tra đủ đầu vào catalog trước khởi động — 26/10/2026

Lệnh environment:check trước đây có danh sách file riêng, chưa cập nhật
Block Attack, Earthquake và Magician of Faith. Vì thế thiếu một trong
sáu file bundle/review của ba lá này vẫn được báo kiểm tra môi trường đạt,
trước khi bộ nạp thật thất bại.

Danh sách tools/runtime-catalog-inputs.json nay được dùng chung bởi
preflight và loadRuntimeCatalog: 16 bundle nhập, 8 file review Phép,
2 file review FLIP và 1 file review Bẫy. Thứ tự bundle/review và tên
importedSnapshots giữ nguyên. Bộ nạp vẫn kiểm schema, format, dấu SHA
review và registry như trước; không suy ra hiệu ứng từ dữ liệu nhập.

Preflight kiểm file tồn tại, đọc được và là file; thư mục mang tên file
cũng bị từ chối. Lỗi ghi đúng đường dẫn và exit 1. Khi chạy npm run beta,
đây là bước trước build và trước mở server. Không tự fetch, import, sửa
review, tạo file thay thế hoặc thay deck người chơi.

Danh sách chung là cấu hình nguồn của dự án, không phải đầu vào do HTTP
hoặc người chơi chọn. Preflight chỉ kiểm khả năng đọc file, chưa xác nhận
nội dung JSON/hồ sơ hiệu ứng hợp lệ. Việc kiểm nội dung vẫn thuộc pipeline
và bộ nạp runtime. Dữ liệu lỗi phải được xem xét, không tự chữa để chạy.

JSON được Node 24 đọc trực tiếp nên preflight vẫn chạy trước npm ci/build,
không cần dependency hay Bash. resolveJsonModule cho TypeScript đưa cùng
file JSON vào dist/tools khi build, để bộ nạp đã biên dịch dùng đúng danh
sách. Không đổi nội dung dữ liệu bài, review, luật, artwork hoặc định dạng
deck; không mở thêm lá/hiệu ứng.

## Kiểm chứng

Thêm tám test vào project-root.test.ts (5 → 13), dùng bản sao nguồn trong
thư mục tạm có khoảng trắng/tiếng Việt, chạy tiến trình Node thật:

- Đủ 16 bundle và 11 file review: preflight đạt khi chưa có node_modules
  hoặc dist và khi cwd nằm ngoài thư mục dự án.
- Lần lượt bỏ từng bundle/review của Block Attack, Earthquake và Magician
  of Faith: exit 1, chỉ rõ file thiếu, không in thông báo đạt hoặc tạo lại
  file. Các file còn lại và file đánh dấu deck A/B giữ nguyên byte.
- Thay file review Faith bằng thư mục có nội dung: bị từ chối, thư mục
  và nội dung được giữ nguyên; các file khác vẫn giữ nguyên byte.

Typecheck/build và 13 test đường dẫn/preflight đã đạt trên Linux.
Đã so sánh toàn bộ loadRuntimeCatalog() từ bản build trước/sau sửa:
giống nhau, gồm cards, registry/revision, effectReviews và importedSnapshots.
Registry revision giữ 1b12e94176942bcf62d4a238e34801bdaa04036361c4c42f14ee95bb77d06289.
Bộ tổng hợp Linux đạt 817/817 test trong 35 file, 47/47 bước và 37 browser
report bằng Chromium 154.0.8037.57, tổng runtimeExceptions=0. Đã đọc report
artifacts/platform-validation/2026-10-26T08-11-53-697Z-174210/report.json.
Đã so sánh toàn capabilities JSON với mốc trước: giống nhau. Hai trận tự
nhiên, nhập lỗi, kiểm tra/lưu/tải deck và startup lifecycle vẫn đạt.
Windows CI đang được kiểm tra; chưa dùng kết quả Linux để xác nhận Windows.

Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
