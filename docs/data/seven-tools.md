# Seven Tools of the Bandit — nhập dữ liệu, chưa mở hiệu ứng — 29/10/2026

Thêm batch seven-tools riêng để chuẩn bị nhánh phản hồi Bẫy. Tổng nhập
tăng 111 → 112 loại trong 19 bundle: 95 verified data, 17 historical
pending. Runtime vẫn 111 loại/16 hiệu ứng/12 scope qua 18 bundle đang
hoạt động. Seven Tools chưa có review hiệu ứng, binding hoặc kiểm thử
hiệu ứng và chưa được dùng trong deck đấu.

## Đối chiếu nguồn

Nguồn đã đọc ngày 29/10/2026:

- [YGOPRODeck](https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Seven%20Tools%20of%20the%20Bandit&misc=yes):
  id dạng số 3819470, tên Seven Tools of the Bandit, Trap Card/Counter,
  Konami CID 4863. Mã chuẩn hóa đủ tám chữ số là 03819470, định danh
  official:03819470; không làm mất số 0 đầu.
- [Konami CID 4863](https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4863&request_locale=en):
  tên, Counter Trap và Card Text khớp API:
  “When a Trap Card is activated: Pay 1000 LP; negate the activation,
  and if you do, destroy it.” Hàng in MRD-129, 2002-06-26, METAL RAIDERS.
- [Goat cardpool](https://www.goatformat.com/cardpool.html): Legal Sets
  có nguyên cụm “Metal Raiders (MRD)”. Kết hợp bản in Konami trước cutoff
  17/8/2005; không dùng riêng API tcg_date hoặc nhãn GOAT làm bằng chứng.

API và Card Text Konami khớp nên overlay không sửa text/type. Fingerprint
facts API là 9b1e0f1ab3d3d715441af06d0ec542733a3cdfa22df70dbf12e38a3c58920dfa.
Giữ subtype=counter; không đưa vào handler Trap Hole hoặc Magic Jammer.
Legal/maxCopies=3 do pipeline và profile/list Goat tháng 4/2005 hiện có
áp dụng, không viết thêm danh sách giới hạn riêng.

Đây là current-reference, chưa xác nhận nguyên văn bản in 2002/2005.
HistoricalTextReview=pending, verification=pending, implementation=not-started,
testing=not-run, effects=[]; summary implemented/testedEffects/playable=0.
Kiểm thử nhập không phải kiểm thử trả LP/phủ nhận activation Bẫy.

## Snapshot và bảo toàn

| Nguồn | Byte | SHA-256 |
| --- | ---: | --- |
| API JSON | 3494 | 324636d43dfe3ab4b010ff9880c84827a349660785e4728b34da2122e5709e95 |
| Konami HTML | 148891 | 0fa7aeda482c7792e98dd9bca18bcef5f0ac675a1f7140b83dd530edd17d09da |
| Goat HTML | 108404 | 01e0626f198987b8daf60e00242cd33b7a692419f645adf4e7f826ed47eef98e |

Giữ nguyên byte tải gốc trong data/raw theo .gitattributes hiện có.
Snapshot Goat mới có hash khác snapshot cũ nên lưu riêng, không ghi đè.
Thêm manifest/receipt, evidence Konami 4863, overlay và generated riêng;
generated được tạo bằng pipeline thật. Đã so hash 236 file dữ liệu/deck
có trước: tất cả giữ nguyên. Không sửa 18 bundle/review/source cũ, starter,
artwork hoặc format revision. Không tải ảnh minh họa; URL ảnh trong raw
API không có nghĩa ảnh đã được đưa vào game.

CLI nhận batch seven-tools. npm run cards:seven-tools-import nhập offline;
cards:seven-tools-fetch chỉ dùng khi chủ động làm mới nguồn. cards:check
kiểm đủ 19 bundle; runtime-catalog-inputs.json và preflight vẫn 18 bundle
đang hoạt động. Không thêm Seven Tools vào public catalog hoặc deck mặc
định; tổng dữ liệu nhập và catalog chơi được tiếp tục là hai số riêng.

## Kiểm chứng nhập

10 ca tools/seven-tools-import.test.ts: pin source bytes, passcode có số
0 đầu, Counter subtype, bản in hợp lệ, text và trạng thái nhập; tổng dữ
liệu 112 nhưng runtime 111. Registry vẫn từ chối Seven Tools khi ghép
dữ liệu mới cùng toàn bộ review đang hoạt động, gồm cả review Counter
của Magic Jammer. Các bảng handler cũ giữ nguyên, deck chứa Seven Tools
bị từ chối. Không suy khả năng hoạt động từ loại Counter Trap.

Nhập lại hai lần offline và check cả 19 bundle giữ nguyên mọi byte trong
fixture, gồm dữ liệu, reviews, raw/evidence và deck A40/B41 đã lưu hợp lệ.
Bảy lỗi checksum, fingerprint review, facts chính thức, ngày sau cutoff,
mã bản in chưa review, Konami identity và bỏ qua historical review của
lá hiệu ứng đều bị từ chối trước ghi. So toàn bộ danh sách file và byte
sau lỗi; chỉ gây lỗi trên bản sao tạm. Các ca nhập Ookazi/Magic Jammer
được cập nhật để bảo toàn cả 19 bundle hiện hành.

## Kết quả tổng hợp

Linux đạt 1060/1060 test trong 42 file, 62/62 bước validation và 52 browser
report bằng Chromium 154.0.8037.57, runtimeExceptions=0. Đã đọc report tại
artifacts/platform-validation/2026-10-29T03-39-53-463Z-88401/report.json;
mỗi bước browser có đúng một report khớp host/version. Log ghi đủ 10 ca
nhập Seven Tools; data-and-build kiểm đủ 19 bundle/112 lá/95 verified/
17 historical pending. Không thêm browser mode hoặc ca hiệu ứng Seven Tools.

Toàn capabilities JSON giống mốc trước: 111 supported/16 reviewed effects/
12 scope/18 snapshot đang hoạt động, không có Seven Tools. Sau validation,
236 file dữ liệu/deck có trước vẫn nguyên byte. Hai trận tự nhiên giữ kết
quả: pilot 16 lượt/339 lệnh, B thắng LP 0/4200; expanded 13 lượt/263 lệnh,
A thắng LP 6300/0. Không chỉnh state khi chơi. Đây là hồi quy gameplay cũ,
không phải bằng chứng Seven Tools hoạt động.

Windows và Ubuntu CI đã đạt trên source commit
fd04f28fc306d0dde712bb8b0ebdccd221980cf8,
[run 40813536667](https://github.com/xuanthao260604-sys/idc/actions/runs/40813536667).
Đã tải/đọc artifact windows-validation-40813536667-1:
win32 x64, OS 10.0.26100, Node 24.19.0, npm 11.17.0,
Edge 155.0.4283.62. Windows đạt 1060/1060 test (42 file), 62/62 bước,
52 browser report; từng bước browser có đúng một report khớp host/version,
runtimeExceptions=0. Đã đọc log đủ 10 ca Seven Tools, kiểm 19 bundle/
112 lá/95 verified/17 historical pending và các report hồi quy.

Toàn capabilities JSON giống Linux và mốc trước: runtime 111/16 hiệu ứng/
12 scope/18 snapshot, không có Seven Tools. Hai trận tự nhiên có kết quả
giống Linux. Report ghi windows11DesktopVerified=false tại
artifacts/ci-seven-tools-import/2026-10-29T03-41-56-157Z-8380/report.json.
Không có kiểm thử hiệu ứng hoặc artwork Seven Tools ở mốc này.

## Trước khi mở hiệu ứng

Cần review riêng về phản hồi activation Bẫy, chi phí LP, điều kiện Set,
priority/Spell Speed, phủ nhận activation và cleanup. Cần đối chiếu rulings
áp dụng cho Goat, phân biệt card activation với effect activation và chốt
phạm vi tương tác với Trap Hole/Magic Jammer trước khi viết handler.
Review/binding hiện tại của Magic Jammer dùng chi phí bỏ bài và phủ nhận
Normal Spell, không dùng thay cho Seven Tools. Sau review mới triển khai
engine/command/view/UI và kiểm thử chi phí, timing, Chain, retry và riêng tư.
Các mục này là việc còn lại, không phải chức năng đã có trong mốc nhập.

Windows 11 desktop chưa thử trực tiếp; chưa đóng gói hoặc bàn giao beta.
