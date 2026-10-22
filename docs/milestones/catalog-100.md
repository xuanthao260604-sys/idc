# Mốc catalog thử nghiệm 100 loại bài

Đạt phạm vi dữ liệu 80–100 lá đã đặt ra. Đây là điểm dừng trước nhóm triển khai tiếp theo;
không đồng nghĩa hoàn tất mọi luật hoặc sẵn sàng phát hành beta.
Nguồn và kết quả kiểm chứng: [catalog 100](../data/classic-100.md).

## Những phần đã có

- 100 loại nhập có provenance: 95 quái thường và 5 lá hiệu ứng.
- Snapshot nhập và capability runtime tách biệt: 5 hồ sơ nhập còn cờ rà soát văn bản lịch sử;
  5 handler runtime đã có review/test riêng trong scope giới hạn, không sửa cờ snapshot để gọi hoàn tất.
- Luật Goat Bắc Mỹ với cutoff 17/8/2005; Normal/Tribute/Set/Flip, chiến đấu ATK/DEF, damage,
  phase/priority/response trong scope engine, bốc bài thất bại, đầu hàng và trận mới.
- Năm hiệu ứng hiện có: Pot of Greed, Fissure, Hane-Hane, Man-Eater Bug, Trap Hole.
- Bàn đấu hotseat A/B, che thông tin riêng, PlayerView, xác nhận lựa chọn và lịch sử công khai.
- Xây/lưu deck A/B, revision chống ghi đè bản cũ; starter ổn định 40 lá.
- Khung quái/Phép/Bẫy và mặt sau chung do người dùng cung cấp; sao/chỉ số/mô tả theo dữ liệu.
- Nhập lại offline có kiểm tra checksum/review/printing; lỗi giữ nguyên dữ liệu và deck.

## Các phần còn thiếu

- Ảnh minh họa từng lá: vẫn để trống/placeholder, chưa tải artwork chính thức.
- General mixed Chain, negate, SEGOC, modifiers/replacements/immunity và mọi card ruling.
- Special/Fusion/Ritual Summon và các nhóm hiệu ứng mới.
- Online, tài khoản, database/lưu trận qua restart; hotseat chưa phải multiplayer online.
- Trình tạo bài riêng: vẫn là phần mở rộng sau; namespace/data/handler cần triển khai riêng.
- Kiểm thử trực tiếp Windows 11 desktop, đóng gói/installer và bàn giao beta: chưa thực hiện.

## Điểm chuyển tiếp hợp lý

Dừng việc mở rộng catalog ở mốc 100. Bước phát triển tiếp theo nên là chọn một nhóm Phép/Bẫy nhỏ,
đối chiếu nguồn và rulings Goat, xác định activation/cost/target/resolution/timing rồi triển khai handler
và kiểm thử tương tác. Giới hạn scope phải được công bố trước khi ghi một lá hiệu ứng mới là hoạt động được.
Các mục ảnh minh họa và custom editor tiếp tục tách riêng theo yêu cầu người dùng.

## Kiểm chứng mốc

Linux và Windows CI đều đạt 423/423 test, 23 file; 21/21 bước validation và 11 browser run.
Đã đọc artifact [run 39746863841](https://github.com/xuanthao260604-sys/idc/actions/runs/39746863841), source commit fa6b77373ea5f85263ffa1f7e2ee7e38cd693080.
Windows dùng Edge 154.0.4258.62, kiểm tra đủ 100 preview; cả 11 browser report runtimeExceptions=0.
Trận tự nhiên với deck thử 100 lá: 8 lượt/162 lệnh/7 attack/1 decision, A thắng LP 8000/0.
Pilot 20 vẫn giữ trận hồi quy 16 lượt/339 lệnh, đủ 5 effect. Dữ liệu 80 lá cũ chỉ được đọc, không bị sửa.
Không dùng kết quả CI để tuyên bố đã thử Windows 11 desktop. Đã dừng tại mốc này, chưa bắt đầu nhóm hiệu ứng mới.
