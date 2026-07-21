// combat.js — 戰鬥引擎：回合流程、牌堆、出牌、傷害/格擋/狀態、敵人 AI 與意圖
(function (SPIRE) {
  'use strict';

  let UID = 1;
  const nextUid = () => UID++;

  // 會隨回合遞減的減益
  const DECAY = ['vulnerable', 'weak'];

  function makeCardInstance(key, upgraded) {
    return { key, upgraded: !!upgraded, uid: nextUid() };
  }

  // 解析卡牌即時數值（合併 base 與升級覆蓋）
  function resolveCard(inst) {
    const def = SPIRE.CARDS[inst.key];
    const v = Object.assign({}, def.base, inst.upgraded ? def.upg : {});
    const cost = (inst.upgraded && def.upg && def.upg.cost !== undefined) ? def.upg.cost
      : (def.cost !== undefined ? def.cost : 1);
    return { def, v, cost, name: def.name + (inst.upgraded ? '+' : '') };
  }
  SPIRE.resolveCard = resolveCard;

  class Combat {
    constructor(G, enemyKeys, kind) {
      this.G = G;
      this.rng = G.rng;
      this._diff = (SPIRE.DIFFICULTY && SPIRE.DIFFICULTY[G.difficulty]) || (SPIRE.DIFFICULTY && SPIRE.DIFFICULTY.normal) || { dmg: 1, hp: 1 };
      this.kind = kind || 'normal';
      this.round = 0;
      this.over = false;
      this.result = null;
      this.log = [];
      this.maxEnergy = 3;
      this.energy = 0;
      this._noDraw = false;
      this._cardsPlayedThisTurn = 0;
      this._attacksThisTurn = 0;
      this._skillsThisTurn = 0;
      this._activeElement = null; // 目前打出卡牌的五行（用於相剋）
      this.extraFirstDraw = 0;

      // 玩家實體：hp 直接映射至 G.hp
      this.player = {
        isPlayer: true, name: '你', block: 0, maxHp: G.maxHp,
        statuses: {}, powers: {}, vigor: 0, thorns: 0,
        get hp() { return G.hp; },
        set hp(v) { G.hp = Math.max(0, Math.min(G.maxHp, v)); },
      };

      // 建立敵人
      this.enemies = enemyKeys.map((k, i) => this.buildEnemy(k, i));

      // 牌堆
      this.drawPile = this.rng.shuffle(G.deck.map(c => makeCardInstance(c.key, c.upgraded)));
      this.hand = [];
      this.discardPile = [];
      this.exhaustPile = [];
    }

    buildEnemy(key, idx) {
      const def = SPIRE.ENEMIES[key];
      const hp = Math.max(1, Math.round(this.rng.int(def.hp[0], def.hp[1]) * this._diff.hp));
      const e = {
        key, def, name: def.name, idx, alive: true,
        hp, maxHp: hp, block: 0, statuses: {}, turns: 0,
        elite: !!def.elite, boss: !!def.boss, element: def.element || null,
      };
      if (def.init) def.init(e, this.rng);
      return e;
    }

    // ---- 狀態存取 ----
    get(entity, key) { return entity.statuses[key] || 0; }
    status(entity, key, n) {
      const cur = entity.statuses[key] || 0;
      let val = cur + n;
      if (['vulnerable', 'weak', 'poison', 'ritual', 'curlUp'].includes(key)) val = Math.max(0, val);
      entity.statuses[key] = val;
      if (val === 0) delete entity.statuses[key];
    }
    power(key, n) { this.status(this.player, key, n); }
    power2(entity, key, n) { this.status(entity, key, n); }

    // ---- 傷害計算 ----
    playerDamage(base, target) {
      let dmg = base + this.get(this.player, 'strength');
      if (this.get(this.player, 'weak') > 0) dmg = Math.floor(dmg * 0.75);
      if (target && this.get(target, 'vulnerable') > 0) dmg = Math.floor(dmg * 1.5);
      // 五行相剋：卡牌五行 vs 敵人五行
      if (this._activeElement && target && target.element && SPIRE.elementMultiplier) {
        dmg = Math.floor(dmg * SPIRE.elementMultiplier(this._activeElement, target.element));
      }
      return Math.max(0, dmg);
    }
    // 五行相剋倍率（UI 顯示用；>1 表示剋）
    elementFactor(inst, target) {
      const el = SPIRE.CARDS[inst.key] && SPIRE.CARDS[inst.key].element;
      if (!el || !target || !target.element || !SPIRE.elementMultiplier) return 1;
      return SPIRE.elementMultiplier(el, target.element);
    }
    enemyDamageCalc(self, base) {
      let dmg = base + this.get(self, 'strength');
      if (this.get(self, 'weak') > 0) dmg = Math.floor(dmg * 0.75);
      if (this.get(this.player, 'vulnerable') > 0) dmg = Math.floor(dmg * 1.5);
      if (this._diff) dmg = Math.floor(dmg * this._diff.dmg);
      return Math.max(0, dmg);
    }
    // UI 用：意圖顯示的每次傷害
    intentDamage(self, base) { return this.enemyDamageCalc(self, base); }

    // ---- 玩家攻擊 ----
    attack(target, base) {
      if (!target || !target.alive) target = this.enemies.find(e => e.alive);
      if (!target) return;
      let dmg = this.playerDamage(base, target);
      if (this.player.vigor > 0) { dmg += this.player.vigor; this.player.vigor = 0; }
      this.dealDamage(target, dmg, true, this.player);
    }
    attackAll(base) {
      this.enemies.filter(e => e.alive).forEach(e => {
        let dmg = this.playerDamage(base, e);
        this.dealDamage(e, dmg, true, this.player);
      });
    }

    // ---- 敵人攻擊玩家 ----
    enemyAttack(self, base) {
      const dmg = this.enemyDamageCalc(self, base);
      this.dealDamage(this.player, dmg, true, self);
      // 荊棘反傷
      if (this.player.thorns > 0 && self.alive) this.dealDamage(self, this.player.thorns, false, this.player);
    }

    // ---- 格擋 ----
    block(n) {
      const amt = Math.max(0, n + this.get(this.player, 'dexterity'));
      this.player.block += amt;
      // 巨獸：獲得格擋時對隨機敵人造成傷害
      const j = this.get(this.player, 'juggernaut');
      if (j > 0 && amt > 0) {
        const alive = this.enemies.filter(e => e.alive);
        if (alive.length) this.dealDamage(this.rng.pick(alive), j, false, this.player);
      }
    }
    enemyBlock(self, n) { self.block += Math.max(0, n + this.get(self, 'dexterity')); }

    // ---- 傷害結算 ----
    dealDamage(entity, dmg, fromAttack, source) {
      if (dmg < 0) dmg = 0;
      if (entity.block > 0) {
        const absorbed = Math.min(entity.block, dmg);
        entity.block -= absorbed;
        dmg -= absorbed;
      }
      if (dmg > 0) {
        entity.hp -= dmg;
        if (!entity.isPlayer && entity.def.onDamaged) entity.def.onDamaged(this, entity, dmg);
        // 綠蟲 蜷曲：首次受傷獲得格擋
        if (!entity.isPlayer && entity.statuses.curlUp) {
          this.enemyBlock(entity, entity.statuses.curlUp);
          delete entity.statuses.curlUp;
        }
      }
      if (entity.isPlayer) {
        if (this.G.hp <= 0) this.lose();
      } else if (entity.hp <= 0) {
        entity.hp = 0; entity.alive = false;
        this.checkWin();
      }
    }

    loseHp(n) {
      this.player.hp -= n;
      if (this.G.hp <= 0) this.lose();
    }

    // ---- 抽牌 / 牌堆 ----
    draw(n) {
      if (this._noDraw) return;
      for (let i = 0; i < n; i++) {
        if (this.drawPile.length === 0) {
          if (this.discardPile.length === 0) break;
          this.drawPile = this.rng.shuffle(this.discardPile);
          this.discardPile = [];
        }
        if (this.hand.length >= 10) { // 手牌上限，多抽即棄
          this.discardPile.push(this.drawPile.pop());
          continue;
        }
        this.hand.push(this.drawPile.pop());
      }
    }
    noDrawThisTurn() { this._noDraw = true; }

    addCard(key, pile) {
      const inst = makeCardInstance(key, false);
      if (pile === 'draw') { this.drawPile.push(inst); this.drawPile = this.rng.shuffle(this.drawPile); }
      else if (pile === 'hand') { if (this.hand.length < 10) this.hand.push(inst); else this.discardPile.push(inst); }
      else this.discardPile.push(inst);
    }

    exhaustCard(inst) {
      this.exhaustPile.push(inst);
      const fnp = this.get(this.player, 'feelNoPain');
      if (fnp > 0) this.block(fnp);
    }
    exhaustRandom(n) {
      for (let i = 0; i < n && this.hand.length; i++) {
        const idx = this.rng.int(0, this.hand.length - 1);
        const [c] = this.hand.splice(idx, 1);
        this.exhaustCard(c);
      }
    }
    exhaustNonAttacksForBlock(blockEach) {
      const keep = [];
      this.hand.forEach(c => {
        if (SPIRE.CARDS[c.key].type !== 'attack') { this.block(blockEach); this.exhaustCard(c); }
        else keep.push(c);
      });
      this.hand = keep;
    }
    upgradeInHand(all) {
      const targets = this.hand.filter(c => !c.upgraded && SPIRE.CARDS[c.key].upg && Object.keys(SPIRE.CARDS[c.key].upg).length);
      if (all) targets.forEach(c => c.upgraded = true);
      else if (targets.length) this.rng.pick(targets).upgraded = true;
    }
    countTag(tag) {
      const all = [...this.drawPile, ...this.hand, ...this.discardPile];
      return all.filter(c => (SPIRE.CARDS[c.key].tags || []).includes(tag)).length;
    }

    gainEnergy(n) { this.energy += n; }

    // ---- 出牌 ----
    canPlay(inst) {
      const { def, cost } = resolveCard(inst);
      if (def.unplayable) return false;
      if (cost > this.energy && cost >= 0) return false;
      if (def.target === 'enemy' && !this.enemies.some(e => e.alive)) return false;
      return true;
    }
    needsTarget(inst) {
      return SPIRE.CARDS[inst.key].target === 'enemy';
    }
    playCard(inst, target) {
      if (this.over) return false;
      const { def, v, cost } = resolveCard(inst);
      if (def.unplayable) return false;
      if (cost > this.energy) return false;
      const hi = this.hand.indexOf(inst);
      if (hi === -1) return false;
      // 花費能量
      this.energy -= Math.max(0, cost);
      // 從手牌移除
      this.hand.splice(hi, 1);
      // 執行效果（設定五行以套用相剋）
      this._activeElement = def.element || null;
      if (def.onPlay) def.onPlay(this, v, target);
      this._activeElement = null;
      // 統計
      this._cardsPlayedThisTurn++;
      if (def.type === 'attack') {
        this._attacksThisTurn++;
        if (this.G.relics.includes('kunai') && this._attacksThisTurn === 3) this.status(this.player, 'dexterity', 1);
      }
      if (def.type === 'skill') {
        this._skillsThisTurn++;
        if (this.G.relics.includes('letterOpener') && this._skillsThisTurn === 3) this.attackAll(5);
        // 哥布林貴族 激怒：玩家打技能牌時獲得力量
        this.enemies.forEach(e => { if (e.alive && e.enrage) this.status(e, 'strength', e.enrage); });
      }
      // 卡牌去向：能力/消耗/一般
      if (def.type === 'power') {
        // 能力牌用後消失（不進棄牌堆）
      } else if (def.exhaust) {
        this.exhaustCard(inst);
      } else {
        this.discardPile.push(inst);
      }
      this.checkWin();
      return true;
    }

    // ---- 藥水 ----
    usePotion(idx, target) {
      const key = this.G.potions[idx];
      if (!key) return false;
      const p = SPIRE.POTIONS[key];
      this.G.potions.splice(idx, 1);
      p.use(this.G, this, target);
      this.checkWin();
      return true;
    }

    // ---- 回合流程 ----
    start() {
      // 遺物：戰鬥開始
      this.G.relics.forEach(r => { const R = SPIRE.RELICS[r]; if (R && R.onCombatStart) R.onCombatStart(this); });
      // 敵人規劃第一手
      this.enemies.forEach(e => this.planEnemy(e));
      this.startPlayerTurn();
    }

    planEnemy(e) {
      if (!e.alive) return;
      e._m = e.def.chooseMove(this.rng, e, e.turns);
    }

    startPlayerTurn() {
      if (this.over) return;
      this.round++;
      this._noDraw = false;
      this._cardsPlayedThisTurn = 0;
      this._attacksThisTurn = 0;
      this._skillsThisTurn = 0;
      // 格擋歸零（除非壁壘）
      if (!this.get(this.player, 'barricade')) this.player.block = 0;
      // 回合開始中毒
      this.applyPoison(this.player);
      if (this.over) return;
      // 惡魔形態
      const df = this.get(this.player, 'demonForm');
      if (df > 0) this.status(this.player, 'strength', df);
      // 能量
      this.energy = this.maxEnergy + (this.G.relics.includes('energyCore') ? 1 : 0);
      // 抽牌
      let drawN = 5 + (this.round === 1 ? this.extraFirstDraw : 0);
      if (this._pocketBonus) { drawN += this._pocketBonus; this._pocketBonus = 0; }
      this.draw(drawN);
    }

    endPlayerTurn() {
      if (this.over) return;
      // 懷錶：本回合打出 <3 張，下回合多抽 3
      if (this.G.relics.includes('pocketwatch') && this._cardsPlayedThisTurn <= 3) this._pocketBonus = 3;
      // 虛無：手牌中的虛無牌被消耗
      const keep = [];
      this.hand.forEach(c => {
        const def = SPIRE.CARDS[c.key];
        if (def.ethereal || (c.upgraded && false)) this.exhaustCard(c);
        else keep.push(c);
      });
      this.hand = keep;
      // 灼傷：回合結束受傷
      this.hand.forEach(c => {
        if (c.key === 'burn') { const { v } = resolveCard(c); this.loseHp(v.dmg); }
      });
      // 棄掉剩餘手牌
      this.discardPile.push(...this.hand);
      this.hand = [];
      // 金屬化：回合結束獲得格擋
      const m = this.get(this.player, 'metallicize');
      if (m > 0) this.block(m);
      // 減益遞減
      DECAY.forEach(k => { if (this.player.statuses[k]) this.status(this.player, k, -1); });
      if (this.over) return;
      this.enemiesTurn();
    }

    applyPoison(entity) {
      const p = this.get(entity, 'poison');
      if (p > 0) {
        this.dealDamage(entity, p, false, null);
        this.status(entity, 'poison', -1);
      }
    }

    enemiesTurn() {
      for (const e of this.enemies) {
        if (this.over) return;
        if (!e.alive) continue;
        // 敵人回合開始：格擋歸零、中毒
        e.block = 0;
        this.applyPoison(e);
        if (!e.alive) continue;
        if (this.over) return;
        // 執行意圖
        this._m = e._m;
        if (e._m && e._m.run) e._m.run(this, e);
        if (this.over) return;
        // 儀式：回合結束獲得力量
        const rit = this.get(e, 'ritual');
        if (rit > 0) this.status(e, 'strength', rit);
        // 減益遞減
        DECAY.forEach(k => { if (e.statuses[k]) this.status(e, k, -1); });
        // 規劃下一手
        e.turns++;
        this.planEnemy(e);
      }
      if (!this.over) this.startPlayerTurn();
    }

    // ---- 勝負 ----
    checkWin() {
      if (this.over) return;
      if (!this.enemies.some(e => e.alive)) this.win();
    }
    win() {
      if (this.over) return;
      this.over = true; this.result = 'win';
      this.G.relics.forEach(r => { const R = SPIRE.RELICS[r]; if (R && R.onCombatEnd) R.onCombatEnd(this.G); });
      if (this.onEnd) this.onEnd('win');
    }
    lose() {
      if (this.over) return;
      this.over = true; this.result = 'lose';
      if (this.onEnd) this.onEnd('lose');
    }
  }

  SPIRE.Combat = Combat;
})(window.SPIRE = window.SPIRE || {});
