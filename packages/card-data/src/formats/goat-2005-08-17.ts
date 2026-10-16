import { FormatSchema, ruleKeys } from '../format.js';
import { reviewedCoreDecisions } from './reviewed-core-decisions.js';

const decisions = Object.fromEntries(ruleKeys.map(key => [key, {
  status: 'pending', proposedValue: null,
  rationale: 'Chưa đối chiếu nguồn lịch sử; không dùng làm luật thực thi.', evidence: [],
}]));

const cardPoolEvidence = {
  url: 'https://www.goatformat.com/cardpool.html', accessedOn: '2026-10-15',
  sourceKind: 'community',
  quotation: 'the cardpool for Goat Format is understood to reflect all cards that would have been legal for premier event play on August 17, 2005.',
  historicalApplicability: 'Quy ước Goat cộng đồng được chọn làm mục tiêu dự án; không phải chứng nhận nguồn chính thức năm 2005.',
};
Object.assign(decisions, {
  territory: {
    status: 'verified', proposedValue: 'TCG-North-America',
    rationale: 'Chọn quy ước Goat Bắc Mỹ; còn cần đối chiếu tính hợp lệ promo từng lá.',
    evidence: [cardPoolEvidence],
  },
  cardPoolCutoff: {
    status: 'verified', proposedValue: '2005-08-17',
    rationale: 'Người dùng cho phép đổi mốc; chọn cutoff Goat có tài liệu cộng đồng để đối chiếu.',
    evidence: [cardPoolEvidence],
  },
  restrictionList: {
    status: 'verified', proposedValue: 'goat-tcg-2005-04',
    rationale: 'Đã đối chiếu 17 mục cấm, 41 mục giới hạn 1, 15 mục giới hạn 2 theo nguồn cộng đồng được chọn; xem restrictions-2005-04.ts.',
    evidence: [{ ...cardPoolEvidence,
      quotation: 'all incarnations of Goat Format use the April 2005 Forbidden/Limited List for the TCG.',
    }],
  },
});

const basicEvidence = (quotation: string) => ({
  url: 'https://www.goatformat.com/basics.html', accessedOn: '2026-10-15',
  sourceKind: 'community', quotation,
  historicalApplicability: 'Quy ước Goat cộng đồng được dự án chọn; không đồng nghĩa đã xác thực tài liệu gốc 2005.',
});
Object.assign(decisions, {
  firstTurnDraw: {
    status: 'verified', proposedValue: true,
    rationale: 'Người đi trước vẫn bốc trong Draw Phase lượt đầu; không gộp thành phát 6 lá lúc khởi tạo.',
    evidence: [basicEvidence('the player who goes first will draw a card at the start of their first draw phase.')],
  },
  simultaneousTriggers: {
    status: 'verified',
    proposedValue: {
      orderBy: 'trigger-occurrence-then-group',
      groups: ['turn-player-mandatory', 'opponent-mandatory', 'turn-player-optional', 'opponent-optional'],
      playerOrdersWithinGroup: true, optionalTimingMustStillBeLegal: true,
    },
    rationale: 'SEGOC theo nhóm trong cùng thời điểm; sự kiện trước xếp trước sự kiện sau. Optional trigger vẫn phải qua kiểm tra timing.',
    evidence: [basicEvidence('when two effects were triggered at different times, the earlier trigger(s) must be placed on the Chain before the later ones.')],
  },
});

Object.assign(decisions, reviewedCoreDecisions, {
  fieldSpellReplacement: {
    status: 'verified',
    proposedValue: {
      globalActiveFaceUpLimit: 1,
      opponentFieldDestroyedWhenNewActivationResolves: true,
      settingDoesNotDestroyOpponentField: true,
      ownReplacementTiming: 'destroy-old-when-placing-new-before-response',
      ownReplacementIsEffectDestruction: false,
      ownReplacementIncludesSetCards: true,
      negatingNewActivationRestoresOwnOldField: false,
    },
    rationale: 'Quy ước dự án tổng hợp v5.0, Goat Rule #3 và trích dẫn UDEbot trong thảo luận tháng 1/2005. Hủy lá của chính mình lúc thay ô; Field đối thủ chỉ bị hủy khi activation mới resolve thành công. Xem field-spell-review.md về nguồn và mức suy luận.',
    evidence: [
      basicEvidence('If the activation of a Field Spell resolves while the opponent controls a face-up Field Spell, the previous Field Spell is destroyed.'),
      {
        url: 'https://archive.org/download/rulebook_v05/rulebook_v05.pdf',
        accessedOn: '2026-10-15', sourceKind: 'archive',
        quotation: 'When a new Field Spell Card is activated, the previous active Field Spell Card is destroyed and sent to the Graveyard.',
        historicalApplicability: 'Rulebook v5.0 lưu trữ; câu viết giản lược, cần đọc cùng Goat #3 khi xét Field đối thủ.',
      },
      {
        url: 'https://www.cogonline.net/threads/field-spell-card-game-mechanic-questions.38119/',
        accessedOn: '2026-10-15', sourceKind: 'community',
        quotation: 'If you control a Field Spell Card, you can activate or Set a new Field Spell, and destroy your own old one.',
        historicalApplicability: 'Post #11/#16 tháng 1/2005 trích lời được gán cho UDEbot; link gốc hiện 404, chưa xác thực độc lập danh tính. Chọn làm bằng chứng bổ trợ cùng rulebook v5; không coi các post sai khác là ruling chính thức.',
      },
    ],
  },
});

// Reviewed rules-design profile. A ready profile does not imply a working game engine.
export const goat200508Format = FormatSchema.parse({
  id: 'goat-2005-08-17', revision: 4, name: 'Goat Format Bắc Mỹ 17/8/2005',
  targetMonth: '2005-08', status: 'ready', decisions,
});
