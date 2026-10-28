# Hướng dẫn lượt và lịch sử công khai

> Cập nhật 28/10/2026: đã thêm [bài phản hồi hợp lệ ngay trong hướng dẫn lượt](response-guide.md), gồm Trap Hole và Magic Jammer. Bằng chứng Linux/Windows CI hiện hành ghi tại tài liệu đó; số liệu bên dưới giữ mốc ban đầu.

> Cập nhật: đã có [lọc lịch sử công khai](activity-filters.md), giữ Pass có kết quả và kiểm chứng trên Windows CI. Các số kiểm thử bên dưới ghi mốc hướng dẫn/activity ban đầu.

Bàn đấu beta có bảng hướng dẫn ngay trên sân, cập nhật từ PlayerView:

- Ai đang có priority, khi nào dùng Pass và vì sao Pass không tự kết thúc lượt.
- Nút Chuyển cho người chơi tương ứng mở hộp chuyển máy đã có, không tự lộ tay của người đó.
- Nhắc trả lời lựa chọn bắt buộc/bỏ bài cuối lượt, rồi mới tiếp tục.
- Chỉ dẫn Main/Battle/chuyển phase và thông báo người thắng, lý do kết thúc.
- Khóa đầu hàng khi đã có kết quả; chỉ dẫn trạng thái đang xử lý khi gửi lệnh.

Đây là giải thích từ trạng thái công khai; không bổ sung luật, không tự bỏ qua priority hoặc tự pass.
Các giới hạn gameplay đã ghi trong tài liệu engine vẫn áp dụng.

## Lịch sử thao tác

DuelClientView mở rộng PlayerView bằng activity. Adapter giữ tối đa 60 thao tác được chấp nhận,
hiển thị trong mục có thể mở/đóng “Lịch sử thao tác công khai”. Mỗi entry chỉ có:
stateVersion, actorId, turn, phase, action type; có thể thêm resolution dạng tóm tắt công khai. Turn/phase là bối cảnh ngay trước thao tác;
stateVersion là phiên bản sau khi chấp nhận thao tác.

Không có tên/ID/handle bài, target/decision options, raw events, source snapshots hoặc RNG.
Set Phép/Bẫy chỉ ghi một loại thao tác chung, không tiết lộ lá đó là Phép hay Bẫy.
Gửi lại cùng command trả receipt cũ, không thêm entry. Lệnh bị từ chối không ghi ra lịch sử chung.
Hai người thấy cùng entry công khai, còn tay/Set/decision tiếp tục lọc theo viewer như trước.

Activity không phải battle log đầy đủ. Đã bổ sung tóm tắt bốc bài, sát thương và movement/destruction
qua public-resolution-feedback.md; không mô tả mọi timing hoặc bước resolve. Không dùng để replay/khôi phục trận. Reset tạo adapter mới nên xóa lịch sử;
refresh/chuyển seat giữ lại lịch sử nhưng quay vòng handle theo chính sách cũ.
Không có persistence qua restart và không mở raw engine events xuống browser.

## Kiểm chứng

Thêm 3 test về activity: dedup/rejection/refresh và đúng phase context, Set không lộ danh tính,
giới hạn 60 entry và dedup vẫn giữ receipt cũ. Tổng 228 test thư viện/HTTP đạt.
Typecheck/build, syntax checks và cards:check đạt. Không đổi dữ liệu nhập gốc.

Chromium chạy lại hai chế độ:

- Effect scenario: đủ 5 effect qua controls, dùng nút chuyển máy mới, kiểm tra hướng dẫn lựa chọn,
  lịch sử không có tên 5 lá hiệu ứng; không có runtime exception.
- Trận tự nhiên: 16 lượt/339 command, 15 attack, 4 decision, đủ 5 effect, B thắng LP [0,4200].
  Kiểm tra hướng dẫn hiện người thắng, không cho đầu hàng tiếp, history đúng 60 entry/allowlist.

Vẫn chưa test Windows thật, mọi browser/touch/accessibility, online hoặc mọi opening hand.
Bước tiếp theo là cải thiện việc chọn bài/ô và xử lý lỗi thao tác khi người dùng chơi thử;
không coi hướng dẫn hoặc activity là bằng chứng đã hoàn thành toàn bộ game.

Mốc mới nhất: [public resolution feedback](public-resolution-feedback.md), tổng 250 test Linux.
