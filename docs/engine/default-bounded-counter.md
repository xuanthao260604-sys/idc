# C3b.3b.2b — review v6 và profile mặc định

Ngày 24/11/2026. Kế thừa source `dc5452b`, báo cáo `7c448e2` và bộ kiểm
6892 ca/126 bước/116 report. Chuyển profile mặc định sang Counter hữu hạn
v6, giữ v5 có phiên bản để kiểm hồi quy; chưa đóng Chain hoặc bàn giao beta.

## Review và cấu hình

Thêm `data/reviews/seven-tools-v6.effects.json` đúng proposal C3a: pin,
handler, revision/scope/continuation và 30 evidence record lấy nguyên từ
profile review thiết kế. Giữ nguyên quotation/ngày truy cập; không tuyên
bố tải nguồn mới hoặc đã đối chiếu nguyên bản TCG 2005. Checker đọc cache
C3a xác nhận 14 nguồn/14 pin/30 trích dẫn. Hồ sơ C3a inactive giữ nguyên
như snapshot lịch sử; checker phân biệt runtimeEnabled của snapshot với
currentRuntimeEnabled. Metadata bài historical pending/not-started/not-run
không được nâng theo việc runtime đã có handler/test.

Manifest mặc định chọn review v6. Loader không tự rơi về v5 khi thiếu/sai
review hoặc dependency. Registry vẫn kiểm đủ 14 pin/handler; frame server,
activation và scope C1 dùng backend đã kiểm. Capability report đổi đúng
Seven reviewRevision/scope/continuation, danh sách scope và limitation;
112 định nghĩa/95 quái thường/17 hiệu ứng/13 scope không đổi.

Các họ mở là 11 Phép đã pin → Magic → Seven^0..6, hoặc Trap Hole^1..3
cùng occurrence summon hợp lệ → Seven^0..6, chịu copy/zone. Bound tám link
thuộc pool này, không phải luật chung. Không mở mixed Chain tổng quát,
SEGOC, Damage Step hoặc Continuous Trap effects ngoài scope.

## Legacy và bằng chứng mới

`runtime-catalog-legacy-v5-inputs.json` là bản byte nguyên vẹn của manifest
trước chuyển đổi. `loadLegacyV5Catalog` và capability report legacy là API
rõ phiên bản, không là fallback sản phẩm. Các test lịch sử và fixture mô
hình đổi import sang profile đó; giữ assertion hành vi và 142 golden hash.
Một số nhãn test được sửa để không gọi profile ghim v5 là default hiện tại.
Project-root kiểm asset review mặc định v6 thay v5, thêm một ca thiếu manifest
legacy cần cho build. Không xóa test hoặc tái sinh golden để bỏ khác biệt.

Browser modes cũ chạy đúng registry lịch sử/explicit như trước. Hai mode
mới `--default-chain=a|b` nạp loader mặc định thật và chơi tám link qua UI/
HTTP sau setup: A ba Trap Hole/năm Seven; B Pot/Magic/sáu Seven. Kiểm phí,
preview/hủy, cleanup riêng, retry và facts chung; server không nhận frame/
review từ client. Đây vẫn là fixture đầu vào, chưa là audit tự nhiên C4.

Sáu report bounded-live cũ có một thay đổi dự kiến:
`defaultCatalogStillV5` true → false, vì default nay là v6. Không thay các
facts gameplay khác. Tám mode bounded-boundary và 102 browser mode v5 còn
lại giữ facts cũ. Capability mặc định đổi như trên; capability legacy phải
khớp nguyên byte baseline. Bộ tổng hợp thêm hai mode và artifact đúng source đã xác nhận 128 bước/
118 browser report, giữ timeout workflow 25 phút.

21 ca profile mới kiểm review/evidence, metadata, frame ABI và registry
revision tách biệt, capability delta, thiếu từng dependency, thiếu active
review không fallback, deck A/B lưu từ v5 đọc bằng v6 không rewrite, import/
save lỗi giữ dữ liệu, server thật/command/reset. CLI startup được kiểm
cùng profile mặc định. C4 sẽ kiểm tiếp lịch sử nhiều lượt, stale/context,
người sở hữu/priority/terminal và checklist đóng Chain trên default v6.

## Điểm dừng

Chốt gate default và CI/artifact rồi dừng. C4 chưa hoàn tất; chưa đánh dấu
Chain beta hoàn thành. Ước lượng C4 2–3 ngày công theo roadmap, cần cập nhật
nếu audit tìm lỗi; không phải cam kết số chu kỳ 30 phút. Sau C4 giữ U1 bộ
tạo bài riêng và W1 Windows 11 desktop thực; chưa đóng gói/bàn giao beta.

## Bằng chứng

Code `f553737368e73b82f672dce293bdbbcd2d0feb7d` tại [CI 45337089591](https://github.com/xuanthao260604-sys/idc/actions/runs/45337089591), attempt 1.
Ubuntu job `138251631162`, Windows job `138251631501` đều completed/success.
Đã đọc log Ubuntu: checkout SHA khớp code; **6914/6914 test/72 file**,
typecheck, cards:check/build và vanilla/mixed smoke đạt. Local đạt cùng
**6914/6914 test/72 file**, typecheck, cards:check/build và hai smoke.
21 ca profile mới và một ca thiếu asset mới; 70 suite cũ giữ số ca, suite
project-root tăng một ca. 163 ca migration giữ 142 golden, không tái sinh.

Local chạy checker cache C3a: 14 pin/14 nguồn/30 trích dẫn khớp, 29 record
inherited giữ nguyên. `runtimeEnabled=false` và `newScopeEffectTests=not-run`
trong checker là dữ liệu snapshot C3a; trường currentRuntimeEnabled=true
và activeSevenRevision=6 mô tả loader hiện tại. Không đổi ngày truy cập,
không tuyên bố tải lại nguồn hoặc historical printed text verified.

Linux local chạy hai mode default-chain mới, bounded-live-a-trap explicit,
trap-four-a-same legacy và CLI startup thực (Unicode cwd, command/retry,
save/reload/restart). Chrome/154.0.8037.57, runtimeExceptions=0. Không chạy
lại toàn bộ 128 bước trên Linux local; Ubuntu CI không chạy browser tổng
hợp. Bằng chứng default v6 được tách khỏi bộ regression v5.

Artifact `windows-validation-45337089591-1`, ID `14895307771`;
SHA-256 ZIP khớp metadata GitHub:
`60753dd183a5573b8fa19023c661a94bd33772cd2d7d3a245b192fd6dae39f2b`.
Report `2026-11-24T05-59-33-679Z-5536/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0,
npm 11.17.0, Edg/157.0.4341.60: **6914/6914 test/72 file,
128/128 bước, 118/118 browser report**, runtimeExceptions=0.

Đã đọc đủ 128 raw step log và đối chiếu từng JSON browser/report/platform.
So baseline `windows-validation-45288045142-1`, source `dc5452b`: giữ đủ
126 bước cũ và 116 bộ facts gameplay khi bỏ riêng browserVersion. Sáu
bounded-live report đổi đúng flag defaultCatalogStillV5 true→false, không
bỏ qua field gameplay khác. Hai mode default mới Windows khớp Linux khi
bỏ platform/browserVersion. ZIP baseline cũng khớp metadata đã lưu.

Capability mặc định thay đúng Seven scope/revision/continuation, scope
list và limitation đầu; mọi metadata/hiệu ứng khác giữ nguyên. Capability
legacy local khớp nguyên byte capabilities.log của artifact baseline;
unit Windows kiểm báo cáo legacy/default và delta. Không gọi capability
mặc định là byte-identical sau khi đổi scope.

Đối chiếu source xác nhận mọi data/evidence/review cũ, ảnh/frame/back và
golden nguyên byte. Engine/protocol chỉ đổi một comment cũ về guard v6;
không sửa hành vi resolver. Test cũ được kiểm khớp source gốc sau đúng các
đổi import/nhãn đã khai báo; project-root đổi asset default v5→v6 và thêm
kiểm manifest legacy. Không làm yếu các assertion để chấp nhận default
mới. README giữ nội dung cũ, thêm notice hiện hành và báo cáo cuối.

Mặc định ứng dụng nay là v6; review v1–v5 và manifest legacy v5 vẫn tồn tại.
Nếu review/dependency active lỗi, loader từ chối thay vì chọn v5. Deck A/B
lưu từ v5 đọc bằng v6 không rewrite; save/import lỗi giữ nguyên dữ liệu.
Các test default dùng loader/application server thực, không chỉ alias
legacy. Fixture ban đầu vẫn được ghi riêng với hành trình tự nhiên.
Commit chốt sau CI chỉ cập nhật tài liệu [skip ci]; bằng chứng code thuộc
`f553737`.

Dừng sau gate default. Tiếp theo C4 audit nhiều lượt trên default v6, chưa
đóng Chain/beta. Ước lượng C4 2–3 ngày công cần cập nhật theo kết quả audit.
Sau đó giữ bộ tạo bài riêng và Windows 11 desktop thực. Report ghi
windows11DesktopVerified=false; chưa kiểm desktop Windows 11, chưa đóng
gói/bàn giao beta.
