# Giai đoạn 4B — Nền tảng xử lý hiệu ứng

Trạng thái hiện tại: primitive và API một link đã có kiểm thử với fixture custom.
Pot of Greed/Fissure chính thức đã được mở có điều kiện bằng hồ sơ riêng;
xem [phạm vi hiện hành và 169 test](reviewed-spells.md).
Các mục dưới đây ghi lại nền tảng và các giới hạn Chain vẫn áp dụng.

## Phạm vi mã và bằng chứng

`packages/engine/src/effect-plans.ts` nhận handler ID và board phía server tại resolution,
trả kế hoạch bất biến. Không đọc tên/passcode, không diễn giải văn bản, không sửa snapshot.
Primitive không export trực tiếp; applyAction gọi chúng trong luồng resolution thử nghiệm.

- `draw`: trả số lần required draw cho controller của link. API thử nghiệm đã áp dụng draw qua hàm draw/event hiện có, kể cả failed-draw loss.
  Activation không chặn vì deck thiếu bài, theo quyết định Goat đã duyệt.
- `destroy-lowest-opposing-face-up-attack`: xét effective ATK hiện tại của quái thú đối phương
  ngửa, chọn mức nhỏ nhất. Nếu hòa, trả decision cho controller của link; hết ứng viên thì no-op.
  Đây là lựa chọn lúc resolution, không phải khai báo targeting lúc activation.
  Đã nối destruction/movement/event trong phạm vi normal monster. Chưa có immunity/replacement.

Nguồn đối chiếu ngày 2026-10-15:

1. [Konami: Pot of Greed](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4844&request_locale=en):
   “Draw 2 cards.” Snapshot current text: `data/evidence/konami/4844.json`.
2. [Konami: Fissure](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4835&request_locale=en):
   “Destroy the 1 face-up monster your opponent controls that has the lowest ATK (your choice, if tied).”
   Snapshot current text: `data/evidence/konami/4835.json`.
3. [GoatFormat, rulings F–H](https://www.goatformat.com/rulings3.html), mục FISSURE,
   Individual Card FAQs, đọc lại trực tiếp ngày trên:
   “You can activate "Fissure" even if your opponent only has 1 monster on the field.”
   “If there are two or more monsters with equal ATK on your opponent’s side of the field,
   you (the player who activated "Fissure") select which monster will be destroyed.”
   Đây là bản sưu tầm cộng đồng; không gắn nhãn nguồn Konami sơ cấp.

Current text và FAQ trên đủ để thử primitive, chưa thay thế hồ sơ duyệt toàn bộ lịch sử
activation/targeting/Chain của hai lá. Không sửa historicalTextReview trong overlay,
không sửa implementation/testing trong bundle nhập. Hồ sơ semantic review mới chỉ mở 2 lá
trong scope được nêu ở reviewed-spells.md.

## Kiểm thử và bước nối tiếp

12 test mới kiểm tra draw plan, lowest ATK, loại own/face-down, một ứng viên, hết ứng viên,
quyết định khi hòa, board thay đổi trước resolution, tính bất biến và input không hợp lệ.
Đây là unit test primitive; không phải kiểm thử kích hoạt lá thật hoặc Chain.

## Luồng gameplay thử nghiệm đã có

createRegistry có tham số thứ ba spellBindings, chỉ nhận binding cho Normal Spell custom verified/hợp lệ.
Đây là fixture/infrastructure, không phải chức năng tạo bài riêng. Binding official trực tiếp không mở bài; phải dùng tham số hồ sơ riêng (xem reviewed-spells.md).
Handler và tham số được pin trong registry hash; không đọc văn bản bài để chạy code.

- set-spell/activate-spell trong open Main của người đi lượt, đúng ô trống hoặc đúng ô bài đã úp.
- Normal Spell được kích hoạt trong lượt vừa Set sau khi cửa sổ phản hồi đóng.
- Kích hoạt tạo một link speed 1, không cost/target; đối thủ có priority phản hồi trước.
- Hai bên pass mới resolution. Không cho Normal Spell chain vào link đang có.
- Hòa ATK tạo effect-choice trong resolution: kiểm tra actor, decision ID, lựa chọn và version.
- Resolution xong đưa Phép xuống Mộ; mở action-response. Không dùng quota Normal Summon.
- Trừ chối sai timing/actor/zone/choice/version trả đúng snapshot cũ.
- Concession trong response hoặc decision kết thúc trận, bỏ Chain/decision đang chờ.

**Giới hạn:** một link Normal Spell, chỉ phản hồi bằng pass; chưa có speed 2/3, negate,
LIFO nhiều link, cost, targeting, Trigger/SEGOC, modifier hay replacement. Không được gọi đây là
Chain đầy đủ. Trong scope không có effect thay đổi sân giữa activation/resolution nên test board
thay đổi mới nằm ở primitive, chưa phải integration test nhiều link.

13 test tích hợp mới dùng fixture custom tách khỏi catalog, cộng 12 test primitive và 132 test cũ.
Tổng 157 test đạt; typecheck, build, cards:check và engine:smoke đạt trên Linux.

Checklist nền tảng (hồ sơ/binding/test hai Phép đã bổ sung trong reviewed-spells.md; Chain nhiều link vẫn chưa có):

1. Binding đã duyệt, pin fingerprint định nghĩa và nguồn lịch sử, tách khỏi snapshot nhập.
2. Mở rộng binding official theo hồ sơ duyệt; activation/Set cơ bản đã có, cost chưa có.
3. Mở rộng Chain nhiều link, responder speed 2/3, negate và test LIFO; response/pass một link đã có.
4. Bổ sung ngoại lệ/replacement theo từng capability; draw/destroy/loss cơ bản đã có.
5. Test tích hợp qua applyAction, gồm activation bị từ chối không đổi state,
   hòa ATK, mục tiêu hợp lệ thay đổi khi resolve và failed required draw.

Chưa chuyển sang giao diện/online hoặc công cụ tạo bài riêng.
