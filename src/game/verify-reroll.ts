/**
 * 阶段C1 回归：升级面板「刷新」/「跳过回血」
 *
 * 覆盖：
 *   - 每层第 1 次刷新免费
 *   - 之后消耗金币且递增（10 / 20 / 30…）
 *   - 金币不足 → 刷新失败且不扣钱
 *   - 跳过回血（25% 最大生命，不超上限）并进入下一层
 *   - HUD 暴露刷新/跳过按钮命中区域，禁用态正确
 *
 * 运行：npx tsx src/game/verify-reroll.ts
 */
// mock 浏览器环境（必须在 import 之前）
const listeners: Record<string, Function[]> = {};
(globalThis as any).window = {
  innerWidth: 960, innerHeight: 600, devicePixelRatio: 1,
  addEventListener: (t: string, cb: Function) => { (listeners[t] ||= []).push(cb); },
  removeEventListener: () => {},
};
(globalThis as any).requestAnimationFrame = () => 0;
(globalThis as any).performance = { now: () => Date.now() };
const calls: string[] = [];
const mockCtx = new Proxy({} as any, {
  get(_t, prop: string) {
    if (prop === 'canvas') return { width: 960, height: 600 };
    if (prop === 'measureText') return () => ({ width: 40 });
    return (...args: any[]) => { calls.push(`${prop}(${args.length})`); };
  },
  set: () => true,
});
const mockCanvas: any = { width: 960, height: 600, style: {}, addEventListener: () => {}, getContext: () => mockCtx };
(globalThis as any).document = {
  createElement: (tag: string) => (tag === 'canvas' ? mockCanvas : { style: {}, appendChild: () => {} }),
  body: { appendChild: () => {}, insertBefore: () => {} },
};

import GameEngine from '../GameEngine/GameEngine';
import { Game, GameState, rerollCost } from './game';
import { createHudSystem } from './systems/hud';
import { Position } from '../GameEngine/ecs/components';
import { EnemyTag, PlayerTag, Portal, Health } from './components';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra = '') {
  console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : ' ' + extra}`);
  if (cond) pass++; else fail++;
}

// ============ 1. 递增计价公式 ============
console.log('\n=== 1. 递增计价公式 ===');
{
  check(`第 1 次付费刷新 = 10（${rerollCost(1)}）`, rerollCost(1) === 10);
  check(`第 2 次付费刷新 = 20（${rerollCost(2)}）`, rerollCost(2) === 20);
  check(`第 3 次付费刷新 = 30（${rerollCost(3)}）`, rerollCost(3) === 30);
  check('消耗严格递增', rerollCost(1) < rerollCost(2) && rerollCost(2) < rerollCost(3));
}

// ============ 2. Game 装配 + 进入升级态 ============
console.log('\n=== 2. 刷新：首次免费 ===');
const engine = GameEngine.getInstance({ screenWidth: 960, screenHeight: 600 });
let lastState: GameState = null as unknown as GameState;
const game = new Game({ onStateChange: (s) => { lastState = s; } });
const world = engine.getWorld();

// 清空敌人 → 生成传送门 → 把玩家移到传送门触发升级
function forceUpgrade(): void {
  const enemyIdxs = world.findEntities(world.query().with(world.maskOf(EnemyTag)).build());
  for (const ei of enemyIdxs) {
    const e = world.getByIndex(ei);
    if (e) world.despawn(e);
  }
  game.update(); // 生成传送门
}
forceUpgrade();

// 玩家传送到传送门位置
{
  const pIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
  const portalIdxs = world.findEntities(world.query().with(world.maskOf(Portal)).build());
  const pPos = world.storage.get(pIdx, Position)!;
  const portalPos = world.storage.get(portalIdxs[0], Position)!;
  pPos.x = portalPos.x;
  pPos.y = portalPos.y;
  game.update(); // 触发 enterUpgrade
}

check('已进入升级选择态', !!lastState.upgradeChoosing);
check(`首次刷新免费（cost=${lastState.rerollCost}）`, lastState.rerollCost === 0);
check(`免费刷新次数 = 1（${lastState.freeRerolls}）`, lastState.freeRerolls === 1);

// ============ 3. 首次刷新免费且不扣金币 ============
console.log('\n=== 3. 首次刷新 ===');
{
  (globalThis as any).__coins = 50;
  const before = lastState!.upgradeOptions.map((u) => u.id).join(',');
  const ok = game.rerollUpgrade();
  check('刷新成功', ok);
  check(`免费刷新后金币不变（${(globalThis as any).__coins}）`, (globalThis as any).__coins === 50);
  check(`免费次数用尽（${lastState.freeRerolls}）`, lastState.freeRerolls === 0);
  check(`下次刷新开始收费（${lastState.rerollCost}）`, lastState.rerollCost === 10);
  check('刷新后仍有 3 个选项', lastState.upgradeOptions.length === 3);
}

// ============ 4. 后续刷新消耗金币且递增 ============
console.log('\n=== 4. 付费刷新递增 ===');
{
  (globalThis as any).__coins = 100;
  const ok1 = game.rerollUpgrade();
  check(`第 1 次付费刷新成功，扣 10（余额 ${(globalThis as any).__coins}）`, ok1 && (globalThis as any).__coins === 90);
  check(`下次价格递增到 20（${lastState.rerollCost}）`, lastState.rerollCost === 20);

  const ok2 = game.rerollUpgrade();
  check(`第 2 次付费刷新成功，扣 20（余额 ${(globalThis as any).__coins}）`, ok2 && (globalThis as any).__coins === 70);
  check(`下次价格递增到 30（${lastState.rerollCost}）`, lastState.rerollCost === 30);
}

// ============ 5. 金币不足 → 刷新失败 ============
console.log('\n=== 5. 金币不足 ===');
{
  (globalThis as any).__coins = 5; // 需要 30
  const before = lastState!.upgradeOptions.map((u) => u.id).join(',');
  const ok = game.rerollUpgrade();
  check('金币不足时刷新失败', !ok);
  check(`失败不扣金币（${(globalThis as any).__coins}）`, (globalThis as any).__coins === 5);
  check('失败时选项不变', lastState!.upgradeOptions.map((u) => u.id).join(',') === before);
  check(`canReroll=false（${lastState.canReroll}）`, lastState.canReroll === false);
}

// ============ 6. 跳过回血 + 进入下一层 ============
console.log('\n=== 6. 跳过回血 ===');
{
  const pIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
  const hp = world.storage.get(pIdx, Health)!;
  hp.current = 40;
  const floorBefore = lastState!.floor;
  const expectedHeal = Math.round(hp.max * 0.25);
  const ok = game.skipUpgrade();
  check('跳过成功', ok);
  check(`回血 40 → ${40 + expectedHeal}（实际 ${hp.current}）`, hp.current === 40 + expectedHeal);
  check('退出升级态', !lastState.upgradeChoosing);
  check(`进入下一层（${floorBefore} → ${lastState.floor}）`, lastState.floor === floorBefore + 1);
}

// ============ 7. 跳过回血不超上限 ============
console.log('\n=== 7. 回血上限 ===');
{
  // 再次触发升级
  const enemyIdxs = world.findEntities(world.query().with(world.maskOf(EnemyTag)).build());
  for (const ei of enemyIdxs) { const e = world.getByIndex(ei); if (e) world.despawn(e); }
  game.update();
  const pIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
  const portalIdxs = world.findEntities(world.query().with(world.maskOf(Portal)).build());
  const pPos = world.storage.get(pIdx, Position)!;
  const portalPos = world.storage.get(portalIdxs[0], Position)!;
  pPos.x = portalPos.x; pPos.y = portalPos.y;
  game.update();
  check('再次进入升级态', !!lastState.upgradeChoosing);

  const hp = world.storage.get(pIdx, Health)!;
  hp.current = hp.max - 5; // 接近满血
  game.skipUpgrade();
  check(`满血附近跳过不超上限（${hp.current}/${hp.max}）`, hp.current === hp.max);
}

// ============ 8. 新层重置免费刷新 ============
console.log('\n=== 8. 新层重置刷新次数 ===');
{
  const enemyIdxs = world.findEntities(world.query().with(world.maskOf(EnemyTag)).build());
  for (const ei of enemyIdxs) { const e = world.getByIndex(ei); if (e) world.despawn(e); }
  game.update();
  const pIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
  const portalIdxs = world.findEntities(world.query().with(world.maskOf(Portal)).build());
  const pPos = world.storage.get(pIdx, Position)!;
  const portalPos = world.storage.get(portalIdxs[0], Position)!;
  pPos.x = portalPos.x; pPos.y = portalPos.y;
  game.update();
  check(`新层免费刷新重置为 1（${lastState.freeRerolls}）`, lastState.freeRerolls === 1);
  check(`新层首次刷新免费（${lastState.rerollCost}）`, lastState.rerollCost === 0);
}

// ============ 9. HUD 按钮命中区域 ============
console.log('\n=== 9. HUD 按钮命中区域 ===');
{
  const hud = createHudSystem({ getCtx: () => mockCtx, width: 960, height: 600 });

  // 可刷新状态
  hud.run(null, 1 / 60, { ...lastState!, upgradeChoosing: true, canReroll: true, rerollCost: 0, freeRerolls: 1 });
  const btns = hud.getPanelButtons();
  check('升级面板暴露 2 个按钮（刷新/跳过）', btns.length === 2);
  check('含 reroll 按钮', btns.some((b) => b.id === 'reroll'));
  check('含 skip 按钮', btns.some((b) => b.id === 'skip'));
  check('reroll 可点击', btns.find((b) => b.id === 'reroll')?.enabled === true);
  check('按钮不重叠', btns[0].x + btns[0].w <= btns[1].x);

  // 金币不足状态
  hud.run(null, 1 / 60, { ...lastState!, upgradeChoosing: true, canReroll: false, rerollCost: 30 });
  const btns2 = hud.getPanelButtons();
  check('金币不足时 reroll 置灰', btns2.find((b) => b.id === 'reroll')?.enabled === false);
  check('跳过按钮始终可点', btns2.find((b) => b.id === 'skip')?.enabled === true);

  // 非升级态：无按钮
  hud.run(null, 1 / 60, { ...lastState!, upgradeChoosing: false });
  check('非升级态无按钮', hud.getPanelButtons().length === 0);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail > 0) {
  (globalThis as any).process?.exit(1);
}
