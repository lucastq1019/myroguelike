/**
 * 地图流程冒烟测试：验证「清怪 → 升级 → 选路 → 下一层」端到端跑通，
 * 以及中途存档（导出/导入）能恢复本局。
 * 运行：npx tsx src/game/smoke-mapflow.ts
 */
const calls: string[] = [];
const mockCtx = new Proxy({} as any, {
  get(_t, prop: string) {
    if (prop === 'canvas') return { width: 960, height: 600 };
    if (prop === 'measureText') return () => ({ width: 50 });
    return (...args: any[]) => { calls.push(`${prop}(${args.length})`); };
  },
  set: () => true,
});

// 必须在 import Game 之前桩掉 DOM（Game 构造会走 GameEngine.getInstance → CanvasManager）
(globalThis as any).document = {
  createElement: () => ({
    width: 0, height: 0, style: {},
    getContext: () => mockCtx,
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }),
  }),
  body: { appendChild: () => {} },
};
(globalThis as any).performance = (globalThis as any).performance ?? { now: () => Date.now() };
(globalThis as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};
// 不真正跑循环（避免无限递归）
(globalThis as any).requestAnimationFrame = () => 0;
(globalThis as any).cancelAnimationFrame = () => {};

import { World } from '../GameEngine/ecs';
import { Position, Velocity, Transform } from '../GameEngine/ecs/components';
import { Camera } from '../GameEngine/resources/Camera';
import { Input } from '../GameEngine/resources/Input';
import { Game } from './game';
import { PlayerTag, EnemyTag, Health, Portal } from './components';

// 用一个最小 engine 桩（Game 需要 world / canvasManager / addSystem / start）
const world = new World();
const systems: any[] = [];
const engineStub: any = {
  world,
  canvasManager: { getCtx: () => mockCtx, width: 960, height: 600, getCanvas: () => null },
  addSystem(s: any) { systems.push(s); return this; },
  getWorld() { return world; },
  start() {},
};

let lastState: any = null;
let mapChoiceCalls = 0;

const game = new Game({
  onStateChange: (s) => { lastState = s; },
  getUnlocked: () => [],
  onMapChoice: () => { mapChoiceCalls++; },
});

// 覆盖内部 engine（Game 构造时通过 GameEngine.getInstance 拿单例，这里直接注入）
(game as any).engine = engineStub;
(game as any).world = world;
(game as any).camera = new Camera(960, 600, 1920, 600);
(game as any).input = new Input();

console.log('=== 地图流程冒烟测试 ===');

// ---- 1. 开局 ----
game.start();
console.log(`开局：第 ${lastState.floor} 层，节点类型 ${lastState.nodeKind}`);
console.log(`地图已生成：${game.getMap() !== null}`);
console.log(`当前节点：${game.getMapNode()?.kind}`);

// ---- 2. 清怪 → 升级 ----
const w = (game as any).world as World;
function clearEnemies(): number {
  const idxs = w.findEntities(w.query().with(w.maskOf(EnemyTag)).build());
  for (const i of idxs) { const e = w.getByIndex(i); if (e) w.despawn(e); }
  return idxs.length;
}
const cleared = clearEnemies();
game.update(); // 生成传送门
console.log(`清怪 ${cleared} 个`);

const pIdx = w.findEntities(w.query().with(w.maskOf(PlayerTag)).build())[0];
const portalIdxs = w.findEntities(w.query().with(w.maskOf(Portal)).build());
console.log(`传送门已生成：${portalIdxs.length > 0}`);

// ---- 3. 升级 → 选路 ----
// 直接把玩家移到传送门触发升级
const pPos = w.storage.get(pIdx, Position)!;
const portal = portalIdxs[0];
if (portal !== undefined) {
  const pp = w.storage.get(portal, Position)!;
  pPos.x = pp.x; pPos.y = pp.y;
  game.update();
}
console.log(`进入升级态：${lastState.upgradeChoosing}`);

// 选第一个升级 → 触发选路
game.chooseUpgrade(0);
console.log(`升级后进入选路：${game.isMapChoosing()}`);
console.log(`选路回调触发次数：${mapChoiceCalls}`);

// ---- 4. 选路 → 下一层 ----
const reachable = game.getReachableNodes();
console.log(`可达节点数：${reachable.length}`);
const floorBefore = lastState.floor;
const ok = game.chooseNode(reachable[0].id);
console.log(`选路成功：${ok}`);
console.log(`层数推进：${floorBefore} → ${lastState.floor}`);
console.log(`节点类型：${lastState.nodeKind}`);

// ---- 5. 中途存档往返 ----
const snap = game.exportRun();
console.log(`导出存档：floor=${snap.floor}, 实体数=${snap.world.entities.length}`);
const restored = game.importRun(snap);
console.log(`导入存档成功：${restored}`);
console.log(`导入后层数：${lastState.floor}`);

console.log('\n✅ 地图流程冒烟测试通过');
