# Giai đoạn 4A — Engine quái thú thường

> Tài liệu mốc vanilla, không phải trạng thái toàn dự án. Hiện đã có 5 hiệu ứng,
> PlayerView, adapter và bàn đấu hotseat; xem README và pilot-interaction-audit.md.

Trạng thái: đã có core và kiểm thử vanilla; Giai đoạn 4 tổng thể vẫn đang thực hiện.
Chưa có giao diện, server Socket.IO, PlayerView projection hoặc hiệu ứng Spell/Trap/Effect Monster.

## API nội bộ

Mã tại packages/engine/src/index.ts:

- createRegistry(definitions, format): đọc định nghĩa đã xác minh, chọn các quái thú thường hợp lệ
  mà core hỗ trợ; giữ riêng unsupportedIds. Không sửa status hoặc text trong bundle nhập.
- createDuel(registry, options): kiểm tra deck, shuffle, phát tay đầu, chọn người đi trước và bốc
  Draw Phase đầu. Trả snapshot bất biến và event. Không nhận kết quả do client tính.
- applyAction(registry, state, request): kiểm tra input runtime, actor, version, phase, quyền và
  điều kiện; xử lý trên bản clone. Action bị từ chối trả lại đúng snapshot cũ, không trả cost nửa chừng.
- assertDuelInvariants(state, registry): kiểm tra phiên bản, zone/instance, không mất/nhân đôi bài,
  LP và phạm vi core. Corrupt snapshot là lỗi lập trình, không được nuốt thành một action thành công.

Request nội bộ dùng instanceId; actorId phải do adapter/session đáng tin gắn vào.
Chưa phải giao thức được mở trực tiếp lên Internet. Backend về sau phải xác thực session,
map các handle đúng quyền và không tin actorId do trình duyệt tự khai.
Toàn bộ DuelState gồm tay/deck/RNG chỉ ở server; chưa có hàm lọc PlayerView để gửi ra trình duyệt.

## Luật đã triển khai và kiểm thử

- Main Deck ít nhất 40, copy limit theo định nghĩa và profile, không áp max 60 hiện đại.
  Không nhận card chưa verified, sai định dạng, bị cấm hoặc chưa thuộc capability core.
- Hai người; mỗi bên 8000 LP; phát 5 lá rồi người đi trước bốc lá thứ 6 ở Draw Phase đầu.
- Draw, Standby, Main1, Battle, Main2, End. Người đi trước không Battle ở turn 1;
  Main2 chỉ sau Battle. Request chuyển phase cho đối thủ cơ hội pass trước khi tiến hành.
- Response window sau hành động: đúng người có priority mới pass; không bỏ qua cửa sổ bằng
  một hành động Main khác. Chưa có kích hoạt hiệu ứng trong cửa sổ này.
- Normal Summon face-up Attack hoặc Set face-down Defense, chung quota 1/lượt qua cả hai Main.
- Tribute 1 cho level 5–6, 2 cho level 7 trở lên trong phạm vi level schema. Tribute được dùng
  quái thú úp của mình, có thể giải phóng ô đích đang đầy, không phát sự kiện bị phá bởi battle.
- Tribute Set không phát sự kiện summon thành công. Flip Summon không dùng quota Normal.
- Đổi tư thế tay đúng Main, không cùng lượt vừa Summon/Set, đã đổi hoặc đã tuyên bố attack.
  Monster Summon trong lượt vẫn được attack khi tới Battle, không tự thêm summoning sickness.
- Declare attack, phản hồi/pass rồi xử lý battle. Direct chỉ khi đối phương không có quái thú.
- ATK/ATK, ATK/DEF, không piercing mặc định, tie 0 ATK phá cả hai theo Goat.
- Quái thú úp bị lật trước calculation; trace đủ 6 timing cho battle chỉ gồm vanilla;
  mark battle destruction rồi gửi Mộ ở cuối Damage Step. LP về 0 kết thúc ngay, không đợi hết Step.
- Cuối lượt hand limit 6: chọn đủ số lá khác nhau trên tay, gửi Mộ, mở lại response trước khi đóng lượt.
- Deck rỗng chưa tự thua; failed required draw mới thua. Có concession, không xử lý action sau khi trận kết thúc.

## Những phần chưa được triển khai

Không có effect handler, Chain có hiệu ứng, negate summon/activation/effect, Trigger queue thực thi,
SEGOC thực thi, missing timing thực thi, continuous modifier/equip hoặc Field Spell.
Các trường tương ứng còn trong hợp đồng tương lai; core từ chối state đang có Chain/Trigger/modifier
thay vì bỏ qua chúng. Các lá Effect/Spell/Trap chưa được đưa vào deck.

Sáu timing trong trace là kiểm thử thứ tự battle vanilla. Chưa có test giới hạn Spell Speed,
Chain trong Damage Step hoặc FLIP Effect; việc lật normal monster không phải thực thi FLIP Effect.
Replay do hiệu ứng thay đổi sân, control change và các ngoại lệ liên quan còn chờ bước hiệu ứng.
Fusion/Ritual, Trap Monster/Union, special win condition, match/side decking cũng chưa được hỗ trợ.
Không có dedup commandId hoặc reconnect/session; stale version rejection hiện có không thay cho dedup ở Giai đoạn 6.

## RNG, phiên bản và tính lặp lại

Shuffle Fisher–Yates với stream HMAC-SHA256 và rejection sampling. Seed mặc định là 32 byte ngẫu nhiên
phía server, không đưa vào view/log công khai. Seed cố định chỉ dùng trong test/replay nội bộ.
Registry hash pin profile, capability version và các định nghĩa có hỗ trợ. Không dùng state với registry khác.
Snapshot và registry được deep-freeze; không dùng thời gian hệ thống trong transition gameplay.
Chưa có lưu/khôi phục trận lâu dài; chiến lược version migration cần làm khi thêm persistence.

## Tách bài gốc khỏi engine

Engine không có nhánh xử lý theo tên/passcode cụ thể và không fetch dữ liệu bài.
Registry nhận các định nghĩa được truyền vào; tests đã thay toàn bộ catalog bằng dữ liệu custom
**tổng hợp dành riêng cho test**, tạo trận với deck 63 lá mà không thay engine.
Các fixture đó không phải bài Yu-Gi-Oh! thật và không được thêm vào data/generated.
Đây là bằng chứng ranh giới dữ liệu, không phải công cụ tạo bài custom đã hoàn thành.

Dữ liệu Giai đoạn 3 vẫn giữ implementation=not-started/testing=not-run của lần nhập, effects=[];
đó là metadata của snapshot nhập, không phải bảng capability runtime. Báo cáo engine:smoke ghi riêng
15 normal definitions được core hỗ trợ, 5 definitions còn bị chặn. Chưa có activated effect nào hỗ trợ.
Khi bổ sung hiệu ứng cần registry handler + kiểm thử riêng và cách tích hợp readiness, không sửa bundle nhập tay.

## Chạy từ thư mục checkout

```sh
npm ci
npm run typecheck
npm test
npm run cards:check
npm run engine:smoke
```

Engine là thư viện TypeScript chạy Node.js, dùng node:crypto cho RNG/version hash.
Giao diện web tương lai dùng package protocol, không bundle RNG/state server vào trình duyệt.
Các lệnh không yêu cầu Bash trong script npm. Hiện mới kiểm thử trên Linux, chưa xác thực Windows thực tế.

## Kết quả đã quan sát

- 52 test engine đạt, gồm hai trận hoàn chỉnh với hai seed test khác nhau, qua API hành động công khai.
- Tổng 132/132 test đạt, giữ nguyên 80 test dữ liệu/pipeline/luật trước đó.
- Typecheck, build, cards:check và engine:smoke đạt.
- Smoke CLI: 8 lượt, 150 command, 18 draw, 8 summon, 8 attack, 8 battle-damage event;
  bên b thắng khi LP bên a về 0. Không dùng concession hoặc chỉnh tay state trong trận smoke.
- Không có test gameplay online/giao diện, không có test effect ở con số này.

Headless smoke driver chỉ là công cụ xác thực, không phải AI đối thủ thuộc sản phẩm.
Bước tiếp theo trong Giai đoạn 4: xác minh lịch sử từng lá trong nhóm 5 lá pending, rồi thiết kế/triển khai
hệ thống hiệu ứng và các handler nhỏ có test. Chưa chuyển sang Giai đoạn 5 giao diện.

Tiến độ tiếp theo: xem [nền tảng hiệu ứng](effect-foundation.md). Đã thêm primitive resolution
với unit test riêng và luồng kích hoạt một link Normal Spell qua fixture custom. Đây là scope
thử nghiệm mở rộng, chưa mở Phép chính thức; các giới hạn vanilla ở trên mô tả registry mặc định.
