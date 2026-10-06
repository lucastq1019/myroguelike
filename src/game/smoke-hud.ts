/**
 * HUD 渲染冒烟测试：确认画布内 HUD 绘制正常，且升级卡片命中区域正确暴露。
 * 运行：npx tsx src/game/smoke-hud.ts
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

import { createHudSystem } from './systems/hud';
import { GameState } from './game';

const hud = createHudSystem({ getCtx: () => mockCtx, width: 960, height: 600 });

// ---- 1. 普通游戏状态 ----
const normalState: GameState = {
  hp: 75,
  maxHp: 100,
  floor: 3,
  enemiesLeft: 4,
  gameOver: false,
  upgradeChoosing: false,
  upgradeOptions: [],
  combo: 5,
  comboStage: 2,
  coins: 12,
  buffs: [{ id: 'rage', name: '狂暴', color: '#ff8c42', timer: 5.2 }],
  freeRerolls: 1,
  rerollCost: 0,
  canReroll: true,
  skipHeal: 25,
};
calls.length = 0;
hud.run(null, 1 / 60, normalState);
const hasFillRect = calls.some((c) => c.startsWith('fillRect'));
const hasFillText = calls.some((c) => c.startsWith('fillText'));
console.log('=== HUD 冒烟测试 ===');
console.log(`普通状态：fillRect=${hasFillRect} fillText=${hasFillText}`);
console.log(`升级卡片区域（普通状态应为 0）：${hud.getUpgradeCardRects().length}`);

// ---- 2. 升级选择状态 ----
const upgradeState: GameState = {
  hp: 100,
  maxHp: 100,
  floor: 2,
  enemiesLeft: 0,
  gameOver: false,
  upgradeChoosing: true,
  upgradeOptions: [
    { id: 'a', name: '锋利刀刃', desc: '近战伤害 +10', rarity: 'common', apply: () => {} },
    { id: 'b', name: '强化弹药', desc: '子弹伤害 +8', rarity: 'rare', apply: () => {} },
    { id: 'c', name: '吸血之刃', desc: '命中回血', rarity: 'epic', apply: () => {} },
  ],
  combo: 0,
  comboStage: 0,
  coins: 0,
  buffs: [],
  freeRerolls: 1,
  rerollCost: 0,
  canReroll: true,
  skipHeal: 25,
};
calls.length = 0;
hud.run(null, 1 / 60, upgradeState);
const rects = hud.getUpgradeCardRects();
console.log(`升级状态：卡片区域数=${rects.length}`);
rects.forEach((r) => console.log(`  卡片 ${r.index}: x=${r.x.toFixed(0)} y=${r.y.toFixed(0)} w=${r.w} h=${r.h}`));

// ---- 3. 死亡状态 ----
const deadState: GameState = { ...normalState, gameOver: true };
calls.length = 0;
hud.run(null, 1 / 60, deadState);
const hasDeadText = calls.length > 0;
console.log(`死亡状态：绘制调用=${calls.length}`);

// 断言
const ok =
  hasFillRect &&
  hasFillText &&
  rects.length === 3 &&
  rects[0].w === 200 &&
  rects[0].x < rects[1].x &&
  rects[1].x < rects[2].x &&
  hasDeadText;

console.log(ok ? '\n✅ HUD 渲染正常' : '\n❌ HUD 渲染异常');
if (!ok) throw new Error('HUD 冒烟测试失败');
