// data.js — 遊戲資料庫：卡牌 / 遺物 / 藥水 / 敵人 / 遭遇
// onPlay(C, v, target)：C = 戰鬥 API（見 combat.js），v = 解析後數值，target = 目標敵人
(function (SPIRE) {
  'use strict';

  // ---------------------------------------------------------------------------
  // 卡牌資料庫
  // base：基礎數值；upg：升級後覆蓋的欄位（含 cost / name）
  // ---------------------------------------------------------------------------
  const CARDS = {
    // ---- 起始牌 ----
    strike: {
      name: '打擊', type: 'attack', cost: 1, rarity: 'starter', target: 'enemy',
      base: { dmg: 6 }, upg: { dmg: 9 }, tags: ['strike'],
      text: v => `造成 <b>${v.dmg}</b> 點傷害。`,
      onPlay: (C, v, t) => C.attack(t, v.dmg),
    },
    defend: {
      name: '防禦', type: 'skill', cost: 1, rarity: 'starter', target: 'self',
      base: { block: 5 }, upg: { block: 8 },
      text: v => `獲得 <b>${v.block}</b> 點格擋。`,
      onPlay: (C, v) => C.block(v.block),
    },
    bash: {
      name: '重擊', type: 'attack', cost: 2, rarity: 'starter', target: 'enemy',
      base: { dmg: 8, vuln: 2 }, upg: { dmg: 10, vuln: 3 }, tags: ['strike'],
      text: v => `造成 <b>${v.dmg}</b> 點傷害，施加 <b>${v.vuln}</b> 層易傷。`,
      onPlay: (C, v, t) => { C.attack(t, v.dmg); C.status(t, 'vulnerable', v.vuln); },
    },

    // ---- 攻擊 ----
    cleave: {
      name: '橫掃', type: 'attack', cost: 1, rarity: 'common', target: 'all',
      base: { dmg: 8 }, upg: { dmg: 11 },
      text: v => `對<b>所有</b>敵人造成 <b>${v.dmg}</b> 點傷害。`,
      onPlay: (C, v) => C.attackAll(v.dmg),
    },
    clothesline: {
      name: '勾拳', type: 'attack', cost: 2, rarity: 'common', target: 'enemy',
      base: { dmg: 12, weak: 2 }, upg: { dmg: 14, weak: 3 },
      text: v => `造成 <b>${v.dmg}</b> 點傷害，施加 <b>${v.weak}</b> 層虛弱。`,
      onPlay: (C, v, t) => { C.attack(t, v.dmg); C.status(t, 'weak', v.weak); },
    },
    pommelStrike: {
      name: '柄擊', type: 'attack', cost: 1, rarity: 'common', target: 'enemy',
      base: { dmg: 9, draw: 1 }, upg: { dmg: 10, draw: 2 }, tags: ['strike'],
      text: v => `造成 <b>${v.dmg}</b> 點傷害，抽 <b>${v.draw}</b> 張牌。`,
      onPlay: (C, v, t) => { C.attack(t, v.dmg); C.draw(v.draw); },
    },
    ironWave: {
      name: '鐵浪', type: 'attack', cost: 1, rarity: 'common', target: 'enemy',
      base: { dmg: 5, block: 5 }, upg: { dmg: 7, block: 7 },
      text: v => `獲得 <b>${v.block}</b> 點格擋，造成 <b>${v.dmg}</b> 點傷害。`,
      onPlay: (C, v, t) => { C.block(v.block); C.attack(t, v.dmg); },
    },
    twinStrike: {
      name: '雙擊', type: 'attack', cost: 1, rarity: 'common', target: 'enemy',
      base: { dmg: 5 }, upg: { dmg: 7 },
      text: v => `造成 <b>${v.dmg}</b> 點傷害 <b>2</b> 次。`,
      onPlay: (C, v, t) => { C.attack(t, v.dmg); C.attack(t, v.dmg); },
    },
    bodySlam: {
      name: '迴身重擊', type: 'attack', cost: 1, rarity: 'common', target: 'enemy',
      base: {}, upg: { cost: 0 },
      text: () => `造成等同你<b>當前格擋值</b>的傷害。`,
      onPlay: (C, v, t) => C.attack(t, C.player.block),
    },
    anger: {
      name: '憤怒', type: 'attack', cost: 0, rarity: 'common', target: 'enemy',
      base: { dmg: 6 }, upg: { dmg: 8 }, tags: ['strike'],
      text: v => `造成 <b>${v.dmg}</b> 點傷害，將一張本卡複製到棄牌堆。`,
      onPlay: (C, v, t) => { C.attack(t, v.dmg); C.addCard('anger', 'discard'); },
    },
    heavyBlade: {
      name: '重刃', type: 'attack', cost: 2, rarity: 'uncommon', target: 'enemy',
      base: { dmg: 14, mult: 3 }, upg: { dmg: 14, mult: 5 },
      text: v => `造成 <b>${v.dmg}</b> 點傷害，你的<b>力量</b>對本牌生效 <b>${v.mult}</b> 倍。`,
      onPlay: (C, v, t) => C.attack(t, v.dmg + C.get(C.player, 'strength') * (v.mult - 1)),
    },
    perfectedStrike: {
      name: '完美打擊', type: 'attack', cost: 2, rarity: 'uncommon', target: 'enemy',
      base: { dmg: 6, per: 2 }, upg: { dmg: 6, per: 3 }, tags: ['strike'],
      text: v => `造成 <b>${v.dmg}</b> 點傷害，每有一張含「打擊」的牌額外 <b>+${v.per}</b>。`,
      onPlay: (C, v, t) => C.attack(t, v.dmg + v.per * C.countTag('strike')),
    },
    pummel: {
      name: '連拳', type: 'attack', cost: 1, rarity: 'uncommon', target: 'enemy', exhaust: true,
      base: { dmg: 2, times: 4 }, upg: { dmg: 2, times: 5 },
      text: v => `造成 <b>${v.dmg}</b> 點傷害 <b>${v.times}</b> 次。<span class="kw">消耗</span>`,
      onPlay: (C, v, t) => { for (let i = 0; i < v.times; i++) C.attack(t, v.dmg); },
    },
    wildStrike: {
      name: '亂擊', type: 'attack', cost: 1, rarity: 'common', target: 'enemy',
      base: { dmg: 12 }, upg: { dmg: 17 },
      text: v => `造成 <b>${v.dmg}</b> 點傷害，將一張<b>傷口</b>洗入抽牌堆。`,
      onPlay: (C, v, t) => { C.attack(t, v.dmg); C.addCard('wound', 'draw'); },
    },

    // ---- 技能 ----
    shrugItOff: {
      name: '甩開', type: 'skill', cost: 1, rarity: 'common', target: 'self',
      base: { block: 8, draw: 1 }, upg: { block: 11, draw: 1 },
      text: v => `獲得 <b>${v.block}</b> 點格擋，抽 <b>${v.draw}</b> 張牌。`,
      onPlay: (C, v) => { C.block(v.block); C.draw(v.draw); },
    },
    flex: {
      name: '屈伸', type: 'skill', cost: 0, rarity: 'common', target: 'self',
      base: { str: 2 }, upg: { str: 4 },
      text: v => `獲得 <b>${v.str}</b> 點力量。`,
      onPlay: (C, v) => C.status(C.player, 'strength', v.str),
    },
    trueGrit: {
      name: '硬撐', type: 'skill', cost: 1, rarity: 'common', target: 'self',
      base: { block: 7 }, upg: { block: 9 },
      text: v => `獲得 <b>${v.block}</b> 點格擋，隨機<span class="kw">消耗</span>一張手牌。`,
      onPlay: (C, v) => { C.block(v.block); C.exhaustRandom(1); },
    },
    armaments: {
      name: '武裝', type: 'skill', cost: 1, rarity: 'common', target: 'self',
      base: { block: 5, all: false }, upg: { block: 5, all: true },
      text: v => `獲得 <b>${v.block}</b> 點格擋，升級${v.all ? '<b>所有</b>手牌' : '一張手牌'}（本場戰鬥）。`,
      onPlay: (C, v) => { C.block(v.block); C.upgradeInHand(v.all); },
    },
    ghostlyArmor: {
      name: '幽靈護甲', type: 'skill', cost: 1, rarity: 'uncommon', target: 'self', ethereal: true,
      base: { block: 10 }, upg: { block: 13 },
      text: v => `<span class="kw">虛無</span>。獲得 <b>${v.block}</b> 點格擋。`,
      onPlay: (C, v) => C.block(v.block),
    },
    disarm: {
      name: '繳械', type: 'skill', cost: 1, rarity: 'uncommon', target: 'enemy', exhaust: true,
      base: { str: 2 }, upg: { str: 3 },
      text: v => `使目標失去 <b>${v.str}</b> 點力量。<span class="kw">消耗</span>`,
      onPlay: (C, v, t) => C.status(t, 'strength', -v.str),
    },
    secondWind: {
      name: '喘息', type: 'skill', cost: 1, rarity: 'uncommon', target: 'self',
      base: { block: 5 }, upg: { block: 7 },
      text: v => `<span class="kw">消耗</span>所有非攻擊牌，每張獲得 <b>${v.block}</b> 點格擋。`,
      onPlay: (C, v) => C.exhaustNonAttacksForBlock(v.block),
    },
    battleTrance: {
      name: '戰鬥恍惚', type: 'skill', cost: 0, rarity: 'uncommon', target: 'self',
      base: { draw: 3 }, upg: { draw: 4 },
      text: v => `抽 <b>${v.draw}</b> 張牌，本回合無法再抽牌。`,
      onPlay: (C, v) => { C.draw(v.draw); C.noDrawThisTurn(); },
    },
    entrench: {
      name: '掘壕', type: 'skill', cost: 2, rarity: 'uncommon', target: 'self',
      base: {}, upg: { cost: 1 },
      text: () => `使你當前的<b>格擋加倍</b>。`,
      onPlay: (C) => C.block(C.player.block),
    },
    bloodletting: {
      name: '放血', type: 'skill', cost: 0, rarity: 'uncommon', target: 'self',
      base: { energy: 2 }, upg: { energy: 3 },
      text: v => `失去 <b>3</b> 點生命，獲得 <b>${v.energy}</b> 點能量。`,
      onPlay: (C, v) => { C.loseHp(3); C.gainEnergy(v.energy); },
    },
    shockwave: {
      name: '震盪波', type: 'skill', cost: 2, rarity: 'uncommon', target: 'all', exhaust: true,
      base: { n: 3 }, upg: { n: 5 },
      text: v => `對所有敵人施加 <b>${v.n}</b> 層虛弱與 <b>${v.n}</b> 層易傷。<span class="kw">消耗</span>`,
      onPlay: (C, v) => C.enemies.forEach(e => { if (e.alive) { C.status(e, 'weak', v.n); C.status(e, 'vulnerable', v.n); } }),
    },

    // ---- 能力 ----
    inflame: {
      name: '怒火', type: 'power', cost: 1, rarity: 'uncommon', target: 'self',
      base: { str: 2 }, upg: { str: 3 },
      text: v => `獲得 <b>${v.str}</b> 點力量。`,
      onPlay: (C, v) => C.status(C.player, 'strength', v.str),
    },
    metallicize: {
      name: '金屬化', type: 'power', cost: 1, rarity: 'uncommon', target: 'self',
      base: { n: 3 }, upg: { n: 4 },
      text: v => `每回合結束時獲得 <b>${v.n}</b> 點格擋。`,
      onPlay: (C, v) => C.power('metallicize', v.n),
    },
    feelNoPain: {
      name: '無視痛楚', type: 'power', cost: 1, rarity: 'uncommon', target: 'self',
      base: { n: 3 }, upg: { n: 4 },
      text: v => `每當一張牌被<span class="kw">消耗</span>，獲得 <b>${v.n}</b> 點格擋。`,
      onPlay: (C, v) => C.power('feelNoPain', v.n),
    },
    demonForm: {
      name: '惡魔形態', type: 'power', cost: 3, rarity: 'rare', target: 'self',
      base: { n: 2 }, upg: { n: 3 },
      text: v => `每回合開始時獲得 <b>${v.n}</b> 點力量。`,
      onPlay: (C, v) => C.power('demonForm', v.n),
    },
    barricade: {
      name: '壁壘', type: 'power', cost: 3, rarity: 'rare', target: 'self',
      base: {}, upg: { cost: 2 },
      text: () => `你的<b>格擋</b>在回合開始時不再消失。`,
      onPlay: (C) => C.power('barricade', 1),
    },
    juggernaut: {
      name: '巨獸', type: 'power', cost: 2, rarity: 'rare', target: 'self',
      base: { n: 5 }, upg: { n: 7 },
      text: v => `每當你獲得格擋，對隨機敵人造成 <b>${v.n}</b> 點傷害。`,
      onPlay: (C, v) => C.power('juggernaut', v.n),
    },

    // ---- 狀態 / 詛咒（負面牌）----
    wound: {
      name: '傷口', type: 'status', cost: -1, rarity: 'special', target: 'none', unplayable: true,
      base: {}, upg: {},
      text: () => `<span class="bad">無法打出。</span>`,
    },
    dazed: {
      name: '眩暈', type: 'status', cost: -1, rarity: 'special', target: 'none', unplayable: true, ethereal: true,
      base: {}, upg: {},
      text: () => `<span class="kw">虛無</span>。<span class="bad">無法打出。</span>`,
    },
    burn: {
      name: '灼傷', type: 'status', cost: -1, rarity: 'special', target: 'none', unplayable: true,
      base: { dmg: 2 }, upg: { dmg: 4 },
      text: v => `<span class="bad">無法打出。回合結束時受到 ${v.dmg} 點傷害。</span>`,
    },
  };

  // ---------------------------------------------------------------------------
  // 遺物資料庫
  // hooks：onCombatStart / onTurnStart / onCombatEnd / onRestSite / passive...
  // ---------------------------------------------------------------------------
  const RELICS = {
    burningBlood: {
      name: '燃燒之血', rarity: 'starter',
      desc: '每場戰鬥結束後回復 6 點生命。',
      onCombatEnd: (G) => SPIRE.heal(G, 6),
    },
    akabeko: {
      name: '赤斑牛', rarity: 'common',
      desc: '每場戰鬥第一張攻擊牌額外造成 8 點傷害。',
      onCombatStart: (C) => { C.player.vigor = 8; },
    },
    anchor: {
      name: '船錨', rarity: 'common',
      desc: '每場戰鬥開始時獲得 10 點格擋。',
      onCombatStart: (C) => C.block(10),
    },
    bag: {
      name: '準備之袋', rarity: 'common',
      desc: '每場戰鬥開始時額外抽 2 張牌（僅第一回合）。',
      onCombatStart: (C) => { C.extraFirstDraw = (C.extraFirstDraw || 0) + 2; },
    },
    vajra: {
      name: '金剛杵', rarity: 'common',
      desc: '每場戰鬥開始時獲得 1 點力量。',
      onCombatStart: (C) => C.status(C.player, 'strength', 1),
    },
    oddlySmoothStone: {
      name: '光滑石', rarity: 'common',
      desc: '每場戰鬥開始時獲得 1 點敏捷。',
      onCombatStart: (C) => C.status(C.player, 'dexterity', 1),
    },
    bloodVial: {
      name: '血瓶', rarity: 'common',
      desc: '每場戰鬥開始時回復 2 點生命。',
      onCombatStart: (C) => SPIRE.heal(C.G, 2),
    },
    pocketwatch: {
      name: '懷錶', rarity: 'uncommon',
      desc: '若某回合打出 3 張以下的牌，下回合多抽 3 張。',
      // 於 combat.js 內處理
    },
    kunai: {
      name: '苦無', rarity: 'uncommon',
      desc: '每回合打出第 3 張攻擊牌時獲得 1 點敏捷。',
    },
    letterOpener: {
      name: '拆信刀', rarity: 'uncommon',
      desc: '每回合打出第 3 張技能牌時對所有敵人造成 5 點傷害。',
    },
    bronzeScales: {
      name: '青銅鱗片', rarity: 'common',
      desc: '每當受到傷害，對來源反彈 3 點傷害（荊棘）。',
      onCombatStart: (C) => { C.player.thorns = (C.player.thorns || 0) + 3; },
    },
    meatOnTheBone: {
      name: '帶肉之骨', rarity: 'uncommon',
      desc: '戰鬥結束時若生命低於一半，回復 12 點生命。',
      onCombatEnd: (G) => { if (G.hp <= G.maxHp / 2) SPIRE.heal(G, 12); },
    },
    maw: {
      name: '血肉之口', rarity: 'boss',
      desc: '每場戰鬥開始時獲得 3 點力量與 3 點敏捷。',
      onCombatStart: (C) => { C.status(C.player, 'strength', 3); C.status(C.player, 'dexterity', 3); },
    },
    energyCore: {
      name: '能量核心', rarity: 'boss',
      desc: '每回合多獲得 1 點能量。',
    },
    regalPillow: {
      name: '華麗枕頭', rarity: 'common',
      desc: '在營火休息時多回復 15 點生命。',
    },
  };

  // ---------------------------------------------------------------------------
  // 藥水資料庫
  // ---------------------------------------------------------------------------
  const POTIONS = {
    heal: { name: '治療藥水', desc: '回復 20% 最大生命。', combat: false,
      use: (G, C) => SPIRE.heal(G, Math.floor(G.maxHp * 0.2)) },
    fire: { name: '烈焰藥水', desc: '對目標造成 20 點傷害。', combat: true, target: true,
      use: (G, C, t) => C.attack(t, 20) },
    block: { name: '格擋藥水', desc: '獲得 12 點格擋。', combat: true,
      use: (G, C) => C.block(12) },
    strength: { name: '力量藥水', desc: '獲得 2 點力量。', combat: true,
      use: (G, C) => C.status(C.player, 'strength', 2) },
    energy: { name: '能量藥水', desc: '獲得 2 點能量。', combat: true,
      use: (G, C) => C.gainEnergy(2) },
    swift: { name: '迅捷藥水', desc: '抽 3 張牌。', combat: true,
      use: (G, C) => C.draw(3) },
    weak: { name: '虛弱藥水', desc: '對目標施加 3 層虛弱。', combat: true, target: true,
      use: (G, C, t) => C.status(t, 'weak', 3) },
    fear: { name: '恐懼藥水', desc: '對目標施加 3 層易傷。', combat: true, target: true,
      use: (G, C, t) => C.status(t, 'vulnerable', 3) },
  };

  // ---------------------------------------------------------------------------
  // 敵人資料庫
  // moves：AI 由 chooseMove(rng, self, turn) 決定；move.run(C, self) 執行
  // 意圖顯示：intent + baseDmg(每次) + times，UI 依即時狀態計算最終數字
  // ---------------------------------------------------------------------------
  function mv(o) { return o; }

  const ENEMIES = {
    louse: {
      name: '綠蟲', hp: [10, 15],
      init: (e, rng) => { e.statuses.curlUp = rng.int(3, 7); }, // 首次受傷獲得格擋
      chooseMove(rng, e, turn) {
        if (rng.random() < 0.75)
          return mv({ name: '啃咬', intent: 'attack', baseDmg: rng.int(5, 7), times: 1, run: (C, s) => C.enemyAttack(s, C._m.baseDmg) });
        return mv({ name: '蓄力', intent: 'buff', run: (C, s) => C.status(s, 'strength', 3) });
      },
    },
    jawWorm: {
      name: '顎蟲', hp: [40, 44],
      chooseMove(rng, e, turn) {
        if (turn === 0) return mv({ name: '猛咬', intent: 'attack', baseDmg: 11, times: 1, run: (C, s) => C.enemyAttack(s, 11) });
        const r = rng.random();
        if (r < 0.45) return mv({ name: '猛咬', intent: 'attack', baseDmg: 11, times: 1, run: (C, s) => C.enemyAttack(s, 11) });
        if (r < 0.75) return mv({ name: '猛揮', intent: 'attack_defend', baseDmg: 7, times: 1, run: (C, s) => { C.enemyAttack(s, 7); C.enemyBlock(s, 5); } });
        return mv({ name: '咆哮', intent: 'buff', run: (C, s) => { C.status(s, 'strength', 3); C.enemyBlock(s, 6); } });
      },
    },
    cultist: {
      name: '邪教徒', hp: [48, 54],
      chooseMove(rng, e, turn) {
        if (turn === 0) return mv({ name: '祝禱', intent: 'buff', run: (C, s) => C.power2(s, 'ritual', 3) });
        return mv({ name: '暗擊', intent: 'attack', baseDmg: 6, times: 1, run: (C, s) => C.enemyAttack(s, 6) });
      },
    },
    fungiBeast: {
      name: '真菌獸', hp: [22, 28],
      chooseMove(rng, e, turn) {
        if (rng.random() < 0.6)
          return mv({ name: '啃咬', intent: 'attack', baseDmg: 6, times: 1, run: (C, s) => C.enemyAttack(s, 6) });
        return mv({ name: '生長', intent: 'buff', run: (C, s) => C.status(s, 'strength', 4) });
      },
    },
    slime: {
      name: '酸性史萊姆', hp: [28, 32],
      chooseMove(rng, e, turn) {
        const r = rng.random();
        if (r < 0.5) return mv({ name: '撕咬', intent: 'attack', baseDmg: 9, times: 1, run: (C, s) => C.enemyAttack(s, 9) });
        if (r < 0.75) return mv({ name: '腐蝕黏液', intent: 'debuff', run: (C, s) => C.addCard('wound', 'discard') });
        return mv({ name: '重砸', intent: 'attack', baseDmg: 12, times: 1, run: (C, s) => C.enemyAttack(s, 12) });
      },
    },

    // ---- 精英 ----
    gremlinNob: {
      name: '哥布林貴族', hp: [82, 86], elite: true,
      chooseMove(rng, e, turn) {
        if (turn === 0) return mv({ name: '咆哮', intent: 'buff', run: (C, s) => { s.enrage = 2; } });
        if (turn % 3 === 0) return mv({ name: '頭槌', intent: 'attack_debuff', baseDmg: 6, times: 1, run: (C, s) => { C.enemyAttack(s, 6); C.status(C.player, 'vulnerable', 2); } });
        return mv({ name: '猛衝', intent: 'attack', baseDmg: 14, times: 1, run: (C, s) => C.enemyAttack(s, 14) });
      },
    },
    sentry: {
      name: '哨衛', hp: [38, 42], elite: true,
      chooseMove(rng, e, turn) {
        if (turn % 2 === 0) return mv({ name: '光束', intent: 'attack', baseDmg: 9, times: 1, run: (C, s) => C.enemyAttack(s, 9) });
        return mv({ name: '干擾', intent: 'debuff', run: (C, s) => C.addCard('dazed', 'discard') });
      },
    },
    lagavulin: {
      name: '沉睡巨獸', hp: [105, 112], elite: true,
      chooseMove(rng, e, turn) {
        if (turn < 3) return mv({ name: '沉睡', intent: 'sleep', run: (C, s) => C.enemyBlock(s, 8) });
        if (turn % 3 === 0) return mv({ name: '削弱', intent: 'debuff', run: (C, s) => { C.status(C.player, 'strength', -1); C.status(C.player, 'dexterity', -1); } });
        return mv({ name: '重擊', intent: 'attack', baseDmg: 18, times: 1, run: (C, s) => C.enemyAttack(s, 18) });
      },
    },

    // ---- Boss ----
    guardian: {
      name: '尖塔守衛', hp: [230, 230], boss: true,
      init: (e) => { e.mode = 'offense'; e.dmgTaken = 0; },
      chooseMove(rng, e, turn) {
        if (e.mode === 'defense') {
          return mv({ name: '進入防禦', intent: 'defend_buff', run: (C, s) => { C.enemyBlock(s, 20); s.sharpHorn = true; } });
        }
        const seq = turn % 4;
        if (seq === 0) return mv({ name: '猛擊', intent: 'attack', baseDmg: 32, times: 1, run: (C, s) => C.enemyAttack(s, 32) });
        if (seq === 1) return mv({ name: '狂捲', intent: 'attack', baseDmg: 5, times: 3, run: (C, s) => { for (let i = 0; i < 3; i++) C.enemyAttack(s, 5); } });
        if (seq === 2) return mv({ name: '重摔', intent: 'attack_debuff', baseDmg: 9, times: 1, run: (C, s) => { C.enemyAttack(s, 9); C.status(C.player, 'weak', 2); } });
        return mv({ name: '尖刺', intent: 'buff', run: (C, s) => { C.status(s, 'strength', 3); C.enemyBlock(s, 8); } });
      },
      onDamaged: (C, e, amt) => {
        // 受到 40 點傷害切換為防禦形態；防禦形態被破則反擊
        if (e.mode === 'offense') {
          e.dmgTaken += amt;
          if (e.dmgTaken >= 40) { e.mode = 'defense'; e.dmgTaken = 0; }
        }
      },
    },
    slimeBoss: {
      name: '史萊姆之王', hp: [150, 150], boss: true,
      chooseMove(rng, e, turn) {
        const seq = turn % 3;
        if (seq === 0) return mv({ name: '黏液', intent: 'debuff', run: (C, s) => { C.addCard('slimed', 'discard'); C.addCard('slimed', 'discard'); C.addCard('slimed', 'discard'); } });
        if (seq === 1) return mv({ name: '準備', intent: 'unknown', run: () => {} });
        return mv({ name: '重壓', intent: 'attack', baseDmg: 35, times: 1, run: (C, s) => C.enemyAttack(s, 35) });
      },
    },
  };

  // 補一張 Boss 用狀態牌
  CARDS.slimed = {
    name: '黏液', type: 'status', cost: 1, rarity: 'special', target: 'none', exhaust: true,
    base: {}, upg: {},
    text: () => `<span class="kw">消耗</span>。<span class="bad">打出以移除。</span>`,
    onPlay: () => {},
  };

  // ---------------------------------------------------------------------------
  // 遭遇表（單幕 MVP）
  // ---------------------------------------------------------------------------
  const ENCOUNTERS = {
    easy: [
      ['louse', 'louse'],
      ['jawWorm'],
      ['fungiBeast', 'louse'],
      ['slime'],
    ],
    normal: [
      ['louse', 'louse', 'louse'],
      ['cultist'],
      ['jawWorm', 'fungiBeast'],
      ['slime', 'louse'],
      ['cultist', 'louse'],
    ],
    elite: [
      ['gremlinNob'],
      ['lagavulin'],
      ['sentry', 'sentry', 'sentry'],
    ],
    boss: [
      ['guardian'],
      ['slimeBoss'],
    ],
  };

  // 卡牌獎勵池
  const REWARD_POOL = {
    common: ['cleave', 'clothesline', 'pommelStrike', 'ironWave', 'twinStrike', 'bodySlam', 'anger', 'wildStrike', 'shrugItOff', 'flex', 'trueGrit', 'armaments'],
    uncommon: ['heavyBlade', 'perfectedStrike', 'pummel', 'ghostlyArmor', 'disarm', 'secondWind', 'battleTrance', 'entrench', 'bloodletting', 'shockwave', 'inflame', 'metallicize', 'feelNoPain'],
    rare: ['demonForm', 'barricade', 'juggernaut'],
  };

  SPIRE.CARDS = CARDS;
  SPIRE.RELICS = RELICS;
  SPIRE.POTIONS = POTIONS;
  SPIRE.ENEMIES = ENEMIES;
  SPIRE.ENCOUNTERS = ENCOUNTERS;
  SPIRE.REWARD_POOL = REWARD_POOL;
})(window.SPIRE = window.SPIRE || {});
