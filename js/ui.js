// ui.js — 畫面渲染與互動（純 DOM，事件委派）
(function (SPIRE) {
  'use strict';

  const G = () => SPIRE.getG();
  let root = null;
  let sel = { cardUid: null, potionIdx: null }; // 需選目標時的暫存
  let overlay = null; // 'deck' 等

  const STATUS_LABEL = {
    strength: '力量', dexterity: '敏捷', vulnerable: '易傷', weak: '虛弱',
    poison: '中毒', ritual: '儀式', metallicize: '金屬化', demonForm: '惡魔形態',
    feelNoPain: '無視痛楚', juggernaut: '巨獸', barricade: '壁壘',
  };
  const STATUS_CLASS = {
    strength: 'buff', dexterity: 'buff', metallicize: 'buff', demonForm: 'buff',
    feelNoPain: 'buff', juggernaut: 'buff', barricade: 'buff', ritual: 'buff',
    vulnerable: 'debuff', weak: 'debuff', poison: 'debuff',
  };

  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  // 五行小標籤
  function elementTag(el) {
    const m = el && SPIRE.ELEMENT_META ? SPIRE.ELEMENT_META[el] : null;
    return m ? `<span class="el-tag el-${el}" title="五行·${m.zh}">${m.icon}</span>` : '';
  }

  // ---------------------------------------------------------------- 卡牌 HTML
  function cardHtml(inst, opts) {
    opts = opts || {};
    const { def, v, cost, name } = SPIRE.resolveCard(inst);
    const typeClass = 'type-' + def.type;
    const schoolClass = def.school ? ' school-' + def.school : '';
    const schoolZh = def.school && SPIRE.SCHOOL_META[def.school] ? SPIRE.SCHOOL_META[def.school].zh : '';
    const elMeta = def.element && SPIRE.ELEMENT_META ? SPIRE.ELEMENT_META[def.element] : null;
    const elBadge = elMeta ? `<div class="card-el el-${def.element}" title="五行·${elMeta.zh}">${elMeta.icon}</div>` : '';
    const playable = opts.playable !== false;
    const costTxt = cost < 0 ? '' : cost;
    const sela = (sel.cardUid === inst.uid) ? ' selected' : '';
    return `<div class="card ${typeClass}${schoolClass}${playable ? '' : ' unplayable'}${sela}" ${opts.uid ? `data-act="play" data-uid="${inst.uid}"` : ''}>
      <div class="card-cost">${costTxt}</div>
      ${elBadge}
      <div class="card-name">${esc(name)}</div>
      <div class="card-type">${schoolZh ? schoolZh + '·' : ''}${typeName(def.type)}</div>
      <div class="card-text">${def.text ? def.text(v) : ''}</div>
    </div>`;
  }
  function typeName(t) {
    return { attack: '攻擊', skill: '技能', power: '能力', status: '狀態', curse: '詛咒' }[t] || t;
  }

  // ---------------------------------------------------------------- 狀態徽章
  function statusBadges(entity) {
    const s = entity.statuses || {};
    return Object.keys(s).filter(k => STATUS_LABEL[k] && s[k]).map(k =>
      `<span class="badge ${STATUS_CLASS[k] || ''}">${STATUS_LABEL[k]} ${s[k]}</span>`
    ).join('');
  }

  // ---------------------------------------------------------------- 頂部資訊列
  function topBar() {
    const g = G();
    const relics = g.relics.map(r => `<span class="relic" title="${esc(SPIRE.RELICS[r].name)}：${esc(SPIRE.RELICS[r].desc)}">◈ ${esc(SPIRE.RELICS[r].name)}</span>`).join('');
    const potions = potionBar();
    return `<div class="topbar">
      <span class="stat hp">❤ ${g.hp}/${g.maxHp}</span>
      <span class="stat gold">💰 ${g.gold}</span>
      <span class="stat floor">🗼 第 ${g.floor} 層</span>
      <span class="relics">${relics}</span>
      <span class="potions">${potions}</span>
      <button class="btn small" data-act="view-deck">牌組 (${g.deck.length})</button>
    </div>`;
  }
  function potionBar() {
    const g = G();
    let html = '';
    for (let i = 0; i < g.maxPotions; i++) {
      const key = g.potions[i];
      if (key) {
        const p = SPIRE.POTIONS[key];
        const act = (g.screen === 'combat' && p.combat) ? `data-act="use-potion" data-i="${i}"` : '';
        html += `<span class="potion filled ${act ? 'usable' : ''}" ${act} title="${esc(p.name)}：${esc(p.desc)}">🧪</span>`;
      } else html += `<span class="potion empty">·</span>`;
    }
    return html;
  }

  // ---------------------------------------------------------------- 主渲染
  function render() {
    const g = G();
    if (!root) root = document.getElementById('app');
    if (!g) { renderTitle(); return; }
    let html = '';
    switch (g.screen) {
      case 'map': html = renderMap(); break;
      case 'combat': html = renderCombat(); break;
      case 'reward': html = renderReward(); break;
      case 'rest': html = renderRest(); break;
      case 'shop': html = renderShop(); break;
      case 'event': html = renderEvent(); break;
      case 'gameover': html = renderGameOver(); break;
      case 'victory': html = renderVictory(); break;
      default: html = renderMap();
    }
    if (overlay === 'deck') html += renderDeckOverlay();
    root.innerHTML = html;

    // 地圖：自動捲動到目前位置（或起點在底部）
    if (g.screen === 'map') {
      const sc = root.querySelector('.map-scroll');
      if (sc) {
        const cur = root.querySelector('.mapnode.current');
        if (cur) sc.scrollTop = Math.max(0, cur.offsetTop - sc.clientHeight / 2);
        else sc.scrollTop = sc.scrollHeight;
      }
    }
  }

  // ---------------------------------------------------------------- 標題
  function renderTitle() {
    if (!root) root = document.getElementById('app');
    const canContinue = SPIRE.Game.hasSave();
    root.innerHTML = `<div class="screen title-screen">
      <h1 class="game-title">深淵尖塔</h1>
      <p class="subtitle">觀測者之夢 · 算命師的輪迴 — 卡牌 Roguelike</p>
      <div class="menu">
        ${canContinue ? '<button class="btn big" data-act="continue">繼續冒險</button>' : ''}
        <button class="btn big" data-act="new-run">新的旅程</button>
      </div>
      <p class="hint">五術學派 · 五行相剋 · 能量 · 格擋 · 卡組構築 · 分支地圖 · 遺物</p>
    </div>`;
  }

  // ---------------------------------------------------------------- 地圖
  function renderMap() {
    const g = G();
    const map = g.map;
    const ICONS = SPIRE.MapGen.ICONS;
    const W = map.WIDTH, ROWS = map.ROWS;
    const totalRows = ROWS + 1;
    const cellW = 64, cellH = 54;
    const width = W * cellW, height = totalRows * cellH;
    const avail = new Set(SPIRE.MapGen.availableNodes(map));

    const yOf = r => (totalRows - 1 - r) * cellH + cellH / 2;
    const xOf = x => x * cellW + cellW / 2;

    // 連線
    let lines = '';
    for (const id in map.nodes) {
      const n = map.nodes[id];
      n.next.forEach(nid => {
        const m = map.nodes[nid];
        const active = (map.current === id) && avail.has(nid);
        lines += `<line x1="${xOf(n.x)}" y1="${yOf(n.r)}" x2="${xOf(m.x)}" y2="${yOf(m.r)}" class="edge${active ? ' edge-active' : ''}"/>`;
      });
    }
    // 節點
    let dots = '';
    for (const id in map.nodes) {
      const n = map.nodes[id];
      const isAvail = avail.has(id);
      const isCurrent = map.current === id;
      const cls = ['mapnode', 'type-' + n.type];
      if (isAvail) cls.push('avail');
      if (isCurrent) cls.push('current');
      if (n.visited && !isCurrent) cls.push('visited');
      const left = xOf(n.x) - 20, top = yOf(n.r) - 20;
      const act = isAvail ? `data-act="node" data-id="${id}"` : '';
      dots += `<div class="${cls.join(' ')}" style="left:${left}px;top:${top}px" ${act}>${ICONS[n.type] || '•'}</div>`;
    }

    return `${topBar()}
    <div class="screen map-screen">
      <div class="map-header">選擇你的路線 — 抵達頂端挑戰 Boss ${ICONS.boss}</div>
      <div class="map-scroll">
        <div class="map-canvas" style="width:${width}px;height:${height}px">
          <svg class="map-svg" width="${width}" height="${height}">${lines}</svg>
          ${dots}
        </div>
      </div>
      <div class="map-legend">
        <span>⚔️ 戰鬥</span><span>🔥 精英</span><span>💤 營火</span>
        <span>🏪 商店</span><span>❓ 事件</span><span>🎁 寶箱</span><span>👑 Boss</span>
      </div>
    </div>`;
  }

  // ---------------------------------------------------------------- 戰鬥
  function intentHtml(c, e) {
    const m = e._m;
    if (!m) return `<div class="intent">❓</div>`;
    const times = m.times || 1;
    let icon = '', txt = '';
    if (m.baseDmg != null) {
      const dmg = c.intentDamage(e, m.baseDmg);
      icon = '⚔️';
      txt = times > 1 ? `${dmg}×${times}` : `${dmg}`;
    } else if (m.intent === 'buff' || m.intent === 'defend_buff') { icon = '💪'; txt = '強化'; }
    else if (m.intent === 'defend') { icon = '🛡'; txt = '防禦'; }
    else if (m.intent === 'debuff') { icon = '⬇'; txt = '弱化'; }
    else if (m.intent === 'sleep') { icon = '💤'; txt = '沉睡'; }
    else { icon = '❓'; txt = ''; }
    const extra = (m.intent === 'attack_debuff' || m.intent === 'attack_buff' || m.intent === 'attack_defend')
      ? '<span class="intent-extra">＋</span>' : '';
    return `<div class="intent" title="${esc(m.name)}">${icon}${extra}<span class="intent-num">${txt}</span></div>`;
  }

  function renderCombat() {
    const g = G();
    const c = g.combat;
    const targeting = sel.cardUid != null || sel.potionIdx != null;

    // 敵人
    const enemiesHtml = c.enemies.map((e, i) => {
      if (!e.alive) return `<div class="enemy dead"></div>`;
      const hpPct = Math.max(0, e.hp / e.maxHp * 100);
      const canTarget = targeting;
      const act = canTarget ? `data-act="target" data-idx="${i}"` : '';
      return `<div class="enemy ${canTarget ? 'targetable' : ''} ${e.boss ? 'boss' : ''} ${e.elite ? 'elite' : ''}" ${act}>
        ${intentHtml(c, e)}
        <div class="enemy-art">${e.boss ? '👹' : e.elite ? '👺' : '👾'}</div>
        <div class="enemy-name">${esc(e.name)} ${elementTag(e.element)}</div>
        <div class="hpbar"><div class="hpfill enemy-hp" style="width:${hpPct}%"></div>
          <span class="hptext">${e.hp}/${e.maxHp}</span></div>
        ${e.block > 0 ? `<div class="blockbadge">🛡 ${e.block}</div>` : ''}
        <div class="badges">${statusBadges(e)}</div>
      </div>`;
    }).join('');

    // 玩家
    const p = c.player;
    const pHpPct = Math.max(0, g.hp / g.maxHp * 100);
    const playerHtml = `<div class="player-panel">
      <div class="player-art">🔮</div>
      <div class="player-name">算命師</div>
      <div class="hpbar"><div class="hpfill player-hp" style="width:${pHpPct}%"></div>
        <span class="hptext">${g.hp}/${g.maxHp}</span></div>
      ${p.block > 0 ? `<div class="blockbadge big">🛡 ${p.block}</div>` : ''}
      <div class="badges">${statusBadges(p)}</div>
    </div>`;

    // 手牌
    const handHtml = c.hand.map(inst => {
      const playable = c.canPlay(inst);
      return cardHtml(inst, { uid: true, playable });
    }).join('');

    const energyHtml = `<div class="energy-orb">${c.energy}<span class="energy-max">/${c.maxEnergy}</span></div>`;

    return `${topBar()}
    <div class="screen combat-screen">
      <div class="enemies-row">${enemiesHtml}</div>
      <div class="mid-row">
        ${playerHtml}
        ${targeting ? '<div class="targeting-hint">選擇目標…</div>' : ''}
      </div>
      <div class="hand-area">
        <div class="piles">
          <div class="pile" title="抽牌堆">🂠 ${c.drawPile.length}</div>
          <div class="pile" title="棄牌堆">♻ ${c.discardPile.length}</div>
          <div class="pile" title="消耗堆">🔥 ${c.exhaustPile.length}</div>
        </div>
        <div class="hand">${handHtml}</div>
        <div class="combat-controls">
          ${energyHtml}
          <button class="btn end-turn" data-act="endturn">結束回合 ⏭</button>
        </div>
      </div>
    </div>`;
  }

  // ---------------------------------------------------------------- 獎勵
  function renderReward() {
    const g = G();
    const p = g.pending;
    const items = p.rewards.map((r, i) => {
      if (r.type === 'card') {
        if (r.taken) return `<div class="reward-row done">✔ 卡牌獎勵已領取</div>`;
        const opts = r.options.map(o => cardHtml({ key: o.key, upgraded: o.upgraded, uid: 0 }, { uid: false })
          .replace('<div class="card ', `<div data-act="choose-card" data-i="${i}" data-key="${o.key}" class="card choose `)).join('');
        return `<div class="reward-card-choice">
          <div class="reward-label">選擇一張卡牌加入牌組：</div>
          <div class="card-choices">${opts}</div>
          <button class="btn small ghost" data-act="skip-card" data-i="${i}">跳過</button>
        </div>`;
      }
      if (r.taken) return `<div class="reward-row done">✔ 已領取</div>`;
      let label = '';
      if (r.type === 'gold') label = `💰 ${r.amount} 金幣`;
      else if (r.type === 'potion') label = `🧪 藥水：${SPIRE.POTIONS[r.key].name}`;
      else if (r.type === 'relic') label = `◈ 遺物：${SPIRE.RELICS[r.key].name} — ${SPIRE.RELICS[r.key].desc}`;
      return `<div class="reward-row" data-act="reward" data-i="${i}"><span>${esc(label)}</span><span class="take">領取</span></div>`;
    }).join('');
    return `${topBar()}
    <div class="screen reward-screen">
      <h2>戰利品</h2>
      <div class="rewards">${items}</div>
      <button class="btn big" data-act="leave-rewards">繼續前進 →</button>
    </div>`;
  }

  // ---------------------------------------------------------------- 營火
  function renderRest() {
    const g = G();
    const upgradable = g.deck.map((c, i) => ({ c, i })).filter(o => SPIRE.Game.canUpgrade(o.c));
    const cards = upgradable.map(o =>
      cardHtml(o.c, { uid: false }).replace('<div class="card ', `<div data-act="rest-upgrade" data-i="${o.i}" class="card choose `)
    ).join('');
    return `${topBar()}
    <div class="screen rest-screen">
      <h2>💤 營火</h2>
      <p>在溫暖的火光旁稍作休整。</p>
      <div class="rest-options">
        <button class="btn big" data-act="rest-heal">🔥 休息（回復 ${Math.floor(g.maxHp * 0.3) + (g.relics.includes('regalPillow') ? 15 : 0)} 生命）</button>
        <div class="rest-upgrade-block">
          <div class="reward-label">🔨 打鐵（升級一張卡牌）</div>
          <div class="card-choices scroll-x">${cards || '<span class="hint">沒有可升級的卡牌。</span>'}</div>
        </div>
      </div>
    </div>`;
  }

  // ---------------------------------------------------------------- 商店
  function renderShop() {
    const g = G();
    const s = g.shop;
    const cardItems = s.cards.map((it, i) => shopItem('cards', i, cardHtml({ key: it.key, upgraded: false }, { uid: false }), it)).join('');
    const relicItems = s.relics.map((it, i) => shopItem('relics', i,
      `<div class="shop-relic"><div class="rname">◈ ${esc(SPIRE.RELICS[it.key].name)}</div><div class="rdesc">${esc(SPIRE.RELICS[it.key].desc)}</div></div>`, it)).join('');
    const potionItems = s.potions.map((it, i) => shopItem('potions', i,
      `<div class="shop-potion"><div class="rname">🧪 ${esc(SPIRE.POTIONS[it.key].name)}</div><div class="rdesc">${esc(SPIRE.POTIONS[it.key].desc)}</div></div>`, it)).join('');
    return `${topBar()}
    <div class="screen shop-screen">
      <h2>🏪 商店</h2>
      <div class="shop-section"><h3>卡牌</h3><div class="shop-grid">${cardItems}</div></div>
      <div class="shop-section"><h3>遺物</h3><div class="shop-grid">${relicItems}</div></div>
      <div class="shop-section"><h3>藥水</h3><div class="shop-grid">${potionItems}</div></div>
      <div class="shop-section">
        <button class="btn" data-act="shop-remove-mode">🗑 移除一張卡牌（${g.removeCost} 金幣）</button>
        ${g.shopRemoving ? renderRemoveList() : ''}
      </div>
      <button class="btn big" data-act="shop-leave">離開商店 →</button>
    </div>`;
  }
  function shopItem(cat, i, inner, it) {
    const g = G();
    const afford = g.gold >= it.price && !it.sold;
    return `<div class="shop-item ${it.sold ? 'sold' : ''} ${afford ? 'afford' : 'poor'}" ${!it.sold ? `data-act="shop-buy" data-cat="${cat}" data-i="${i}"` : ''}>
      ${inner}
      <div class="price">${it.sold ? '已售出' : '💰 ' + it.price}</div>
    </div>`;
  }
  function renderRemoveList() {
    const g = G();
    const cards = g.deck.map((c, i) =>
      cardHtml(c, { uid: false }).replace('<div class="card ', `<div data-act="shop-remove" data-i="${i}" class="card choose `)
    ).join('');
    return `<div class="remove-list"><div class="reward-label">選擇要移除的卡牌：</div><div class="card-choices scroll-x">${cards}</div></div>`;
  }

  // ---------------------------------------------------------------- 事件
  function renderEvent() {
    const ev = G().event;
    const opts = ev.options.map((o, i) => `<button class="btn event-opt" data-act="event" data-i="${i}">${esc(o.label)}</button>`).join('');
    return `${topBar()}
    <div class="screen event-screen">
      <h2>${esc(ev.title)}</h2>
      <p class="event-text">${esc(ev.text)}</p>
      ${ev.result ? `<p class="event-result">${esc(ev.result)}</p>` : ''}
      <div class="event-options">${opts}</div>
    </div>`;
  }

  // ---------------------------------------------------------------- 結局
  function renderGameOver() {
    const g = G();
    return `<div class="screen end-screen gameover">
      <h1>💀 你倒下了</h1>
      <p>你在第 ${g.floor} 層被擊敗。</p>
      <p>尖塔仍在等待下一位挑戰者。</p>
      <button class="btn big" data-act="new-run">再次挑戰</button>
    </div>`;
  }
  function renderVictory() {
    return `<div class="screen end-screen victory">
      <h1>👑 尖塔征服！</h1>
      <p>你擊敗了 Boss，通過了深淵尖塔！</p>
      <button class="btn big" data-act="new-run">開啟新旅程</button>
    </div>`;
  }

  // ---------------------------------------------------------------- 牌組檢視
  function renderDeckOverlay() {
    const g = G();
    const cards = g.deck.slice().sort((a, b) => {
      const ta = SPIRE.CARDS[a.key].type, tb = SPIRE.CARDS[b.key].type;
      const order = { attack: 0, skill: 1, power: 2, status: 3, curse: 4 };
      return (order[ta] - order[tb]) || a.key.localeCompare(b.key);
    }).map(c => cardHtml(c, { uid: false })).join('');
    return `<div class="overlay" data-act="close-overlay">
      <div class="overlay-box" data-stop="1">
        <div class="overlay-head"><h3>你的牌組（${g.deck.length} 張）</h3>
          <button class="btn small" data-act="close-overlay">關閉 ✕</button></div>
        <div class="card-choices wrap">${cards}</div>
      </div>
    </div>`;
  }

  // ---------------------------------------------------------------- 事件委派
  function onClick(ev) {
    const t = ev.target.closest('[data-act]');
    if (!t) return;
    const act = t.getAttribute('data-act');
    const Game = SPIRE.Game;
    const idx = (n) => parseInt(t.getAttribute(n), 10);
    switch (act) {
      case 'new-run': overlay = null; sel = { cardUid: null, potionIdx: null }; Game.startNewRun(); break;
      case 'continue': Game.load(); break;
      case 'node': Game.selectNode(t.getAttribute('data-id')); break;

      case 'play': {
        const c = G().combat; const uid = parseInt(t.getAttribute('data-uid'), 10);
        const inst = c.hand.find(x => x.uid === uid);
        if (!inst || !c.canPlay(inst)) return;
        if (c.needsTarget(inst) && c.enemies.filter(e => e.alive).length > 1) {
          sel.cardUid = uid; sel.potionIdx = null; render();
        } else {
          const ti = c.enemies.findIndex(e => e.alive);
          Game.playCard(uid, ti); sel.cardUid = null;
        }
        break;
      }
      case 'target': {
        const ti = idx('data-idx');
        if (sel.cardUid != null) { Game.playCard(sel.cardUid, ti); sel.cardUid = null; }
        else if (sel.potionIdx != null) { Game.useCombatPotion(sel.potionIdx, ti); sel.potionIdx = null; }
        break;
      }
      case 'endturn': sel = { cardUid: null, potionIdx: null }; Game.endTurn(); break;
      case 'use-potion': {
        const i = idx('data-i'); const key = G().potions[i]; const p = SPIRE.POTIONS[key];
        if (p && p.target && G().combat.enemies.filter(e => e.alive).length > 1) { sel.potionIdx = i; sel.cardUid = null; render(); }
        else Game.useCombatPotion(i, G().combat.enemies.findIndex(e => e.alive));
        break;
      }

      case 'reward': Game.takeReward(idx('data-i')); break;
      case 'choose-card': Game.chooseCard(idx('data-i'), t.getAttribute('data-key')); break;
      case 'skip-card': Game.skipCard(idx('data-i')); break;
      case 'leave-rewards': Game.leaveRewards(); break;

      case 'rest-heal': Game.restHeal(); break;
      case 'rest-upgrade': Game.restUpgrade(idx('data-i')); break;

      case 'shop-buy': Game.buyShop(t.getAttribute('data-cat'), idx('data-i')); break;
      case 'shop-remove-mode': G().shopRemoving = !G().shopRemoving; render(); break;
      case 'shop-remove': Game.shopRemove(idx('data-i')); break;
      case 'shop-leave': G().shopRemoving = false; Game.leaveShop(); break;

      case 'event': Game.eventChoice(idx('data-i')); break;

      case 'view-deck': overlay = 'deck'; render(); break;
      case 'close-overlay':
        if (t.getAttribute('data-stop')) return;
        overlay = null; render(); break;
    }
  }

  function init() {
    root = document.getElementById('app');
    root.addEventListener('click', (e) => {
      // 覆蓋層點擊內部不關閉
      if (e.target.closest('[data-stop]') && e.target.closest('[data-act="close-overlay"]') === null) {
        // 允許內部按鈕
      }
      onClick(e);
    });
    // 開機：有存檔顯示標題，否則也顯示標題
    if (SPIRE.state) render(); else renderTitle();
  }

  SPIRE.UI = { render, init, renderTitle };
})(window.SPIRE = window.SPIRE || {});
