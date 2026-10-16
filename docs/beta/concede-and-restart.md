# Đầu hàng và tạo trận mới sau kết thúc

`npm run beta:browser-concede` dùng trận mới bình thường từ server, không dựng sân,
không chỉnh state. Chromium bấm Đầu hàng và xử lý hộp confirm thực của trình duyệt:

1. Hủy xác nhận: toàn bộ view, version và history giữ nguyên.
2. Đồng ý: B thắng với reason=concession, hướng dẫn ghi đầu hàng, availableActions rỗng.
3. Chuyển sang B: nhận cùng kết quả kết thúc.
4. Tạo trận mới, chọn B đi trước: duelId mới, result=null, history rỗng,
   B có 6 lá và hai bên 8000 LP.

Không thay luật đầu hàng, engine hoặc dữ liệu bài trong đợt này. Đã đạt trên
Chromium/Linux, không có runtime exception. Windows CI có step tương ứng nhưng chưa chạy;
chưa xác nhận Windows 11 thực tế. Không phát hành hoặc bàn giao beta.
