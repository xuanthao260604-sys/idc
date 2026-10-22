'use strict';
const $ = id => document.getElementById(id);
const catalog = new Map();
let deckRules, deckDraft = null;
let actionHints = new Set();
let view = null, selected = null, busy = false, message = 'Chọn một lá bài để bắt đầu.';
const names = { a: 'Người chơi A', b: 'Người chơi B' };
const phaseNames = { draw: 'BỐC BÀI', standby: 'CHUẨN BỊ', main1: 'MAIN 1', battle: 'CHIẾN ĐẤU', main2: 'MAIN 2', end: 'KẾT THÚC' };
const reasonNames = { 'stale-state': 'Bàn đấu đã thay đổi. Hãy chọn lại bài.', 'not-your-action': 'Chưa đến quyền thao tác của bạn.', 'illegal-timing': 'Không thể dùng thao tác ở thời điểm này.', 'invalid-target': 'Lá bài hoặc mục tiêu chưa hợp lệ.', 'invalid-choice': 'Hãy chọn đúng số lá được yêu cầu.', 'quota-used': 'Bạn đã Normal Summon hoặc Set trong lượt này.', 'unpayable-cost': 'Cần bỏ một lá khác từ tay của bạn làm chi phí.', 'unpayable-tribute': 'Số bài hiến tế chưa đúng.', 'occupied-zone': 'Ô đã có bài.', 'invalid-position': 'Chưa thể đổi tư thế hoặc tấn công.', 'duel-ended': 'Trận đấu đã kết thúc.', 'invalid-action': 'Thao tác chưa được hỗ trợ trong beta.', 'command-capacity': 'Trận thử đã đạt giới hạn lệnh. Hãy bắt đầu trận mới.' };
function node(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function button(text, action, className) { const b = node('button', text, className); b.type = 'button'; b.addEventListener('click', action); return b; }
async function api(path, body) {
  const response = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Không kết nối được bàn đấu.'); return data;
}
function def(card) { return card?.visibility === 'known' ? catalog.get(card.definition.id) : null; }
function label(card) { return def(card)?.name || 'Bài úp'; }
function visibleCard(handle) {
  return [...view.selfHand, ...view.players.flatMap(p => [...p.monsters, ...p.spellsTraps, ...p.graveyard])].find(c => c?.handle === handle);
}
function optionLabel(handle) {
  const hand = view.selfHand.find(c => c.handle === handle);
  if (hand) return `Tay của bạn — ${label(hand)}`;
  for (const p of view.players) for (const [zone, cards] of [['Quái', p.monsters], ['Phép / Bẫy', p.spellsTraps], ['Mộ', p.graveyard]]) {
    const slot = cards.findIndex(c => c?.handle === handle);
    if (slot >= 0 && zone === 'Mộ') return `${names[p.playerId]} · Mộ — ${label(cards[slot])}`;
    if (slot >= 0) return `${names[p.playerId]} · ${zone} ô ${slot + 1} — ${label(cards[slot])}`;
  }
  return 'Lựa chọn';
}
function frontContent(element, d) {
  element.classList.add('front', d.kind === 'spell' ? 'spell' : d.kind === 'trap' ? 'trap' : 'monster');
  const frame = node('span', undefined, 'card-front-art'); frame.setAttribute('aria-hidden', 'true');
  const name = node('span', d.name, `card-name${d.name.length > 24 ? ' long-name' : ''}`); name.title = d.name;
  element.append(frame, name);
  if (d.level) {
    const stars = node('span', undefined, 'card-level'); stars.setAttribute('aria-label', `Cấp ${d.level}`);
    for (let n = 0; n < d.level; n++) stars.append(node('span', '★', 'card-star'));
    const attribute = node('span', d.attribute, 'card-attribute'); attribute.title = d.attribute;
    element.append(stars, attribute);
  }
  const art = node('span', '✧', 'card-art'); art.setAttribute('aria-label', 'Chưa có ảnh minh họa');
  element.append(art, node('span', d.level ? `${d.race} · ${d.kind === 'normal-monster' ? 'Quái thường' : 'Hiệu ứng'}` : d.kind === 'spell' ? 'PHÉP THUẬT' : 'CẠM BẪY', 'card-type'));
  element.append(node('span', d.text, 'card-description'));
  if (d.level) element.append(node('span', `ATK/${d.attack}  DEF/${d.defense}`, 'card-stats'));
}
function cardPreview(d) {
  const preview = node('div', undefined, 'card card-preview'); preview.setAttribute('aria-hidden', 'true');
  frontContent(preview, d); return preview;
}
function cardButton(card, zone, player, slot, onSelect) {
  const d = def(card), b = button('', onSelect || (() => { selected = { card, zone, player, slot }; render(); }), `card ${d?.kind === 'spell' ? 'spell' : d?.kind === 'trap' ? 'trap' : ''} ${!d ? 'back' : ''} ${selected?.card.handle === card.handle ? 'selected' : ''}`);
  b.setAttribute('aria-label', `${label(card)}${zone === 'hand' ? ' trên tay' : zone === 'graveyard' ? ` trong Mộ, vị trí ${slot + 1} từ trên xuống` : ` tại ô ${slot + 1}`}`);
  if (!d) { const art = node('span', undefined, 'card-back-art'); art.setAttribute('aria-hidden', 'true'); b.append(art); return b; }
  frontContent(b, d);
  if (player === view.viewerId && ['hand', 'monster', 'spell-trap'].includes(zone)) {
    b.dataset.cardHandle = card.handle;
    if (actionHints.has(card.handle)) {
      b.classList.add('actionable');
      b.setAttribute('aria-label', b.getAttribute('aria-label') + ' · Có thao tác hợp lệ');
      const hint = node('span', '✓ Có thao tác', 'card-action-hint'); hint.setAttribute('aria-hidden', 'true'); b.append(hint);
    }
  }
  if (zone !== 'hand') b.append(node('span', card.position === 'face-down-defense' || card.position === 'face-down' ? 'ÚP' : card.position === 'face-up-defense' ? 'PHÒNG THỦ' : card.position === 'face-up-attack' ? 'TẤN CÔNG' : 'NGỬA', 'card-position'));
  return b;
}
function row(cards, zone, player) {
  const n = node('div', undefined, 'zone-row'); cards.forEach((c, i) => { const slot = node('div', undefined, 'slot'); slot.append(c ? cardButton(c, zone, player, i) : node('span', `${zone === 'monster' ? 'QUÁI' : 'PHÉP / BẪY'} ${i + 1}`)); n.append(slot); }); return n;
}
function side(p, element, own) {
  const info = node('div', undefined, 'zone-info'); info.append(node('span', `${names[p.playerId]} ${own ? '· BẠN' : ''}`), node('span', `Deck ${p.deckCount} · Tay ${own ? view.selfHand.length : view.opponentHandCount} · Mộ ${p.graveyard.length}`));
  info.append(button('Xem Mộ', () => {
    $('graveyard-title').textContent = `Mộ · ${names[p.playerId]} · ${p.graveyard.length} lá`;
    const preview = $('graveyard-detail'), cards = $('graveyard-cards');
    preview.replaceChildren(node('p', p.graveyard.length ? 'Chọn một lá trong Mộ để đọc nội dung.' : 'Mộ đang trống.'));
    cards.replaceChildren(...[...p.graveyard].reverse().map((c, i) => cardButton(c, 'graveyard', p.playerId, i, () => {
      cardInfo(preview, c);
      for (const b of cards.children) b.classList.remove('selected');
      cards.children[i].classList.add('selected');
    })));
    $('graveyard-dialog').showModal();
  }));
  $(element).replaceChildren(info, ...(own ? [row(p.monsters, 'monster', p.playerId), row(p.spellsTraps, 'spell-trap', p.playerId)] : [row(p.spellsTraps, 'spell-trap', p.playerId), row(p.monsters, 'monster', p.playerId)]));
}
async function command(action) {
  if (busy || !view) return;
  busy = true; render();
  try {
    const data = await api('/api/command', { commandId: crypto.randomUUID(), duelId: view.duelId, expectedStateVersion: view.stateVersion, action });
    view = data.view; selected = null; const entry = view.activity?.find(e => e.stateVersion === data.outcome.stateVersion);
    const feedback = entry?.resolution?.map(resolutionText).filter(Boolean).join(' · ');
    message = data.outcome.accepted ? (feedback || 'Đã thực hiện.') : (reasonNames[data.outcome.reason] || 'Thao tác không hợp lệ.');
  } catch (e) { message = e.message; }
  finally { busy = false; render(); }
}
function resolutionText(fact) {
  const player = names[fact.playerId] || 'Người chơi';
  if (fact.kind === 'draw') return `${player} bốc ${fact.count} lá`;
  if (fact.kind === 'battle-damage') return `${player} nhận ${fact.amount} sát thương chiến đấu`;
  if (fact.kind === 'effect-damage') return `${player} nhận ${fact.amount} sát thương hiệu ứng`;
  if (fact.kind === 'life-points-gained') return `${player} hồi ${fact.amount} LP`;
  if (fact.kind === 'effect-destroyed') return `${fact.count} quái bị phá bởi hiệu ứng`;
  if (fact.kind === 'battle-destroyed') return `${fact.count} quái bị phá bởi chiến đấu`;
  if (fact.kind === 'return-to-hand') return `${fact.count} lá trở về tay ${player}`;
  if (fact.kind === 'discard-cost') return `${player} bỏ ${fact.count} lá làm chi phí`;
  if (fact.kind === 'discard') return `${player} bỏ ${fact.count} lá xuống Mộ`;
  if (fact.kind === 'tribute') return `${player} hiến tế ${fact.count} quái`;
  return '';
}
function matchingActions(base) {
  return (view.availableActions || []).filter(a => Object.entries(base).every(([key, value]) => a[key] === value));
}
function matchesPlan(plan, action) {
  return Object.entries(action).every(([key, value]) => Array.isArray(value)
    ? Array.isArray(plan[key]) && new Set(value).size === value.length && value.length === plan[key].length && value.every(v => plan[key].includes(v))
    : plan[key] === value);
}
let dialogEvents = new AbortController();
function chooseAction(title, base, { slots = false, tributes = false, targets = null, discards = false, note = null } = {}) {
  dialogEvents.abort(); dialogEvents = new AbortController();
  const fields = $('action-fields'); fields.replaceChildren(); $('action-title').textContent = title;
  const plans = matchingActions(base);
  if (!plans.length) { message = 'Chưa có thao tác hợp lệ cho lá này ở thời điểm hiện tại.'; $('status').textContent = message; return; }
  if (note) fields.append(node('p', note));
  let selectSlot, selectTarget, selectDiscard; const checks = [];
  if (slots) {
    const l = node('label', 'Chọn ô đặt bài'); selectSlot = node('select'); selectSlot.name = 'slot';
    const p = view.players.find(p => p.playerId === view.viewerId);
    const board = ['normal-summon', 'set-monster'].includes(base.type) ? p.monsters : p.spellsTraps;
    board.forEach((c, i) => { const o = node('option', `Ô ${i + 1}${c ? ' · đang có bài' : ' · trống'}`); o.value = String(i); o.disabled = !plans.some(a => a.slot === i); selectSlot.append(o); });
    const first = [...selectSlot.options].find(o => !o.disabled); if (first) selectSlot.value = first.value; l.append(selectSlot); fields.append(l);
  }
  if (tributes) {
    fields.append(node('p', plans[0].tributeHandles.length ? `Chọn đúng ${plans[0].tributeHandles.length} lá hiến tế. Ô đang có bài chỉ dùng được nếu lá tại ô đó được hiến tế.` : 'Không cần hiến tế.'));
    (plans[0].tributeHandles.length ? view.players.find(p => p.playerId === view.viewerId).monsters.filter(Boolean) : []).forEach(c => { const l = node('label'), input = node('input'); input.type = 'checkbox'; input.value = c.handle; input.disabled = !plans.some(a => a.tributeHandles.includes(c.handle)); checks.push(input); l.append(input, document.createTextNode(` ${label(c)}`)); fields.append(l); });
  }
  if (discards) {
    const l = node('label', 'Chọn 1 lá trên tay để bỏ làm chi phí'); selectDiscard = node('select'); selectDiscard.name = 'discard';
    view.selfHand.filter(c => plans.some(p => p.discardHandle === c.handle)).forEach(c => {
      const o = node('option', label(c)); o.value = c.handle; selectDiscard.append(o);
    });
    l.append(selectDiscard); fields.append(l);
  }
  if (targets) {
    const l = node('label', 'Chọn mục tiêu'); selectTarget = node('select'); selectTarget.name = 'target';
    targets.forEach(t => { const o = node('option', t.label); o.value = t.handle; o.disabled = !plans.some(a => a.targetHandle === t.handle); selectTarget.append(o); }); const first = [...selectTarget.options].find(o => !o.disabled); if (first) selectTarget.value = first.value; l.append(selectTarget); fields.append(l);
  }
  const previews = node('div', undefined, 'choice-previews');
  const previewCard = (select, kind, caption) => {
    if (!select) return () => {};
    const section = node('section', undefined, 'choice-preview'); section.dataset.preview = kind;
    section.setAttribute('aria-label', caption);
    const content = node('div'); content.setAttribute('aria-live', 'polite');
    section.append(node('h3', caption), content); previews.append(section);
    return () => {
      const handle = select.value;
      if (!handle || select.selectedOptions[0]?.disabled) { content.replaceChildren(node('p', 'Chưa có lựa chọn hợp lệ.')); return; }
      if (handle === 'direct') { content.replaceChildren(node('p', 'Tấn công trực tiếp vào đối thủ.')); return; }
      const card = visibleCard(handle);
      if (!card) { content.replaceChildren(node('p', 'Không có thông tin lá trong góc nhìn hiện tại.')); return; }
      cardInfo(content, card);
      content.prepend(node('p', select.selectedOptions[0].textContent, 'choice-location'));
    };
  };
  const showDiscard = previewCard(selectDiscard, 'discard', 'Lá bỏ làm chi phí');
  const showTarget = previewCard(selectTarget, 'target', 'Mục tiêu đang chọn');
  if (previews.children.length) fields.append(previews);
  const assemble = () => {
    const a = { ...base };
    if (selectSlot) a.slot = Number(selectSlot.value);
    if (tributes) a.tributeHandles = checks.filter(c => c.checked).map(c => c.value);
    if (selectDiscard) a.discardHandle = selectDiscard.value;
    if (selectTarget) a.targetHandle = selectTarget.value;
    return a;
  };
  const sync = () => {
    if (selectDiscard && selectTarget) {
      const compatible = plans.filter(p => p.discardHandle === selectDiscard.value && (!selectSlot || p.slot === Number(selectSlot.value)));
      for (const o of selectTarget.options) o.disabled = !compatible.some(p => p.targetHandle === o.value);
      if (selectTarget.selectedOptions[0]?.disabled) selectTarget.value = [...selectTarget.options].find(o => !o.disabled)?.value || '';
    }
    showDiscard(); showTarget();
    $('action-form').querySelector('button[type="submit"]').disabled = !plans.some(p => matchesPlan(p, assemble()));
  };
  fields.addEventListener('change', sync, { signal: dialogEvents.signal });
  sync();
  $('action-form').onsubmit = e => {
    e.preventDefault(); const a = assemble();
    if (!plans.some(p => matchesPlan(p, a))) { message = 'Ô, bài hiến tế hoặc mục tiêu chưa hợp lệ.'; $('status').textContent = message; return; }
    $('action-dialog').close(); command(a);
  };
  $('action-dialog').showModal();
}
function cardInfo(panel, card) {
  const d = def(card);
  if (!d) { panel.replaceChildren(node('h2', 'Bài úp'), node('p', 'Danh tính lá bài được giữ kín.')); return; }
  panel.replaceChildren(node('h2', d.name), cardPreview(d), node('span', d.level ? `Cấp ${d.level} · ${d.attribute} · ATK ${d.attack} / DEF ${d.defense}` : d.kind === 'spell' ? 'Bài Phép' : 'Bài Bẫy', 'tag'), node('p', d.text));
}
function detail() {
  const panel = $('detail'), actions = $('actions'); actions.replaceChildren();
  if (!selected) { panel.replaceChildren(node('h2', 'Chọn một lá bài'), node('p', 'Chọn bài trên tay hoặc trên sân để xem và thực hiện thao tác.')); return; }
  const { card, zone, player, slot } = selected, d = def(card);
  if (!d) { panel.replaceChildren(node('h2', 'Bài úp'), node('div', '◇', 'large-symbol'), node('p', 'Danh tính lá bài được giữ kín.')); return; }
  panel.replaceChildren(node('h2', d.name), cardPreview(d), node('span', d.level ? `Cấp ${d.level} · ${d.attribute} · ATK ${d.attack} / DEF ${d.defense}` : d.kind === 'spell' ? 'Bài Phép' : 'Bài Bẫy', 'tag'), node('p', d.text));
  if (player !== view.viewerId || view.result) return;
  const canMain = view.turn.activePlayer === view.viewerId && ['main1', 'main2'].includes(view.turn.phase) && view.timing.window === 'open' && !view.decision;
  const canBattle = view.turn.activePlayer === view.viewerId && view.turn.phase === 'battle' && view.timing.window === 'open' && !view.decision;
  const h = card.handle, add = (text, fn, allowed = canMain) => {
    const types = { 'Triệu hồi': 'normal-summon', 'Úp quái': 'set-monster', 'Úp bài': 'set-spell-trap', 'Kích hoạt': 'activate-spell', 'Flip Summon': 'flip-summon', 'Đổi tư thế': 'change-position', 'Tấn công': 'declare-attack', 'Kích hoạt Bẫy': 'activate-trap' };
    const base = text === 'Tấn công' ? { type: types[text], attackerHandle: h } : { type: types[text], cardHandle: h };
    const b = button(text, fn); b.disabled = busy || !allowed || !matchingActions(base).length; actions.append(b);
  };
  if (zone === 'hand') {
    if (d.level) {
      add('Triệu hồi', () => chooseAction('Normal Summon', { type: 'normal-summon', cardHandle: h }, { slots: true, tributes: true }));
      add('Úp quái', () => chooseAction('Set quái thú', { type: 'set-monster', cardHandle: h }, { slots: true, tributes: true }));
    } else {
      add('Úp bài', () => chooseAction('Set Phép / Bẫy', { type: 'set-spell-trap', cardHandle: h, zone: 'spell-trap' }, { slots: true }));
      if (d.kind === 'spell') add('Kích hoạt', () => activateSpell(h));
    }
  }
  if (zone === 'monster') {
    if (card.position === 'face-down-defense') add('Flip Summon', () => command({ type: 'flip-summon', cardHandle: h }));
    else {
      add('Đổi tư thế', () => command({ type: 'change-position', cardHandle: h }));
      add('Tấn công', () => {
        const targets = view.players.find(p => p.playerId !== view.viewerId).monsters.flatMap((c, i) => c ? [{ handle: c.handle, label: `Ô ${i + 1}: ${label(c)}` }] : []);
        chooseAction('Chọn mục tiêu tấn công', { type: 'declare-attack', attackerHandle: h }, { targets: targets.length ? targets : [{ handle: 'direct', label: 'Tấn công trực tiếp' }] });
      }, canBattle);
    }
  }
  if (zone === 'spell-trap' && card.position === 'face-down') {
    if (d.kind === 'spell') add('Kích hoạt', () => activateSpell(h, slot));
    else add('Kích hoạt Bẫy', () => chooseAction('Chọn quái vừa triệu hồi', { type: 'activate-trap', cardHandle: h }, { targets: view.players.find(p => p.playerId !== view.viewerId).monsters.flatMap((c, i) => c ? [{ handle: c.handle, label: `Ô ${i + 1}: ${label(c)}` }] : []) }), view.timing.priorityPlayer === view.viewerId && ['summon-response', 'chain-response'].includes(view.timing.window) && !view.decision);
  }
}
function activateSpell(handle, slot) {
  const base = { type: 'activate-spell', cardHandle: handle, ...(slot === undefined ? {} : { slot }) };
  const plans = matchingActions(base), cost = plans.some(a => a.discardHandle !== undefined);
  if (!cost && slot !== undefined) return command(base);
  const graveyard = view.players.find(p => p.playerId === view.viewerId).graveyard;
  const recovery = cost && plans.some(a => graveyard.some(c => c.handle === a.targetHandle));
  const targets = cost ? [...new Set(plans.map(a => a.targetHandle))].map(h => {
    const fromHand = recovery && view.selfHand.find(c => c.handle === h);
    return { handle: h, label: fromHand ? `Lá sẽ bỏ làm chi phí — ${label(fromHand)}` : optionLabel(h) };
  }) : null;
  chooseAction(recovery ? 'Bỏ 1 lá làm chi phí và chọn quái về tay' : cost ? 'Bỏ 1 lá làm chi phí và chọn quái để phá' : 'Kích hoạt Phép', base,
    { slots: slot === undefined, discards: cost, targets, note: recovery ? 'Mộ phải có quái trước khi kích hoạt. Bạn có thể chọn lại quái vừa bỏ làm chi phí.' : null });
}
function renderGuide() {
  let title = '', text = '', transfer = null;
  const priority = view.timing.priorityPlayer;
  if (view.result) {
    title = view.result.winner ? `${names[view.result.winner]} thắng` : 'Trận đấu hòa';
    const reasons = { 'life-points': 'Trận kết thúc vì điểm gốc về 0.', 'failed-draw': 'Một người chơi không thể bốc đủ bài theo yêu cầu.', concession: 'Một người chơi đã đầu hàng.', effect: 'Trận kết thúc theo hiệu ứng.', 'simultaneous-loss': 'Hai người chơi cùng đạt điều kiện thua.' };
    text = `${reasons[view.result.reason] || 'Trận đấu đã kết thúc.'} Chọn Trận mới nếu muốn chơi tiếp.`;
  } else if (view.decision) {
    title = view.decision.kind === 'discard' ? 'Bạn cần bỏ bài cuối lượt' : 'Bạn cần chọn bài';
    text = `Chọn ${view.decision.min === view.decision.max ? view.decision.min : view.decision.min + '–' + view.decision.max} lá trong mục Lựa chọn bắt buộc, rồi xác nhận. Chưa thể chuyển phase hoặc pass lúc này.`;
  } else if (priority && priority !== view.viewerId) {
    title = `Chờ ${names[priority]} phản hồi`;
    text = 'Chuyển máy để người có quyền thao tác xem góc nhìn của mình. Pass là nhường quyền phản hồi, không phải tự kết thúc lượt.'; transfer = priority;
  } else if (!priority) {
    title = 'Người chơi còn lại đang chọn bài'; text = 'Chuyển góc nhìn để trả lời lựa chọn bắt buộc trước khi tiếp tục.';
    transfer = view.players.find(p => p.playerId !== view.viewerId).playerId;
  } else if (view.timing.window === 'phase-exit') {
    title = 'Đang đề nghị chuyển phase'; text = 'Nếu không phản hồi, nhấn Pass để đồng ý chuyển phase. Lượt chơi vẫn tiếp tục theo thứ tự trên sân.';
  } else if (view.timing.window !== 'open') {
    title = view.chain.length ? `Bạn có quyền phản hồi · Chain ${view.chain.length}` : 'Bạn có quyền phản hồi';
    text = 'Dùng bài phản hồi nếu đúng điều kiện, hoặc nhấn Pass. Khi hai bên nhường quyền liên tiếp, hiệu ứng hoặc bước đang chờ mới được xử lý.';
  } else if (view.turn.phase === 'battle') {
    title = 'Battle Phase · Chọn quái để tấn công'; text = 'Chọn quái ngửa tấn công của mình và mục tiêu. Khi đánh xong, chuyển MAIN 2 trong mục Điều khiển lượt.';
  } else if (['main1', 'main2'].includes(view.turn.phase)) {
    title = `${phaseNames[view.turn.phase]} · Chọn bài để thao tác`; text = 'Có thể triệu hồi hoặc úp quái theo hạn mức, đặt Phép/Bẫy và dùng Phép đủ điều kiện. Chọn phase tiếp theo khi đã xong.';
  } else {
    title = `${phaseNames[view.turn.phase]} · Đến lượt bạn`; text = 'Dùng nút phase trong Điều khiển lượt để tiếp tục. Đối thủ sẽ có cơ hội phản hồi trước khi phase đổi.';
  }
  $('guide-title').textContent = busy ? 'Đang xử lý thao tác…' : title;
  $('guide-text').textContent = text;
  $('handoff-next').hidden = !transfer || busy;
  $('handoff-next').textContent = transfer ? `Chuyển cho ${names[transfer]}` : 'Chuyển máy';
  const actionNames = { 'normal-summon': 'Triệu hồi quái', 'set-monster': 'Úp quái', 'set-spell-trap': 'Úp Phép / Bẫy', 'change-position': 'Đổi tư thế', 'flip-summon': 'Flip Summon', 'declare-attack': 'Tuyên bố tấn công', 'activate-spell': 'Kích hoạt Phép', 'activate-trap': 'Kích hoạt Bẫy', 'answer-decision': 'Xác nhận lựa chọn', pass: 'Nhường quyền', 'request-phase': 'Đề nghị chuyển phase', concede: 'Đầu hàng' };
  const entries = (view.activity || []).slice().reverse();
  $('activity').replaceChildren(...(entries.length ? entries.map(e => { const item = node('li', `#${e.stateVersion} · Lượt ${e.turn} · ${names[e.actorId]}: ${actionNames[e.action] || 'Thao tác'}`); if (e.resolution?.length) item.append(node('p', e.resolution.map(resolutionText).filter(Boolean).join(' · '), 'resolution')); return item; }) : [node('li', 'Chưa có thao tác.')]));
  $('concede').disabled = busy || !!view.result;
}
function render() {
  $('decision-card-dialog').close(); $('decision-card-detail').replaceChildren(); $('decision-card-location').textContent = '';
  if (!view) return;
  const self = view.players.find(p => p.playerId === view.viewerId), opponent = view.players.find(p => p.playerId !== view.viewerId);
  const ownHandles = new Set([...view.selfHand, ...self.monsters, ...self.spellsTraps].filter(Boolean).map(c => c.handle));
  actionHints = new Set(!busy && !view.result && !view.decision
    ? (view.availableActions || []).flatMap(a => [a.cardHandle, a.attackerHandle]).filter(h => ownHandles.has(h)) : []);
  $('action-hints').textContent = busy ? 'Đang xử lý thao tác…' : view.result ? 'Trận đấu đã kết thúc.'
    : view.decision ? 'Hoàn tất lựa chọn bắt buộc trước khi dùng bài.'
    : actionHints.size ? `✓ ${actionHints.size} lá có thao tác hợp lệ trên tay hoặc sân của bạn. Chọn lá để xem thao tác.`
    : 'Hiện chưa có lá nào có thao tác hợp lệ. Xem hướng dẫn lượt để tiếp tục.';
  $('score').replaceChildren(...[opponent, self].map(p => { const n = node('div', undefined, `score ${view.turn.activePlayer === p.playerId ? 'active' : ''}`); n.append(node('span', names[p.playerId]), node('div', undefined)); n.lastChild.append(node('small', 'LIFE POINTS'), node('strong', String(p.lifePoints))); return n; }));
  const phases = node('div', undefined, 'phases'); for (const [key, text] of Object.entries(phaseNames)) phases.append(node('span', text, `phase ${view.turn.phase === key ? 'current' : ''}`)); $('phases').replaceChildren(phases);
  side(opponent, 'opponent', false); side(self, 'self', true);
  $('hand').replaceChildren(...view.selfHand.map(c => cardButton(c, 'hand', view.viewerId, 0))); $('hand-count').textContent = `(${view.selfHand.length})`;
  $('timing').textContent = view.result ? `Kết thúc · ${view.result.winner ? names[view.result.winner] + ' thắng' : 'Hòa'}` : `Lượt ${view.turn.number} · ${names[view.turn.activePlayer]} · ${view.timing.priorityPlayer ? 'Quyền: ' + names[view.timing.priorityPlayer] : 'Đang chọn bài'}${view.chain.length ? ' · Chain ' + view.chain.length : ''}`;
  renderGuide(); detail(); $('status').textContent = message + (!view.result && view.timing.priorityPlayer && view.timing.priorityPlayer !== view.viewerId ? ' Đổi người chơi để ' + names[view.timing.priorityPlayer] + ' phản hồi.' : ''); $('pass').disabled = busy || !matchingActions({ type: 'pass' }).length;
  const turns = $('turn-actions'); turns.replaceChildren();
  const next = { draw: ['standby'], standby: ['main1'], main1: view.turn.number === 1 ? ['end'] : ['battle', 'end'], battle: ['main2'], main2: ['end'], end: ['draw'] };
  if (!view.result && view.turn.activePlayer === view.viewerId) for (const phase of next[view.turn.phase]) { const b = button(phase === 'draw' ? 'Sang lượt đối thủ' : phaseNames[phase], () => command({ type: 'request-phase', phase })); b.disabled = busy || !matchingActions({ type: 'request-phase', phase }).length; turns.append(b); }
  $('decision-panel').hidden = !view.decision;
  const form = $('decision-form'); form.replaceChildren();
  if (view.decision) {
    const d = view.decision; form.append(node('p', `Chọn ${d.min === d.max ? d.min : d.min + '–' + d.max} lá${d.kind === 'discard' ? ' để bỏ xuống Mộ' : ' để xử lý hiệu ứng'}.`));
    d.optionIds.forEach(h => {
      const row = node('div', undefined, 'decision-option'), l = node('label'), input = node('input');
      input.type = d.max === 1 ? 'radio' : 'checkbox'; input.name = 'option'; input.value = h;
      l.append(input, document.createTextNode(` ${optionLabel(h)}`));
      const read = button('Xem bài', () => {
        if (busy || !view.decision?.optionIds.includes(h)) return;
        const card = visibleCard(h); if (!card) return;
        cardInfo($('decision-card-detail'), card);
        $('decision-card-location').textContent = optionLabel(h);
        $('decision-card-dialog').showModal();
      });
      read.dataset.inspect = h; read.setAttribute('aria-label', `Xem nội dung: ${optionLabel(h)}`);
      row.append(l, read); form.append(row);
    });
    const submit = node('button', 'Xác nhận lựa chọn', 'primary'); submit.type = 'submit'; form.append(submit);
    const progress = node('p'); progress.id = 'decision-progress'; progress.setAttribute('aria-live', 'polite'); form.append(progress);
    const updateSelection = () => {
      const count = form.querySelectorAll('input:checked').length;
      progress.textContent = `Đã chọn ${count}/${d.min === d.max ? d.min : d.min + '–' + d.max} lá.`;
      submit.disabled = busy || count < d.min || count > d.max;
      for (const input of form.querySelectorAll('input, [data-inspect]')) input.disabled = busy;
    };
    form.onchange = updateSelection; updateSelection();
    form.onsubmit = e => { e.preventDefault(); if (busy) return; const optionIds = [...form.querySelectorAll('input:checked')].map(i => i.value); if (optionIds.length < d.min || optionIds.length > d.max) { message = 'Hãy chọn đúng số lá.'; $('status').textContent = message; return; } command({ type: 'answer-decision', decisionId: d.id, optionIds }); };
  }
}
function handoff() { document.body.classList.add('concealed'); selected = null; $('seat-dialog').showModal(); }
$('seat-dialog').addEventListener('cancel', e => e.preventDefault());
for (const b of document.querySelectorAll('[data-seat]')) b.addEventListener('click', async () => {
  if (busy) return; busy = true;
  try { view = await api('/api/seat', { seat: b.dataset.seat }); message = `Bạn đang xem ${names[view.viewerId]}.`; selected = null; render(); $('seat-dialog').close(); document.body.classList.remove('concealed'); }
  catch (e) { alert(e.message); } finally { busy = false; render(); }
});
$('switch').addEventListener('click', handoff);
$('handoff-next').addEventListener('click', handoff);
$('close-graveyard').addEventListener('click', () => $('graveyard-dialog').close());
$('close-decision-card').addEventListener('click', () => $('decision-card-dialog').close());
$('decision-card-dialog').addEventListener('close', () => { $('decision-card-detail').replaceChildren(); $('decision-card-location').textContent = ''; });
$('cancel-action').addEventListener('click', () => $('action-dialog').close());
$('pass').addEventListener('click', () => command({ type: 'pass' }));
$('refresh').addEventListener('click', async () => { if (busy) return; busy = true; try { view = await api('/api/view'); selected = null; message = 'Đã cập nhật.'; render(); } catch (e) { message = e.message; $('status').textContent = message; } finally { busy = false; render(); } });
$('concede').addEventListener('click', () => { if (confirm('Đầu hàng trận này?')) command({ type: 'concede' }); });
$('reset').addEventListener('click', () => {
  if (busy || !view) return;
  $('new-game-error').textContent = '';
  $('new-game-warning').textContent = view.result ? 'Kết quả và lịch sử trận trước sẽ được thay bằng trận mới.' : 'Trận đang chơi sẽ bị thay thế khi xác nhận. Chọn Hủy để giữ nguyên trận.';
  $('new-game-dialog').showModal();
});
$('cancel-new-game').addEventListener('click', () => { if (!busy) $('new-game-dialog').close(); });
$('new-game-dialog').addEventListener('cancel', e => { if (busy) e.preventDefault(); });
$('new-game-form').addEventListener('submit', async e => {
  e.preventDefault(); if (busy || !view) return;
  const firstPlayer = $('new-game-form').querySelector('input[name="first-player"]:checked')?.value;
  if (!firstPlayer) return;
  busy = true; $('new-game-error').textContent = '';
  for (const c of $('new-game-form').elements) c.disabled = true;
  try {
    const next = await api('/api/reset', { firstPlayer });
    view = next; selected = null;
    message = `Trận mới: ${names[view.turn.activePlayer]} đi trước.`;
    $('new-game-dialog').close();
  } catch (error) { $('new-game-error').textContent = error.message; }
  finally { busy = false; for (const c of $('new-game-form').elements) c.disabled = false; render(); }
});
(async () => { try { const data = await api('/api/catalog'); data.cards.forEach(c => catalog.set(c.id, c)); deckRules = data.deckRules; $('catalog-count').textContent = `${catalog.size} loại bài thử nghiệm`; handoff(); } catch (e) { $('status').textContent = e.message; } })();

function draftIssues() {
  if (!deckDraft) return [];
  const issues = [], cards = deckDraft.cards;
  if (cards.length < deckRules.mainMin) issues.push(`Cần ít nhất ${deckRules.mainMin} lá; còn thiếu ${deckRules.mainMin - cards.length}.`);
  if (deckRules.mainMax !== null && cards.length > deckRules.mainMax) issues.push(`Chỉ được tối đa ${deckRules.mainMax} lá.`);
  for (const c of catalog.values()) if (cards.filter(id => id === c.id).length > c.maxCopies) issues.push(`${c.name}: tối đa ${c.maxCopies} bản sao.`);
  if (cards.some(id => !catalog.has(id))) issues.push('Có bài chưa được hỗ trợ.');
  return issues;
}
function renderDeck() {
  if (!deckDraft) return;
  $('deck-title').textContent = `Xây deck · ${names[deckDraft.seat]}`;
  $('deck-count').textContent = `${deckDraft.cards.length} lá · Tối thiểu ${deckRules.mainMin}${deckRules.mainMax === null ? ' · Không có trần 60 lá hiện đại' : ' · Tối đa ' + deckRules.mainMax}`;
  const issues = draftIssues(); $('deck-issues').replaceChildren(...issues.map(text => node('li', text)));
  $('deck-save').disabled = busy || !!issues.length;
  $('deck-export').disabled = busy || !!issues.length;
  for (const id of ['deck-default', 'deck-close', 'deck-search', 'deck-kind', 'deck-import', 'deck-file']) $(id).disabled = busy;
  const query = $('deck-search').value.trim().toLocaleLowerCase(), kind = $('deck-kind').value;
  const rows = [...catalog.values()].filter(c => (!query || (c.name + ' ' + c.text).toLocaleLowerCase().includes(query)) && (kind === 'all' || (kind === 'monster' ? c.kind.includes('monster') : c.kind === kind))).map(c => {
    const row = node('div', undefined, 'deck-row'); row.dataset.cardId = c.id;
    const count = deckDraft.cards.filter(id => id === c.id).length;
    const read = button(c.name, () => cardInfo($('deck-preview'), { visibility: 'known', definition: { id: c.id } }), 'deck-name');
    read.disabled = busy;
    const minus = button('−', () => { deckDraft.cards.splice(deckDraft.cards.indexOf(c.id), 1); $('deck-error').textContent = ''; renderDeck(); });
    minus.dataset.change = 'remove'; minus.disabled = busy || !count; minus.setAttribute('aria-label', `Bớt ${c.name}`);
    const plus = button('+', () => { deckDraft.cards.push(c.id); $('deck-error').textContent = ''; renderDeck(); });
    plus.dataset.change = 'add'; plus.disabled = busy || count >= c.maxCopies; plus.setAttribute('aria-label', `Thêm ${c.name}`);
    row.append(read, minus, node('span', `${count}/${c.maxCopies}`, 'deck-copies'), plus); return row;
  });
  $('deck-catalog').replaceChildren(...(rows.length ? rows : [node('p', 'Không có lá phù hợp.') ]));
}
$('deck-builder').addEventListener('click', async () => {
  if (busy || !view) return; busy = true; render();
  try {
    const saved = await api('/api/deck'); if (saved.seat !== view.viewerId) throw new Error('Người chơi đã thay đổi. Hãy chọn lại góc nhìn trước khi sửa deck.'); deckDraft = { ...saved, cards: [...saved.cards] };
    $('deck-search').value = ''; $('deck-kind').value = 'all'; $('deck-error').textContent = '';
    $('deck-preview').replaceChildren(node('p', 'Chọn tên lá bài để xem nội dung và chỉ số.'));
    $('deck-dialog').showModal();
  } catch (error) { message = error.message; }
  finally { busy = false; render(); renderDeck(); }
});
$('deck-search').addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
$('deck-search').addEventListener('input', renderDeck); $('deck-kind').addEventListener('change', renderDeck);
$('deck-close').addEventListener('click', () => { if (!busy) { $('deck-dialog').close(); deckDraft = null; } });
$('deck-dialog').addEventListener('cancel', e => { if (busy) e.preventDefault(); else deckDraft = null; });
$('deck-default').addEventListener('click', () => { if (!busy && deckDraft) { deckDraft.cards = [...deckDraft.defaultCards]; $('deck-error').textContent = ''; renderDeck(); } });
$('deck-form').addEventListener('submit', async e => {
  e.preventDefault(); if (busy || !deckDraft || draftIssues().length) return;
  busy = true; renderDeck();
  try {
    const saved = await api('/api/deck', { seat: deckDraft.seat, revision: deckDraft.revision, cards: deckDraft.cards });
    message = `Đã lưu deck ${names[saved.seat]} (${saved.cards.length} lá). Deck này sẽ dùng ở trận mới.`;
    $('deck-dialog').close(); deckDraft = null;
  } catch (error) { $('deck-error').textContent = 'Chưa xác nhận lưu deck. ' + error.message + ' Bản đang sửa được giữ lại.'; }
  finally { busy = false; render(); renderDeck(); }
});

$('deck-export').addEventListener('click', async () => {
  if (busy || !deckDraft || draftIssues().length) return;
  busy = true; renderDeck();
  try {
    const data = await api('/api/deck/export', { seat: deckDraft.seat, cards: deckDraft.cards });
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `classic-duel-deck-${deckDraft.seat}.json`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('deck-error').textContent = 'Đã gửi file cho trình duyệt tải xuống. Deck đã lưu không thay đổi.';
  } catch (error) { $('deck-error').textContent = error.message; }
  finally { busy = false; renderDeck(); }
});
$('deck-import').addEventListener('click', () => {
  if (!busy && deckDraft) { $('deck-file').value = ''; $('deck-file').click(); }
});
$('deck-file').addEventListener('change', async () => {
  const file = $('deck-file').files[0]; if (busy || !deckDraft || !file) return;
  busy = true; renderDeck();
  try {
    if (file.size > 12000) throw new Error('File deck vượt 12.000 byte.');
    const data = await api('/api/deck/import', { seat: deckDraft.seat, text: await file.text() });
    deckDraft.cards = [...data.cards];
    $('deck-error').textContent = 'Đã nhập vào bản nháp. Kiểm tra rồi bấm Lưu deck để áp dụng cho trận mới.';
  } catch (error) { $('deck-error').textContent = 'Không nhập được; giữ nguyên bản nháp và deck đã lưu. ' + error.message; }
  finally { $('deck-file').value = ''; busy = false; renderDeck(); }
});
