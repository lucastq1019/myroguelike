/**
 * 阶段3 词条回归：稀有度分级 / 加权抽取 / 新词条生效
 *
 * 运行：npx tsx src/game/verify-upgrades.ts
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
const mockCtx = new Proxy({} as any, {
  get(_t, prop: string) { return prop === 'canvas' ? { width: 960, height: 600 } : () => {}; },
  set: () => true,
});
const mockCanvas: any = { width: 960, height: 600, style: {}, addEventListener: () => {}, getContext: () => mockCtx };
(globalThis as any).document = {
  createElement: (tag: string) => (tag === 'canvas' ? mockCanvas : { style: {}, appendChild: () => {} }),
  body: { appendChild: () => {}, insertBefore: () => {} },
};

import { World } from '../GameEngine/ecs';
import { Position, Velocity } from '../GameEngine/ecs/components';
import {
  Health, Sprite, Collider, PlayerTag, Facing, Weapon, MeleeAttack,
  Locomotion, JumpState, Lifesteal, CritChance,
} from './components';
import { UPGRADES, rollUpgrades, RARITY_COLOR, RARITY_NAME, Rarity } from './resources/Upgrades';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (cond) pass++; else fail++;
}

/** 生成一个完整玩家（用于 apply 测试） */
function makePlayer(w: World) {
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

// ============ 1. 稀有度字段完整 ============
console.log('\n=== 1. 稀有度字段完整 ===');
{
  const valid: Rarity[] = ['common', 'rare', 'epic'];
  const allHaveRarity = UPGRADES.every((u) => valid.includes(u.rarity));
  check(`所有词条都有合法稀有度（${UPGRADES.length} 个）`, allHaveRarity);

  const hasCommon = UPGRADES.some((u) => u.rarity === 'common');
  const hasRare = UPGRADES.some((u) => u.rarity === 'rare');
  const hasEpic = UPGRADES.some((u) => u.rarity === 'epic');
  check('三种稀有度都有词条', hasCommon && hasRare && hasEpic);

  check('稀有度颜色齐全', !!RARITY_COLOR.common && !!RARITY_COLOR.rare && !!RARITY_COLOR.epic);
  check('稀有度名称齐全', !!RARITY_NAME.common && !!RARITY_NAME.rare && !!RARITY_NAME.epic);
}

// ============ 2. 加权抽取 ============
console.log('\n=== 2. 加权抽取 ===');
{
  // 抽 3 个不重复
  const r = rollUpgrades(3);
  check(`抽取 3 个词条（${r.length}）`, r.length === 3);
  const ids = new Set(r.map((u) => u.id));
  check('抽取结果不重复', ids.size === 3);

  // 统计稀有度分布（抽 3000 次，验证稀有度确实更难出）
  const counts: Record<Rarity, number> = { common: 0, rare: 0, epic: 0 };
  for (let i = 0; i < 3000; i++) {
    for (const u of rollUpgrades(3)) counts[u.rarity]++;
  }
  check(`普通出现最多（${counts.common}）`, counts.common > counts.rare);
  check(`史诗出现最少（${counts.epic}）`, counts.epic < counts.rare);
}

// ============ 3. 新词条生效 ============
console.log('\n=== 3. 新词条生效 ===');
{
  const w = new World();
  const p = makePlayer(w);

  // 吸血
  const lifesteal = UPGRADES.find((u) => u.id === 'lifesteal')!;
  const lsBefore = w.getComponent(p, Lifesteal)!.perHit;
  lifesteal.apply(w, p);
  const lsAfter = w.getComponent(p, Lifesteal)!.perHit;
  check(`吸血词条生效（${lsBefore} → ${lsAfter}）`, lsAfter === lsBefore + 1);

  // 暴击
  const crit = UPGRADES.find((u) => u.id === 'crit')!;
  const critBefore = w.getComponent(p, CritChance)!.chance;
  crit.apply(w, p);
  const critAfter = w.getComponent(p, CritChance)!.chance;
  check(`暴击词条生效（${critBefore} → ${critAfter}）`, Math.abs(critAfter - (critBefore + 0.2)) < 1e-9);

  // 弹药伤害
  const bulletpower = UPGRADES.find((u) => u.id === 'bulletpower')!;
  const dmgBefore = w.getComponent(p, Weapon)!.damage;
  bulletpower.apply(w, p);
  const dmgAfter = w.getComponent(p, Weapon)!.damage;
  check(`强化弹药生效（${dmgBefore} → ${dmgAfter}）`, dmgAfter === dmgBefore + 8);

  // 射速
  const firerate = UPGRADES.find((u) => u.id === 'firerate')!;
  const cdBefore = w.getComponent(p, Weapon)!.cooldown;
  firerate.apply(w, p);
  const cdAfter = w.getComponent(p, Weapon)!.cooldown;
  check(`速射装置生效（${cdBefore.toFixed(2)} → ${cdAfter.toFixed(2)}）`, cdAfter < cdBefore);

  // 三段跳
  const triple = UPGRADES.find((u) => u.id === 'doublejump')!;
  const jumpsBefore = w.getComponent(p, Locomotion)!.maxJumps;
  triple.apply(w, p);
  const jumpsAfter = w.getComponent(p, Locomotion)!.maxJumps;
  check(`三段跳生效（${jumpsBefore} → ${jumpsAfter}）`, jumpsAfter === jumpsBefore + 1);
}

// ============ 4. 暴击上限钳制 ============
console.log('\n=== 4. 暴击率上限 ===');
{
  const w = new World();
  const p = makePlayer(w);
  const crit = UPGRADES.find((u) => u.id === 'crit')!;
  // 连加 10 次，应钳制在 1.0
  for (let i = 0; i < 10; i++) crit.apply(w, p);
  const chance = w.getComponent(p, CritChance)!.chance;
  check(`暴击率不超过 1.0（${chance}）`, chance <= 1.0);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail > 0) {
  (globalThis as any).process?.exit(1);
}
