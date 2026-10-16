# ADR 004 — Deck riêng cho hotseat

Một deck Main cho mỗi seat A/B, chỉ dùng catalog/format hiện hành. Dùng file JSON local
với atomic write thay vì bổ sung SQLite cho hai record. Không đổi cơ chế engine/RNG/PlayerView.
Store mặc định in-memory khi tạo server trong test; CLI chủ động cấp thư mục persistent.
Schema file không pin registry hash vì save kiểm tra lại legality/capability bằng registry
hiện tại, nhưng pin format id/revision. File không còn hợp lệ không bị tự reset hoặc migrate.

Revision optimistic chống tab cũ ghi đè; queue serialize save trong một server. HTTP xác định
actor qua cookie và so khớp seat kỳ vọng, không tin seat trong payload để cấp quyền.
Game dùng bản sao deck đã lưu tại thời điểm tạo trận; save không đụng snapshot đang chơi.
Đây là persistence deck local, không phải lưu trận, online authentication hoặc database nhiều writer.

Bài tự tạo, artwork, import/export deck, nhiều profile và side deck giữ cho mục sau.
Xem ../beta/deck-builder.md để biết UI, hợp đồng và bằng chứng kiểm chứng.
