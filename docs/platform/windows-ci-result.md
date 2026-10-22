# Kết quả Windows CI — 16/10/2026

> Mốc hiện hành: [catalog 100](../data/classic-100.md), [run 39746863841](https://github.com/xuanthao260604-sys/idc/actions/runs/39746863841), commit fa6b773.
> 423/423 test, 21 bước, 11 browser run bằng Edge 154.0.4258.62; Windows/Ubuntu đều đạt.
> Windows 11 desktop chưa chạy. Các kết quả dưới đây giữ làm lịch sử.

> Mốc trước: [catalog 80](../data/classic-80.md), [run 39744582537](https://github.com/xuanthao260604-sys/idc/actions/runs/39744582537), commit 5ed6911.
> 380/380 test, 21 bước, 11 browser run bằng Edge 155.0.4283.62; Windows/Ubuntu đều đạt.
> Windows 11 desktop chưa chạy. Các kết quả dưới đây giữ làm lịch sử.

> Mốc trước: [catalog 70](../data/classic-70.md), [run 39742428389](https://github.com/xuanthao260604-sys/idc/actions/runs/39742428389), commit 9a3fadf.
> 357/357 test, 21 bước, 11 browser run bằng Edge 154.0.4258.62; Windows/Ubuntu đều đạt.
> Windows 11 desktop chưa chạy. Các kết quả dưới đây giữ làm lịch sử.

> Mốc trước: [catalog 60](../data/classic-60.md), [run 39740451524](https://github.com/xuanthao260604-sys/idc/actions/runs/39740451524), commit d7d1a74.
> 334/334 test, 21 bước, 11 browser run bằng Edge 155.0.4283.62; Windows/Ubuntu đều đạt.
> Windows 11 desktop chưa chạy. Các kết quả dưới đây giữ làm lịch sử.

> Mốc trước: [ba khung mặt trước](../beta/card-fronts.md), [run 39737883662](https://github.com/xuanthao260604-sys/idc/actions/runs/39737883662), commit 93e1191.
> 321/321 test, 21 bước, 11 browser run bằng Edge; 50 preview có sao theo dữ liệu. Windows/Ubuntu đều đạt.
> Windows 11 desktop chưa chạy.

> Mốc trước: [mặt sau chung do người dùng cung cấp](../beta/card-frames.md), [run 38881716115](https://github.com/xuanthao260604-sys/idc/actions/runs/38881716115), commit 70034db.
> 321/321 test, 21 bước, 11 browser run bằng Edge; Windows/Ubuntu đều đạt. Windows 11 desktop chưa chạy.

> Mốc trước: [catalog 50 lá](../data/classic-50.md), [run 38878802549](https://github.com/xuanthao260604-sys/idc/actions/runs/38878802549), commit c1c1d38.
> 321/321 test, 21/21 bước, 11 browser run bằng Edge 154.0.4258.62; Windows và Ubuntu đều đạt.
> Windows 11 desktop chưa chạy; các kết quả dưới đây là lịch sử.

> Mốc trước: [catalog 40 lá](../data/classic-40.md), [run 38877923439](https://github.com/xuanthao260604-sys/idc/actions/runs/38877923439), commit d902d0a.
> 308/308 test, 21/21 bước, 11 browser run bằng Edge 154.0.4258.62; Windows và Ubuntu đều đạt.
> Windows 11 desktop chưa chạy; các kết quả dưới đây là lịch sử.

> Mốc trước: [catalog 30 lá](../data/classic-30.md) đạt [run 38876718294](https://github.com/xuanthao260604-sys/idc/actions/runs/38876718294)
> trên commit c1a8f81: 295 test, 21 bước, 11 browser run. Windows 11 desktop chưa chạy.

> Kết quả tiếp theo: [mục xây deck](../beta/deck-builder.md) đã đạt Windows/Ubuntu CI
> ở [run 38874697590](https://github.com/xuanthao260604-sys/idc/actions/runs/38874697590), commit fc8bb52: 278 test, 19 bước,
> 9 browser run. Báo cáo bên dưới giữ mốc CI đầu tiên sau sửa newline.

**Đã đạt Windows CI và Ubuntu CI** trên commit
7294e60aa84a660a269b7cf5005caba68f3a1e57, nhánh work.
[Run có kết quả thật](https://github.com/xuanthao260604-sys/idc/actions/runs/38872877968).
Không phải kiểm chứng Windows 11 desktop hoặc bản beta đã phát hành.

## Môi trường và kết quả Windows

- Runner windows-latest, platform win32/x64, OS release 10.0.26100.
- Node 24.19.0; npm thực tế của runner 11.17.0 (cloud Linux dùng 11.9.0).
- Microsoft Edge Edg/154.0.4258.62, lấy version từ CDP thực.
- 267/267 test, 19 test file; typecheck, build, data check và CLI startup đạt.
- Tổng 18/18 bước của validate:platform đạt; 8 browser report, không runtime exception.
- Browser: đủ 5 effect, xem Mộ, A/B/ngẫu nhiên, bỏ bài, Pot còn 0/1/2 lá,
  hủy/đồng ý đầu hàng và tạo trận mới sau kết thúc.
- Trận browser tự nhiên: 16 lượt/339 lệnh, 15 attack, 4 decision, đủ 5 effect,
  B thắng với LP 0/4200. Không sửa state trong lúc chơi.
- Ubuntu job trong cùng run cũng đạt toàn bộ core checks đã cấu hình.

Đã tải artifact và đọc report JSON/test log để xác nhận platform, trạng thái từng bước,
số test, 8 browser report và windows11DesktopVerified=false; không suy kết quả từ cấu hình CI.
Artifact windows-validation-38872877968-1 chứa report cùng log; CI giữ 14 ngày.
Bản tải local ở artifacts/ci-windows-success/ bị Git bỏ qua. Link run/commit và tài liệu
này lưu lại kết quả, không khẳng định artifact được giữ vĩnh viễn.

## Lỗi đã phát hiện và sửa

[Run đầu](https://github.com/xuanthao260604-sys/idc/actions/runs/38872740517)
trên commit 3fb6b5d thất bại tại kiểm thử import giữ nguyên byte: checkout Windows tự
đổi LF thành CRLF, trong khi importer ghi JSON xác định bằng LF. Ubuntu đạt.

Thêm .gitattributes: text dùng LF ổn định giữa hai hệ điều hành; data/raw/** đặt -text
để snapshot content-addressed giữ nguyên byte. Không nới assertion so sánh byte,
không sửa checksum hoặc dữ liệu bài/hiệu ứng. 30 test importer đạt local trước push;
run Windows sau sửa đạt toàn bộ 267 test và các bước còn lại.

## Trạng thái bàn giao của mục

Đã hoàn tất phần chuẩn bị và kiểm chứng Windows tự động trong CI. Người dùng đã cho phép
commit/push work để thực hiện công việc này; chưa tạo release, installer hoặc bàn giao beta.
Chưa có môi trường Windows 11 desktop được cung cấp, nên kiểm tra trực tiếp trên máy
Windows 11 vẫn để **chưa chạy**, không ghi mục tương thích sản phẩm hoàn tất 100%.
Ca desktop, Chrome Windows riêng và thao tác touch/keyboard toàn diện chưa có bằng chứng.

Tài liệu chuẩn bị trước đây ghi “chưa chạy CI” là lịch sử; kết quả hiện hành ở tài liệu này.
