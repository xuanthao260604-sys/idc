# Rà soát Phép LP qua lớp lệnh bàn đấu — 22/10/2026

Mục này bổ sung 11 kiểm thử tích hợp trong tools/life-point-commands.test.ts, dùng catalog
102 lá và các review đã có ở [mục Phép LP](life-point-spells.md). Không thêm lá, dữ liệu,
handler, luật mới hoặc thay đổi trạng thái review. Không cần sửa engine để các ca này đạt.

Fixture được chuẩn bị tại server trước khi tạo command adapter, kiểm tra invariants;
sau đó mọi chuyển trạng thái đi qua lệnh public và handle của người chơi. Không gán lại
LP, đổi sân hoặc thay definition trong khi chạy kịch bản.

| Nhánh | Điều được xác minh |
| --- | --- |
| Hai lá LP, mỗi người chơi làm controller | LP đổi đúng người, đúng lượng; activity công khai giống nhau ở A/B |
| Gửi lại activation và pass đã resolve sau refreshView | Trả receipt cũ, không áp LP lần hai, không tăng stateVersion hoặc thêm history |
| Hinotama với đối thủ 500 hoặc 200 LP | LP về 0, winner A; retry giữ kết quả, lệnh mới bị từ chối, không còn availableActions |
| Client gửi thêm amount/playerId/handler hoặc dùng handle trước refresh | Từ chối, không thay LP/stateVersion/history |
| Set Dian Keto rồi yêu cầu danh sách hành động nhiều lần | Đối thủ chưa thấy identity; dò availableActions không hồi LP hoặc thêm activity |
| Kích hoạt Dian đã Set cùng lượt | Identity được công khai khi activation, hồi khi resolve và giải phóng ô |
| Dian/Hinotama/Pot/Fissure và thứ tự ngược | Bốn link độc lập dùng lại một ô, không kẹt Chain/decision; LP 9000/7500, bốc 2, phá đúng một quái |

Hai thứ tự bốn Phép không phải Chain bốn link. Chúng là bốn activation liên tiếp sau khi
link trước đã resolve và cửa sổ mở lại. General mixed Chain/negate, replacement/prevention,
trigger do thay đổi LP và SEGOC vẫn ngoài phạm vi. Không thêm diễn giải luật chính thức mới.

Receipt được lưu trong adapter còn sống; refreshView chỉ xoay handle/góc nhìn. Đây không
phải reconnect qua mạng, không chứng minh chống xử lý lặp sau restart process; persistence
trận và online vẫn chưa triển khai. Các ca này là tích hợp kịch bản, không thay bằng chứng
trận tự nhiên/trình duyệt của mốc trước và không phải kiểm thử Windows 11 desktop.

## Kết quả

Linux: typecheck đạt; 467/467 test trong 25 file, gồm 11 ca tích hợp mới.
Windows và Ubuntu CI đều đạt trên commit dc25a98f5b82732f651d7c8ab7b31821eea1df28,
[run 39753236857](https://github.com/xuanthao260604-sys/idc/actions/runs/39753236857).
Đã tải/đọc artifact: Windows x64 10.0.26100, Node 24.19.0, npm 11.17.0;
467/467 test, 23/23 bước, 13 browser report với Edge 154.0.4258.62, runtimeExceptions=0.
Không chạy lại bộ browser Linux vì không thay mã sản phẩm hoặc browser harness.
Dữ liệu/deck/ảnh và scope runtime giữ nguyên; chưa đóng gói beta.
