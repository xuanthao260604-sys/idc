# Xuất và nhập file deck

Mục này bổ sung sao lưu/chuyển deck từ cửa sổ **Xây deck**, dùng được bằng trình duyệt
trên Windows; không cần lệnh Linux hoặc đường dẫn filesystem server.

- **Xuất file deck** tải bản nháp hợp lệ thành classic-duel-deck-a.json hoặc b.json.
  File giữ thứ tự definition ID và số bản sao. Chưa lưu deck vẫn có thể xuất;
  thao tác xuất không lưu bản nháp hay thay trận đang chơi.
- **Nhập file deck** chọn file JSON tối đa 12.000 byte. File hợp lệ thay danh sách
  trong bản nháp của người chơi đang mở editor. Có thể nhập file xuất từ A vào B.
  Kiểm tra rồi bấm **Lưu deck** để dùng ở trận mới. Đóng/Escape bỏ bản nháp nhập.
- File sai JSON/schema, sai format/revision, thiếu 40 lá, vượt copy limit hoặc có
  ID chưa được hỗ trợ bị từ chối. Lỗi đọc file/kết nối cũng giữ nguyên bản nháp và
  deck đã lưu. Không áp trần Main Deck 60 hiện đại; đã kiểm tra đủ pool 316 bản sao.

File có đúng kind=ygo-classic-deck, schemaVersion=1, format={id,revision}, cards=[ID…].
UTF-8 có hoặc không BOM được chấp nhận. Không nhập definitions, artwork, effect code,
seat, save revision, hand/deck order trong trận, RNG hoặc state. Đây không phải
trình tạo bài, YDK converter, nhiều profile hoặc tính năng lưu/khôi phục trận.
Các file lưu nội bộ .ygo-local/decks không phải định dạng chuyển deck này.

## Hợp đồng và bảo toàn

POST /api/deck/export nhận {seat,cards}, trả file JSON sau khi validateDeck hiện hành
xác nhận hợp lệ. POST /api/deck/import nhận {seat,text}, trả {cards} sau xác thực.
Cả hai cần cookie seat và kiểm tra seat kỳ vọng. Không thao tác deckStore.save hoặc
trận; POST /api/deck hiện có vẫn là bước lưu duy nhất, giữ kiểm tra revision và ghi
file atomic. Tên file người dùng không được chuyển thành đường dẫn server.
Dữ liệu nhập thẻ, review và deck cũ không bị sửa hoặc chuyển đổi tự động.

## Kiểm chứng

Linux: typecheck, build và 644/644 test trong 31 file đạt. Có 13 test file deck,
1 test HTTP mới kiểm tra seat/schema và thao tác chuyển file không thay deck/trận.
Browser Chromium 154.0.8037.57: tải file thật và chọn file thật qua native file input,
nhập JSON lỗi giữ nháp, roundtrip 41 lá, đóng bỏ nháp và chuyển A→B không tự lưu;
regression editor A=41/B=42 và chỉ áp dụng deck ở trận mới đều đạt, runtimeExceptions=0.
Đã xem ảnh bố cục 390px; kiểm tra không tràn ngang ở 390px và 1440px.

Windows và Ubuntu CI đều đạt trên source commit 2d9b758eb3544a339306ec60dddd7f5ca0cb0fe0:
[run 39786648331](https://github.com/xuanthao260604-sys/idc/actions/runs/39786648331).
Đã tải và đọc artifact windows-validation-39786648331-1: win32 x64,
OS 10.0.26100, Node 24.19.0, npm 11.17.0, Edge 154.0.4258.62.
Windows đạt 644/644 test trong 31 file, 28/28 bước và 18 browser report,
tất cả runtimeExceptions=0. Report deck-builder xác nhận portableFileRoundtrip,
invalidImportPreservesDraft, importRequiresSave đều true, deck A/B vẫn 41/42.
Windows 11 desktop chưa thử trực tiếp; không đóng gói hoặc bàn giao beta.
