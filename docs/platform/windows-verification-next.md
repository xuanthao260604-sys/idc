# Mục kế tiếp: kiểm chứng Windows

> Cập nhật 16/10/2026: [Windows CI đã đạt](windows-ci-result.md) trên commit 7294e60,
> gồm 267 test và 8 browser run bằng Edge. Windows 11 desktop chưa chạy.
> Các đoạn “chưa chạy CI” bên dưới ghi lịch sử chuẩn bị trước run này.

Đầu vào: mốc hotseat nội bộ 20 lá ở ../milestones/hotseat-20.md.
Không thêm bài hoặc đổi engine trước khi có lỗi tái hiện cụ thể ở mục này.

## Trình tự dành cho môi trường kiểm chứng

Trên Windows dùng Node 24.x theo .node-version, npm ci với lockfile hiện có.
Không cần Bash/WSL. Dùng từng lệnh trong PowerShell, dừng khi lệnh trước báo lỗi:

```powershell
npm run environment:check
npm ci
npm run validate:platform
```

`validate:platform` lần lượt chạy preflight, syntax, typecheck, tests, data/build,
engine vanilla/capabilities/mixed và 8 browser run (effect/Mộ, setup, discard,
3 nhánh deck-out, concede/restart, full duel). Báo cáo JSON và log từng bước nằm ở
artifacts/platform-validation/<thời điểm>-<pid>/. Mỗi lần tạo thư mục mới, không ghi đè
bằng chứng cũ. Một bước lỗi dừng toàn bộ, exit 1; các bước sau ghi not-run.
Browser checks tự tìm Edge/Chrome; thiếu browser phải báo lỗi, không bỏ qua check.
Report phải ghi Windows version, Node/npm, browser/version và exit status thực.
CI runner Windows không được gọi là bằng chứng Windows 11 desktop.

Sau tự động hóa, kiểm tra trực tiếp trên Windows 11: khởi động ứng dụng từ đường dẫn
có khoảng trắng/tiếng Việt; Edge/Chrome mở đúng bàn đấu, chuyển seat kín tay, dialog
đọc bài và xác nhận hoạt động; dừng server/khởi động lại đúng giới hạn in-memory.
Không lấy việc mô phỏng đường dẫn Windows trên Linux làm bằng chứng đã chạy Windows.

## Trạng thái

Workflow Windows đã cấu hình; chưa chạy trên GitHub. Workspace hiện tại là Linux,
không có môi trường Windows được cung cấp nên chưa thể thực hiện các bước Windows.
Không tự push/publish hoặc yêu cầu người dùng nhận beta/test ở thời điểm này.
Không coi mục Windows hoàn tất và không phát hành trước khi có kết quả thật.

Sau mục Windows: chốt điều kiện bàn giao nội bộ rồi mới mở xây deck/mở rộng catalog.
Online và trình tạo bài riêng tiếp tục là các mục riêng chưa triển khai.

## Cơ chế thu bằng chứng

Windows CI chạy cùng lệnh tổng hợp và upload report/log bằng upload-artifact, kể cả
khi một bước kiểm tra lỗi. Nếu cài dependency thất bại trước đó sẽ không có report;
job vẫn thất bại, artifact thiếu không được coi là kết quả đạt.
Linux CI giữ core checks, không giả định runner có Chromium.
Report ghi OS platform/release, Node/npm và browser version từ output CDP thực;
không dump biến môi trường/credential. windows11DesktopVerified luôn false trong
báo cáo tự động vì kiểm tra desktop trực tiếp là bước riêng. Các log là output của
lệnh kiểm chứng; chưa có report Windows cho tới khi workflow được chạy thật.

## Kiểm chứng công cụ báo cáo trên Linux — 16/10/2026

Lệnh tổng hợp đã đạt 17/17 bước, 267/267 test (gồm 4 test cơ chế báo cáo),
8 browser report với Chromium Chrome/154.0.8037.57 và 17 log. Đã đọc lại report
trên đĩa, xác nhận platform=linux, Node=24.19.0, npm=11.9.0 và
windows11DesktopVerified=false. Unit test kiểm tra exit code lỗi được giữ trong report,
launch error/signal bị coi là lỗi và các bước sau không được chạy hoặc ghi đạt.
Workflow YAML đã parse và kiểm tra cấu hình runner/report; chưa thực thi GitHub Actions.
Report/log nằm trong artifacts/ bị Git bỏ qua, không phải dữ liệu bài hoặc bản phát hành.

## Điểm dừng giữa phần chuẩn bị

Đã thêm [startup lifecycle check](beta-startup-check.md) vào validate:platform sau build.
Cấu hình hiện có 18 bước; lần chạy tổng hợp 17 bước bên trên là bằng chứng trước khi thêm
startup check. Check mới đã chạy riêng trên Linux và kiểm tra report unit tests đạt.
Theo yêu cầu người dùng, dừng sau hai đầu việc chuẩn bị (report/CI và CLI lifecycle);
hai đầu việc thực thi Windows CI/Windows 11 desktop vẫn chưa thực hiện.
Không diễn giải đây là đã xác minh 50% khả năng chạy Windows.

## Hoàn tất chuẩn bị và điểm chặn thực thi — 16/10/2026

Theo yêu cầu tiếp tục đến hết mục, đã chạy lại validate:platform với startup check:
18/18 bước, 267/267 test, 8 browser report và 18 log đạt trên Linux. Đã đọc lại report
trên đĩa, xác nhận startup step đạt, platform=linux, windows11DesktopVerified=false.
Bằng chứng mới trong artifacts/platform-validation/2026-10-16T08-14-58-786Z-109332/;
không thay hoặc xóa report 17 bước cũ. Phần chuẩn bị đã xong, không còn dừng giữa chừng.

Kiểm tra read-only git ls-remote --symref origin thành công nhưng không có ref nào;
checkout nhánh work cũng chưa có HEAD. Vì vậy workflow mới chỉ có trong workspace,
chưa có mã/nhánh từ xa để chạy GitHub Actions. Không có runtime Windows được cung cấp.
Quy ước Git ở docs/architecture/001-foundation.md ghi không tự push, nên cần người dùng
cho phép đưa bản mã đã kiểm tra lên nhánh work của xuanthao260604-sys/idc để chạy CI.
Không đổi default branch, không force push, không phát hành beta. Nếu được phép, bước tiếp:
commit nguồn/data/docs/workflow đã kiểm tra, push work và theo dõi Windows CI, xử lý lỗi có thật.
Không đưa node_modules, dist, cache, report cục bộ hoặc .env lên Git.

Windows CI và Windows 11 desktop vẫn chưa đạt vì chưa chạy. CI Windows nếu đạt cũng
không tự hoàn tất ca desktop Windows 11. Không thay mốc chưa xác minh thành hoàn tất.
