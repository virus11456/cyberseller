// meta.js — Phase 3：跨輪迴繼承（功德/靈魂磨損/難度）
(function (SPIRE) {
  'use strict';

  // 難度倍率（取自 Kiro 難度表）
  SPIRE.DIFFICULTY = {
    normal: { name: '正常', dmg: 1.0, hp: 1.0, karma: 1.0, gold: 1.0, soul: 1.0 },
    hard:   { name: '困難', dmg: 1.5, hp: 1.5, karma: 0.75, gold: 0.75, soul: 1.5 },
    hell:   { name: '地獄', dmg: 2.0, hp: 2.0, karma: 0.5, gold: 0.5, soul: 2.0 },
  };

  SPIRE.Meta = {
    KEY: 'abyss-spire-meta-v1',
    data: null,
    load() {
      try { this.data = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { this.data = null; }
      if (!this.data || typeof this.data !== 'object') this.data = {};
      const d = this.data;
      ['karma', 'runs', 'bestAct', 'soulWear'].forEach(k => { if (typeof d[k] !== 'number') d[k] = 0; });
      if (!SPIRE.DIFFICULTY[d.difficulty]) d.difficulty = 'normal';
      return d;
    },
    save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {} },
    get() { if (!this.data) this.load(); return this.data; },
    diff() { return SPIRE.DIFFICULTY[this.get().difficulty] || SPIRE.DIFFICULTY.normal; },

    setDifficulty(d) { if (SPIRE.DIFFICULTY[d]) { this.get().difficulty = d; this.save(); } },

    // 花 100 功德修復 5% 靈魂磨損
    repairSoul() {
      const m = this.get();
      if (m.karma >= 100 && m.soulWear > 0) {
        m.karma -= 100;
        m.soulWear = Math.max(0, m.soulWear - 5);
        this.save();
        return true;
      }
      return false;
    },

    // 本輪結束：繼承 50% 功德、輪迴 +1、靈魂磨損累積
    onRunEnd(G) {
      const m = this.get();
      const diff = this.diff();
      m.karma += Math.max(0, Math.floor((G.karma || 0) * 0.5 * diff.karma));
      m.runs += 1;
      m.bestAct = Math.max(m.bestAct, G.act || 0);
      m.soulWear = Math.min(100, m.soulWear + Math.round(1 * diff.soul));
      this.save();
    },

    // 靈魂磨損 → 開局懲罰
    soulPenalty(soulWear) {
      let curses = 0, hp = 0;
      if (soulWear >= 30) curses = 1;
      if (soulWear >= 60) { curses = 2; hp = 5; }
      if (soulWear >= 90) { curses = 3; hp = 10; }
      return { curses, hp };
    },
  };
})(window.SPIRE = window.SPIRE || {});
