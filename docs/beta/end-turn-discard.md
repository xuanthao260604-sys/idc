# Lựa chọn bắt buộc và bỏ bài cuối lượt

Form chọn bài hiển thị số đã chọn, cập nhật khi thay đổi lựa chọn và chỉ mở xác nhận
khi số lượng nằm trong min/max server cung cấp. Dùng radio khi max=1 và checkbox khi
chọn nhiều. Khi đang gửi lệnh, form bị khóa. Server vẫn kiểm tra số lượng, trùng bài,
quyền, version và mã lựa chọn; khóa UI không thay thế kiểm tra luật.

Khi vào End với 8 lá, phải chọn đúng 2 lá bỏ xuống Mộ để còn 6. Quyết định và các mã
lựa chọn chỉ gửi cho người có tay bài đó; đối thủ không nhận decision. Sau khi bỏ bài,
phải xử lý cửa sổ phản hồi trước khi yêu cầu sang lượt kế tiếp. Bài đã xuống Mộ là công khai.
Không thêm luật/hiệu ứng hoặc sửa dữ liệu pilot trong đợt này.

## Kiểm thử

- Adapter: quyết định riêng, thiếu/trùng bài, sai người, cố chuyển lượt sớm đều bị từ chối
  và giữ nguyên cả hai view. Gửi lại lệnh thành công không bỏ thêm bài hoặc ghi thêm lịch sử.
- `npm run beta:browser-discard`: fixture dựng tay 8 trước khi chạy server, sau đó chỉ dùng
  điều khiển UI để vào End, kiểm tra form kín với B, bộ đếm 0/1/2/3 lựa chọn,
  bỏ 2 lá và chuyển sang lượt B. Không có endpoint sửa state hoặc chỉnh trận khi đang chơi.
- Thay đổi form cũng áp dụng cho lựa chọn FLIP/Fissure; browser effect regression kiểm tra
  lại các thao tác chọn target một lá.

Đã kiểm tra trên Chromium/Linux, không phải bằng chứng Windows 11. Có bước CI Windows
riêng nhưng chưa chạy. Không cần người dùng nhận beta hoặc tự kiểm thử ở thời điểm này.

Kết quả đợt này: 263/263 test, typecheck và build đạt. Browser discard và 5 hiệu ứng đạt;
trận browser tự nhiên vẫn kết thúc sau 16 lượt/339 lệnh, không có runtime exception.

## Sửa thông tin quyền phản hồi

Khi có quyết định bắt buộc, PlayerView gửi priorityPlayer=null cho cả hai góc nhìn.
Trước đây, End Phase giữ priority nội bộ của A nên B thấy “Chờ A phản hồi”, dù Pass
bị cấm. Nay B thấy “Người chơi còn lại đang chọn bài” và nút chuyển máy dẫn về A;
A vẫn có decision riêng. Không gửi thêm ID, loại hoặc option của decision cho đối thủ.
Khi trả lời xong, view lại có priority theo cửa sổ phản hồi của engine.

Đây là sửa projection/hướng dẫn, không đổi luật priority nội bộ hoặc thêm hiệu ứng.
Regression adapter kiểm tra cả hai priority=null và đối thủ chỉ còn action concede;
browser kiểm tra lời hướng dẫn, Pass bị khóa và hoàn tất chuyển lượt.
