# C4d — new-game Fissure choice và Tribute cost/target

Ngày 24/11/2026. Kế thừa C4c `b80c730`, báo cáo `4941f3b`.
Default v6 giữ nguyên; audit riêng hai root Fissure và Tribute to The Doomed.
Không mở pattern/hiệu ứng mới hoặc coi đã audit new-game đủ 11 Phép.

## Đầu vào và hành trình

`naturalChoiceStart` trả nguyên state frozen từ createDuel: lượt 1/Draw,
stateVersion 0, LP 8000, sân/Mộ trống. Test so cả state với createDuel mới
cùng input. Hai deck 40 lá hợp lệ, seed và thứ tự input được chọn trước
khởi tạo bằng nghịch đảo shuffle; engine vẫn shuffle/deal/Draw chuẩn.
Đây là đầu vào deterministic để tái lập, không phải mẫu ngẫu nhiên bất kỳ.
Không clone rồi sửa zone/LP/phase/quota/marker/receipt giữa hành trình,
không thêm seed hoặc endpoint sửa state vào server/CLI sản phẩm.

| Lượt | Các thao tác thật |
| --- | --- |
| 1 | Actor Set ba Seven và Set Faith, dùng quota Normal Set. |
| 2 | Đối thủ Set Magic/hai Seven, Summon Skull Servant thứ nhất; Man-Eater Bug được rút thật và giữ làm cost. |
| 3 | Actor rút lá cost tiếp theo, Set root Phép ở ô 3. |
| 4 | Đối thủ rút Magic thứ hai, Summon Skull Servant thứ hai ở ô 1. Cả hai quái cùng ATK thấp nhất 300. |
| 5 | Root từ Set → Magic bỏ Bug → năm Seven, bảy link. Magic bị phủ nhận; Fissure tạm dừng tại lựa chọn hai quái đồng hạng, hoặc Tribute đã chọn quái/bỏ Skull khi activation. Resume phá đúng quái thứ nhất; nguồn cleanup theo owner. |
| 6 | Rút và Set Seven cuối cùng Magic thứ hai, không dùng nguồn vượt giới hạn ba Seven mỗi người. |
| 7–8 | Qua lượt bằng lệnh thật; Hane-Hane được rút ở lượt 8 làm cost Magic mới. |
| 9 | Flip Summon Faith, lấy lại cùng instance root trong Mộ. Root từ tay → Magic bỏ Hane → Seven cuối, ba link; root tiếp tục phá đúng Skull còn lại. Tribute trả discard Skull khác cho lần activation mới. |

Cả hai root có sáu phí Seven, LP A/B cuối 5000/5000, hai quái bị phá.
Fissure có hai discard Magic; Tribute có thêm hai discard activation root,
tổng bốn. Bug/Hane bị bỏ làm cost không tự kích hoạt FLIP; chỉ Faith được
Flip Summon thật. Hai root/link activation khác nhau, cùng instance Phép
được lấy lại; không hoàn cost khi Magic bị phủ nhận.

## Ma trận và bảo vệ

16 trace: hai root × hai actor × Main1/Main2 ở lượt 5 × hai thứ tự cleanup.
Mỗi trace mirror raw engine và command adapter từng lệnh, kiểm input,
stateVersion, invariant, LP, private keys, owner decision, Mộ/cleanup và
số phí/discard/phá/FLIP. Fissure pin parent stage root-choice và hai option;
engine/adapter từ chối option sai hoặc owner sai mà giữ pause/state.
Retry receipt Magic đầu không làm đổi state ở lượt sau; root handle,
choice/cleanup cũ bị từ chối khi dùng như intent mới, không trả phí lần nữa.
Giới hạn mỗi trace 15 giây cho hành trình chín lượt có kiểm bất biến từng
lệnh; lúc phát triển một ca vượt mặc định 5 giây khi chạy cạnh toàn suite
và browser. Không thay assertion/luật để bỏ ca lỗi.

Hai browser `--natural-choice=a|b`: A/Fissure/Main1, B/Tribute/Main2;
các tổ hợp còn lại chỉ tính coverage engine/adapter. Fissure có một pause
lựa chọn riêng, Tribute không có pause hiệu ứng đó. Cờ oldRootChoiceRejected
chỉ true cho Fissure; false ở Tribute ghi không chạy ca đó, không phải đã
xác nhận một rejection. Cả hai dùng DOM/UI/HTTP thật, store deck in-memory
riêng, giữ saved A/B; thu public history theo duelId/stateVersion trước
limiter 60 mục, không lấy history đã cắt để đếm phí.

Thêm hai mode validation, artifact xác nhận 136 bước/126 browser report, giữ mọi
bước cũ. Timeout CI tăng 25→30 phút: artifact C4c cho thấy validation mất
23 phút 34 giây, thêm hai journey chín lượt cần dư thời gian; không giảm
coverage. Timeout browser riêng mode mới 240 giây, mode cũ giữ nguyên.

## Điểm dừng và phần tiếp theo

Chốt C4d/CI/artifact rồi dừng. C4e tiếp theo lập bảng đối chiếu đúng bảy
điều kiện kết thúc Chain trong roadmap, gắn evidence thành phần/HTTP/UI/
hành trình theo phạm vi thực tế và xác định gap cụ thể; chạy toàn bộ bộ
Linux và Windows CI trên cùng source chốt. Nếu còn gap chặn C1 thì sửa
và xác minh trước khi đóng. Không tự yêu cầu mọi root phải có journey
new-game giống nhau hoặc mở thêm luật để tăng số test.
Ước lượng C4 còn cần cập nhật theo checklist/gap thực tế, trong khung
2–3 ngày công tổng thể. Sau đóng Chain giữ U1 bộ tạo bài riêng rồi W1
Windows 11 desktop thực. Chưa đóng gói hoặc bàn giao beta.

## Bằng chứng

Code `3650a2df808a7c4c0df16ef3be36cc0a525a8cd1` tại [CI 45380797380](https://github.com/xuanthao260604-sys/idc/actions/runs/45380797380), attempt 1.
Ubuntu job `138398989543`, Windows job `138398989220` đều completed/success;
đã đọc log checkout khớp SHA ở cả hai job. Ubuntu đạt **6964/6964 test/76
file**, typecheck, cards:check/build, vanilla/mixed smoke. Local đạt cùng
**6964/6964 test/76 file**, typecheck, cards:check/build và hai smoke.
16 trace mới mirror engine/adapter, không tính đôi số test;
75 suite cũ giữ số ca, 163 migration case/142 golden nguyên byte.

Linux local chạy hai mode natural-choice-a/b trên Chrome/154.0.8037.57:
Fissure 149 lệnh, một root-choice pause, hai discard; Tribute 152 lệnh,
không root-choice pause, bốn discard. Cả hai Chain [7,3], sáu phí Seven,
hai quái bị phá, LP A/B 5000/5000, lượt cuối 9, runtimeExceptions=0.
Không chạy lại bộ 136 bước tổng hợp Linux local trong C4d; Ubuntu CI không
chạy browser tổng hợp. Đây là gap kiểm chứng tổng hợp dành cho C4e,
không lấy số Windows điền thay Linux.

Artifact `windows-validation-45380797380-1`, ID `14914704441`;
SHA-256 ZIP khớp metadata GitHub:
`9d2c473d729f57d2aa12dea1113a5468f555b512a77cb22e119ab7e5c9715c71`.
Report `2026-11-24T11-05-07-962Z-852/report.json`.
Windows win32/x64, OS 10.0.26100, Node 24.19.0,
npm 11.17.0, Edg/157.0.4341.60: **6964/6964 test/76 file,
136/136 bước, 126/126 browser report**, runtimeExceptions=0.

Đã đọc đủ 136 raw step log, đối chiếu JSON browser/report/expected count,
platform/browserVersion/exception. So baseline C4c
`windows-validation-45361921064-1`, source `b80c730`: đủ 134 bước và 124
browser facts cũ giữ nguyên khi bỏ riêng browserVersion; capabilities.log
nguyên byte. ZIP baseline khớp metadata đã lưu. Hai report mới Windows
khớp Linux khi bỏ platform/browserVersion, gồm 149/152 lệnh, Fissure pause,
Tribute cost, Faith lấy cùng root, stale/retry, public history và deck.
Không ghép evidence khác source.

Hash xác nhận engine/protocol, UI/server, dữ liệu/review/evidence,
ảnh/frame/back, deck nguồn, test cũ và golden nguyên byte. README giữ
prefix cũ; capability default v6 không đổi. Chỉ thêm fixture/test/browser
audit, hai mode validation, tăng timeout workflow và tài liệu.
Lúc viết driver đã sửa luồng Fissure từ Set: UI gửi activation ngay khi
nhấn Kích hoạt, không có form xác nhận thứ hai. Đồng thời phân biệt
PlayerView effect-choice của Fissure với target của Faith, và tăng timeout
riêng trace chín lượt lên 15 giây sau một lần quá 5 giây dưới tải đồng thời.
Không sửa luật, review, UI hoặc state để đi qua ca kiểm thử.
Commit chốt sau CI chỉ tài liệu [skip ci]; evidence code thuộc `3650a2d`.

Dừng ở C4d. C4e tiếp theo đối chiếu đúng bảy điều kiện trong roadmap,
chạy toàn bộ Linux cùng source đã có Windows evidence, xác định và sửa
gap chặn nếu có trước khi đóng Chain. Dự kiến 1–2 chu kỳ nếu không có lỗi,
cần cập nhật theo checklist thực tế. Không đòi audit new-game mọi root
hoặc mở rộng C1. Sau đóng Chain giữ U1 bộ tạo bài riêng rồi W1 Windows 11
desktop thực. windows11DesktopVerified=false; chưa đóng gói/bàn giao beta.
