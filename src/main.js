import { ACTS, CARD_LIBRARY, DESIGN_NOTES, claimReward, createRun, endTurn, playCard, startCombat } from './game.js';

let run = createRun();
let combat = startCombat(run);

const app = document.querySelector('#app');

function intentText(enemy) {
  const move = enemy.moves[enemy.move % enemy.moves.length];
  const parts = [];
  if (move.damage) parts.push(`攻擊 ${move.damage}`);
  if (move.block) parts.push(`凝勢 ${move.block}`);
  return parts.join(' / ');
}

function render() {
  const won = combat.enemy.hp <= 0;
  const lost = run.hp <= 0;
  app.innerHTML = `
    <main class="shell">
      <section class="hero">
        <p class="eyebrow">Wuxia Roguelike Deckbuilder · Act 1</p>
        <h1>群俠牌劫：衡陽風雨</h1>
        <p>${ACTS[run.act].description}</p>
      </section>
      <section class="research">
        <h2>研究後轉化的玩法支柱</h2>
        <ul>${DESIGN_NOTES.map((note) => `<li>${note}</li>`).join('')}</ul>
      </section>
      <section class="run-panel">
        <div><strong>氣血</strong><span>${run.hp}/${run.maxHp}</span></div>
        <div><strong>關卡</strong><span>${run.floor}/${run.map.length}</span></div>
        <div><strong>銀兩</strong><span>${run.silver}</span></div>
        <div><strong>俠名</strong><span>${run.renown}</span></div>
      </section>
      <section class="map">${run.map.map((node, index) => `<span class="${index + 1 === run.floor ? 'active' : ''}">${node}</span>`).join('')}</section>
      <section class="battle">
        <article class="player">
          <h2>玩家</h2>
          <p class="hp">氣血 ${run.hp}</p>
          <p>招架 ${combat.playerBlock}｜真氣 ${combat.qi}｜悟性 ${run.insight}｜抽牌堆 ${combat.drawPile.length}｜棄牌堆 ${combat.discardPile.length}</p>
          <p>行囊：${run.relics.join('、')}</p>
        </article>
        <article class="enemy">
          <h2>${combat.enemy.name}</h2>
          <p class="hp">氣血 ${combat.enemy.hp}/${combat.enemy.maxHp}</p>
          <p>架勢 ${combat.enemy.block}｜意圖：${intentText(combat.enemy)}</p>
        </article>
      </section>
      <section class="hand">
        ${combat.hand.map((id, index) => {
          const card = CARD_LIBRARY[id];
          return `<button class="card" data-card="${index}" ${won || lost || card.cost > combat.qi ? 'disabled' : ''}>
            <span>${card.type}｜${card.cost} 真氣</span>
            <strong>${card.name}</strong>
            <em>${card.text}</em>
          </button>`;
        }).join('')}
      </section>
      <section class="actions">
        <button id="end" ${won || lost ? 'disabled' : ''}>收招回合</button>
        ${won ? '<button id="reward">拾取機緣並闖下一關</button>' : ''}
        ${lost ? '<button id="restart">重入江湖</button>' : ''}
      </section>
      <section class="log"><h2>江湖紀事</h2>${combat.log.slice(0, 6).map((line) => `<p>${line}</p>`).join('')}</section>
    </main>`;

  document.querySelectorAll('[data-card]').forEach((button) => {
    button.addEventListener('click', () => {
      playCard(combat, Number(button.dataset.card));
      render();
    });
  });
  document.querySelector('#end')?.addEventListener('click', () => { endTurn(combat); render(); });
  document.querySelector('#reward')?.addEventListener('click', () => {
    const reward = claimReward(run);
    if (run.floor > run.map.length) {
      run.map.push('江湖後話');
    }
    combat = startCombat(run);
    combat.log.unshift(`戰利品：取得「${CARD_LIBRARY[reward].name}」並獲得 25 銀兩。`);
    render();
  });
  document.querySelector('#restart')?.addEventListener('click', () => { run = createRun(); combat = startCombat(run); render(); });
}

render();
