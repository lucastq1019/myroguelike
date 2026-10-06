/**
 * 地图节点图回归测试：图结构 / 生成 / 连通性 / 布局 / 选路推进。
 * 运行：npx tsx src/game/verify-map.ts
 */
import {
  MapNode,
  GameMap,
  generateMap,
  layoutMap,
  reachableFrom,
  NODE_KIND_NAME,
} from './resources/MapGraph';
import { createMapScreenSystem } from './systems/mapScreen';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

/** 可复现的伪随机（mulberry32） */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 1. MapNode 图结构（双向维护）----
console.log('1) MapNode 图结构');
{
  const a = new MapNode(0, 0, 0, 'start');
  const b = new MapNode(1, 1, 0, 'battle');
  const c = new MapNode(2, 1, 1, 'elite');
  a.addNext(b);
  a.addNext(c);

  check('addNext 建立后继', a.next.length === 2);
  check('addNext 反向维护前驱', b.prev.length === 1 && b.prev[0] === a);
  check('canReach 直接相邻', a.canReach(b));
  check('canReach 非相邻为 false', !b.canReach(a));
  check('重复 addNext 不重复添加', (a.addNext(b), a.next.length === 2));
  check('reachableFrom 返回后继', reachableFrom(a).length === 2);
}

// ---- 2. 地图生成：结构正确 ----
console.log('2) 地图生成结构');
{
  const map = generateMap({ layers: 8, rng: seeded(42) });
  check('层数 = 8', map.layerCount === 8);
  check('起点层只有 1 个节点', map.layers[0].length === 1);
  check('起点类型 = start', map.startNode.kind === 'start');
  check('Boss 层只有 1 个节点', map.layers[7].length === 1);
  check('Boss 类型 = boss', map.bossNode.kind === 'boss');
  check('起点无前驱', map.startNode.prev.length === 0);
  check('Boss 无后继', map.bossNode.next.length === 0);

  // 中间层节点数 1~3
  let ok = true;
  for (let l = 1; l < 7; l++) {
    const n = map.layers[l].length;
    if (n < 1 || n > 3) ok = false;
  }
  check('中间层节点数在 1~3', ok);

  // 所有节点类型合法
  const validKinds = Object.keys(NODE_KIND_NAME);
  check('节点类型均合法', map.allNodes().every((n) => validKinds.includes(n.kind)));
}

// ---- 3. 连通性：每个节点都有入边/出边 ----
console.log('3) 连通性');
{
  const map = generateMap({ layers: 8, rng: seeded(7) });
  let allHaveEntry = true;
  let allHaveExit = true;
  for (const n of map.allNodes()) {
    if (n !== map.startNode && n.prev.length === 0) allHaveEntry = false;
    if (n !== map.bossNode && n.next.length === 0) allHaveExit = false;
  }
  check('除起点外所有节点有入边', allHaveEntry);
  check('除 Boss 外所有节点有出边', allHaveExit);

  // 起点能到达 Boss（BFS）
  const seen = new Set<number>();
  const queue: MapNode[] = [map.startNode];
  seen.add(map.startNode.id);
  while (queue.length) {
    const n = queue.shift()!;
    for (const nx of n.next) {
      if (!seen.has(nx.id)) { seen.add(nx.id); queue.push(nx); }
    }
  }
  check('起点可达 Boss', seen.has(map.bossNode.id));
  check('起点可达所有节点', seen.size === map.allNodes().length, `${seen.size}/${map.allNodes().length}`);

  // 边只连相邻层（无跨层边）
  let adjacentOnly = true;
  for (const n of map.allNodes()) {
    for (const nx of n.next) {
      if (nx.layer !== n.layer + 1) adjacentOnly = false;
    }
  }
  check('边只连相邻层', adjacentOnly);
}

// ---- 4. 生成的随机性（不同种子不同图）----
console.log('4) 随机性');
{
  const m1 = generateMap({ layers: 8, rng: seeded(1) });
  const m2 = generateMap({ layers: 8, rng: seeded(2) });
  const shape = (m: GameMap) => m.layers.map((l) => l.length).join(',');
  check('不同种子产生不同层形状', shape(m1) !== shape(m2), `${shape(m1)} vs ${shape(m2)}`);

  const same = generateMap({ layers: 8, rng: seeded(1) });
  check('同种子可复现', shape(same) === shape(m1));
}

// ---- 5. 布局：归一化坐标 ----
console.log('5) 布局');
{
  const map = generateMap({ layers: 8, rng: seeded(3) });
  const pos = layoutMap(map);
  check('每个节点都有坐标', map.allNodes().every((n) => pos.has(n.id)));

  let inRange = true;
  for (const p of pos.values()) {
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) inRange = false;
  }
  check('坐标归一化在 0~1', inRange);

  check('起点 x = 0', pos.get(map.startNode.id)!.x === 0);
  check('Boss x = 1', pos.get(map.bossNode.id)!.x === 1);

  // 同层节点纵向分散
  const layer3 = map.layers[3];
  if (layer3.length > 1) {
    const ys = layer3.map((n) => pos.get(n.id)!.y);
    check('同层节点 y 互不相同', new Set(ys).size === ys.length);
  } else {
    check('同层节点 y 互不相同（单节点层跳过）', true);
  }
}

// ---- 6. 地图界面：命中检测 ----
console.log('6) 地图界面命中检测');
{
  const calls: string[] = [];
  const ctx = new Proxy({} as any, {
    get(_t, prop: string) {
      if (prop === 'measureText') return () => ({ width: 20 });
      return (..._a: any[]) => { calls.push(prop); return undefined; };
    },
    set() { return true; },
  });
  const cm = { width: 960, height: 600, getCtx: () => ctx, getCanvas: () => null } as any;

  const map = generateMap({ layers: 6, rng: seeded(11) });
  const ms = createMapScreenSystem(cm);
  const cur = map.startNode;
  const visited = new Set<number>([cur.id]);

  ms.run(null, 1 / 60, { map, currentNode: cur, visited });

  const points = ms.getNodePoints();
  check('绘制了所有节点', points.length === map.allNodes().length);
  check('可达节点被标记为可选', points.filter((p) => p.selectable).length === cur.next.length);
  check('起点自身不可选（非后继）', !points.find((p) => p.node.id === cur.id)!.selectable);

  // 命中可达节点
  const target = points.find((p) => p.selectable)!;
  const hit = ms.hitNode(target.x, target.y);
  check('命中可达节点', hit?.id === target.node.id);

  // 不可达节点不响应
  const nonSel = points.find((p) => !p.selectable && p.node.id !== cur.id);
  if (nonSel) {
    check('不可达节点不响应命中', ms.hitNode(nonSel.x, nonSel.y) === null);
  } else {
    check('不可达节点不响应命中（无此类节点跳过）', true);
  }

  // 空白处不命中
  check('空白处不命中', ms.hitNode(5, 5) === null);

  // UI 层同步注册了命中区
  check('UI 层注册了可达节点命中区', ms.getUi().all().length === cur.next.length);
}

// ---- 7. 选路推进（模拟 game.chooseNode 语义）----
console.log('7) 选路推进');
{
  const map = generateMap({ layers: 6, rng: seeded(5) });
  let cur = map.startNode;
  const visited = new Set<number>([cur.id]);
  const path: number[] = [cur.id];

  // 沿图走到 Boss
  let guard = 0;
  while (cur.next.length > 0 && guard++ < 20) {
    const next = cur.next[0];
    // 模拟 chooseNode 的合法性校验
    if (!cur.canReach(next)) break;
    cur = next;
    visited.add(cur.id);
    path.push(cur.id);
  }

  check('能走到 Boss 层', cur.kind === 'boss');
  check('路径长度 = 层数', path.length === map.layerCount);
  check('visited 覆盖路径', visited.size === path.length);
  check('路径每步层号递增', path.every((id, i) => i === 0 || map.get(id)!.layer === i));

  // 非法跳转拒绝（不能直接跳到 Boss）
  const start = map.startNode;
  check('起点不能直接到达 Boss', !start.canReach(map.bossNode));
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) (globalThis as any).process?.exit?.(1);
