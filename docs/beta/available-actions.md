# Lựa chọn thao tác hợp lệ do engine cung cấp

Beta HTTP gọi getView/refreshView với includeActions=true. DuelClientView có availableActions
tùy chọn; adapter dùng bình thường vẫn có thể lấy view không kèm discovery. Những lựa chọn này
là intent bằng mã tạm, gắn với đúng viewer/projection/version, không phải quyền bỏ qua luật.

packages/engine/src/available-actions.ts tạo candidate từ bài của mình và sân công khai,
rồi thử applyAction trên state bất biến. Chỉ candidate được chấp nhận mới đi vào danh sách.
Các snapshot/event của lần thử bị bỏ, không gán về adapter: không bốc bài thật, trả cost,
đổi LP, dùng quota, tăng version, ghi history hoặc receipt. Bộ discovery không gọi submit.

Có cache riêng theo projection của mỗi người; action thật thành công xóa cache cả hai phía,
refresh seat xóa cache phía đó. Không dùng lại mã tạm sau khi đổi version hoặc quay vòng view.
Danh sách không chứa raw instance IDs, định nghĩa/tên bài kín, source snapshot, RNG hoặc
option của decision riêng. Decision tiếp tục dùng tập lựa chọn đã lọc trong PlayerView,
không liệt kê mọi tổ hợp trả lời trong availableActions.

## UI đã nối

- Nút bài, Pass và phase khóa khi engine không có intent tương ứng.
- Normal Summon/Set khóa sau khi đã dùng quota. Spell/Trap không chọn ô đang có bài.
- Với Tribute, liệt kê các tổ hợp từ quái mình kiểm soát theo profile hiện tại; ô đang chiếm
  có thể dùng nếu quái tại đó được tribute trong cùng intent. Không tự cho dùng ô chỉ vì đã tick đủ số.
- Bài không cần tribute không hiện checkbox hiến tế; bài cần tribute hiện đúng số cần chọn.
- Target không hợp lệ bị khóa; Trap Hole chỉ cho chọn quái vừa Normal/Flip Summon hợp lệ,
  không chọn nhầm quái đã đứng trên sân từ trước.
- Confirm chỉ mở khi slot/tribute/target khớp một intent hợp lệ. Xử lý bằng engine lại khi gửi,
  stale state, thiếu quyền hoặc input giả vẫn bị từ chối như trước.
- Mở Mộ đặt lại trạng thái nút Confirm, tránh giữ trạng thái khóa của hộp thao tác trước.

Đây là capability cho pilot 20 lá trong scope hiện tại, không phải action solver cho mọi bài.
Candidate construction chỉ dùng own/public information. Trước khi thêm hiệu ứng liên quan
thông tin kín, search/reveal, nhiều target/cost hoặc modifier, phải review lại tính riêng tư và
phạm vi discovery; không tự suy từ accepted/rejected probe để tiết lộ dữ liệu kín cho người chơi.
Phạm vi one-link Spell/FLIP, limited summon Trap Chain và các giới hạn luật cũ giữ nguyên.

## Bằng chứng

5 test mới: discovery không đổi snapshot/quota; mã tạm/ID kín/refresh; Pot probe không draw;
Spell/Trap destination bị chiếm; Tribute trên sân đầy chỉ dùng ô được giải phóng đúng tổ hợp.
Tổng 233/233 test thư viện/HTTP đạt, cùng typecheck/build/syntax check/cards:check.

Chromium effect regression vẫn chạy đủ 5 effect; thêm assertion ô summon bị chiếm bị khóa
và hộp target Trap chỉ có 1 lựa chọn hợp lệ. Trận tự nhiên vẫn kết thúc sau 16 lượt/339 command,
dùng đủ 5 effect, B thắng LP [0,4200], không có runtime exception. Browser checks được tính riêng,
không cộng vào 233 test Vitest. Chưa test Windows thật hoặc mọi opening hand.

## Chạy bản cập nhật

Dừng process beta cũ bằng Ctrl+C, chạy lại `npm run beta`, rồi tải lại trang.
Phải khởi động lại server để nhận trường availableActions mới; chỉ reload CSS/JS không cập nhật
server Node đã chạy từ bản build cũ. Không cần tải lại dữ liệu bài hoặc cài dependency mới.

## Rà soát bổ sung — 16/10/2026

Thêm 3 regression test tại command-adapter.test.ts:

- Hai scenario Main/Battle so sánh toàn bộ view và availableActions sau khi chuẩn hóa
  opaque handle theo vị trí hiển thị. Hoán đổi danh tính quái úp với một quái khác trong
  deck đối thủ, đảo hai deck và tay đối thủ không làm thay đổi kết quả cho người chơi A.
- Với opening Main cố định, từng action được quảng bá được gửi qua adapter ở một nhánh
  trạng thái tương đương riêng; tất cả được chấp nhận và chỉ tăng version một lần.
  Việc đọc discovery trước đó không làm thay đổi view đối thủ.

Đây là kiểm tra không tiết lộ qua discovery trong các scenario nêu trên, không phải
chứng minh an toàn cho mọi lá/hiệu ứng tương lai. Không thay engine, luật hoặc dữ liệu bài.
Tổng hiện tại 262/262 test đạt cùng typecheck trên Linux. Không chạy lại browser trong
đợt này vì không thay mã sản phẩm; các kết quả browser trước được ghi riêng.

Giao diện bổ sung: [đánh dấu lá có thao tác](actionable-cards.md) dùng cùng danh sách hành động server; không suy luận luật thêm ở client.
