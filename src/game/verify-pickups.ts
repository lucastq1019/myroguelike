/**
 * 阶段C2 掉落物回归：掉落生成 / 拾取生效 / 增益计时与回滚 / 寿命回收
 *
 * 运行：npx tsx src/game/verify-pickups.ts
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
import { Position, Velocity, Sprite } from '../GameEngine/ecs/components';
import { createPhysicsSystem } from '../GameEngine/physics';
import {
  Health, Collider, PlayerTag, EnemyTag, EnemyType, ContactDamage,
  RigidBody, dynamicBody, Circle, Pickup, Buff, Box,
} from './components';
import { PickupSystem, spawnDrop, spawnDropsFromEnemy, applyBuff, clearBuffs } from './systems/pickup';
import { LifecycleSystem } from './systems/lifecycle';
import { DROP_CONFIG, BUFF_DEFS, getBuffDef, PICKUP_STYLE } from './resources/Pickups';
import { CollisionSystem } from './systems/collision';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra = '') {
  console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : ' ' + extra}`);
  if (cond) pass++; else fail++;
}

const DT = 1 / 60;

function makeWorld(): World {
  const w = new World();
  w.addSystem(createPhysicsSystem({ gravityY: 2000 }));
  w.addSystem(CollisionSystem);
  w.addSystem(PickupSystem);
  w.addSystem(LifecycleSystem);
  return w;
}

function spawnPlayer(w: World, x: number, y: number): number {
  const p = w.spawn();
  w.addComponent(p, Position, new Position(x, y));
  w.addComponent(p, Velocity, new Velocity(0, 0));
  w.addComponent(p, Health, new Health(100, 100));
  w.addComponent(p, Sprite, new Sprite(28, '#4ec9b0'));
  w.addComponent(p, Collider, new Collider(14));
  w.addComponent(p, PlayerTag, new PlayerTag());
  w.addComponent(p, RigidBody, dynamicBody(1, 0, 0, 0));
  w.addComponent(p, Circle, new Circle(14));
  return p.index;
}

function countPickups(w: World): number {
  return w.dense(Pickup).length;
}

// ============ 1. 掉落生成 ============
console.log('\n=== 1. 掉落生成 ===');
{
  const w = makeWorld();
  // 多次采样：金币必掉，血包/增益按概率出现
  let sawHeal = false;
  let sawBuff = false;
  let minCoins = Infinity;
  for (let i = 0; i < 400; i++) {
    const before = countPickups(w);
    spawnDropsFromEnemy(w, 100, 100, 100);
    const gained = countPickups(w) - before;
    minCoins = Math.min(minCoins, gained);
    for (const p of w.dense(Pickup)) {
      if (p.kind === 'heal') sawHeal = true;
      if (p.kind === 'buff') sawBuff = true;
    }
    // 清空重来
    for (const e of w.entities.getAllEntities()) w.despawn(e);
  }
  check(`每次至少掉 ${DROP_CONFIG.coinMin} 枚金币（最少 ${minCoins}）`, minCoins >= DROP_CONFIG.coinMin);
  check('样本中出现血包掉落', sawHeal);
  check('样本中出现增益掉落', sawBuff);
}

// ============ 2. 金币拾取 ============
console.log('\n=== 2. 金币拾取 ===');
{
  const w = makeWorld();
  (globalThis as any).__coins = 0;
  const pIdx = spawnPlayer(w, 100, 100);
  spawnDrop(w, 'coin', 100, 100, 1);
  check('拾取前金币 = 0', (globalThis as any).__coins === 0);
  w.update(DT);
  check(`拾取后金币 = 1（${(globalThis as any).__coins}）`, (globalThis as any).__coins === 1);
  check('金币实体已回收', countPickups(w) === 0);
}

// ============ 3. 血包拾取（回血 + 不超上限） ============
console.log('\n=== 3. 血包拾取 ===');
{
  const w = makeWorld();
  const pIdx = spawnPlayer(w, 100, 100);
  w.storage.get(pIdx, Health)!.current = 50;
  spawnDrop(w, 'heal', 100, 100, 30);
  w.update(DT);
  check(`回血 50 → 80（${w.storage.get(pIdx, Health)!.current}）`, w.storage.get(pIdx, Health)!.current === 80);

  // 满血拾取不超上限
  w.storage.get(pIdx, Health)!.current = 95;
  spawnDrop(w, 'heal', 100, 100, 30);
  w.update(DT);
  check(`满血不超上限（${w.storage.get(pIdx, Health)!.current}）`, w.storage.get(pIdx, Health)!.current === 100);
}

// ============ 4. 增益：生效 + 计时 + 回滚 ============
console.log('\n=== 4. 增益计时与回滚 ===');
{
  const w = makeWorld();
  const pIdx = spawnPlayer(w, 100, 100);
  (globalThis as any).__buffDamageMul = 1;
  (globalThis as any).__playerSpeedMul = 1;

  const rage = getBuffDef('rage')!;
  spawnDrop(w, 'buff', 100, 100, 1, 'rage');
  w.update(DT);
  check('拾取后玩家带 Buff 组件', w.storage.has(pIdx, Buff));
  check(`狂暴生效：伤害倍率 = 1.6（${(globalThis as any).__buffDamageMul}）`, (globalThis as any).__buffDamageMul === 1.6);

  // 跑过持续时间
  const frames = Math.ceil(rage.duration / DT) + 5;
  for (let i = 0; i < frames; i++) w.update(DT);
  check('到期后移除 Buff 组件', !w.storage.has(pIdx, Buff));
  check(`到期回滚伤害倍率 = 1（${(globalThis as any).__buffDamageMul}）`, (globalThis as any).__buffDamageMul === 1);
}

// ============ 5. 同类增益刷新计时（不叠加） ============
console.log('\n=== 5. 同类增益刷新 ===');
{
  const w = makeWorld();
  const pIdx = spawnPlayer(w, 100, 100);
  applyBuff(w, pIdx, 'haste');
  const b1 = w.storage.get(pIdx, Buff)!;
  for (let i = 0; i < 60; i++) w.update(DT); // 消耗 1 秒
  const tMid = b1.timer;
  applyBuff(w, pIdx, 'haste'); // 再拾取
  check(`重复拾取刷新计时（${tMid.toFixed(2)} → ${b1.timer.toFixed(2)}）`, b1.timer > tMid);
  check('同类增益不新增组件（仍 1 个）', w.dense(Buff).length === 1);
}

// ============ 6. 掉落物寿命回收 ============
console.log('\n=== 6. 掉落物寿命回收 ===');
{
  const w = makeWorld();
  spawnPlayer(w, 1000, 1000); // 玩家远离，避免拾取
  spawnDrop(w, 'coin', 100, 100, 1, '', 0.5);
  check('掉落物已生成', countPickups(w) === 1);
  for (let i = 0; i < 40; i++) w.update(DT); // 0.5s ≈ 30 帧
  check('到期后自动回收', countPickups(w) === 0);
}

// ============ 7. 敌人死亡触发掉落（LifecycleSystem 集成） ============
console.log('\n=== 7. 敌人死亡掉落（集成） ===');
{
  const w = makeWorld();
  const e = w.spawn();
  w.addComponent(e, Position, new Position(300, 100));
  w.addComponent(e, Velocity, new Velocity(0, 0));
  w.addComponent(e, EnemyTag, new EnemyTag());
  w.addComponent(e, EnemyType, new EnemyType('chaser'));
  w.addComponent(e, Health, new Health(0, 50)); // 已死
  w.addComponent(e, Sprite, new Sprite(24, '#e06c75', 'circle'));
  w.addComponent(e, Collider, new Collider(12));
  w.addComponent(e, ContactDamage, new ContactDamage(0.6));
  w.addComponent(e, RigidBody, dynamicBody(1, 0, 0, 0));
  w.addComponent(e, Circle, new Circle(12));

  w.update(DT); // 触发 LifecycleSystem
  check(`敌人死亡后生成掉落物（${countPickups(w)}）`, countPickups(w) >= DROP_CONFIG.coinMin);
  check('敌人实体已销毁', w.dense(EnemyTag).length === 0);
}

// ============ 8. 清空增益（换局） ============
console.log('\n=== 8. 换局清空增益 ===');
{
  const w = makeWorld();
  const pIdx = spawnPlayer(w, 100, 100);
  applyBuff(w, pIdx, 'rage');
  check('换局前有增益', w.dense(Buff).length === 1);
  clearBuffs(w);
  check('换局后增益清空', w.dense(Buff).length === 0);
  check(`换局后倍率复位（${(globalThis as any).__buffDamageMul}）`, (globalThis as any).__buffDamageMul === 1);
}

// ============ 9. 掉落物落在地面（不下穿） ============
console.log('\n=== 9. 掉落物落地 ===');
{
  const w = makeWorld();
  // 地面：实心 Box，顶面 y = 500
  const ground = w.spawn();
  w.addComponent(ground, Position, new Position(500, 520));
  w.addComponent(ground, Sprite, new Sprite(40, '#2f2f2f'));
  w.addComponent(ground, Collider, new Collider(20));
  w.addComponent(ground, Box, new Box(500, 20));

  spawnPlayer(w, 3000, 100); // 玩家远离
  spawnDrop(w, 'coin', 500, 300, 1, '', 0); // 从空中落下、永久存活
  const idx = w.denseEntities(Pickup)[0];

  // 跑 2 秒让它落地
  for (let i = 0; i < 120; i++) w.update(DT);

  const pos = w.storage.get(idx, Position)!;
  const col = w.storage.get(idx, Collider)!;
  const bottom = pos.y + col.radius;
  check(`掉落物停在地面上（bottom=${bottom.toFixed(1)} ≈ 500）`, Math.abs(bottom - 500) < 3, `y=${pos.y.toFixed(1)}`);
  check('掉落物未穿透地面', bottom <= 500 + 1);
}

// ============ 10. 配置完整性 ============
console.log('\n=== 10. 配置完整性 ===');
{
  check('掉落物外观齐全（coin/heal/buff）', !!PICKUP_STYLE.coin && !!PICKUP_STYLE.heal && !!PICKUP_STYLE.buff);
  check('增益表非空且字段完整', BUFF_DEFS.length > 0 && BUFF_DEFS.every((b) => b.id && b.name && b.duration > 0 && !!b.apply && !!b.revert));
  check('血包回复比例合理（0~1）', DROP_CONFIG.healRatio > 0 && DROP_CONFIG.healRatio <= 1);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail > 0) {
  (globalThis as any).process?.exit(1);
}
