# Hane-Hane và Man-Eater Bug — FLIP trong scope một link

> Các số liệu bên dưới ghi mốc triển khai FLIP ban đầu. Kiểm thử bổ sung hiện tại
> được ghi riêng tại [rà soát tương tác pilot](pilot-interaction-audit.md).

Hồ sơ `data/reviews/pilot.flip-effects.json` mở hai lá qua tham số thứ năm của createRegistry.
Hồ sơ và định nghĩa được kiểm tra schema, ID/type, format revision, SHA-256 toàn bộ định nghĩa,
không tự sửa fingerprint khi dữ liệu thay đổi. Hash registry pin cả hồ sơ và handler.
Registry mặc định vẫn vanilla; CLI engine:capabilities dùng cả hồ sơ Phép và FLIP, báo 19 hỗ trợ,
chỉ Trap Hole bị chặn. Đây là khả năng runtime trong scope, không phải 19 lá đã duyệt mọi tương tác.

```ts
createRegistry(bundle.cards, goat200508Format, {}, spellReviews, flipReviews);
```

## Hành vi đã thực thi

- Normal Summon/Set không kích hoạt FLIP. Flip Summon ở Main đúng luật tạo mandatory trigger.
- Khi bị tấn công lúc úp: lật trước calculation, tính/apply damage, xác định battle destruction,
  rồi mới kích hoạt FLIP tại after-calculation. Trận đã kết thúc vì LP về 0 không chạy FLIP tiếp.
- Pending trigger lưu source/controller/event snapshot. Chọn target trước khi tạo link,
  trong scope hiện tại có tối đa một mandatory trigger và một link, không phải SEGOC đầy đủ.
- Controller của FLIP chọn một quái trên một trong hai sân, kể cả quái úp hoặc chính nguồn;
  quái đã battle-destroyed không được chọn. Bug là quái duy nhất hợp lệ phải chọn chính nó.
- Target lưu instance/location ở activation; response hiện chỉ bằng pass. Hết hai pass mới resolve.
- Man-Eater Bug phá target; Hane-Hane trả target về tay owner, xóa counter/field markers.
  Nguồn không tự xuống Mộ vì kích hoạt monster effect.
- Nếu nguồn bị battle-destroyed, nó vẫn kích hoạt và resolve trước khi xuống Mộ ở end Damage Step.
  Sau effect, engine tiếp tục đúng Damage Step, không tính lại sát thương hoặc tạo replay.
- Từ chối sai actor/decision/phase giữ nguyên snapshot; mandatory target không được bỏ qua bằng pass.
  Concession xóa cả pending trigger/decision/Chain để kết thúc trận.

## Nguồn và mức chắc chắn

Current text/type/stats của Konami trong data/evidence/konami/4547.json và 4507.json;
bản in LOB 2002 đã được đối chiếu từ Giai đoạn 3. Đây không phải bản chép text in năm 2005.

- https://www.goatformat.com/rulings5.html, Man-Eater Bug:
  “If "Man-Eater Bug" is the only monster on the field when it is flipped, it destroys itself.”
- https://www.goatformat.com/basics.html, Substep 5: FLIP/flip-face-up triggers kích hoạt
  after damage calculation, sau khi monster được coi là destroyed by battle; chuyển Mộ ở Substep 6.
- Official current rulebook SD_RuleBook_EN_10.pdf, mục Activation of a Flip Effect:
  không chọn monster đã bị phá trong damage calculation làm target của FLIP.
  Dùng baseline này cùng thứ tự Goat ở trên, không nhập hệ Damage Step hiện đại.

Hai trang Goat là bản cộng đồng, không phải bản gốc UDE được xác thực. Quotation, URL/ngày và hash
nguồn đọc ngày 2026-10-15 được lưu trong data/evidence/effects/flip-rulings.json và hồ sơ review.
Hồ sơ là semantic review của dự án cho supported scope; importer historical printed-text review
vẫn pending. Không sửa raw, overlays hay generated để nâng trạng thái nhập.

## Kiểm thử và giới hạn

13 test mới: gate 19/1, review conflict/duplicate/stale format, self-target hai lá,
hai lá bị phá bởi battle vẫn resolve và không chọn nguồn battle-destroyed, target úp,
return/reset markers, Normal Summon/Set không trigger, sai quyền/decision/pass/phase,
concession, Hane sống sót sau damage và lethal damage chặn FLIP.
Các scenario biên dựng state hợp lệ rồi chuyển qua applyAction; không mô tả chúng là full-duel test.
Tổng 182 test đạt trên Linux; typecheck/build, cards:check, engine:capabilities và vanilla smoke đạt.

Chưa có nhiều link, speed 2/3, negate, general trigger queue/SEGOC, immunity/replacement,
continuous effects, lật bởi hiệu ứng khác, thay đổi controller, server/UI hoặc online.
Trong scope chỉ một monster mới bị lật trong một hành động/battle. Không suy diễn kết quả kiểm thử
thành hỗ trợ mọi ngoại lệ hoặc mọi lá FLIP. Sự kiện destruction/send-to-graveyard và việc nhóm
nhiều draw cần rà lại khi bổ sung các trigger ngoài scope hiện tại.

Bước tiếp theo: Trap Hole cần cửa sổ summon-response, priority/targeting và điều kiện kích hoạt Trap;
không mở lá đó trước khi có review/handler/test tương ứng.

Cập nhật sau bước FLIP: [Trap Hole đã được nối](reviewed-trap.md), capability 20 khi truyền đủ hồ sơ;
các số 19/182 ở trên ghi mốc riêng của bước FLIP.
