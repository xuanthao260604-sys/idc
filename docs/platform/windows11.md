# Yêu cầu nền tảng: Windows 11

> Cập nhật 16/10/2026: [Windows CI đã đạt](windows-ci-result.md) trên commit 7294e60,
> gồm 267 test và 8 browser run bằng Edge. Windows 11 desktop chưa chạy.
> Các đoạn “chưa chạy CI” bên dưới ghi lịch sử chuẩn bị trước run này.

Yêu cầu người dùng đã xác nhận: mục đích cuối cùng là chạy được trên Windows 11.
Windows là nền tảng sản phẩm chính; Linux/cloud chỉ là môi trường phát triển và kiểm chứng hiện tại.
Người dùng chưa cần nhận beta hoặc tự test vào thời điểm này; tiếp tục công việc độc lập,
không yêu cầu họ chuyển Linux/WSL hoặc cài môi trường Linux để dùng sản phẩm.

Kiến trúc hiện tại là ứng dụng web mở bằng trình duyệt trên Windows, với engine Node chạy trên
máy trong bản hotseat. Không đổi sang một stack chỉ hỗ trợ Linux. Chưa tạo installer, file exe,
archive bàn giao hoặc phát hành bản beta trong bước này.

## Quy tắc phát triển

- Lệnh npm dùng được qua shell Windows, không phụ thuộc Bash/curl/systemd cho workflow ứng dụng.
- Dùng node:path và fileURLToPath để đọc tài nguyên; không tự cắt file:// hoặc nối dấu slash.
- Kiểm tra đường dẫn có khoảng trắng/Unicode, cả cây source và cây build.
- Cache npm ở .npm-cache trong checkout, không cần quyền ghi thư mục cha hoặc home cloud.
- Node 24 theo .node-version; không bắt người dùng có Chromium automation để chơi ứng dụng.
- Mọi báo cáo phân biệt kiểm thử Linux, Windows CI và Windows 11 desktop thực tế.

## Công việc đã thực hiện

- tools/project-root.ts tìm root qua module URL và manifest dự án, không dựa process.cwd().
  Đọc data và static assets của beta dùng root này, dù khởi chạy node từ thư mục khác.
- npm run environment:check kiểm tra runtime Node và các tài nguyên cần thiết trước build beta.
  Preflight không kiểm tra lại toàn bộ luật, không thay cho npm test và không tự cài phần mềm.
- CI tại .github/workflows/ci.yml có job Windows và Ubuntu riêng: pinned Node, preflight,
  npm ci, typecheck, test, card check/build, vanilla smoke và mixed smoke.
  Mỗi lệnh smoke là một step riêng để không che lỗi bằng exit code lệnh sau.
- README đã bỏ mô tả cũ “chưa có giao diện/5 effect bị chặn” và ghi lại scope hiện hành.

## Trạng thái kiểm chứng

| Hạng mục | Trạng thái |
|---|---|
| npm ci với cache mới | Đạt trên Linux, 50 packages |
| Preflight | Đạt Linux/x64, Node 24.19.0 |
| Unit/integration | 238/238 test đạt trên Linux |
| Typecheck/build/card check/mixed duel | Đạt trên Linux |
| CLI beta chạy từ cwd ngoài project | Đạt trên Linux: static HTML, nạp dữ liệu, view tay 6 lá |
| Path khoảng trắng/tiếng Việt | Đạt trong filesystem Linux; ca test chạy được trong Windows CI |
| Workflow Windows/Ubuntu | Đã viết; chưa chạy trên GitHub |
| Windows 11 thực tế | Chưa có máy Windows trong môi trường này; chưa kiểm chứng |

5 test mới cho resource root: source/build URLs, nested workspace, thiếu project root,
root checkout thực và preflight chạy từ cwd có khoảng trắng/Unicode khác checkout.
Các test dùng node:path/pathToFileURL thực của hệ điều hành đang chạy; không mô tả việc dùng
chuỗi kiểu C:\\... trên Linux là đã kiểm thử Windows filesystem.

Workflow chỉ chạy sau khi source được đưa lên GitHub và workflow được trigger. Không tự push
hoặc tuyên bố CI xanh khi chưa có run. Windows runner của GitHub cũng chưa thay thế kiểm tra
trình duyệt/khởi động trên Windows 11 desktop trước khi bàn giao chính thức.

Bước tiếp theo: tiếp tục hoàn thiện game theo mục tiêu Windows, giữ kiểm thử hai nền tảng;
chưa cần giao beta cho người dùng. Xác thực Windows thực tế vẫn là tiêu chí trước phát hành.

Cập nhật tiếp: [Windows browser regression](windows-browser-checks.md), tổng 244 test Linux.
CI đã có effect/full-duel browser steps cho Windows, nhưng vẫn chưa trigger run.

Mốc nền tảng 238/244 ở trên là số lịch sử. Trạng thái và kết quả tổng hợp hiện tại:
[hotseat 20 lá](../milestones/hotseat-20.md). Công việc tiếp theo:
[kiểm chứng Windows](windows-verification-next.md).
