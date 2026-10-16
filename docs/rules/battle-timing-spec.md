# Battle, Chain và timing — đặc tả bản đầu

Nguồn đã đọc 2026-10-15:
- https://www.goatformat.com/basics.html (Rules #4–#16, #19)
- https://www.goatformat.com/home/6-facts-that-you-should-know-about-priority
- https://www.goatformat.com/rulings6.html (Peten the Dark Clown)
- https://www.yugioh-card.com/en/play/fast-effect-timing/
- Rulebook English v5.0 lưu trữ, cộng với rulebook hiện tại cho baseline không đổi.

Đây là đặc tả toàn bộ timing mục tiêu. Engine hiện mới thực thi battle vanilla; xem ../engine/vanilla-core.md.
Không coi mô tả Trigger/Chain dưới đây là đã được thực thi.

## Priority và Chain

1. Tách cửa sổ negate summon với cửa sổ phản hồi sau summon thành công.
2. Thu thập Trigger trước khi mở cơ hội ignition. Người chơi có priority, bản thân lá bài không có.
3. Goat cho turn player cơ hội dùng ignition đúng điều kiện trong response sau summon/Chain.
   Ignition vẫn speed 1: không chain ignition vào Trigger hoặc một Chain Link đang chờ phản hồi.
4. Khi thêm Chain Link, đối thủ của người vừa activate có cơ hội phản hồi trước.
5. Hai bên pass liên tiếp: resolve Chain LIFO hoặc đóng cửa sổ hiện tại nếu không có Chain.
   Không dùng pass để bỏ qua Trigger bắt buộc hay công việc bắt buộc của phase.
6. Không activate giữa lúc Chain đang resolve. Trigger phát sinh được ghi nhận, kiểm tra timing
   và xếp ở Chain mới sau đó. Lưu snapshot source/controller lúc event, không chỉ kiểm tra vị trí cuối.
7. Cùng thời điểm: turn-player mandatory, opponent mandatory, turn-player optional, opponent optional;
   người chơi chọn thứ tự trong nhóm. Khác thời điểm: nhóm sự kiện trước được xếp trước theo Goat #9.
8. Với optional “when”, sự kiện yêu cầu phải là sự kiện liên quan cuối cùng khi cửa sổ activation tới.
   Không suy ra mọi optional effect đều dùng cùng quy tắc. Ruling từng lá quyết định classification.

## Sáu thời điểm Damage Step theo Goat

| Timing nội bộ | Hành động và giới hạn chính |
|---|---|
| start | Trước lật mục tiêu úp; chỉ hiệu ứng đúng timing/category hoặc ngoại lệ ruling |
| before-calculation | Lật mục tiêu nếu cần; áp continuous thích hợp; hiệu ứng destroy continuous có thể bị hoãn |
| calculation-1 | Trigger đúng damage calculation và cơ hội thay ATK/DEF theo luật Goat; xác định kết quả battle |
| calculation-2 | Áp battle damage; Trigger gây/nhận battle damage theo ruling |
| after-calculation | Đánh dấu bị phá bởi battle; xử lý FLIP và các Trigger phù hợp, chưa gửi quái thú thua trận xuống Mộ |
| end | Gửi các quái thú bị phá còn hợp lệ xuống Mộ; thu thập Trigger tương ứng |

Mỗi timing có tối đa một Chain thông thường; Chain Trigger phát sinh do resolution là ngoại lệ.
Không cho phép mọi speed 2 ở Damage Step. Monster effect negate activation và Counter Trap được
xét theo timing/ruling; Spell/Trap speed 2 chỉ có khả năng negate activation không tự được phép dùng.
Hiệu ứng đổi ATK/DEF phải đúng cửa sổ, không mở suốt cả sáu timing. Mỗi handler cần chỉ rõ timing.
Mất LP về 0 có thể kết thúc trận trước các bước sau; không chờ hết toàn Damage Step.

## Battle cơ bản và replay

- ATK đấu ATK: bên thấp hơn bị phá, controller chịu chênh lệch; bằng nhau phá cả hai.
  Goat phá cả hai ngay cả 0 ATK đấu 0 ATK.
- ATK đấu DEF: ATK lớn hơn phá defender, mặc định không gây damage; bằng nhau không phá;
  ATK thấp hơn gây chênh lệch damage lên bên tấn công, mặc định không phá attacker.
- Direct attack mặc định cần đối thủ không có quái thú; card effect có thể thay đổi điều kiện.
- Replay thuộc Battle Step, không tự áp cùng cơ chế trong Damage Step. Theo Goat replay là
  tuyên bố tấn công mới; có thể không tấn công ngay và dùng lại quái thú đó sau trong Battle Phase.
  Ghi riêng attack declaration/cost và việc đã chiến đấu, không chỉ dùng một cờ attacked.

## Danh sách tình huống hiệu ứng Giai đoạn 4 — CHƯA CHẠY

- Trigger sau summon được xếp trước ignition; ignition không chain vào Trigger.
- Sangan tribute cho Monarch được ghi event trước sự kiện summon.
- Peten tribute/discard làm cost không được coi là event cuối sau resolution.
- Trigger ghi nhận giữa Chain còn có thể tạo Chain mới dù source đã chuyển vùng, theo ruling Goat.
- FLIP bị đánh và phá vẫn xử lý đúng trước khi gửi xuống Mộ; không chọn quái đã bị battle destroy
  khi ruling không cho phép chọn nó.
- Một Chain thông thường/timing, Chain Trigger follow-up vẫn được xét.
- Replay tạo declaration mới, kiểm tra lại cost/cửa sổ phản hồi.
- End Phase discard có thể tạo phản hồi/Trigger rồi kiểm tra hand limit lại (core hiện có response/pass, chưa có Chain/Trigger hiệu ứng).

## Tình huống vanilla đã chạy trong Giai đoạn 4A

- 0 ATK đấu 0 ATK phá cả hai; ATK=DEF không phá cả hai.
- Tấn công normal monster úp: lật trước calculation, trace sáu timing, gửi Mộ ở cuối khi bị phá.
- LP về 0 tại calculation-2 kết thúc ngay.
- Response/pass trước chuyển phase và sau action; không cho chen action Main sai cửa sổ.
- Discard đúng số lượng về 6 và xử lý response/pass trước đóng lượt.
- Chưa có test hiệu ứng FLIP, effect Chain, replay hoặc negate trong các ca vanilla trên.
