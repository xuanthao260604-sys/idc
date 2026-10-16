# Xây deck từ bộ pilot 20 lá

Trạng thái triển khai: có editor và lưu deck riêng cho A/B. Kết quả kiểm chứng cuối mục
được ghi ở phần cuối tài liệu; đây không phải mở rộng catalog hoặc tạo bài mới.

## Cách dùng

1. Chọn người chơi rồi mở Xây deck. Cửa sổ chỉ tải deck đã lưu của góc nhìn đó.
2. Tìm theo tên/nội dung hoặc lọc Quái/Phép/Bẫy. Chọn tên lá để đọc nguyên văn text/chỉ số.
3. Dùng +/− để chỉnh số bản sao; bộ đếm và lỗi cập nhật ngay. Pot of Greed tối đa 1,
   các lá khác theo giới hạn catalog/format. Tối thiểu 40; không áp trần 60 hiện đại.
4. Lưu deck hợp lệ. Dùng deck mẫu chỉ thay bản nháp; vẫn phải bấm Lưu để áp dụng.
5. Tạo trận mới để dùng deck A/B đã lưu gần nhất. Lưu/sửa deck không chỉnh trận đang chơi.

Đóng/Escape bỏ bản nháp chưa lưu, không sửa deck cũ. Nếu kết nối lỗi, bản nháp vẫn ở trong
cửa sổ và hiển thị chưa xác nhận lưu. Nếu server đã lưu nhưng phản hồi bị mất, gửi lại
revision cũ sẽ bị từ chối; đóng/mở lại tải bản đã lưu. Không tự nhận lỗi mạng là lưu thành công.
Nếu hai tab cùng sửa hoặc đổi seat ở tab khác, server kiểm tra revision và seat kỳ vọng;
không ghi đè bản mới hoặc vô tình lưu deck A vào B.

## Lưu trữ và bảo toàn dữ liệu

CLI beta mặc định lưu .ygo-local/decks/a.json và b.json trong checkout, Git bỏ qua.
Mỗi file có schemaVersion, format id/revision, revision lưu và danh sách definition ID.
Có thể cấu hình thư mục qua YGO_BETA_DECK_DIR ở startup, không nhận đường dẫn qua HTTP.
Không cần database. Chỉ deck được lưu qua restart, chưa lưu trận/hand/deck order/RNG.
Không có import/export deck, nhiều deck profile hoặc side/Fusion Deck trong mục này.

Chưa từng lưu thì dùng deck mẫu hợp lệ 40 lá. File đã lưu sai JSON, format hoặc deck không
hợp lệ làm startup báo lỗi và giữ file nguyên vẹn, không tự ghi đè bằng deck mẫu.
Lưu kiểm tra bằng cùng validateDeck của engine; ghi temp, sync, rename rồi mới commit bộ nhớ.
Lỗi ghi/đổi tên giữ deck cũ; tác vụ tiếp theo vẫn có thể chạy. Một tiến trình server serialize
các save và kiểm tra revision; đây chưa phải hệ lưu trữ nhiều server/online.

## API

- GET /api/catalog thêm deckRules và maxCopies công khai, chỉ gồm các bài runtime hỗ trợ.
- GET /api/deck cần cookie seat; trả seat/revision/cards/defaultCards của chính seat đó.
- POST /api/deck nhận đúng {seat, revision, cards}; seat phải khớp cookie. Không nhận path,
  chỉ số, effect code hoặc dữ liệu định nghĩa do client cung cấp.
- Deck thiếu lá/quá copy/ID không hỗ trợ: 422; schema sai: 400; stale/seat đã đổi: 409.
- POST /api/reset giữ hợp đồng cũ, lấy deck đã lưu của cả hai người. Trận cũ chỉ được thay
  sau khi tạo trận mới thành công. Không thay dữ liệu nguồn/generated/review để xây deck.

## Kiểm chứng

- Store: 8 test về limits/default, reload Unicode, deck riêng, validation không đổi file,
  concurrent/stale save, rename failure không mất bản cũ và corrupt file không bị thay.
- HTTP: 3 test bổ sung về cookie/seat binding, lỗi giữ deck/trận, save chỉ áp dụng khi reset.
- Browser --deck-builder: chọn/lọc/đọc text, min/copy limits, A=41/B=42, hủy giữ bản cũ,
  lỗi mạng giữ bản nháp, save giữ nguyên view trận và reset dùng đúng hai deck.
- CLI startup smoke: lưu deck qua HTTP, dừng/khởi động lại, đọc lại deck và tạo trận theo deck đó.
  Dùng thư mục lưu tạm riêng, không đọc/ghi deck cá nhân của người đang chạy kiểm thử.

Bộ tổng hợp Linux hiện đạt 19/19 bước, 278/278 test và 9 browser run, không có runtime
exception. Windows CI của mục này sẽ được đối chiếu riêng, không lấy kết quả Windows mốc cũ.

Đã chụp/xem bố cục 1440px và 390px trên Chromium/Linux, hộp thoại không tràn ngang.
Enter trong ô tìm kiếm không tự lưu deck; có regression bằng sự kiện phím thực qua CDP.
