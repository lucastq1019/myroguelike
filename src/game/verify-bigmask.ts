/**
 * 回归测试：复现「组件类型超过 31 种」崩溃场景。
 *
 * 原崩溃：spawnDamageNumber → world.addComponent → ComponentStorage.getBitMask 抛错。
 * 修复：位掩码改 BigInt。
 *
 * 运行：npx tsx src/game/verify-bigmask.ts
 */
const listeners: Record<string, Function[]> = {};
(globalThis as any).window = {
  innerWidth: 960, innerHeight: 600, devicePixelRatio: 1,
  addEventListener: (t: string, cb: Function) => { (listeners[t] ||= []).push(cb); },
  removeEventListener: () => {},
};
(globalThis as any).requestAnimationFrame = () => 0;
(globalThis as any).performance = { now: () => Date.now() };
const mockCtx = new Proxy({} as any, {
  get(_t, p: string) { return p === 'canvas' ? { width: 960, height: 600 } : () => {}; },
  set: () => true,
});
const mockCanvas: any = { width: 960, height: 600, style: {}, addEventListener: () => {}, getContext: () => mockCtx };
(globalThis as any).document = {
  createElement: (t: string) => (t === 'canvas' ? mockCanvas : { style: {}, appendChild: () => {} }),
  body: { appendChild: () => {}, insertBefore: () => {} },
};

import { World } from '../GameEngine/ecs';
import { Position, Velocity, Sprite } from '../GameEngine/ecs/components';
import { Camera } from '../GameEngine/resources/Camera';
import { createRenderSystem } from '../GameEngine/renderer/RenderSystem';
import {
  PlayerTag, EnemyTag, BulletTag, MeleeHitbox, MeleeLifetime, Facing, HitFlash,
  ComboState, ComboCounter, Collider, Health, Knockback, DamageNumber, HitSpark, DeathBurst,
  Wall, Portal, EnemyType, ContactDamage, Chase, Weapon, Shooter, Charger, Invincible,
  AttackTiming, Locomotion, JumpState, DashState, IgnorePlatforms, MeleeAttack, Afterimage,
  Patrol, Jumper, RigidBody, Circle, Box, Platform,
} from './components';
import { spawnDamageNumber, spawnHitSpark, spawnDeathBurst, FxSystem } from './systems/fx';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

console.log('1) 注册超过 31 种组件类型不报错');
const world = new World();
world.insertResource(Camera, new Camera(960, 600, 960, 600));

// 注册真实游戏用到的所有组件类型（>31 种）
const types = [
  Position, Velocity, Sprite, PlayerTag, EnemyTag, BulletTag, MeleeHitbox, MeleeLifetime,
  Facing, HitFlash, ComboState, ComboCounter, Collider, Health, Knockback,
  DamageNumber, HitSpark, DeathBurst,
  Wall, Portal, EnemyType, ContactDamage, Chase, Weapon, Shooter, Charger, Invincible,
  AttackTiming, Locomotion, JumpState, DashState, IgnorePlatforms, MeleeAttack, Afterimage,
  Patrol, Jumper, RigidBody, Circle, Box, Platform,
];
let maskCount = 0;
let threw = false;
try {
  for (const t of types) {
    world.maskOf(t as any);
    maskCount++;
  }
} catch (e) {
  threw = true;
  console.log(`    异常：${(e as Error).message}`);
}
check(`注册 ${maskCount} 种组件类型（>31）无异常`, !threw && maskCount === types.length, `count=${maskCount}`);

console.log('2) 生成打击特效（原崩溃点）');
const e = world.spawn();
world.addComponent(e, Position, new Position(0, 0));
let spawnOk = true;
try {
  spawnDamageNumber(world, 100, 100, 42);
  spawnHitSpark(world, 100, 100);
  spawnDeathBurst(world, 100, 100);
} catch (err) {
  spawnOk = false;
  console.log(`    异常：${(err as Error).message}`);
}
check('生成伤害飘字/冲击波/爆裂无异常', spawnOk);
check('伤害飘字实体已创建', world.dense(DamageNumber).length > 0);
check('冲击波实体已创建', world.dense(HitSpark).length > 0);
check('爆裂粒子已创建', world.dense(DeathBurst).length > 0);

console.log('3) 特效系统更新 + 到期销毁');
for (let i = 0; i < 80; i++) FxSystem.run(world, 1 / 60);
check('特效到期后全部销毁', world.dense(DamageNumber).length === 0 && world.dense(HitSpark).length === 0 && world.dense(DeathBurst).length === 0);

console.log('4) 位掩码查询正确（BigInt）');
{
  const world2 = new World();
  const a = world2.spawn();
  world2.addComponent(a, Position, new Position(0, 0));
  world2.addComponent(a, Health, new Health(10, 10));
  const b = world2.spawn();
  world2.addComponent(b, Position, new Position(0, 0));
  world2.addComponent(b, Velocity, new Velocity(0, 0));

  const posMask = world2.maskOf(Position);
  const hpMask = world2.maskOf(Health);
  const found = world2.findEntities(world2.query().with(posMask, hpMask).build());
  check('查询 Position+Health 命中 1 个', found.length === 1 && found[0] === a.index, `found=${found}`);

  const onlyPos = world2.findEntities(world2.query().with(posMask).build());
  check('查询 Position 命中 2 个', onlyPos.length === 2, `found=${onlyPos.length}`);
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) throw new Error(`BigInt 位掩码回归测试失败：${failed} 项`);
