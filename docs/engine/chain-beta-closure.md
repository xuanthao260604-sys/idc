# C4e — nghiệm thu phạm vi Chain C1

Ngày 25/11/2026. Kế thừa C4d, nhánh work ở `2a38731`.
Source code kiểm chứng: `3650a2df808a7c4c0df16ef3be36cc0a525a8cd1`.
`2a38731` chỉ bổ sung báo cáo C4d; packages/apps/tools/data/.github không đổi.
Phiên này chưa sửa code, luật, review hoặc dữ liệu để nghiệm thu.

## Bảy điều kiện trong roadmap

| Điều kiện | Bằng chứng hiện có trong source chốt | Kết luận |
| --- | --- | --- |
| 1. Capability có phiên bản, activation thực và từ chối ngoài scope | `default-counter-profile.test.ts` 21 ca pin default review v6, fail-closed dependency/review, tách ABI v5/v6. `bounded-live.test.ts` 662 ca: 344 Trap shapes, 276 Spell shapes, 22 root odd/even và các guard. Graph/preflight 524/70 ca giữ grammar/pin/copy/zone. Các ca candidate vẫn tính riêng, không gọi là gameplay. | Đủ trong phạm vi C1; không cấp quyền cho mixed Chain tùy ý. |
| 2. Timing/priority/speed, LIFO, cost, target, negate, cleanup | Kernel LIFO dùng chung; migration 163 ca/142 golden v5; graph/dispatcher/frame 524/542/528 ca; live Summon Normal/Tribute/Flip, nhiều Trap Hole, đủ owner assignments khả thi. HTTP boundary 66 ca có LP 999/1000/1001, tay/Set, Main1/Main2, 11 root. C4a–d kiểm phí/cost thật qua nhiều lượt. | Đủ; activation negation theo review, không công bố effect-negation tổng quát. |
| 3. Pause/resume, retry/stale, terminal và reset | Live root-choice/cleanup/concede/failed draw; HTTP 0/1/2 draw và lethal; C4b 10 ca và hai journey đầu hàng owner/non-owner trong cleanup, reset đổi duelId, request cũ bị chặn, deck/file giữ nguyên. C4c/d lấy cùng Phép qua Faith, root/link/handle mới, receipt cũ read-only; Fissure sai option/owner không đổi pause. | Đủ; context/journal chỉ phía server, không thu phí/xử lý lại. |
| 4. UI/PlayerView khớp server và giữ privacy | `bounded-live-adapter.test.ts` 8 ca, suite HTTP 7 ca (6 journey HTTP +1 kiểm profile legacy) và 6 UI mode explicit; 8 mode boundary, hai default-chain mode và 8 journey C4a–d dùng default thật. Decision riêng theo ghế, frame/source snapshot/digest không lộ; preview/hủy không đổi state/LP, link cũ bỏ target handle. | Đủ theo hotseat/cookie/handle hiện có; không tuyên bố bảo mật online/auth. |
| 5. Engine/adapter/HTTP/UI và hành trình nhiều lượt | C4a 8 trace sau fixture lượt 3; C4b 8 trace +2 HTTP từ createDuel; C4c 16 và C4d 16 trace mirror engine/adapter. UI: C4a 84 lệnh, C4b 95/99, C4c 99/102, C4d 149/152. Các trận tự nhiên cũ seed 08/5e là regression riêng. | Đủ đại diện hai họ, odd/even, bound, choice/cost và nhiều lượt; không tính mọi tổ hợp logic là UI. |
| 6. Full Linux/Windows cùng source, raw log/report khớp | Windows CI 45380797380 và Linux local đầy đủ đều đạt cùng code/assets `3650a2d`: 6964 test/76 file, 136 bước/126 report; raw log/JSON/126 bộ facts khớp, capability nguyên byte. | Đạt; xem chứng cứ bên dưới. |
| 7. Không còn lỗi đã biết chặn C1, dữ liệu/ảnh/deck giữ nguyên, giới hạn rõ | Default profile/import/deck HTTP và CLI startup; hash tracked files trước/sau, golden không tái sinh. Runtime 112 định nghĩa/95 quái thường/17 hiệu ứng trong 13 scope; metadata nhập và review/effect/test tách riêng. | Đạt; full regression và hash cuối xác nhận bảo toàn, không còn gap chặn C1 đã biết. |

Các số ca trong bảng mô tả suite có sẵn, không cộng các lớp mirror hoặc
cộng lại thành test mới. Tổng phải lấy từ report của lần chạy cuối.
Fixture graph/board đầu vào, registry explicit v6 và default v6 được ghi
riêng: registry explicit và default có cùng runtime fields; chỉ revision
registry và evidence/notes của boundedCounterReview khác nhau. Không gọi
chúng là byte-identical. Active review mặc định có đúng nguồn v6, test
profile giữ import/review lịch sử và capability delta như đã chốt ở C3.

## Phạm vi Chain đã nghiệm thu

R1 Phép đơn và R2 FLIP hiện có được giữ. R3 nhiều Trap Hole giữ target
và occurrence Summon; không coi Trap Hole là negate Summon. R4 là đúng
11 Normal Spell pin trong [C1](chain-beta-scope.md) → Magic → Seven^0..6.
R5/R6 là Trap Hole^1..3 trên cùng Normal/Tribute/Flip Summon hợp lệ → Seven,
chịu max ba copy mỗi owner và năm ô S/T. Tối đa tám link là bound của
pool này, không phải luật Chain chung. Nhiều Trap Hole trước Seven vẫn
xử lý độc lập; không suy Seven phủ nhận Trap cuối thành quái luôn sống.

Nguồn/cost/LP/priority/target đều qua handler và command thật. Candidate
không tự cấp quyền; client không gửi review/frame để mở capability.
New-game C4b–d dùng createDuel nguyên vẹn với seed/deck input được chọn
để tái lập; không phải mẫu ngẫu nhiên bất kỳ hoặc kiểm phân bố. Không
đòi mọi root có cùng journey new-game; ma trận 11 root thành phần/HTTP
và UI đại diện được đối chiếu riêng.

Ngoài C1 vẫn gồm SEGOC tổng quát, mixed Chain tùy ý, Trigger mới giữa/sau
Chain, Continuous/Quick-Play, Damage Step nâng cao, modifier/replacement,
summon-negation và hiệu ứng ngoài pool. Chưa có lưu trận qua restart,
online/auth hoặc AI. Không đồng nhất giới hạn này với lỗi chặn C1.

## Bằng chứng tổng hợp và bảo toàn

**C4e đạt; đóng phần Chain C1–C4 trong scope hữu hạn đã review.**
Không còn gap đã biết chặn bảy điều kiện nêu trên sau vòng kiểm cuối này.
Không đổi code, luật, review, pool hoặc assertion để chốt kết quả.

Code `3650a2df808a7c4c0df16ef3be36cc0a525a8cd1` giống nguyên byte giữa hai lần kiểm runtime/assets.
Checkout Linux `2a38731` chỉ có hai file báo cáo khác code CI Windows;
commit chốt C4e sau kiểm chứng cũng chỉ tài liệu [skip ci]. Không tuyên bố
CI chạy trực tiếp SHA của commit báo cáo hoặc ghép source khác nhau.

| Bằng chứng | Linux local đầy đủ | Windows CI đầy đủ |
| --- | --- | --- |
| Tests | 6964/6964, 76 file | 6964/6964, 76 file |
| Steps / browser reports | 136/136 / 126/126 | 136/136 / 126/126 |
| OS / arch | 6.18.57 / x64 | 10.0.26100 / x64 |
| Node / npm | 24.19.0 / 11.9.0 | 24.19.0 / 11.17.0 |
| Browser | Chrome/154.0.8037.57 | Edg/157.0.4341.60 |
| Runtime exceptions | 0 | 0 |
| Windows 11 desktop verified | false | false |

Linux validate:platform chạy liên tục, không lọc/bỏ bước:
`/workspace/idc/artifacts/platform-validation/2026-11-25T02-31-48-375Z-600/report.json`.
Bắt đầu/kết thúc UTC `2026-11-25T02:31:48.381Z` / `2026-11-25T02:53:23.235Z`.
SHA-256 report Linux `560f14e1ac1859f44d9b339ece6a9b2e4bc615f03ab6ec0f1980b0ee26a9c479`.
ZIP Linux local `/workspace/work/idc-recovery/c4e/linux-validation.zip`, SHA-256
`908de71aedfaf617e8bc81b8622a415456f5b2a7dda2c99e4acd54efabad1f0a`; gồm report, 136 raw step log và manifest
source/hash từng file. Đây là ZIP local, không phải artifact GitHub.
Đây là bộ Linux tổng hợp mới, thay cho việc chỉ có hai journey riêng ở
C4a–d; Ubuntu CI không chạy bộ browser này.

[Windows/Ubuntu CI 45380797380](https://github.com/xuanthao260604-sys/idc/actions/runs/45380797380), attempt 1:
Windows job `138398989220`, Ubuntu job `138398989543` completed/success.
Metadata GitHub được đọc lại ngày 25/11; checkout SHA trong log đã lưu
khớp `3650a2d`. Tái dùng đúng artifact đã chốt C4d, không chạy lại CI
chỉ vì thêm tài liệu. Artifact `windows-validation-45380797380-1`,
ID `14914704441`, ZIP SHA-256 khớp metadata GitHub:
`9d2c473d729f57d2aa12dea1113a5468f555b512a77cb22e119ab7e5c9715c71`.
Report `2026-11-24T11-05-07-962Z-852/report.json`; artifact vẫn chưa hết hạn khi đối chiếu.

Đã đọc đủ 136 raw step log mỗi nền tảng. JSON browser khớp report,
expected count, platform và runtimeExceptions=0; cùng thứ tự ID và script/
args chức năng, cùng 76 suite/count. Đường dẫn node/npm riêng của host
khác nhau, không coi absolute executable/CLI path là giống nhau. **126/126 bộ facts gameplay khớp** khi bỏ đúng
`platform`, `browserVersion`, `browser` (brand). Brand khác: Linux
Chromium, Windows Microsoft Edge.
npm Linux 11.9.0 và Windows 11.17.0 là hai bản cài trên host;
environment:check đều đạt, package-lock/code giữ nguyên. Không coi phiên
bản package manager là đồng nhất. Không bỏ field gameplay, seed, LP, Chain length, command count hoặc
cờ rejection. `capabilities.log` nguyên byte; vanilla/mixed JSON và
CLI startup facts khớp (startup bỏ riêng platform). CLI vẫn kiểm đường
dẫn Unicode/khoảng trắng, static/private view, retry, stop/restart,
deck save/reload. Node/npm và OS được ghi đúng môi trường; runner không
được xem là Windows 11 desktop chỉ vì OS release giống một bản Windows.

Hash cuối xác nhận mọi code/test/fixture/golden cũ, dữ liệu nhập/review/
evidence, ảnh/frame/back người dùng cung cấp và deck nguồn nguyên byte
so với đầu C4e. Chỉ thêm tài liệu nghiệm thu, cập nhật notice hiện hành
README/roadmap; nội dung lịch sử giữ nguyên. Bộ test kiểm invalid import,
save/revision, v5 deck đọc bằng v6 không rewrite, C4b disk A/B files,
UI saved deck và restart giữ đúng dữ liệu. Không xóa catalog cũ hoặc
thay nội dung người dùng. Runtime vẫn 112 định nghĩa, 95 quái thường,
17 hiệu ứng/13 scope; dữ liệu historical pending giữ nguyên.

C4e không tạo test mới hoặc review luật mới. Kết luận dựa trên bảy điều
kiện và toàn bộ evidence hiện có ở source chốt, không chỉ dựa số test
hoặc một Chain dài. Nếu pool/review/grammar/handler thay đổi trong U1/U2,
phải kiểm lại bound và capability; không dùng nghiệm thu C1 để mở hiệu
ứng custom tùy ý.


## Điểm dừng sau C4e

Bảy điều kiện đã đạt: đóng riêng Chain C1–C4 và dừng báo cáo/push.
Mục kế tiếp U1 là bộ tạo bài riêng giới hạn: namespace/revision riêng,
nhập/sửa/lưu/xuất thuộc tính và ảnh, chọn mẫu handler đã review, giữ dữ
liệu/deck cũ khi lỗi; không eval văn bản hoặc mã tải lên. Ước lượng U1
vẫn 4–7 ngày công theo roadmap, chia mốc nhỏ trước triển khai.
Sau U1 là W1 trên Windows 11 desktop thực, 1–3 ngày công khi có môi trường.
U2 thay toàn bộ nội dung bài/ảnh giữ riêng và cần đầu vào nội dung.
C4e không mở editor trong cùng chu kỳ, không đóng gói/bàn giao beta và
không dùng runner CI để đánh dấu Windows 11 desktop đã kiểm chứng.
