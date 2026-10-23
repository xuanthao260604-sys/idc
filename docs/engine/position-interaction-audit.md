# Rà soát tương tác đổi tư thế — 23/10/2026

Rà soát sau Block Attack, không thêm lá hoặc đổi engine, dữ liệu nhập, hồ sơ review,
artwork hay deck. Catalog vẫn 107 loại: 95 quái thường và 12 lá hiệu ứng trong scope
đã duyệt. Snapshot nhập và khả năng runtime tiếp tục được ghi riêng.

10 test mới trong tools/block-attack.test.ts chạy đối xứng cho A/B, dựa trên nguồn
và scope tại [Block Attack](block-attack.md), [Hammer Shot](hammer-shot.md),
[Fissure](reviewed-spells.md) và [Smashing Ground](smashing-ground.md).

| Chuỗi hành động | Điều được kiểm chứng |
| --- | --- |
| Block Attack đổi Battle Ox đối thủ sang DEF → Hammer Shot | Loại Battle Ox khỏi nhóm tấn công; Hammer Shot phá Celtic Guardian của chính người dùng khi đó là quái tấn công còn lại |
| Block Attack đổi Mystical Elf sang DEF → Fissure | Vẫn so ATK 800, không dùng DEF 2000; Elf bị phá, Battle Ox ATK 1700 còn trên sân |
| Block Attack đổi Mystical Elf sang DEF → Smashing Ground | Vẫn tính Elf là quái ngửa, so DEF 2000 và phá Elf; không tráo ATK/DEF |
| Block Attack khiến sân không còn quái tấn công → Hammer Shot | Từ chối activation nguyên trạng, giữ Phép trên tay; vẫn có thể Set Phép |
| Block Attack đổi Giant Soldier of Stone sang DEF, Mystical Elf vẫn ATK → Smashing Ground | Cả hai cùng DEF 2000, đều vào lựa chọn khi resolve; chỉ phá đúng lá người dùng chọn |

Fixture dựng trước hành động; sau đó mọi thay đổi qua applyAction, kiểm tra invariant
sau mỗi lệnh hợp lệ và không sửa state đầu vào. Quái úp vẫn được bỏ qua đúng scope,
LP và quota Normal giữ nguyên. Các phép được dùng nối tiếp sau khi Chain trước đã
xử lý và cửa sổ phản hồi đã đóng; đây không phải Chain nhiều link.

Không cần sửa engine để các ca này hoạt động. Không mở thêm mixed Chain, negate,
modifiers/immunity/replacement, lật bài úp hoặc ruling mới. Đây là kiểm thử tình
huống, không phải bằng chứng bao phủ mọi tương tác Yu-Gi-Oh!.

## Kiểm chứng

Linux: typecheck và toàn bộ 686/686 test trong 32 file đạt; riêng Block Attack có
39 test (29 cũ + 10 mới). Không chạy lại browser Linux vì không thay logic sản phẩm
hoặc giao diện; báo cáo browser mốc triển khai giữ ở tài liệu Block Attack.
Windows/Ubuntu CI đang chờ kiểm chứng trên commit audit.
Windows 11 desktop chưa thử trực tiếp; không đóng gói hoặc bàn giao beta.
