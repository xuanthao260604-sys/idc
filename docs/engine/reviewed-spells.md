# Pot of Greed và Fissure — phạm vi đã kiểm thử

Hai lá chính thức được mở **có điều kiện** qua hồ sơ `data/reviews/pilot.spell-effects.json`.
Đây là semantic review cho phạm vi engine hiện tại, không phải xác nhận mọi tương tác Yu-Gi-Oh!.

## Trạng thái dữ liệu và khả năng engine

- Bundle nhập vẫn 20 lá, 15 verified dữ liệu và 5 pending lịch sử, implementation/testing của
  snapshot nhập giữ nguyên. Không sửa generated, raw hoặc overlay để tạo trạng thái thành công.
- Registry mặc định vẫn vanilla 15 lá. Truyền hồ sơ đã duyệt vào tham số thứ tư mới mở thành
  17 lá: 15 Normal Monster, Pot of Greed và Fissure. Trap Hole, Hane-Hane, Man-Eater Bug bị chặn.
- Kiểm tra khả năng thực tế bằng `npm run engine:capabilities`, có tách import snapshot và engine.
- Historical printed-text review vẫn pending trong importer: văn bản hiện tại của Konami là
  reference; hồ sơ mới duyệt ngữ nghĩa trong scope Goat đã chọn, không bịa văn bản in năm 2005.

```ts
const registry = createRegistry(bundle.cards, goat200508Format, {}, spellReviews);
```

Registry kiểm tra schema, card ID, format ID/revision và SHA-256 của toàn bộ định nghĩa parsed.
Dữ liệu thay đổi (kể cả legality/revision) gây review conflict, không tự sửa fingerprint.
Review trùng, thiếu evidence hoặc bị binding custom ghi đè đều bị từ chối.
Hash registry bao gồm hồ sơ review và handler. Bản thân hồ sơ là cấu hình server tin cậy,
không nhận review/handler do người chơi gửi lên. Schema không tự xác minh tính đúng đắn của nguồn.

## Luật và nguồn

Pot of Greed: bốc 2 lá, không cost/target. Giới hạn 1 bản theo April 2005 trong catalog.
Được kích hoạt khi deck còn dưới 2 lá theo quy ước Goat; thất bại khi required draw không thực hiện được.

Fissure: phá một quái ngửa của đối thủ có ATK thấp nhất; nếu hòa, controller của link chọn
khi resolution. Không khai báo target lúc activation. Không kích hoạt nếu không có ứng viên hợp lệ.

Nguồn đã đọc và quotation có trong hồ sơ:

- Konami current text, CIDs 4844 và 4835, cùng bằng chứng bản in LOB đã lưu từ Giai đoạn 3.
- https://www.goatformat.com/rulings3.html: FAQ Fissure cho một quái và hòa ATK;
  mục **Freed the Matchless General** ghi Fissure trong nhóm Spell không target.
- https://www.goatformat.com/basics.html: quy ước Goat cho phép kích hoạt hiệu ứng gây deck-out.

Hai trang Goat là nguồn cộng đồng, không gắn nhãn Konami sơ cấp. Trích dẫn đã so khớp với
trang tải ngày 2026-10-15; URL/ngày/SHA-256 HTML/trích dẫn nằm tại `data/evidence/effects/`.
Không lưu artwork. Phạm vi normal-spell-single-link-vanilla-v1 còn dựa trên các quyết định
Main Phase, Spell Speed và priority đã duyệt của format revision 4.

## Bằng chứng thực thi và giới hạn

12 test mới: gate 17/3, dữ liệu snapshot không đổi, conflict text/revision/legality/format,
duplicate/evidence/override, Pot copy limit, Pot qua API từ createDuel không sửa state ban đầu,
Pot với 0/1/2 lá còn lại, Fissure tie không targeting, từ chối Fissure khi chỉ có quái úp.
Fixture boundary test được ghi rõ là scenario setup; sau đó chuyển trạng thái đều qua applyAction.
Tổng 169 test đạt trên Linux; typecheck, build, cards:check, engine:capabilities và vanilla smoke đạt.

Chỉ có Normal Spell speed 1 trong open Main của người đi lượt, kích hoạt từ tay hoặc ô đã Set,
response bằng pass, một link, resolution và cleanup; tie decision kiểm tra quyền/version.
Không có responder speed 2/3, nhiều link/LIFO, negate, Trigger/SEGOC, immunity, modifier,
replacement, bài đổi quyền điều khiển, UI hoặc online. Hai lá được kiểm thử trong phạm vi này,
không gọi là hoàn tất tương tác trong toàn bộ game. Đặc biệt sự kiện nhiều lá bốc và timing trigger
cần xem lại khi bổ sung Trigger; test hiện tại chưa chứng minh hành vi đó.

Bước tiếp theo: thiết kế Chain/Trigger và kiểm chứng Trap Hole, Man-Eater Bug, Hane-Hane;
chỉ mở từng lá sau khi có handler, hồ sơ và test tích hợp tương ứng.

Cập nhật sau bước Phép: [hai FLIP đã được nối và kiểm thử](reviewed-flips.md).
Khi truyền cả hai nhóm hồ sơ, capability hiện tại là 19 lá; các số 17/169 bên trên ghi mốc hoàn thành bước Phép.
