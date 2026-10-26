# Chỉ ghi đạt khi đủ bằng chứng trình duyệt — 26/10/2026

Trước đây validate:platform chỉ dựa vào exit code/signal để quyết định một
bước đạt. Đã tái hiện bằng một executor trả exitCode=0 nhưng không có
browserReports: bước trình duyệt và báo cáo tổng vẫn ghi passed.

Mỗi bước trình duyệt trong bộ tổng hợp nay yêu cầu đúng một browser report
qua expectedBrowserReports=1. Bước chỉ đạt khi tiến trình thoát thành công
và báo cáo đáp ứng đủ:

- Có đúng một record, không thiếu hoặc trùng.
- platform khớp nền tảng của process đang chạy bộ tổng hợp.
- browserVersion là chuỗi không rỗng.
- runtimeExceptions là số 0; thiếu trường hoặc chuỗi "0" không được nhận.

Thiếu hoặc sai bằng chứng làm bước failed ngay cả khi exitCode vẫn là 0.
Giữ exit code, report đã nhận và lý do lỗi để đọc lại; bước sau không chạy
và giữ not-run. Main trả exit 1 khi báo cáo tổng thất bại. Các bước không
phải trình duyệt vẫn dùng exit code/signal như trước, không bị yêu cầu
xuất báo cáo trình duyệt.

Bộ đọc stdout dùng StringDecoder để không làm hỏng ký tự UTF-8 khi byte
bị chia giữa hai chunk; nhận CRLF và đọc nốt dòng cuối không có newline.
Log gốc vẫn giữ nguyên byte. Output thông thường/JSON không phải report
không được tính là bằng chứng; record có browserVersion sai kiểu được
giữ lại và bị kiểm tra từ chối.

Không thêm hoặc bỏ browser invocation: vẫn 47 bước/37 ca trình duyệt.
Thay đổi này kiểm tra tính đầy đủ/nhất quán của output kiểm thử; không
thay thế các assertion gameplay trong ca trình duyệt hoặc xác nhận đã
kiểm thử Windows 11 desktop. windows11DesktopVerified vẫn false.
Không đổi engine, dữ liệu, review hiệu ứng, giao diện, artwork hoặc deck.

## Kiểm chứng

Thêm 12 test vào validate-platform.test.mjs (4 → 16):

- Hai fixture metadata linux/win32 đầy đủ được nhận đúng host, giữ dữ
  liệu và không nâng cờ Windows desktop. Đây là fixture unit test, không
  phải bằng chứng chạy Windows thật.
- Tám ca exit 0 nhưng thiếu/trùng report, sai platform, version rỗng/sai
  kiểu, có lỗi runtime, thiếu số lỗi hoặc số lỗi là chuỗi đều bị từ chối;
  ghi report lỗi và không chạy bước sau.
- UTF-8 bị chia từng byte, banner, CRLF và dòng JSON cuối không newline
  được đọc đầy đủ. Output không phải report bị bỏ qua; trường trình duyệt
  sai kiểu vẫn được giữ để đánh dấu thất bại.

Syntax, typecheck và 16 test riêng đã đạt trên Linux. Tái hiện sau sửa:
exitCode=0 không có report → failed, bước kế tiếp not-run.
Bộ tổng hợp Linux đạt 829/829 test trong 35 file, 47/47 bước và 37 browser
report bằng Chromium 154.0.8037.57, tổng runtimeExceptions=0. Đã đọc report
artifacts/platform-validation/2026-10-26T11-52-58-669Z-187684/report.json:
đủ 37 bước có expectedBrowserReports=1, mỗi bước đúng một report khớp
platform và không có lỗi runtime. Capabilities JSON giống mốc trước;
hai trận tự nhiên, dữ liệu nhập và deck cũ vẫn đạt hồi quy.
Windows và Ubuntu CI [run 40318785650](https://github.com/xuanthao260604-sys/idc/actions/runs/40318785650)
đạt trên source commit ef36ddbdcb1123cae553e3fb314d432f52906878.
Đã tải và đọc artifact windows-validation-40318785650-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 155.0.4283.62.
Windows đạt 829/829 test trong 35 file, gồm 16 test báo cáo; 47/47 bước.
Đã kiểm đủ 37 bước có expectedBrowserReports=1: mỗi bước đúng một report,
platform=win32 khớp host, browserVersion không rỗng và runtimeExceptions=0.
Tổng 37 browser report, không có bằng chứng dư từ bước khác. Capabilities
JSON giống Linux: 109 định nghĩa trong 16 bundle, 14 hiệu ứng/11 scope,
trạng thái nhập và runtime vẫn riêng. Hai trận tự nhiên giữ kết quả
16 lượt/339 lệnh và 13 lượt/262 lệnh; hồi quy dữ liệu/deck vẫn đạt.
Report ghi windows11DesktopVerified=false. Report đã đọc tại
artifacts/ci-browser-evidence/2026-10-26T11-57-06-328Z-8680/report.json.
