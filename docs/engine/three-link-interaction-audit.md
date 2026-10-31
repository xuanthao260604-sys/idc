# Tương tác chuỗi ba liên kết — phục hồi và tái kích hoạt

Mốc 31/10/2026: kiểm tra phần tiếp nối của
[Normal Spell → Magic Jammer → Seven Tools](three-link-counter.md) qua nhiều
lượt, phục hồi bài và chi phí mới. Không thêm card/effect/luật đang mở.
Engine, protocol, giao diện sản phẩm, review active và dữ liệu đều giữ nguyên.

## Hành trình đã kiểm tra

| Giai đoạn | Hành vi |
| --- | --- |
| Chuỗi đầu, lượt 3 | Monster Reincarnation bỏ Ookazi làm cost, chọn Magician of Faith trong Mộ mình. Magic bỏ Man-Eater Bug; Seven trả 1000 từ 1001 còn 1. Magic bị phủ nhận/phá; root trả Faith về tay |
| Phí và cleanup | Ookazi đã bỏ vẫn ở Mộ, không gây sát thương. Man-Eater Bug không FLIP. Cùng owner chọn thứ tự root/Seven; khác owner gửi riêng mỗi nguồn, không hỏi thứ tự giữa hai Mộ |
| Hồi LP | Dian Keto được chủ Seven kích hoạt trong Main Phase của họ, hồi 1 → 1001 khi xử lý, không phải refund payment |
| Chuẩn bị Faith | Chủ root Normal Set Faith ở lượt 3, không được Flip ngay; qua lượt đối thủ rồi tới lượt mình (lượt 5) mới Flip Summon |
| Phục hồi Phép | Faith chỉ chọn Phép trong Mộ mình, lấy lại chính Monster Reincarnation đã dùng. Không chọn Counter/FLIP monster hoặc Dian Keto thuộc Mộ đối thủ |
| Chuỗi thứ hai | Cùng instance Reincarnation kích hoạt mới với link ID mới, bỏ Skull Servant làm cost và chọn lại Skull từ Mộ. Magic thứ hai bỏ Hane-Hane; Seven thứ hai trả 1000 từ 1001 còn 1 |
| Sau root | Giữ cost receipts mới; Reincarnation thực sự trả Skull về tay. Cost Ookazi cũ vẫn ở Mộ; không hoàn cost Magic hoặc Seven. Hane-Hane bị discard không FLIP |
| Kết thúc | Người chơi đối diện chủ Seven dùng một Ookazi khác, gây 800 sát thương hiệu ứng, LP 1 → 0 và kết thúc đúng winner. Không biến payment thành damage |

Timeline LP của chủ Seven: **1001 → 1 → 1001 → 1 → 0**.
Có hai Chain ba liên kết riêng, một Chain hồi LP và một Chain FLIP giữa chúng;
không nối chúng thành một Chain dài. Nguồn Counter thứ hai là bản sao Set hợp lệ
từ trước, không tái sử dụng lá Counter đã ở Mộ. Root được lấy lại là cùng instance
Phép, với activation, target và cost mới; không tiếp tục receipt cũ.

Nếu chủ Seven là chủ root, Dian được dùng ở lượt 3 và Ookazi kết thúc ở lượt 6.
Nếu Seven thuộc đối thủ, Dian được dùng ở lượt 4 và Ookazi kết thúc ở lượt 5.
Đổi lượt, Draw/Standby/Main, Set/Flip, mọi activation/Pass/answer đều qua engine
hoặc UI, không chỉnh board sau khi bắt đầu. Quota Normal Set được dùng ở lượt 3,
reset qua lượt và không bị Flip Summon lượt 5 tiêu hao.

## Kiểm thử engine và adapter

18 ca mới trong tools/three-link-interactions.test.ts:

- 16 hành trình: A/B × Magic thuộc mình/đối thủ × Seven thuộc mình/đối thủ ×
  thứ tự cleanup đầu. Hai batch chung owner được chọn theo hai thứ tự ngược
  nhau; khác owner không tạo một thứ tự giả giữa các Mộ.
- 2 hành trình qua command adapter, một ghế A và một ghế B. Dịch lệnh thật
  qua handle hiện hành, retry receipt không đổi view/version, xoay handle khi
  phục hồi root và từ chối payload handle cũ. Replay receipt Seven đã trả phí
  ở trạng thái sau hồi LP không làm LP đổi hoặc tạo Chain mới.

Kiểm nguyên input trước/sau mỗi accepted/rejected transition, invariant ở mọi
snapshot ổn định, root source ID giữ nguyên nhưng link ID khác, target/cost
receipts riêng từng activation, mỗi source/cost thực sự còn ở đúng vùng, không
mất prefix Mộ. Root thứ hai lấy lại cost Skull bằng hiệu ứng được review; đó
không phải refund tự động. Private target/cleanup chỉ tới đúng owner, frame/raw
ID/cost history không đi ra view. Không giả dữ liệu hoặc stat để dựng kết quả.

Pure helper tools/fixtures/three-link-interactions.ts chỉ chuẩn bị fixture
trước action đầu; dùng cùng helper cho unit và browser. Không import Vitest vào
browser hoặc tạo state-edit endpoint/beta flag trong sản phẩm. Registry vẫn
được nạp theo manifest/review thật.

## Hai hành trình trình duyệt

Thêm --three-link-interactions=a/b vào full validation, nâng 82/72 thành
84 bước/74 browser report. Ca A: Magic thuộc đối thủ, Seven thuộc chủ root,
63 lệnh được chấp nhận tới lượt 6. Ca B: Magic thuộc chủ root (self-response
sau đối thủ Pass), Seven thuộc đối thủ, 53 lệnh tới lượt 5; cleanup mỗi owner
một nguồn nên không có hộp chọn order hai lá. Cả hai dùng UI thật, xác nhận đúng
Magic ở link 2, chọn cost/target, Set, Flip, phục hồi và kích hoạt lại.

A vượt history limit 60 hoạt động đang có của sản phẩm. Test ghi lại **public
summaries từ response khi chúng xuất hiện**, theo stateVersion, để kiểm cả
payment/discard đầu đã rời cửa sổ hiển thị ở cuối. Không tăng limit hoặc đọc
engine state kín. Retry không tạo thêm entry khi cùng stateVersion. B chỉ có
53 hoạt động nên chưa chạm limit. View cuối của hai ghế vẫn có cùng public
facts trong cửa sổ hiện tại; không tuyên bố UI giữ toàn bộ 63 hoạt động.

Collector là quan sát test, không thực thi hoặc sửa lệnh/board. Các assert ban
đầu giả định mọi fact cũ còn trong history cuối và cả hai ghế đều vượt 60 đã
được sửa trước commit: giữ nguyên chính sách sản phẩm và kiểm độ dài
min(60, acceptedCommands). Đây không phải lỗi hiệu ứng cần đổi engine.

Các report kiểm hai Chain thật, hai LP payment, bốn discard costs, hai Magic
bị phủ nhận/phá, ba return-to-hand và một effect-damage cuối. Cả hai ghế có cùng
facts, deck lưu không đổi, không runtime exception. Metadata report không biến
các ca setup có kiểm soát thành trận tự nhiên không fixture.

## Bằng chứng và phạm vi

Linux source 1368375 đạt 2245/2245 test trong 51 file, đủ 18 ca mới,
84/84 bước và 74/74 browser report, runtimeExceptions=0. Đã đọc report và từng
log tại artifacts/platform-validation/2026-10-31T10-50-30-513Z-324707/report.json:
Node 24.19.0, npm 11.9.0, Chrome/154.0.8037.57. Typecheck/build/check 19 bundle
đạt: 112 nhập, 95 verified data, 17 historical pending.

Đủ hai report mới A/B với 63/53 lệnh, lượt kết thúc 6/5, hai Chain ba link và
timeline LP nêu trên; 10 browser mode ba link đơn cùng mọi scope cũ vẫn đạt.
Mỗi bước browser có một report đúng nền tảng/phiên bản. Capabilities JSON bằng
baseline trước audit: 112 definition, 95 quái thường, 17 hiệu ứng, 13 scope,
19 snapshot; không đổi imported status. Hai trận tự nhiên giữ seed 08/5e,
16/11 turn, 339/239 command, LP 0/4200 và 0/8000. Hai trận đó không dùng Counter;
không lấy chúng làm bằng chứng cho hành trình controlled fixture mới.

Windows và Ubuntu CI đạt trên source
136837532106190191c1a0919c5a15241be5ed31 tại
[run 41194416388](https://github.com/xuanthao260604-sys/idc/actions/runs/41194416388).
Đã tải/đọc artifact windows-validation-41194416388-1 cùng từng log tại
artifacts/ci-three-link-interactions/2026-10-31T10-51-33-153Z-2944/report.json.
Windows win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62: 2245/2245 test/51 file, đủ 18 ca tương tác mới,
84/84 bước, 74/74 browser report, runtimeExceptions=0. Hai mode mới đủ
63/53 command, lượt 6/5, đúng LP timeline và mọi cờ kiểm chứng; A chạm giới
hạn history, B không chạm. Mỗi bước browser có một report khớp host/version.
Capabilities Windows/Linux bằng nhau và bằng baseline trước audit.
Report vẫn windows11DesktopVerified=false; Windows 11 desktop chưa thử trực tiếp.

Đối chiếu SHA-256 toàn bộ 310 file đầu vào/mã sản phẩm cũ: giữ nguyên byte,
gồm data/, packages/, apps/, manifest, package và lockfile. Không tải dữ liệu,
artwork, sửa review hoặc nâng imported status. Đây là bổ sung test/fixture/tool
validation; không thay capability version, registry hash hoặc scope.

Khối này hoàn tất audit tương tác tiếp nối cho pattern ba link đang mở.
Các giới hạn vẫn giữ: Counter link 4+, Seven → Seven, generic mixed Chain,
SEGOC, Damage Step input, modifiers/replacements và continuous Trap effects
chưa được triển khai. Bộ tạo bài riêng, artwork từng lá, online/lưu trận và
đóng gói Windows là các mục tiếp theo riêng, không nằm trong audit này.
