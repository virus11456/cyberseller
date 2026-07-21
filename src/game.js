export const DESIGN_NOTES = [
  '研究《金庸群俠傳》後，保留「開放江湖、門派武學、尋訪群俠、回合制戰鬥」的精神。',
  '本作改為原創武俠牌組構築：玩家是初入江湖的無名少俠，以招式牌、內功牌與身法牌闖關。',
  '第一大關「衡陽風雨」聚焦入門江湖：茶棚探聽、鏢局劫案、山道伏擊、破廟療傷與衡陽擂台。',
  '避免直接複製金庸小說角色、門派招式與劇情，只借鑑武俠 RPG 的探索感與群俠氛圍。'
];

export const ACTS = [
  {
    name: '第一大關：衡陽風雨',
    description: '江南鏢銀被劫，衡陽城群雄聚會。少俠需沿湘水古道追查黑帖，累積武學與俠名，最後挑戰「黑帖壇主」。',
    map: ['茶棚探聽', '古道交鋒', '鏢局疑雲', '破廟調息', '衡陽擂台'],
    bossIndex: 4
  }
];

export const CARD_LIBRARY = {
  straight: { name: '青鋒直刺', type: '劍招', cost: 1, text: '造成 7 點外傷。', damage: 7 },
  guard: { name: '抱元守一', type: '內功', cost: 1, text: '獲得 6 點招架。', block: 6 },
  cloudstep: { name: '雲蹤步', type: '身法', cost: 1, text: '獲得 3 招架，抽 1 張牌。', block: 3, draw: 1 },
  listen: { name: '茶棚聽風', type: '奇遇', cost: 0, text: '獲得 2 點悟性；下張劍招 +2 外傷。', insight: 2, focus: 2 },
  palm: { name: '劈山掌', type: '拳掌', cost: 2, text: '造成 14 點外傷。', damage: 14 },
  heal: { name: '行氣小周天', type: '內功', cost: 1, text: '獲得 5 招架並回復 2 氣血。', block: 5, heal: 2 },
  rain: { name: '瀟湘夜雨劍', type: '劍招', cost: 2, text: '造成 5 點外傷 3 次。', damage: 5, hits: 3 },
  oath: { name: '俠義盟誓', type: '心法', cost: 2, text: '本場戰鬥每回合開始造成 3 點外傷。', power: 'oath', exhaust: true },
  sweep: { name: '掃堂腿', type: '拳掌', cost: 1, text: '造成 4 點外傷，敵人下回合少 2 攻擊。', damage: 4, weaken: 2 },
  meditate: { name: '破廟打坐', type: '內功', cost: 0, text: '抽 2 張牌，本回合失去 1 氣血。', draw: 2, hpCost: 1 }
};

export const ENCOUNTERS = [
  { name: '茶棚惡丐', hp: 32, intent: '試探', moves: [{ damage: 6 }, { block: 5 }, { damage: 8 }] },
  { name: '劫鏢刀客', hp: 44, intent: '快刀', moves: [{ damage: 7 }, { damage: 5, block: 4 }, { damage: 10 }] },
  { name: '黑帖壇主', hp: 72, intent: '壇主令', moves: [{ damage: 9 }, { block: 8 }, { damage: 13 }, { damage: 6, block: 6 }] }
];

const starterDeck = ['straight', 'straight', 'straight', 'straight', 'guard', 'guard', 'guard', 'listen', 'cloudstep', 'palm'];
const rewards = ['rain', 'heal', 'meditate', 'sweep', 'oath', 'cloudstep', 'palm'];

export function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

export function createRun() {
  return {
    act: 0,
    floor: 1,
    maxHp: 76,
    hp: 76,
    silver: 99,
    deck: [...starterDeck],
    relics: ['舊布包：每場戰鬥第一回合多 1 真氣'],
    map: [...ACTS[0].map],
    encounterIndex: 0,
    renown: 0,
    insight: 0
  };
}

export function startCombat(run) {
  const enemyTemplate = ENCOUNTERS[Math.min(run.encounterIndex, ENCOUNTERS.length - 1)];
  const drawPile = shuffle(run.deck);
  const state = {
    run,
    enemy: { ...enemyTemplate, maxHp: enemyTemplate.hp, block: 0, move: 0, weakened: 0 },
    drawPile,
    discardPile: [],
    exhaustPile: [],
    hand: [],
    qi: 4,
    turn: 0,
    playerBlock: 0,
    focus: 0,
    powers: { oath: 0 },
    log: ['遭遇：' + enemyTemplate.name]
  };
  beginPlayerTurn(state);
  return state;
}

export function drawCards(state, count) {
  for (let i = 0; i < count; i += 1) {
    if (state.drawPile.length === 0) {
      state.drawPile = shuffle(state.discardPile);
      state.discardPile = [];
      if (state.drawPile.length === 0) return;
    }
    state.hand.push(state.drawPile.pop());
  }
}

export function beginPlayerTurn(state) {
  state.turn += 1;
  state.qi = state.turn === 1 ? 4 : 3;
  state.playerBlock = 0;
  if (state.powers.oath) damageEnemy(state, state.powers.oath);
  drawCards(state, 5);
  state.log.unshift(`第 ${state.turn} 回合：運轉真氣 ${state.qi} 點並抽牌。`);
}

export function damageEnemy(state, amount) {
  const dealt = Math.max(0, amount - state.enemy.block);
  state.enemy.block = Math.max(0, state.enemy.block - amount);
  state.enemy.hp = Math.max(0, state.enemy.hp - dealt);
  return dealt;
}

export function playCard(state, handIndex) {
  const cardId = state.hand[handIndex];
  const card = CARD_LIBRARY[cardId];
  if (!card || card.cost > state.qi) return false;
  state.qi -= card.cost;
  state.hand.splice(handIndex, 1);
  const hits = card.hits || 1;
  if (card.damage) {
    let totalDealt = 0;
    for (let i = 0; i < hits; i += 1) {
      const strike = card.damage + (i === 0 ? state.focus : 0);
      totalDealt += damageEnemy(state, strike);
    }
    state.log.unshift(`${card.name} 造成 ${totalDealt} 點外傷。`);
    state.focus = 0;
  }
  if (card.block) state.playerBlock += card.block;
  if (card.heal) state.run.hp = Math.min(state.run.maxHp, state.run.hp + card.heal);
  if (card.insight) state.run.insight += card.insight;
  if (card.focus) state.focus += card.focus;
  if (card.hpCost) state.run.hp = Math.max(1, state.run.hp - card.hpCost);
  if (card.power === 'oath') state.powers.oath += 3;
  if (card.weaken) state.enemy.weakened += card.weaken;
  if (card.draw) drawCards(state, card.draw);
  (card.exhaust ? state.exhaustPile : state.discardPile).push(cardId);
  return true;
}

export function endTurn(state) {
  state.discardPile.push(...state.hand);
  state.hand = [];
  const move = state.enemy.moves[state.enemy.move % state.enemy.moves.length];
  state.enemy.move += 1;
  state.enemy.block = move.block || 0;
  if (move.damage) {
    const incoming = Math.max(0, move.damage - state.enemy.weakened);
    state.enemy.weakened = 0;
    const taken = Math.max(0, incoming - state.playerBlock);
    state.run.hp = Math.max(0, state.run.hp - taken);
    state.log.unshift(`${state.enemy.name} 出招，受到 ${taken} 點內外傷。`);
  }
  if (state.run.hp > 0 && state.enemy.hp > 0) beginPlayerTurn(state);
}

export function claimReward(run) {
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  run.deck.push(reward);
  run.silver += 25;
  run.renown += 100 + run.floor * 25;
  run.floor += 1;
  run.encounterIndex += 1;
  return reward;
}
