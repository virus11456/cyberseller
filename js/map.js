// map.js — 分支地圖生成與導航（仿殺戮尖塔的樹狀路線）
(function (SPIRE) {
  'use strict';

  const ROWS = 15;      // 地圖層數（0..14），最上方額外一個 Boss
  const WIDTH = 7;      // 每層最多節點數
  const PATHS = 6;      // 從底部生成的路徑數

  // 節點類型圖示
  const ICONS = {
    monster: '⚔️', elite: '🔥', rest: '🔥', campfire: '💤',
    event: '❓', shop: '🏪', treasure: '🎁', boss: '👑',
  };
  ICONS.rest = '💤';

  function generateMap(rng) {
    const nodes = {};
    const key = (r, x) => r + ',' + x;
    function getNode(r, x) {
      const k = key(r, x);
      if (!nodes[k]) nodes[k] = { id: k, r, x, next: [], type: null, visited: false };
      return nodes[k];
    }

    // 生成路徑
    const starts = new Set();
    for (let p = 0; p < PATHS; p++) {
      let x = rng.int(0, WIDTH - 1);
      let cur = getNode(0, x);
      starts.add(cur.id);
      for (let r = 0; r < ROWS - 1; r++) {
        const opts = [x];
        if (x > 0) opts.push(x - 1);
        if (x < WIDTH - 1) opts.push(x + 1);
        const nx = rng.pick(opts);
        const nxt = getNode(r + 1, nx);
        if (!cur.next.includes(nxt.id)) cur.next.push(nxt.id);
        cur = nxt; x = nx;
      }
    }

    // 指派節點類型
    for (const id in nodes) {
      const n = nodes[id];
      n.type = pickType(rng, n.r);
    }
    // Boss 節點（連接所有最頂層節點）
    const boss = { id: 'boss', r: ROWS, x: 3, type: 'boss', next: [], visited: false };
    for (const id in nodes) {
      const n = nodes[id];
      if (n.r === ROWS - 1) n.next = ['boss'];
    }
    nodes['boss'] = boss;

    return {
      nodes, ROWS, WIDTH,
      starts: [...starts],
      current: null,          // 尚未進入任何節點
      currentRow: -1,
    };
  }

  function pickType(rng, r) {
    if (r === 0) return 'monster';
    if (r === ROWS - 1) return 'rest';
    if (r === 8) return 'treasure';
    const table = [];
    table.push({ item: 'monster', weight: 45 });
    table.push({ item: 'event', weight: 22 });
    if (r >= 4) table.push({ item: 'elite', weight: 16 });
    if (r >= 5) table.push({ item: 'rest', weight: 12 });
    table.push({ item: 'shop', weight: 6 });
    table.push({ item: 'treasure', weight: 4 });
    return rng.weighted(table);
  }

  // 目前可前往的節點 id 陣列
  function availableNodes(map) {
    if (map.current === null) return map.starts;
    const cur = map.nodes[map.current];
    return cur ? cur.next : [];
  }

  function enterNode(map, id) {
    const n = map.nodes[id];
    if (!n) return null;
    n.visited = true;
    map.current = id;
    map.currentRow = n.r;
    return n;
  }

  SPIRE.MapGen = { generateMap, availableNodes, enterNode, ICONS, ROWS, WIDTH };
})(window.SPIRE = window.SPIRE || {});
