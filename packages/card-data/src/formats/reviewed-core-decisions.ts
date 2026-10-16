import type { RuleDecision, RuleKey } from '../format.js';

const basicsUrl = 'https://www.goatformat.com/basics.html';
const bookUrl = 'https://www.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf';
const evidence = (url: string, quotation: string, historicalApplicability: string) => ({
  url, accessedOn: '2026-10-15', quotation, historicalApplicability,
  sourceKind: url === bookUrl ? 'official-current' as const : 'community' as const,
});
const basic = (quotation: string) => evidence(basicsUrl, quotation,
  'Quy ước Goat cộng đồng được chọn cho dự án; không phải chứng nhận tài liệu gốc 2005.');
const book = (quotation: string) => evidence(bookUrl, quotation,
  'Luật chung hiện tại được dùng làm baseline theo hướng dẫn basics; các khác biệt Goat được áp riêng.');
const baseline = basic('if a general rule is not explicitly listed here is being different in Goat Format, you can assume that it works the exact same way as it does in the current format.');
const reviewed = (proposedValue: RuleDecision['proposedValue'], rationale: string,
  sources: RuleDecision['evidence']): RuleDecision => ({
  status: 'verified', proposedValue, rationale, evidence: sources,
});

// Reviewed design decisions only. No engine behavior is implemented by this module.
export const reviewedCoreDecisions = {
  textAndErrataPolicy: reviewed({
    useHistoricalText: true, autoUseCurrentErrata: false,
    perCardRulingReviewRequired: true, unresolvedCardPlayable: false,
    sourcePrecedence: ['explicit-goat-clarification', 'curated-period-ruling', 'reviewed-historical-text'],
  }, 'Áp dụng quy ước Goat đã chọn; tranh chấp phải ghi rõ nguồn và quyết định riêng trước khi hỗ trợ lá.', [
    basic('Be sure to check rulings over card text for these matters.'),
    evidence('https://www.goatformat.com/indivrulings.html',
      'ruling sources are organized under each card in descending order of precedential value.',
      'Nguồn cộng đồng biên tập ruling UDE; giữ nhãn nguồn gốc và không giả là tài liệu đương thời đã xác thực.'),
  ]),
  startingLifePoints: reviewed(8000, 'LP chuẩn, chưa xét hiệu ứng thay đổi luật.', [baseline,
    book('Each player starts a Duel with 8000 LP (Life Points).')]),
  openingHand: reviewed(5, 'Phát 5 lá, sau đó thực hiện Draw Phase lượt đầu đúng luật Goat.', [baseline,
    book('Finally, draw 5 cards from the top of your Deck; this is your starting hand.')]),
  deckConstruction: reviewed({
    mainMin: 40, mainMax: null, fusionMax: null, sideSizes: [0, 15],
    combinedCopyLimit: 3, restrictedListId: 'goat-tcg-2005-04',
    copyLimitScope: ['main', 'fusion', 'side'], initialMode: 'single-duel', initialSideSize: 0,
    technicalLimitsAreSeparate: true,
  }, 'Không áp giới hạn 60/15 hiện đại vào Main/Fusion Deck; side decking trong match chưa thuộc bản đầu.', [
    basic('Unlimited Fusion Deck and Main Deck'),
    basic('not allowed to use Side Decks with more than 0 but less than 15 cards.'),
    baseline, book('You can only have up to 3 copies of the same card in your Deck, Extra Deck and Side Deck combined.'),
    book('These cards are not counted towards the 40-card minimum limit'),
  ]),
  fieldLayout: reviewed({
    monsterSlotsPerPlayer: 5, spellTrapSlotsPerPlayer: 5, fieldSlotsPerPlayer: 1,
    hasExtraMonsterZones: false, hasPendulumZones: false,
    zones: ['deck', 'hand', 'monster', 'spell-trap', 'field', 'graveyard', 'banished', 'fusion-deck'],
    multiSlotOccupancyRequired: true,
  }, 'Layout cổ điển; trap monster có thể chiếm đồng thời ô quái thú và ô Phép/Bẫy.', [baseline,
    book('You can have up to 5 cards here.'),
    basic('Embodiment of Apophis will occupy'),
    basic('Extra Monster Zones did not yet exist.'),
  ]),
  turnPhases: reviewed({
    phases: ['draw', 'standby', 'main1', 'battle', 'main2', 'end'],
    firstPlayerFirstTurnBattle: false, battleOptional: true,
    main2RequiresBattlePhase: true, advanceRequiresResponsesAndMandatoryWork: true,
  }, 'Main 2 chỉ sau Battle Phase; vào Battle không bắt buộc phải tấn công.', [baseline,
    book('The player who goes first cannot conduct their Battle Phase on their first turn.'),
    book('If you conducted your Battle Phase, your turn moves to Main Phase 2 afterwards.'),
  ]),
  normalAndTributeSummons: reviewed({
    normalSummonOrSetQuota: 1, quotaSharedAcrossMainPhases: true,
    tributesByLevel: [{ min: 1, max: 4, count: 0 }, { min: 5, max: 6, count: 1 }, { min: 7, max: 12, count: 2 }],
    normalSummonPosition: 'face-up-attack', setPosition: 'face-down-defense',
    tributeSetIsSummonEvent: false, tributeIsDestruction: false,
    onlyOwnMonstersUnlessEffectOverrides: true,
  }, 'Tribute Summon dùng cùng quota Normal; Tribute Set không phát sự kiện summon thành công.', [baseline,
    book('Monsters that are Level 5 or 6 require 1 Tribute and Monsters that are Level 7 or higher require 2 Tributes.'),
    book('A monster Tribute Set on the field is NOT considered Summoned.'),
    book('A monster sent to the Graveyard by Tributing is not treated as “destroyed.”'),
  ]),
  positionChanges: reviewed({
    manualChangesPerMonsterPerTurn: 1, phases: ['main1', 'main2'],
    blockedAfterAttack: true, blockedWhenSummonedByTurnPlayerThisTurn: true,
    opponentSummonedThisTurnException: true, cardEffectChangesAreSeparate: true,
    flipSummonUsesManualChange: true,
  }, 'Theo dõi ai đã summon, không suy ra từ controller hiện tại; giữ nguyên các hạn chế khác khi đổi quyền điều khiển.', [baseline,
    book('You cannot change it if you have already changed its battle position once this turn.'),
    book('You cannot change it in Main Phase 2 if the monster attacked during the Battle Phase.'),
    basic('a monster\'s position cannot be changed manually if it was Summoned that turn'),
  ]),
  battleAndDamageStep: reviewed({
    battleSteps: ['start', 'battle', 'damage', 'end'],
    damageTimings: ['start', 'before-calculation', 'calculation-1', 'calculation-2', 'after-calculation', 'end'],
    ordinaryChainsPerDamageTiming: 1, triggeredFollowupChainsAllowed: true,
    replayIsNewDeclaration: true, replayMayDeferAttackUntilLater: true,
    equalAttackZeroDestroysBoth: true,
    attackDefenseDefaultPiercing: false, destroyedByBattleLeavesAtDamageEnd: true,
    damageActivationPolicy: 'explicit-timing-and-effect-category-or-reviewed-card-exception',
    spellTrapSpeed2NegationAloneAllowsDamageStep: false,
  }, 'Giữ sáu timing riêng, sự kiện sát thương và bị phá hủy khác với gửi Mộ; xem battle-timing-spec.md.', [
    baseline, book('compare ATK vs. ATK.'), book('compare your monster’s ATK vs. the attacked monster’s DEF.'),
    basic('In Goat Format, on the other hand, there are six:'),
    basic('only one Chain can occur during each substep of the Damage Step (unless the resolution of one Chain triggers some other effect).'),
    basic('In Goat Format, both monsters are destroyed in battle.'),
    basic('play rewinds back to the beginning of the Battle Step where the attack may be re-declared, and will be treated as an entirely new attack.'),
  ]),
  winConditions: reviewed({
    lossAtZeroLP: true, failedRequiredDrawIsLoss: true,
    emptyDeckAloneIsLoss: false, simultaneousZeroLPIsDraw: true,
    effectBasedWinRequiresSupportedHandler: true, initialMode: 'single-duel',
    stopAtFirstDecisiveEvent: true,
  }, 'Bộ bài rỗng chưa tự thua; thua khi không thể bốc lúc phải bốc. Match/tiebreak chưa thuộc bản đầu.', [baseline,
    book('if your opponent is unable to draw a card; or if a card’s special effect says you win.'),
    book('If you and your opponent both reach 0 LP at the same time, the Duel is declared a draw.'),
  ]),
  priorityAndResponseWindows: reviewed({
    priorityBelongsToPlayer: true, triggersBeforeIgnitionOpportunity: true,
    turnPlayerIgnitionOpportunity: ['successful-summon-response', 'post-chain-response'],
    ignitionCanChainToTrigger: false, opponentRespondsFirstToNewChainLink: true,
    bothPassClosesCurrentWindow: true, phaseAdvanceRequiresBothPassAndNoPendingWork: true,
  }, 'Ignition vẫn Spell Speed 1, không dùng priority để chen vào Chain hoặc bỏ qua Trigger.', [
    evidence('https://www.goatformat.com/home/6-facts-that-you-should-know-about-priority',
      'there is no way that you can try to chain your Exiled Force’s effect to King Tiger Wanghu’s.',
      'Bài giải thích priority Goat; xem toàn bộ ví dụ và phân biệt negate summon với response summon.'),
    basic('This change does not affect how Trigger Effects work.'),
    evidence('https://www.yugioh-card.com/en/play/fast-effect-timing/',
      'during a Chain, the chance to go next passes back and forth between players.',
      'Baseline fast-effect flow, chỉ dùng sau khi áp ngoại lệ ignition Goat; không hỗ trợ cơ chế triệu hồi mới.'),
  ]),
  chainResolution: reviewed({
    resolutionOrder: 'last-in-first-out', responsesDuringResolution: false,
    spellSpeeds: [1, 2, 3], responseMinSpeed: 2, responseCannotBeSlower: true,
    simultaneousSpeed1TriggerException: true, triggersCollectedDuringResolution: true,
    pendingTriggersStartNewChain: true,
  }, 'Đợi cả hai pass rồi resolve LIFO; không có thao tác client chen giữa resolution. Ghi nhận Trigger chứ chưa kích hoạt trong Chain đang xử lý.', [baseline,
    book('then you resolve the outcome in reverse order – starting with the last card that was activated.'),
    book('Typically, these effects cannot be Chain Link 2 or higher, unless multiple Spell Speed 1 effects are activated simultaneously.'),
    basic('triggers can be recognized as being met in the middle of a Chain'),
  ]),
  optionalTriggerTiming: reviewed({
    ruleFromReviewedCardMetadata: true, optionalWhenRequiresLastRelevantEvent: true,
    mandatoryEffectsUseSeparateRules: true, neverInferFromCurrentTextAlone: true,
  }, 'Không đánh đồng mọi optional trigger; nhập timing classification riêng theo ruling từng lá.', [
    evidence('https://www.goatformat.com/rulings6.html',
      '“Peten” being sent to the Graveyard has to be the very last thing that happened in order to activate its effect.',
      'Individual Card FAQs của Peten: ví dụ cho optional when; không coi Peten là quy tắc cho mọi loại Trigger.'),
  ]),
  activationCostTargetNegation: reviewed({
    validateBeforePaying: true, costsPaidAtActivation: true, targetsChosenAtActivation: true,
    costRefundedWhenNegated: false, destructionIsNotNegation: true,
    negateActivationAndNegateEffectAreDistinct: true, targetLegalityRecheckedPerEffect: true,
    lpPaymentMustLeavePositiveLP: true, chainEnergyRequiresSeparateRule: true,
    insufficientDeckForDrawEffectMayStillActivate: true, searchFailurePolicy: 'review-per-card',
  }, 'Cost/target/negation phải có metadata riêng; không suy luận bằng dấu câu của text hiện tại. Ngoại lệ từng lá cần test.', [baseline,
    book('Even if the activation of the card is negated, you cannot get a refund of the cost that you have paid.'),
    book('A card is destroyed when it is sent to the Graveyard due to battle between monsters or by an effect that destroys a card.'),
    basic('you must have a higher LP total such that you can pay the cost while remaining above 0 LP'),
    basic('in Goat Format, you can always activate an effect that will deck a player out.'),
  ]),
  continuousAndEquipEffects: reviewed({
    reevaluateOnStateChanges: true, modifiersSeparateFromPrintedStats: true,
    faceUpDependencyIsPerEffect: true, equipReferencesInstance: true,
    equipCleanupWhenMonsterLeavesOrFaceDown: true,
    continuousTrapIgnitionLikeEffectRequiresAlreadyFaceUp: true,
    monsterEquipFailedResolutionKeepsTarget: true, unionLimitPerMonster: 1,
    unionDestructionProtectionFromHistoricalText: true,
  }, 'Không có quy tắc mọi hiệu ứng mất nguồn đều mất tác dụng; phân loại continuous/lingering và xem ruling của từng lá.', [baseline,
    book('If the equipped monster is destroyed, flipped face-down, or removed from the field, its Equip Cards are destroyed.'),
    basic('Continuous Traps with Ignition-like effects cannot be flipped face-up and use their Ignition-like effects at the same time.'),
    basic('the opponent keeps their monster (it is not sent to the Graveyard).'),
    basic('a monster can only be equipped with 1 Union monster (through its Union effect) at any given time.'),
  ]),
  endPhaseAndHandLimit: reviewed({
    standardHandLimit: 6, discardToLimitAtEndOfOwnTurn: true,
    discardIsGameRuleAction: true, responsesToDiscardAllowed: true,
    recheckMandatoryWorkAndHandLimitAfterResponses: true,
    expiryTimingIsExplicit: true,
  }, 'Không đóng lượt ngay sau discard; xử lý phản hồi/Trigger rồi kiểm tra trạng thái End Phase lại.', [baseline,
    book('If you have more than 6 cards in your hand at the end of this phase, select and discard cards to the Graveyard until you only have 6 cards in your hand.'),
    basic('players may simply respond to the end-of-turn discard in whatever ways they wish.'),
  ]),
  fusionAndRitualScope: reviewed({
    historicalMechanicsExist: true, fusionDeckName: 'fusion-deck',
    initialPilotSupportsFusionSummon: false, initialPilotSupportsRitualSummon: false,
    unsupportedCardsPlayable: false, addSchemaAndHandlersAndTestsBeforeExpansion: true,
    synchroXyzPendulumLinkSupported: false,
  }, 'Giữ ranh giới bản nhỏ: dữ liệu bài cần Fusion/Ritual không được vào pool chơi thử trước khi schema/engine hỗ trợ. Không tuyên bố cơ chế lịch sử là bị cấm.', [
    basic('the Extra Deck was called the Fusion Deck'),
    book('Ritual Monsters are special monsters that are Special Summoned with a specific Ritual Spell Card, along with a required Tribute.'),
  ]),
} satisfies Partial<Record<RuleKey, RuleDecision>>;

// Archived scan supplies period evidence for general rules; it is not hosted by the publisher.
const archiveBookUrl = 'https://archive.org/download/rulebook_v05/rulebook_v05.pdf';
const periodQuotes: Partial<Record<keyof typeof reviewedCoreDecisions, string>> = {
  startingLifePoints: 'Each player begins a Duel with 8000 Life Points.',
  openingHand: 'Finally, each player draws 5 cards from the top of their respective Decks.',
  deckConstruction: 'The Deck used for Dueling should contain a minimum of 40 cards.',
  fieldLayout: 'The Monster Card Zone has a 5-CARD LIMIT.',
  winConditions: 'the first player unable to draw a card is declared the LOSER.',
};
for (const [key, quotation] of Object.entries(periodQuotes)) {
  reviewedCoreDecisions[key as keyof typeof reviewedCoreDecisions].evidence.push({
    url: archiveBookUrl, accessedOn: '2026-10-15', sourceKind: 'archive', quotation,
    historicalApplicability: 'Rulebook English v5.0 lưu tại Internet Archive; PDF có dấu dàn trang 2004, metadata archive ghi 2005. Đối chiếu với quy ước Goat, không tự coi metadata là xác thực của nhà phát hành.',
  });
}
