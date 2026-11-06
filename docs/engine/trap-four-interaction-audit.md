# Audit Trap Hole bốn liên kết qua nhiều lượt

Mốc 06/11/2026: rà soát pattern đã mở ở
[review v5](trap-three-seven-live.md). Không thay engine/protocol, UI sản phẩm,
review, dữ liệu bài, ảnh hoặc deck mẫu; không mở link thứ năm hay luật mới.

## Hành trình được kiểm tra

| Thời điểm | Tương tác thật |
| --- | --- |
| Lượt 3 | Triệu hồi Battle Ox; Trap Hole → Seven → Seven → Seven, quái sống sót; ba phí giữ nguyên |
| Sau chuỗi đầu | Tribute to The Doomed bỏ Man-Eater Bug để phá chính Battle Ox; Monster Reincarnation bỏ Hane-Hane lấy lại đúng quái đó; Summon lần nữa bị chặn vì quota |
| Hồi LP | Hai người hồi từ 1 LP bằng Dian Keto; người sẽ trả hai phí ở chuỗi sau cần hai lần hồi. Magic Jammer có thể phủ nhận lần hồi thứ hai, dù người kích hoạt Magic đang ở 1 LP |
| Lượt 4 | Úp Trap Hole thứ hai thật vào ô vừa được giải phóng; không sửa board giữa hành trình |
| Lượt 5 | Flip Magician of Faith lấy lại cùng Monster Reincarnation; triệu hồi lại Battle Ox. Người trả hai phí của chuỗi sau đổi so với chuỗi đầu |
| Hồi đủ | Chuỗi thứ hai có bốn link, ba phí mới, quái sống; không cho Monster Reincarnation lấy một quái đang ở trên sân và không bỏ phí cho ý định bị từ chối |
| Hồi bị phủ nhận | Thiếu LP cho Seven cuối, giữ lá úp/không trả phí; chuỗi còn ba link và Trap Hole phá quái. Reincarnation dùng lại với discard khác, link ID mới, rồi trả quái về tay |
| Kết thúc | Ookazi gây sát thương thật ở lượt 5; winner là người triệu hồi, LP còn lại 1, đối thủ 0 |

Fixture chỉ chuẩn bị vị trí ban đầu từ các định nghĩa đã nhập. Mỗi người có
tối đa ba Seven; cả hai chuỗi dùng tổng cộng đúng sáu instance, không thêm
bản sao vượt giới hạn để tạo tình huống thử. Phép phá quái có thể chọn quái
của chính người kích hoạt theo handler đã duyệt; không bịa hiệu ứng mới.
Discard Man-Eater Bug/Hane-Hane không tự kích hoạt FLIP; Faith chỉ kích hoạt
khi Flip Summon thật.

## Bảo vệ trạng thái và lịch sử

- Mỗi bước kiểm input không đổi, invariant và LP; cùng trạng thái được chạy
  qua engine và adapter. Ledger ba phí đầu vẫn là history hợp lệ sau hồi LP,
  nhưng không được dùng như binding của board/LP hiện hành hoặc parent mới.
- Cleanup giữ Mộ cũ, source đúng một lần và thứ tự owner chọn. Owner có thể
  đổi giữa hai chuỗi; decision/option cũ bị từ chối nếu có pause thứ hai.
- Handle Summon cũ không dùng lại được sau cùng quái về tay. Retry command
  cũ trả cùng receipt nhưng không trừ phí/đổi state mới; một intent mới dùng
  handle cũ bị từ chối. Journal/receipt LP/source snapshot không lộ qua view.
- Bộ browser thu activity sau từng command trước khi giới hạn 60 mục cắt
  phần đầu, rồi kiểm tổng phí/hồi/discard/phá/quay về tay. Hai ghế vẫn thấy
  cùng facts công khai; deck A/B lưu giữ nguyên.

40 ca mới: hai ghế × hai cách chia người trả hai phí × Main1/Main2 × hai
thứ tự cleanup × hồi đủ/bị phủ nhận =32 ca engine; tám ca adapter ghế/người
trả phí/nhánh hồi. Bốn browser mode `--trap-four-interactions=a|b:heal|negated`
bao phủ hai ghế và cả hai nhánh. Chỉ dùng hành động/HTTP/UI thật sau setup.

Bộ tổng hợp tăng 108→112 bước và 98→102 browser report. Timeout CI tăng
20→25 phút vì thêm bốn hành trình dài và bộ kiểm thử nhiều lượt; không bỏ
bước cũ, không giảm phạm vi kiểm chứng Windows.

Kết quả local/Windows CI sẽ được ghi sau khi kiểm chứng xong.
Chưa kiểm thử Windows 11 desktop; chưa đóng gói hoặc phát hành beta.
