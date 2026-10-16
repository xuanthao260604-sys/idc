# Rà soát tương tác pilot — 16/10/2026

Không mở thêm bài, không sửa dữ liệu hoặc hồ sơ hiệu ứng. Đợt này rà lại các nhánh
đã hỗ trợ và thêm regression test trong flips.test.ts, dựa trên scope/nguồn ở
reviewed-flips.md: FLIP kích hoạt khi bị lật, trả tay không phải lật,
phá bài úp không phải Flip Summon; quái sống sót sau tính sát thương có thể là target.

| Tình huống | Kết quả được kiểm tra |
| --- | --- |
| Man-Eater Bug phá Hane-Hane đang úp | Hane xuống Mộ, không phát FLIP hoặc trả nguồn về tay |
| Hane-Hane trả Man-Eater Bug đang úp | Bug về tay ở trạng thái kín, không kích hoạt phá quái |
| Hane trả quái của mình về tay rồi Normal Summon lại | Marker sân cũ được xóa; lần triệu hồi mới dùng quota Normal |
| Bug sống sót sau battle và tự phá mình | Damage đã áp dụng giữ nguyên; attacker không được tấn công lần hai |

Các test dựng scenario trước hành động, sau đó gọi applyAction và kiểm tra invariants.
Chúng không phải trận tự nhiên hoặc bằng chứng cho toàn bộ luật Yu-Gi-Oh!.
Không cần sửa engine để các tình huống này hoạt động.

Giới hạn giữ nguyên: chưa có replay do thay đổi sân trong Battle Step, Chain hỗn hợp,
negate, SEGOC tổng quát, Special Summon hoặc modifier/immunity/replacement.
20 definitions được hỗ trợ trong scope, không đồng nghĩa mọi tương tác đều hoàn tất.
Trạng thái nhập và runtime capability vẫn tách biệt. Chưa xác nhận Windows thực tế.

## Kết quả kiểm chứng

259/259 test đạt (17 FLIP, gồm 4 test bổ sung); typecheck, build và cards:check đạt.
Mixed smoke qua API vẫn kết thúc sau 16 lượt/339 lệnh, dùng đủ 5 hiệu ứng,
B thắng với LP 0/4200. Tất cả kết quả đợt này trên Linux; không chạy lại browser
vì không thay logic sản phẩm hoặc giao diện. Các kết quả browser trước được giữ ở tài liệu riêng.
