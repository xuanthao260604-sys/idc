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
khớp nguyên byte baseline. Bộ tổng hợp thêm hai mode, dự kiến 128 bước/
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

Đang chốt hồi quy và CI đúng source; số dự kiến chưa là kết quả nghiệm thu.
