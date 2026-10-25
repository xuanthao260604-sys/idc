# Phân biệt các bản sao cùng tên khi chọn bài — 25/10/2026

Trước đây một số lựa chọn chỉ ghi tên bài: hai Battle Ox làm chi phí,
hai quái cùng tên để hiến tế, hoặc hai Phép cùng tên trong quyết định lấy
bài từ Mộ có nhãn giống nhau. Engine đã dùng handle riêng, nhưng người
chơi khó nhận biết bản sao đang chọn.

Bổ sung vị trí theo đúng PlayerView hiện tại:

- Tay bài: vị trí theo thứ tự nhận, giữ số này khi chỉ sắp xếp hiển thị.
  Dùng chung cho tooltip/nhãn đọc của nút bài, panel đọc lá đang chọn,
  danh sách chi phí và bảng quyết định bắt buộc.
- Mộ: vị trí từ trên xuống, lá mới nhất ở vị trí 1, khớp cửa sổ Xem Mộ.
  Dùng cho mục tiêu, preview, bảng quyết định và đọc target trong Chain.
- Hiến tế: chủ sân và số ô Quái gốc; ô trống không làm lệch số.
- Quái vừa bỏ bằng Monster Reincarnation vẫn có nhãn Lá sẽ bỏ làm chi phí,
  kèm vị trí tay của đúng bản sao; giữ bộ lọc tương thích cost/target cũ.

Số vị trí chỉ mô tả view đang xem, không phải ID vĩnh viễn của lá. Khi có
command, vị trí được tính lại từ view mới. Giá trị option/radio/checkbox
vẫn là handle server cấp, không tìm lá hoặc gửi lệnh bằng tên/số vị trí.
Chỉ xem hoặc đổi lựa chọn không gửi lệnh; Hủy giữ nguyên trận.
Không thêm thông tin tay/deck đối thủ hoặc danh tính bài úp vào view.

## Kiểm chứng

Ca `--choice-identities`, chạy bằng `npm run beta:browser-choice-identities`,
dựng fixture catalog 109 trước server, không chỉnh state khi chơi:

- Hai Battle Ox xen giữa bởi Gaia trên tay, hai Celtic Guardian ở ô 1/3,
  hai Fissure và hai Hane-Hane xen kẽ trong Mộ. Nhãn từng bản sao khác nhau,
  giữ đúng vị trí tay khi xếp theo tên và khớp vị trí từ trên xuống của Mộ.
- Đọc/hiến tế nháp rồi Hủy giữ toàn view và không có command; preview vẫn
  dùng đúng lá. Kiểm tra bài úp A từ ghế B vẫn không có tên thật.
- Monster Reincarnation bỏ Battle Ox thứ hai và lấy Hane-Hane thứ hai.
  Kiểm tra đúng hai handle trong request. Sau command/resolve, thứ tự những
  lá khác xen giữa chứng minh đúng bản sao đã rời tay/Mộ dù handles xoay mới.
- Faith Flip Summon: hai Fissure có vị trí khác nhau trong bảng quyết định.
  Đọc không chọn hộ; xác nhận lấy Fissure thứ hai, request đúng handle và
  thứ tự Mộ còn lại chứng minh đúng bản sao đã được lấy. LP/quota giữ nguyên.
- Đã chụp/xem dialog 1440/390; nhãn dài không làm tràn ngang, preview có thể
  đọc đầy đủ khi cuộn. Deck A/B đọc trước/sau giống nhau.

Ca riêng đạt Linux/Chromium 154.0.8037.57, runtimeExceptions=0.
Đang chạy bộ tổng hợp Linux; Windows CI chưa xác minh cho source mới.
Thêm một bước và một browser report, dự kiến 46 bước và 36 report.
Các ca reincarnation/tribute-doomed cũ chọn bằng handle/định nghĩa hiện
trong view thay vì phụ thuộc nhãn cũ chỉ có tên; giữ assertion hành vi cũ.

Không đổi engine, card facts/effect/review, catalog 109, artwork hoặc deck cũ.
Windows 11 desktop chưa kiểm thử trực tiếp; chưa đóng gói/bàn giao beta.
