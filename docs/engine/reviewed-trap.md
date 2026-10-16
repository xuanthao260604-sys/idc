# Trap Hole — phản hồi triệu hồi trong pilot

Hồ sơ `data/reviews/pilot.trap-effects.json` mở lá cuối cùng của pilot qua tham số thứ sáu:

```ts
createRegistry(bundle.cards, goat200508Format, {}, spellReviews, flipReviews, trapReviews);
```

Khi truyền đủ hồ sơ, registry có 20/20 definitions trong phạm vi được hỗ trợ. Registry mặc định
vẫn vanilla. Đây không phải hoàn tất luật Yu-Gi-Oh! hoặc mọi tương tác của 20 lá.
Dữ liệu raw/overlay/generated không bị sửa; snapshot nhập vẫn giữ các status cũ.

## Luồng đã triển khai

- set-trap ở open Main của người đi lượt, đúng lá trên tay và ô Spell/Trap trống.
- activate-trap dùng source đã Set từ lượt trước, trên sân người kích hoạt, lúc có priority.
- Chỉ mở trong summon-response của quái đối phương Normal/Tribute/Flip Summon có ATK >=1000;
  Set không phải Summon, không dùng Trap Hole để negate Summon.
- Người vừa triệu hồi giữ priority trước; sau khi họ pass, đối thủ mới được kích hoạt.
  Không có ignition effect trong catalog hiện tại để kiểm thử ngoại lệ ignition priority Goat.
- Ghi target instance/location tại activation, link Spell Speed 2. Giữ sự kiện triệu hồi làm
  điều kiện phản hồi khi thêm các Trap đã hỗ trợ vào cùng Chain; hai pass liên tiếp mới resolve.
- Cho phép nhiều Trap cùng đáp lại lần triệu hồi đó, xử lý LIFO. Target đã rời sân thì link sau
  không phá lại. Trap xuống Mộ sau khi các link được xử lý xong.
- Chỉ phá target còn đúng location, ngửa và đạt ngưỡng ATK. Chưa có modifier để thử ATK thay đổi.
- Hai bên pass không đáp lại thì đóng cửa sổ; không thể kích hoạt muộn trong open Main.

EventRef nay có details tùy chọn để lưu phương thức triệu hồi một cách có kiểu trong snapshot;
không đọc kết quả do client tính. actorId vẫn phải do adapter/session tin cậy cung cấp.

## Nguồn

- Current Konami text và bản in LOB 2002: data/evidence/konami/4836.json.
- https://www.goatformat.com/rulings7.html, TRAP HOLE / Netrep Rulings:
  “Trap Hole” is a targeting effect. Trích dẫn đã so khớp trực tiếp ngày 2026-10-15;
  URL/ngày/hash HTML ở data/evidence/effects/trap-rulings.json. Đây là bản cộng đồng,
  không phải bản UDE gốc được xác thực.
- Quy tắc Trap Set, Spell Speed, Chain và priority dùng baseline rulebook cùng các quyết định
  format revision 4 đã duyệt. Không suy luận quy tắc từ tên bài.

Review pin SHA-256 toàn bộ định nghĩa và format revision, có provenance riêng, conflict thì dừng.
Hồ sơ là semantic review trong scope; historical printed-text review của importer vẫn pending.

## Kiểm thử

11 test mới: gate 20/0, review drift/duplicate, Set qua API, priority/target/destroy/cleanup,
LIFO hai Trap chỉ phá một lần, cấm cùng lượt Set, ATK thấp, kích hoạt từ tay, Set monster,
cửa sổ đã đóng, Flip Summon normal monster, sai quái/summon của mình và Special Summon event fixture.

Special Summon mới được thử bằng event fixture; chưa có lệnh Special Summon gameplay.
Các test dựng scenario hợp lệ rồi gọi applyAction, không phải full duel gồm toàn bộ 20 loại bài.
Tổng 193 test đạt trên Linux; typecheck, build, cards:check, engine:capabilities và vanilla smoke đạt.

## Phần chưa có

Chưa có Chain responder tổng quát/mixed effects, Counter Trap, negate, ignition priority handler,
Special Summon, general SEGOC, immunity/replacement/modifier hoặc UI/online.
Normal Spell và FLIP vẫn trong scope riêng đã ghi; nhiều link mới được kiểm thử cho các Trap
phản hồi cùng summon event. Không tự coi là Chain engine hoàn chỉnh.

Đã bổ sung [trận kết hợp qua API](mixed-duel-smoke.md), có đủ 5 effect và kết thúc bằng LP.
Tiếp tục củng cố event/Chain contract và player view trước khi chuyển giao diện; Giai đoạn 4 vẫn đang thực hiện.
