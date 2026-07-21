// game.js — 全域狀態、爬塔流程總控、存檔/讀檔
(function (SPIRE) {
  'use strict';

  const SAVE_KEY = 'abyss-spire-save-v1';

  // 玩家血量回復
  SPIRE.heal = function (G, n) { G.hp = Math.min(G.maxHp, G.hp + n); };

  // 起始牌組（鐵衛）
  function starterDeck() {
    const d = [];
    for (let i = 0; i < 5; i++) d.push({ key: 'strike', upgraded: false });
    for (let i = 0; i < 4; i++) d.push({ key: 'defend', upgraded: false });
    d.push({ key: 'bash', upgraded: false });
    return d;
  }

  let G = null;
  SPIRE.getG = () => G;

  const Game = {
    // ---------------------------------------------------------------- 新遊戲
    startNewRun(seed) {
      seed = (seed >>> 0) || SPIRE.randomSeed();
      G = {
        seed,
        rng: new SPIRE.RNG(seed),
        maxHp: 75, hp: 75, gold: 99,
        deck: starterDeck(),
        relics: ['burningBlood'],
        potions: [], maxPotions: 3,
        floor: 0,
        act: 0,
        advanceAct: false,
        screen: 'map',
        combat: null,
        pending: null,
        shop: null,
        event: null,
        removeCost: 75,
        wonAct: false,
        log: [],
      };
      G.map = SPIRE.MapGen.generateMap(G.rng);
      SPIRE.state = G;
      this.save();
      SPIRE.UI.render();
    },

    hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
    save() {
      try {
        const data = {
          seed: G.seed, rngState: G.rng.state(), maxHp: G.maxHp, hp: G.hp, gold: G.gold,
          deck: G.deck, relics: G.relics, potions: G.potions, floor: G.floor,
          screen: G.screen === 'combat' ? 'map' : G.screen, map: G.map,
          removeCost: G.removeCost, shop: G.shop, event: G.event, pending: G.pending,
          act: G.act, advanceAct: G.advanceAct,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch (e) { /* localStorage 不可用時忽略 */ }
    },
    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const d = JSON.parse(raw);
        G = Object.assign({}, d);
        G.rng = new SPIRE.RNG(d.rngState || d.seed);
        G.combat = null;
        if (G.screen === 'combat') G.screen = 'map';
        SPIRE.state = G;
        SPIRE.UI.render();
        return true;
      } catch (e) { return false; }
    },
    clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },

    // ---------------------------------------------------------------- 地圖
    selectNode(id) {
      const avail = SPIRE.MapGen.availableNodes(G.map);
      if (!avail.includes(id)) return;
      const node = SPIRE.MapGen.enterNode(G.map, id);
      G.floor = node.r + 1;
      switch (node.type) {
        case 'monster': this.startCombat(this.pickEncounter(node.r < 3 ? 'easy' : 'normal'), 'normal'); break;
        case 'elite': this.startCombat(this.pickEncounter('elite'), 'elite'); break;
        case 'boss': this.startCombat(this.pickEncounter('boss'), 'boss'); break;
        case 'rest': G.screen = 'rest'; break;
        case 'shop': this.openShop(); break;
        case 'event': this.openEvent(); break;
        case 'treasure': this.openTreasure(); break;
      }
      this.save();
      SPIRE.UI.render();
    },

    pickEncounter(kind) {
      const act = SPIRE.ENCOUNTERS.acts[G.act] || SPIRE.ENCOUNTERS.acts[0];
      return G.rng.pick(act[kind]).slice();
    },

    // ---------------------------------------------------------------- 戰鬥
    startCombat(enemyKeys, kind) {
      const combat = new SPIRE.Combat(G, enemyKeys, kind);
      combat.onEnd = (result) => this.endCombat(result, kind);
      G.combat = combat;
      G.screen = 'combat';
      combat.start();
    },

    // 玩家操作（由 UI 呼叫）
    playCard(uid, targetIdx) {
      const c = G.combat;
      if (!c || c.over) return;
      const inst = c.hand.find(x => x.uid === uid);
      if (!inst) return;
      let target = null;
      if (c.needsTarget(inst)) {
        target = c.enemies[targetIdx];
        if (!target || !target.alive) target = c.enemies.find(e => e.alive);
      }
      if (!c.canPlay(inst)) return;
      c.playCard(inst, target);
      SPIRE.UI.render();
    },
    endTurn() {
      const c = G.combat;
      if (!c || c.over) return;
      c.endPlayerTurn();
      if (!c.over) SPIRE.UI.render();
    },
    useCombatPotion(idx, targetIdx) {
      const c = G.combat;
      if (!c || c.over) return;
      const key = G.potions[idx];
      const p = SPIRE.POTIONS[key];
      if (!p) return;
      const target = p.target ? (c.enemies[targetIdx] || c.enemies.find(e => e.alive)) : null;
      c.usePotion(idx, target);
      SPIRE.UI.render();
    },

    endCombat(result, kind) {
      if (result === 'lose') {
        G.screen = 'gameover';
        this.clearSave();
        SPIRE.UI.render();
        return;
      }
      // Boss 勝利：非最終幕則進入下一宇宙，最終幕則通關
      if (kind === 'boss') {
        const lastAct = G.act >= SPIRE.ENCOUNTERS.acts.length - 1;
        if (lastAct) {
          G.wonAct = true;
          G.screen = 'victory';
          this.clearSave();
          SPIRE.UI.render();
          return;
        }
        this.buildRewards('boss');
        G.advanceAct = true;
        G.combat = null;
        G.screen = 'reward';
        this.save();
        SPIRE.UI.render();
        return;
      }
      // 產生獎勵
      this.buildRewards(kind);
      G.combat = null;
      G.screen = 'reward';
      this.save();
      SPIRE.UI.render();
    },

    buildRewards(kind) {
      const rng = G.rng;
      const rewards = [];
      // 金幣
      const goldRange = kind === 'boss' ? [40, 60] : kind === 'elite' ? [25, 35] : [10, 20];
      const gold = rng.int(goldRange[0], goldRange[1]);
      rewards.push({ type: 'gold', amount: gold });
      // 藥水（戰後機率）
      if (rng.random() < (kind === 'boss' ? 0.7 : kind === 'elite' ? 0.6 : 0.4) && G.potions.length < G.maxPotions) {
        rewards.push({ type: 'potion', key: rng.pick(Object.keys(SPIRE.POTIONS)) });
      }
      // 遺物（精英/道主必掉）
      if (kind === 'elite' || kind === 'boss') {
        const relic = this.rollRelic(kind === 'boss' ? ['boss', 'uncommon'] : ['uncommon', 'common']);
        if (relic) rewards.push({ type: 'relic', key: relic });
      }
      // 卡牌三選一
      rewards.push({ type: 'card', options: this.rollCardChoices(3, kind === 'boss' ? 2 : kind === 'elite' ? 1 : 0) });
      G.pending = { rewards, taken: [] };
    },

    rollCardChoices(count, boost) {
      const rng = G.rng;
      const chosen = [];
      const pool = SPIRE.REWARD_POOL;
      for (let i = 0; i < count; i++) {
        let r = rng.random() + boost * 0.05;
        let tier = r < 0.04 ? 'rare' : (r < 0.40 ? 'uncommon' : 'common');
        let tries = 0, key;
        do {
          key = rng.pick(pool[tier]);
          tries++;
        } while (chosen.includes(key) && tries < 20);
        chosen.push(key);
      }
      return chosen.map(k => ({ key: k, upgraded: false }));
    },

    rollRelic(tiers) {
      const owned = new Set(G.relics);
      const candidates = Object.keys(SPIRE.RELICS).filter(k => {
        const R = SPIRE.RELICS[k];
        return !owned.has(k) && R.rarity !== 'starter' && tiers.includes(R.rarity);
      });
      const any = Object.keys(SPIRE.RELICS).filter(k => !owned.has(k) && SPIRE.RELICS[k].rarity !== 'starter');
      const list = candidates.length ? candidates : any;
      return list.length ? G.rng.pick(list) : null;
    },

    takeReward(index) {
      const p = G.pending;
      if (!p) return;
      const r = p.rewards[index];
      if (!r || r.taken) return;
      if (r.type === 'gold') { G.gold += r.amount; r.taken = true; }
      else if (r.type === 'potion') {
        if (G.potions.length < G.maxPotions) { G.potions.push(r.key); r.taken = true; }
      } else if (r.type === 'relic') { this.gainRelic(r.key); r.taken = true; }
      // 卡牌獎勵透過 chooseCard 處理
      this.save();
      SPIRE.UI.render();
    },
    chooseCard(index, cardKey) {
      const p = G.pending;
      const r = p.rewards[index];
      if (!r || r.type !== 'card' || r.taken) return;
      const opt = r.options.find(o => o.key === cardKey);
      if (opt) { G.deck.push({ key: opt.key, upgraded: !!opt.upgraded }); r.taken = true; }
      this.save();
      SPIRE.UI.render();
    },
    skipCard(index) {
      const r = G.pending.rewards[index];
      if (r && r.type === 'card') { r.taken = true; this.save(); SPIRE.UI.render(); }
    },
    leaveRewards() {
      G.pending = null;
      if (G.advanceAct) { G.advanceAct = false; this.startAct(G.act + 1); }
      else { G.screen = 'map'; }
      this.save(); SPIRE.UI.render();
    },
    startAct(i) {
      G.act = i;
      G.floor = 0;
      G.map = SPIRE.MapGen.generateMap(G.rng);
      G.screen = 'map';
    },

    gainRelic(key) {
      if (!G.relics.includes(key)) {
        G.relics.push(key);
        // 立即生效型（例如加最大血）可在此擴充
      }
    },

    // ---------------------------------------------------------------- 寶箱
    openTreasure() {
      const relic = this.rollRelic(['common', 'uncommon']);
      G.pending = { rewards: [], taken: [] };
      if (relic) G.pending.rewards.push({ type: 'relic', key: relic });
      G.pending.rewards.push({ type: 'gold', amount: G.rng.int(25, 45) });
      G.screen = 'reward';
    },

    // ---------------------------------------------------------------- 營火
    restHeal() {
      let amt = Math.floor(G.maxHp * 0.3);
      if (G.relics.includes('regalPillow')) amt += 15;
      SPIRE.heal(G, amt);
      G.screen = 'map';
      this.save(); SPIRE.UI.render();
    },
    restUpgrade(index) {
      const c = G.deck[index];
      if (c && this.canUpgrade(c)) c.upgraded = true;
      G.screen = 'map';
      this.save(); SPIRE.UI.render();
    },
    canUpgrade(c) {
      const def = SPIRE.CARDS[c.key];
      return !c.upgraded && def.upg && Object.keys(def.upg).length > 0 && def.rarity !== 'special';
    },

    // ---------------------------------------------------------------- 商店
    openShop() {
      const rng = G.rng;
      const cardKeys = rng.sample([].concat(SPIRE.REWARD_POOL.common, SPIRE.REWARD_POOL.uncommon, SPIRE.REWARD_POOL.rare), 5);
      const cards = cardKeys.map(k => {
        const rar = SPIRE.CARDS[k].rarity;
        const price = rar === 'rare' ? rng.int(135, 165) : rar === 'uncommon' ? rng.int(70, 110) : rng.int(45, 70);
        return { key: k, price, sold: false };
      });
      const relics = [];
      for (let i = 0; i < 2; i++) {
        const rk = this.rollRelic(['common', 'uncommon', 'boss']);
        if (rk) relics.push({ key: rk, price: rng.int(140, 220), sold: false });
      }
      const potions = [];
      for (let i = 0; i < 3; i++) {
        potions.push({ key: rng.pick(Object.keys(SPIRE.POTIONS)), price: rng.int(40, 70), sold: false });
      }
      G.shop = { cards, relics, potions };
      G.screen = 'shop';
    },
    buyShop(cat, index) {
      const s = G.shop; if (!s) return;
      const item = s[cat][index];
      if (!item || item.sold || G.gold < item.price) return;
      if (cat === 'potions' && G.potions.length >= G.maxPotions) return;
      G.gold -= item.price;
      item.sold = true;
      if (cat === 'cards') G.deck.push({ key: item.key, upgraded: false });
      else if (cat === 'relics') this.gainRelic(item.key);
      else if (cat === 'potions') G.potions.push(item.key);
      this.save(); SPIRE.UI.render();
    },
    shopRemove(index) {
      if (G.gold < G.removeCost) return;
      if (G.deck.length <= 1) return;
      G.gold -= G.removeCost;
      G.removeCost += 25;
      G.deck.splice(index, 1);
      G.shopRemoving = false;
      this.save(); SPIRE.UI.render();
    },
    leaveShop() { G.shop = null; G.screen = 'map'; this.save(); SPIRE.UI.render(); },

    // ---------------------------------------------------------------- 事件
    openEvent() {
      G.event = G.rng.pick(SPIRE.EVENTS)();
      G.screen = 'event';
    },
    eventChoice(index) {
      const ev = G.event;
      const opt = ev.options[index];
      if (!opt) return;
      const msg = opt.effect(G) || '';
      if (opt.end !== false) { G.event = null; G.screen = 'map'; }
      else { ev.result = msg; }
      this.save(); SPIRE.UI.render();
    },

    // ---------------------------------------------------------------- 其他
    toTitle() { G.screen = 'title'; SPIRE.UI.render(); },
  };

  // 隨機事件庫
  SPIRE.EVENTS = [
    () => ({
      title: '神秘祭壇',
      text: '一座散發微光的祭壇。你可以獻祭生命以換取力量。',
      options: [
        { label: '獻祭 8 點生命，獲得遺物', effect: (G) => { G.hp = Math.max(1, G.hp - 8); const r = Game.rollRelic(['common', 'uncommon']); if (r) { Game.gainRelic(r); return '你獲得了 ' + SPIRE.RELICS[r].name + '。'; } return '祭壇沉寂了。'; } },
        { label: '離開', effect: () => '你謹慎地離開了。' },
      ],
    }),
    () => ({
      title: '受傷的旅人',
      text: '一名旅人倒在路旁，你可以幫助他，或搜刮他的財物。',
      options: [
        { label: '幫助他（回復 15 生命）', effect: (G) => { SPIRE.heal(G, 15); return '旅人感激地離去，你感到一陣暖意。'; } },
        { label: '搜刮財物（獲得 30 金幣）', effect: (G) => { G.gold += 30; return '你拿走了他的錢袋。'; } },
      ],
    }),
    () => ({
      title: '古老的圖書館',
      text: '書架上散落著知識。你可以升級一張卡牌，或帶走一瓶藥水。',
      options: [
        { label: '升級一張隨機卡牌', effect: (G) => { const up = G.deck.filter(c => Game.canUpgrade(c)); if (up.length) { G.rng.pick(up).upgraded = true; return '一張卡牌被強化了。'; } return '沒有可升級的卡牌。'; } },
        { label: '帶走藥水', effect: (G) => { if (G.potions.length < G.maxPotions) { G.potions.push(G.rng.pick(Object.keys(SPIRE.POTIONS))); return '你獲得了一瓶藥水。'; } return '你的藥水欄已滿。'; } },
      ],
    }),
    () => ({
      title: '賭徒的骰子',
      text: '一名神秘賭徒邀你擲骰。賭上 30 金幣，贏則翻倍，輸則全失。',
      options: [
        { label: '下注 30 金幣', effect: (G) => { if (G.gold < 30) return '你的金幣不足。'; if (G.rng.random() < 0.5) { G.gold += 30; return '你贏了！獲得 60 金幣。'; } G.gold -= 30; return '你輸了 30 金幣。'; } },
        { label: '拒絕', effect: () => '你婉拒了。' },
      ],
    }),
  ];

  SPIRE.Game = Game;
})(window.SPIRE = window.SPIRE || {});
