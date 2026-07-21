// rng.js — 可重現的偽隨機數（Mulberry32），支援種子，讓每局可重播/存檔
(function (SPIRE) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class RNG {
    constructor(seed) {
      this.seed = (seed >>> 0) || 1;
      this._next = mulberry32(this.seed);
    }
    // [0,1)
    random() { return this._next(); }
    // 整數 [min, max]
    int(min, max) { return Math.floor(this.random() * (max - min + 1)) + min; }
    // 陣列隨機取一
    pick(arr) { return arr[Math.floor(this.random() * arr.length)]; }
    // 依權重取一：items = [{item, weight}]
    weighted(items) {
      const total = items.reduce((s, i) => s + i.weight, 0);
      let r = this.random() * total;
      for (const it of items) { if ((r -= it.weight) <= 0) return it.item; }
      return items[items.length - 1].item;
    }
    // 洗牌（Fisher-Yates），回傳新陣列
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    // 從陣列取 n 個不重複
    sample(arr, n) {
      return this.shuffle(arr).slice(0, Math.min(n, arr.length));
    }
    state() { return this.seed; }
  }

  SPIRE.RNG = RNG;
  SPIRE.randomSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;
})(window.SPIRE = window.SPIRE || {});
