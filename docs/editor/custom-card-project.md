# U1a — dự án bài riêng và lưu trữ bản nháp

Ngày 26/11/2026. Kế thừa nghiệm thu Chain `12ab71c`.
**U1a là nền tảng thư viện phía Node, chưa có màn hình editor hoặc bài
custom trong trận đấu.** Catalog official, review, deck A/B, frame/back
và capability Chain v6 giữ nguyên. Không đóng gói/bàn giao beta.

## Các mốc U1 và điều kiện dừng

| Mốc | Đầu ra | Điều kiện hoàn thành | Ước lượng công sức |
| --- | --- | --- | --- |
| U1a — nền tảng dự án (chu kỳ này) | Schema quái thường custom, revision, JSON import/export và store độc lập | Namespace đúng; lỗi nhập/ghi/xung đột không đổi bản đã lưu; reopen/Unicode/deck cạnh bên giữ nguyên; kiểm Linux/Windows | 0,5–1 ngày |
| U1b — editor quái thường/ảnh | UI tạo/sửa/nhân bản/xóa, xem trước với frame cũ; nhập byte ảnh và quản lý asset riêng, mở/lưu/xuất dự án | Dùng được bằng chuột/bàn phím; validate byte ảnh thực, không tải URL/tệp tùy ý; hủy/lỗi giữ draft/bản lưu; không tự lưu đè | 1–2 ngày |
| U1c — pool/deck riêng và mẫu hiệu ứng | Registry/format custom tách official; mẫu handler đã review với capability theo definition/revision thực | Quái custom chơi được trong pool riêng; template không eval text/code, không tự thừa hưởng quyền official; review/gate và bound custom được kiểm trước bật | 1,5–2,5 ngày |
| U1d — audit U1 | Import/export/restart/ảnh/deck/custom capability và hồi quy | Full Linux/Windows, bảo toàn dữ liệu cũ, giới hạn công bố rõ | 1 ngày |

Tổng U1 vẫn khoảng 4–7 ngày công tập trung theo roadmap, không phải hứa
số chu kỳ hoặc ngày bàn giao. Mỗi mốc hoàn thành rồi dừng báo cáo.
U1a không triển khai UI/ảnh byte/runtime trong cùng chu kỳ. Sau U1 giữ
W1 Windows 11 desktop thực (1–3 ngày công khi có môi trường). U2 thay
toàn bộ nội dung bài/ảnh là phần mở rộng riêng, không xóa catalog cũ.

## Hợp đồng U1a

`tools/custom-card-project.ts` không import registry/engine hoặc sửa
runtime catalog. Dữ liệu authoring riêng, chưa phải CardDefinition đã
được review/đủ điều kiện chơi. Văn bản mô tả được giữ nguyên như text,
không eval, không chuyển thành effect descriptor hoặc handler.

- Project `schemaVersion=1`, UUID `projectId`, `revision`, title, cards,
  assets và retiredIds. Chưa lưu có revision 0; file đã lưu phải >0.
- Card ID là `custom:UUID`, origin custom; chỉ normal-monster với tên,
  text, attribute/race, level 1–12, ATK/DEF 0–99999. Đây là giới hạn nhập
  của authoring v1, không tuyên bố luật Yu-Gi-Oh! có trần chỉ số đó.
  Không nhận official ID/passcode, effect kind/parameters/code hoặc tự
  khai implementation/testing/verification/legality.
- Project revision tăng mỗi save; card revision chỉ tăng khi nội dung
  card đổi. Revision trong file import không cấp quyền ghi đè và không
  được dùng thay clock local. Bài xóa ghi vào retiredIds; không dùng lại
  ID cũ để reset revision. Muốn bản sao phải tạo UUID mới.
- Title/tên/race không trắng, tối đa 120 ký tự; text tối đa 10000 ký tự;
  500 card/500 asset, 5000 retired ID, JSON UTF-8 tối đa 2 MiB. Không cắt
  bớt dữ liệu âm thầm khi vượt giới hạn. Các trường lạ bị từ chối.
- Artwork chỉ tham chiếu asset UUID trong project; metadata gồm MIME
  PNG/JPEG/WebP, SHA-256, byte length/kích thước và quyền do người nhập
  khai báo ở card. **U1a chưa nhận byte ảnh, chưa xác minh MIME/hash/kích
  thước hay quyền thực tế**, chưa đọc/serve/render asset. Không có URI,
  filesystem path, SVG hoặc HTML upload trong hợp đồng này. U1b phải
  kiểm byte và quản lý vòng đời asset trước khi cho dùng ảnh thực.

## Lưu và nhập/xuất

`createCustomProjectStore(directory?, expectedProjectId?)` dùng bộ nhớ
khi không có directory; directory là cấu hình local đáng tin của caller,
không lấy từ JSON nhập hoặc HTTP. Một store tương ứng một project trong
file `custom-project.json`, không dùng `a.json`/`b.json` hoặc catalog.
Chưa nối store vào CLI beta, server hay UI, không tự tạo file lúc import
module/khởi động ứng dụng hiện tại.

API `get()` trả snapshot freeze sâu; `export()` chỉ đọc. `replace(revision,
{title,cards,assets})` sao chép/validate trước khi enqueue, rồi kiểm revision;
caller sửa object sau khi gọi không đổi lệnh đang chờ. Card input không
có revision do caller quyết định. `importText(revision,text)` parse toàn
bộ trước khi thay, bắt đúng projectId và gán revision local; lỗi trả
invalid-input/conflict mà giữ snapshot/file/deck cũ. Không tự merge import
project khác vào project hiện có. Mở project mới ở UI sau này là thao tác
riêng: parse/kiểm rồi mở store với ID/thư mục riêng đã chọn, không ghi đè
store đang mở. Export không tự save hoặc nâng revision.

Một queue serialize thao tác trong store. File lock tạo độc quyền `wx`
phối hợp các store; trước ghi đọc/so toàn bộ snapshot trên đĩa, không chỉ
revision, để phát hiện sửa ngoài cửa sổ. Writer khác thắng thì báo conflict.
Không chiếm/xóa lock của writer khác. File temp tạo độc quyền, write+sync,
close, rename rồi mới commit bộ nhớ; lỗi I/O giữ snapshot cũ và queue vẫn
nhận lần thử tiếp theo. Không tự khôi phục/xóa lock sau crash; cần xác
nhận writer đã dừng trước khi xử lý lock còn lại, tránh tự đoán mất writer.
Không tuyên bố database hoặc đồng bộ online nhiều server.

Startup file sai JSON/schema/UTF-8/projectId/revision từ chối và giữ file,
không thay bằng project trống. UTF-8 BOM được đọc đúng, không rewrite khi
chỉ mở. File đã lưu bị xóa ngoài store không bị tạo lại âm thầm khi save.
Store không bảo đảm undo file sau khi rename đã thành công nhưng tiến
trình bị crash; reopen phải đọc file thực tế, không giả định request chưa
được lưu chỉ vì mất response. U1b sẽ có UI xác nhận kết quả lưu.

## Quan hệ với Chain và effect template

Quái thường draft chưa được đưa vào registry hoặc deck official. Các review
hiệu ứng hiện pin ID/fingerprint official; đổi tên/ảnh/definition không có
nghĩa tự hưởng review. U1c phải thiết kế binding template/review custom
riêng trước activation, không đổi 17 hiệu ứng hiện có thành arbitrary code.
Nếu có custom Counter/revival/control làm đổi pool/zone assumptions, phải
xét lại bound; tám link C1 không phải giới hạn luật chung. Nội dung hiệu
ứng mới ngoài handler/review hiện có là phạm vi khác, phải báo trước khi
đổi hướng. Không nâng dữ liệu historical pending thành verified vì editor.

## Kiểm chứng và điểm dừng

Đang chốt test/CI đúng source. U1a chưa hoàn tất nghiệm thu; không gọi các
ca thư viện/import/disk là UI, xử lý ảnh thực hoặc gameplay custom.
