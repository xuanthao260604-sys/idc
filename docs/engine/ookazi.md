# Ookazi — hiệu ứng trong phạm vi đã duyệt — 27/10/2026

Mở Ookazi (official:19523799) trong catalog runtime bằng review riêng,
không sửa snapshot nhập. Catalog tăng 109 → 110 loại: 95 quái thường và
15 hiệu ứng được duyệt trong phạm vi hỗ trợ (11 Phép, 3 FLIP, 1 Bẫy).
Tổng dữ liệu nhập vẫn 110 lá/17 bundle, 95 verified và 15 historical pending.

## Nguồn và ràng buộc

Dùng [snapshot Konami đã đọc ngày 26/10](../data/ookazi.md), CID 4352:
“Inflict 800 points of damage to your opponent's Life Points.”
HTML gốc có SHA-256
f197145576d527bc20b289c136d6bc9d2c7325aabb2dfe75252bb94a8336fec1.
API ghi ngắn hơn; cả hai cách viết và bản in SDK-023 vẫn được giữ nguyên.
Không khẳng định đây là nguyên văn bản in năm 2002/2005.

Review data/reviews/ookazi.effects.json pin toàn bộ parsed definition:
834b4eee8335d5e15da679820bd89d728327b5b7f2dee1dd9be895a7e0180bac,
format goat-2005-08-17 revision 4 và scope
normal-spell-life-points-single-link-v1. Dùng lại handler inflict-damage
với amount=800. Không thêm bộ diễn giải text hoặc thay đổi engine.
Sai definition/revision/legality/scope hoặc override official đều bị từ chối.
Không có review thì dữ liệu nhập không đủ để mở hiệu ứng.

Bản nhập vẫn verification=pending, implementation=not-started,
testing=not-run, effects=[]; summary implemented/testedEffects/playable=0.
Đây là trạng thái snapshot nguồn, tách biệt review runtime và bằng chứng
kiểm thử bên dưới. engine:capabilities tự lấy 15 review đang hoạt động;
UI hiện có vẫn trình bày hai trạng thái riêng.

## Hành vi hỗ trợ

- Người có lượt, Main 1/Main 2 mở và đúng priority; từ tay cần ô Phép/Bẫy
  trống hoặc kích hoạt lá đã Set của mình, kể cả Set trong cùng lượt.
- Không chi phí, không chọn mục tiêu; người nhận và lượng sát thương lấy
  từ review trên server. Không cần quái trên sân hoặc bài còn trong deck.
- LP giữ nguyên khi kích hoạt và sau pass đầu. Khi link xử lý sau hai pass,
  đối thủ nhận đúng 800 sát thương hiệu ứng; LP sàn 0. Public fact amount=800
  kể cả overkill; đây không phải sát thương chiến đấu.
- LP về 0 kết thúc ngay, winner là controller. Cleanup Phép về Mộ và Chain
  rỗng trong cùng lệnh. Không tiêu hao lượt Normal Summon/Set.
- Cả A và B dùng cùng hành vi. Bài úp giữ kín với đối thủ đến khi kích hoạt.
  Gửi lại lệnh đã nhận hoặc đổi handle khi tải lại không xử lý sát thương lần hai.

Chỉ hỗ trợ một link với phản hồi Pass trong phạm vi này. Chưa có general
mixed Chain/negate, giảm/ngăn/chuyển sát thương, replacement, modifier hoặc
trigger do sát thương. Không bổ sung luật hoặc tương tác của lá ngoài pool.

## Bảo toàn và kiểm chứng

Đưa bundle Ookazi và review vào danh sách đầu vào dùng chung cho preflight
và runtime. Không đổi 109 definition, 14 handler cũ, raw/evidence/overlay,
starter 40 lá, deck A/B hoặc artwork. Deck cũ tải nguyên byte; batch Ookazi
nhập lại thành công/lỗi vẫn được kiểm tra bảo toàn toàn bộ file bằng byte.
Pool đủ bản sao hiện có 328 lá (325 + 3 Ookazi); không thêm trần 60 lá.

31 ca mới tools/ookazi.test.ts kiểm tra review, A/B × tay/Set × Main1/Main2,
LP 801/800/799/1, cleanup/kết thúc, quota, sai phase/controller, client giả
amount/playerId, extra link, deck rỗng, command retry và deck cũ A/B.
Preflight bổ sung hai ca thiếu bundle/review Ookazi.
Bốn browser mode: a:hand:normal, b:set:normal, a:set:lethal,
b:hand:lethal; kiểm tra LP trước/sau pass, bài úp, thông báo 800, Mộ,
quota và public facts/result ở cả hai ghế. Chỉ chỉnh fixture trước khởi động.

Mở rộng fixture 109 → 110 thay đổi kết quả xáo bài. Hồi quy Magician of
Faith phát hiện phép đếm tay sau Pass đã dùng ghế đang xem thay vì chủ
sở hữu; ca thử được sửa để luôn đếm tay A, kể cả khi viewer là B. Không
đổi engine hoặc kết quả hiệu ứng để khớp kiểm thử.

Kết quả đầy đủ Linux và Windows CI sẽ được ghi sau khi đọc report thực tế.
Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
