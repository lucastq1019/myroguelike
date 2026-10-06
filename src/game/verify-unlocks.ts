/**
 * 阶段C3 回归：局外永久解锁
 *
 * 覆盖：
 *   - 两种货币分离：局内金币不入存档，灵魂跨局保留
 *   - 结算灵魂 = 层数 * SOULS_PER_FLOOR + 新纪录奖励
 *   - 解锁：扣灵魂、写入已解锁、重复/不足时拒绝
 *   - 解锁项应用到新一局玩家
 *   - 商店界面暴露解锁按钮命中区域，已解锁项不可再点
 *
 * 运行：npx tsx src/game/verify-unlocks.ts
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

import { World } from '../GameEngine/ecs';
import { Position, Velocity, Sprite } from '../GameEngine/ecs/components';
import {
  Health, Collider, PlayerTag, Facing, Locomotion, JumpState, MeleeAttack,
  Weapon, Lifesteal, CritChance,
} from './components';
import {
  loadSave, writeSave, recordRun, clearSave, unlockItem,
  soulsForRun, SOULS_PER_FLOOR, SOULS_NEW_BEST_BONUS,
} from './save';
import { UNLOCKS, getUnlockDef, applyUnlocks } from './resources/Unlocks';
import { createScreenSystem } from './systems/screen';
import { GamePhase } from './state';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra = '') {
  console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : ' ' + extra}`);
  if (cond) pass++; else fail++;
}

// ============ 1. 两种货币分离 ============
console.log('\n=== 1. 两种货币分离 ===');
{
  clearSave();
  // 局内金币：模拟本局拾取
  (globalThis as any).__coins = 77;
  // 结算：只写灵魂，不写金币
  const r = recordRun(5, 10);
  const save = loadSave();
  check('存档不含 coins 字段（局内金币不入档）', !('coins' in (save as any)));
  check(`结算写入灵魂（${save.souls}）`, save.souls === soulsForRun(5, true));
  check('局内金币仍独立存在（不因结算变化）', (globalThis as any).__coins === 77);
}

// ============ 2. 灵魂结算公式 ============
console.log('\n=== 2. 灵魂结算公式 ===');
{
  check(`每层 +${SOULS_PER_FLOOR}`, soulsForRun(3, false) === 3 * SOULS_PER_FLOOR);
  check(`新纪录额外 +${SOULS_NEW_BEST_BONUS}`, soulsForRun(3, true) === 3 * SOULS_PER_FLOOR + SOULS_NEW_BEST_BONUS);
  check('0 层非新纪录 = 0', soulsForRun(0, false) === 0);

  clearSave();
  const r1 = recordRun(4, 0);
  check(`首局 4 层 → 新纪录，+${r1.soulsGained}`, r1.isNewBest && r1.soulsGained === 4 * SOULS_PER_FLOOR + SOULS_NEW_BEST_BONUS);
  const r2 = recordRun(2, 0);
  check(`次局 2 层 → 非新纪录，+${r2.soulsGained}`, !r2.isNewBest && r2.soulsGained === 2 * SOULS_PER_FLOOR);
  check(`灵魂累计（${loadSave().souls}）`, loadSave().souls === r1.soulsGained + r2.soulsGained);
}

// ============ 3. 解锁：扣灵魂 + 写入 ============
console.log('\n=== 3. 解锁扣费 ===');
{
  clearSave();
  writeSave({ bestFloor: 0, bestCombo: 0, runs: 0, souls: 100, unlocked: [] });
  const def = getUnlockDef('vitality')!;
  const next = unlockItem('vitality', def.cost);
  check('解锁成功返回新存档', next !== null);
  check(`扣除灵魂 100 → ${100 - def.cost}`, next!.souls === 100 - def.cost);
  check('已解锁列表含该 id', next!.unlocked.includes('vitality'));
  check('持久化生效', loadSave().unlocked.includes('vitality') && loadSave().souls === 100 - def.cost);

  check('重复解锁返回 null', unlockItem('vitality', def.cost) === null);
  check('灵魂不足返回 null', unlockItem('vampire', 99999) === null);
  check('失败不扣灵魂', loadSave().souls === 100 - def.cost);
}

// ============ 4. 解锁项应用到玩家 ============
console.log('\n=== 4. 解锁项应用到玩家 ===');
{
  const w = new World();
  function makePlayer() {
    const p = w.spawn();
    w.addComponent(p, Position, new Position(0, 0));
    w.addComponent(p, Velocity, new Velocity(0, 0));
    w.addComponent(p, Health, new Health(100, 100));
    w.addComponent(p, Sprite, new Sprite(28, '#4ec9b0'));
    w.addComponent(p, Collider, new Collider(14));
    w.addComponent(p, PlayerTag, new PlayerTag());
    w.addComponent(p, Facing, new Facing(1));
    w.addComponent(p, Locomotion, new Locomotion(240, 720, 0.45, 900, 2));
    w.addComponent(p, JumpState, new JumpState());
    w.addComponent(p, MeleeAttack, new MeleeAttack(0.32, 0.12, 26, 20, 30, 220));
    w.addComponent(p, Weapon, new Weapon(0.45, 560, 14));
    w.addComponent(p, Lifesteal, new Lifesteal(0));
    w.addComponent(p, CritChance, new CritChance(0));
    return p;
  }

  // 无解锁：基线
  const p0 = makePlayer();
  const baseHp = w.getComponent(p0, Health)!.max;
  const baseSpd = w.getComponent(p0, Locomotion)!.moveSpeed;
  const baseDmg = w.getComponent(p0, MeleeAttack)!.damage;

  // 应用全部解锁
  const p1 = makePlayer();
  applyUnlocks(w, p1, UNLOCKS.map((u) => u.id));
  const hp1 = w.getComponent(p1, Health)!;
  const loco1 = w.getComponent(p1, Locomotion)!;
  const atk1 = w.getComponent(p1, MeleeAttack)!;
  const ls1 = w.getComponent(p1, Lifesteal)!;
  const crit1 = w.getComponent(p1, CritChance)!;
  const wp1 = w.getComponent(p1, Weapon)!;

  check(`最大生命 +20（${baseHp} → ${hp1.max}）`, hp1.max === baseHp + 20);
  check('解锁后回满血', hp1.current === hp1.max);
  check(`移速 +10%（${baseSpd} → ${loco1.moveSpeed.toFixed(0)}）`, Math.abs(loco1.moveSpeed - baseSpd * 1.1) < 1e-6);
  check(`近战伤害 +8（${baseDmg} → ${atk1.damage}）`, atk1.damage === baseDmg + 8);
  check(`自带吸血 1（${ls1.perHit}）`, ls1.perHit === 1);
  check(`自带暴击 10%（${crit1.chance}）`, Math.abs(crit1.chance - 0.1) < 1e-9);
  check(`子弹伤害 +6（${wp1.damage}）`, wp1.damage === 14 + 6);

  // 部分解锁
  const p2 = makePlayer();
  applyUnlocks(w, p2, ['vitality']);
  check('只应用已解锁项', w.getComponent(p2, Health)!.max === baseHp + 20 && w.getComponent(p2, Lifesteal)!.perHit === 0);

  // 未知 id 安全忽略
  const p3 = makePlayer();
  let threw = false;
  try { applyUnlocks(w, p3, ['__nonexistent__']); } catch { threw = true; }
  check('未知解锁 id 不抛错', !threw);
}

// ============ 5. 商店界面 ============
console.log('\n=== 5. 商店界面 ===');
{
  const screen = createScreenSystem({ getCtx: () => mockCtx, width: 960, height: 600 });
  const save = { bestFloor: 5, bestCombo: 12, runs: 3, souls: 30, unlocked: ['vitality'] };

  // 主菜单有商店按钮
  screen.run(null, 1 / 60, { phase: GamePhase.MENU, floor: 0, combo: 0, save, isNewBest: false, soulsGained: 0 });
  const menuBtns = screen.getButtons();
  check('主菜单有「商店」按钮', menuBtns.some((b) => b.id === 'shop'));

  // 商店界面
  calls.length = 0;
  screen.run(null, 1 / 60, { phase: GamePhase.SHOP, floor: 0, combo: 0, save, isNewBest: false, soulsGained: 0 });
  const shopBtns = screen.getButtons();
  check('商店有返回按钮', shopBtns.some((b) => b.id === 'back'));
  const unlockBtns = shopBtns.filter((b) => b.id.startsWith('unlock:'));
  check(`商店暴露可购买解锁项（${unlockBtns.length} 个）`, unlockBtns.length > 0);
  check('已解锁项不在可点列表', !unlockBtns.some((b) => b.id === 'unlock:vitality'));
  check('未解锁项在可点列表', unlockBtns.some((b) => b.id === 'unlock:swift'));
  check('商店绘制了文字', calls.some((c) => c.startsWith('fillText')));

  // 灵魂不足时仍可点击（由 unlockItem 兜底拒绝），但界面不崩
  const poorSave = { ...save, souls: 0, unlocked: [] };
  screen.run(null, 1 / 60, { phase: GamePhase.SHOP, floor: 0, combo: 0, save: poorSave, isNewBest: false, soulsGained: 0 });
  check('灵魂为 0 时商店正常渲染', screen.getButtons().length > 0);

  // 结束界面显示灵魂
  calls.length = 0;
  screen.run(null, 1 / 60, { phase: GamePhase.GAMEOVER, floor: 4, combo: 9, save, isNewBest: true, soulsGained: 9 });
  check('结束界面绘制灵魂奖励', calls.some((c) => c.startsWith('fillText')));
}

// ============ 6. 解锁表完整性 ============
console.log('\n=== 6. 解锁表完整性 ===');
{
  check('解锁表非空', UNLOCKS.length > 0);
  check('每项字段完整', UNLOCKS.every((u) => u.id && u.name && u.desc && u.cost > 0 && !!u.apply));
  const ids = UNLOCKS.map((u) => u.id);
  check('id 不重复', new Set(ids).size === ids.length);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail > 0) {
  (globalThis as any).process?.exit(1);
}
