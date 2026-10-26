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
Windows và Ubuntu CI [run 40290978843](https://github.com/xuanthao260604-sys/idc/actions/runs/40290978843)
đạt trên source commit ef7aecc32e798ac337434a373365204dd28c1db5.
Đã tải và đọc artifact windows-validation-40290978843-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62.
Windows đạt 817/817 test trong 35 file, gồm 13 test đường dẫn/preflight
và 53 test catalog; 47/47 bước, 37 browser report, tổng runtimeExceptions=0.
Workflow cũng đã chạy environment:check thành công trước npm ci.
Đã đọc environment.log/tests.log và so sánh toàn capabilities JSON với
Linux: giống nhau, đủ 16 bundle, 109 định nghĩa, 14 hiệu ứng/11 scope;
trạng thái nhập và runtime vẫn tách riêng. Hai trận tự nhiên vẫn đạt
16 lượt/339 lệnh và 13 lượt/262 lệnh. Report ghi windows11DesktopVerified=false.
Report đã đọc tại
artifacts/ci-catalog-preflight/2026-10-26T08-15-45-994Z-8376/report.json.

Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
