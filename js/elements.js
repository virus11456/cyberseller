// elements.js — Phase 1：五術（學派）與五行（相剋）核心
// 於 data.js 之後載入，替卡牌/敵人標註 school 與 element，並提供相剋倍率
(function (SPIRE) {
  'use strict';

  // ---- 五行相剋倍率表（攻擊方 → 防禦方）----
  // 來源：Kiro 平衡表「五行相剋倍率表」
  const CLASH = {
    metal: { metal: 1.0, wood: 1.5, water: 0.75, fire: 0.75, earth: 1.25 },
    wood:  { metal: 0.75, wood: 1.0, water: 1.25, fire: 0.75, earth: 1.5 },
    water: { metal: 1.25, wood: 0.75, water: 1.0, fire: 1.5, earth: 0.75 },
    fire:  { metal: 1.5, wood: 1.25, water: 0.75, fire: 1.0, earth: 0.75 },
    earth: { metal: 0.75, wood: 0.75, water: 1.25, fire: 1.25, earth: 1.0 },
  };
  SPIRE.elementMultiplier = function (atk, def) {
    if (!atk || !def || !CLASH[atk]) return 1;
    return CLASH[atk][def] != null ? CLASH[atk][def] : 1;
  };

  // ---- 已就緒的五行像素圖（有檔案時填 1，UI 會用圖取代 emoji）----
  // 檔案位置：assets/art/elements/<key>.png
  SPIRE.ELEMENT_ART = { /* metal:1, wood:1, water:1, fire:1, earth:1 */ };

  // ---- 五行外觀 ----
  SPIRE.ELEMENT_META = {
    metal: { zh: '金', icon: '⚙' },
    wood:  { zh: '木', icon: '🌿' },
    water: { zh: '水', icon: '💧' },
    fire:  { zh: '火', icon: '🔥' },
    earth: { zh: '土', icon: '⛰' },
  };

  // ---- 五術學派外觀 ----
  SPIRE.SCHOOL_META = {
    mountain:    { zh: '山術', color: '#6fcf7f' },
    medical:     { zh: '醫術', color: '#4fd6c0' },
    fate:        { zh: '命術', color: '#9d6bd6' },
    physiognomy: { zh: '相術', color: '#f2a14e' },
    divination:  { zh: '卜術', color: '#5aa9e6' },
  };

  // ---- 卡牌 → 學派 / 五行 ----
  const CARD_META = {
    strike:         { school: 'mountain',    element: 'metal' },
    defend:         { school: 'mountain',    element: 'earth' },
    bash:           { school: 'fate',        element: 'earth' },
    cleave:         { school: 'physiognomy', element: 'fire' },
    clothesline:    { school: 'fate',        element: 'metal' },
    pommelStrike:   { school: 'divination',  element: 'metal' },
    ironWave:       { school: 'mountain',    element: 'water' },
    twinStrike:     { school: 'physiognomy', element: 'wood' },
    bodySlam:       { school: 'mountain',    element: 'earth' },
    anger:          { school: 'physiognomy', element: 'fire' },
    heavyBlade:     { school: 'mountain',    element: 'metal' },
    perfectedStrike:{ school: 'physiognomy', element: 'metal' },
    pummel:         { school: 'divination',  element: 'metal' },
    wildStrike:     { school: 'fate',        element: 'fire' },
    shrugItOff:     { school: 'medical',     element: 'earth' },
    flex:           { school: 'mountain',    element: 'fire' },
    trueGrit:       { school: 'medical',     element: 'earth' },
    armaments:      { school: 'fate',        element: 'metal' },
    ghostlyArmor:   { school: 'medical',     element: 'water' },
    disarm:         { school: 'fate',        element: 'metal' },
    secondWind:     { school: 'medical',     element: 'wood' },
    battleTrance:   { school: 'divination',  element: 'fire' },
    entrench:       { school: 'mountain',    element: 'earth' },
    bloodletting:   { school: 'medical',     element: 'water' },
    shockwave:      { school: 'fate',        element: 'water' },
    inflame:        { school: 'mountain',    element: 'fire' },
    metallicize:    { school: 'mountain',    element: 'metal' },
    feelNoPain:     { school: 'mountain',    element: 'earth' },
    demonForm:      { school: 'mountain',    element: 'fire' },
    barricade:      { school: 'mountain',    element: 'earth' },
    juggernaut:     { school: 'mountain',    element: 'earth' },
    wound:          { school: 'fate',        element: 'earth' },
    dazed:          { school: 'physiognomy', element: 'water' },
    burn:           { school: 'fate',        element: 'fire' },
    slimed:         { school: 'fate',        element: 'water' },
  };

  // ---- 敵人 → 五行 ----
  const ENEMY_ELEMENT = {
    louse: 'wood', jawWorm: 'earth', cultist: 'fire', fungiBeast: 'wood',
    slime: 'water', gremlinNob: 'earth', sentry: 'metal', lagavulin: 'earth',
    guardian: 'metal', slimeBoss: 'water',
  };

  // ---- 套用標註（data.js 已載入）----
  SPIRE.applyElements = function () {
    if (SPIRE.CARDS) {
      for (const k in SPIRE.CARDS) {
        const m = CARD_META[k];
        if (m) { SPIRE.CARDS[k].school = m.school; SPIRE.CARDS[k].element = m.element; }
      }
    }
    if (SPIRE.ENEMIES) {
      for (const k in SPIRE.ENEMIES) {
        if (ENEMY_ELEMENT[k]) SPIRE.ENEMIES[k].element = ENEMY_ELEMENT[k];
      }
    }
  };
  SPIRE.applyElements();
})(window.SPIRE = window.SPIRE || {});
