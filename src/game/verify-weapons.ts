/**
 * 阶段2 远程武器回归：冷却 / 伤害 / 子弹生命周期
 *
 * 运行：npx tsx src/game/verify-weapons.ts
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
import { createPhysicsSystem } from '../GameEngine/physics';
import { Input } from '../GameEngine/resources/Input';
import {
  Health, Sprite, Collider, PlayerTag, EnemyTag, Facing, Weapon, BulletTag,
  RigidBody, dynamicBody, Circle,
} from './components';
import { createRangedSystem } from './systems/ranged';
import { CollisionSystem } from './systems/collision';
import { LifecycleSystem } from './systems/lifecycle';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (cond) pass++; else fail++;
}

const DT = 1 / 60;

/** 构造 world：物理 + 远程武器 + 碰撞 + 生命周期 */
function makeWorld(input: Input): World {
  const w = new World();
  w.addSystem(createPhysicsSystem({ gravityY: 0 }));
  w.addSystem(createRangedSystem(input));
  w.addSystem(CollisionSystem);
  w.addSystem(LifecycleSystem);
  return w;
}

/** 生成玩家（带 Weapon） */
function spawnPlayer(w: World, x: number, y: number, weapon: Weapon): number {
  const p = w.spawn();
  w.addComponent(p, Position, new Position(x, y));
  w.addComponent(p, Velocity, new Velocity(0, 0));
  w.addComponent(p, Health, new Health(100, 100));
  w.addComponent(p, Sprite, new Sprite(28, '#4ec9b0'));
  w.addComponent(p, Collider, new Collider(14));
  w.addComponent(p, PlayerTag, new PlayerTag());
  w.addComponent(p, Facing, new Facing(1));
  w.addComponent(p, Weapon, weapon);
  return p.index;
}

/** 生成敌人 */
function spawnEnemy(w: World, x: number, y: number, hp: number): number {
  const e = w.spawn();
  w.addComponent(e, Position, new Position(x, y));
  w.addComponent(e, Velocity, new Velocity(0, 0));
  w.addComponent(e, EnemyTag, new EnemyTag());
  w.addComponent(e, Health, new Health(hp, hp));
  w.addComponent(e, Sprite, new Sprite(24, '#e06c75', 'circle'));
  w.addComponent(e, Collider, new Collider(12));
  w.addComponent(e, RigidBody, dynamicBody(1, 0, 0, 0));
  w.addComponent(e, Circle, new Circle(12));
  return e.index;
}

/** 统计子弹数量 */
function countBullets(w: World): number {
  return w.findEntities(w.query().with(w.maskOf(BulletTag)).build()).length;
}

// ============ 1. 按 U 发射子弹 ============
console.log('\n=== 1. 按 U 发射子弹 ===');
{
  const input = new Input();
  const w = makeWorld(input);
  spawnPlayer(w, 100, 300, new Weapon(0.45, 560, 14));

  check('初始无子弹', countBullets(w) === 0);

  input.firePressed = true;
  w.update(DT);
  check(`按 U 后生成 1 颗子弹（${countBullets(w)}）`, countBullets(w) === 1);

  // 子弹朝右（朝向 dir=1）飞行
  const bIdx = w.findEntities(w.query().with(w.maskOf(BulletTag)).build())[0];
  const bVel = w.storage.get(bIdx, Velocity)!;
  check(`子弹朝右飞行（vx=${bVel.x}）`, bVel.x > 0);
}

// ============ 2. 冷却限制 ============
console.log('\n=== 2. 冷却限制 ===');
{
  const input = new Input();
  const w = makeWorld(input);
  spawnPlayer(w, 100, 300, new Weapon(0.45, 560, 14));

  // 连续两帧按 U（未过冷却）
  input.firePressed = true;
  w.update(DT);
  input.firePressed = true;
  w.update(DT);
  check(`冷却内连按只发 1 颗（${countBullets(w)}）`, countBullets(w) === 1);

  // 等待冷却结束（0.45s ≈ 27 帧）
  input.firePressed = false;
  for (let i = 0; i < 30; i++) w.update(DT);
  input.firePressed = true;
  w.update(DT);
  check(`冷却结束后可再发（${countBullets(w)}）`, countBullets(w) === 2);
}

// ============ 3. 子弹命中敌人造成伤害 ============
console.log('\n=== 3. 子弹命中敌人造成伤害 ===');
{
  const input = new Input();
  const w = makeWorld(input);
  spawnPlayer(w, 100, 300, new Weapon(0.45, 560, 14));
  const enemyIdx = spawnEnemy(w, 160, 300, 50); // 敌人在玩家右侧 60px

  input.firePressed = true;
  w.update(DT);
  input.firePressed = false; // 手动重置边沿标志（测试中不调用 endFrame）

  // 跑若干帧让子弹飞到敌人
  for (let i = 0; i < 30; i++) w.update(DT);

  const hp = w.storage.get(enemyIdx, Health);
  check(`敌人受到子弹伤害（50 → ${hp?.current}）`, hp !== undefined && hp.current < 50);
  check(`伤害值 = 14（50 - 14 = 36）`, hp?.current === 36);
  check(`命中后子弹销毁（${countBullets(w)}）`, countBullets(w) === 0);
}

// ============ 4. 子弹生命周期（超时销毁） ============
console.log('\n=== 4. 子弹生命周期 ===');
{
  const input = new Input();
  const w = makeWorld(input);
  spawnPlayer(w, 100, 300, new Weapon(0.45, 560, 14));

  input.firePressed = true;
  w.update(DT);
  check('发射后子弹存在', countBullets(w) === 1);

  // 子弹 life = 1.4s ≈ 84 帧，跑 100 帧应销毁
  input.firePressed = false;
  for (let i = 0; i < 100; i++) w.update(DT);
  check(`子弹超时销毁（${countBullets(w)}）`, countBullets(w) === 0);
}

// ============ 5. 朝向决定发射方向 ============
console.log('\n=== 5. 朝向决定发射方向 ===');
{
  const input = new Input();
  const w = makeWorld(input);
  const pIdx = spawnPlayer(w, 300, 300, new Weapon(0.45, 560, 14));
  w.storage.get(pIdx, Facing)!.dir = -1; // 面朝左

  input.firePressed = true;
  w.update(DT);

  const bIdx = w.findEntities(w.query().with(w.maskOf(BulletTag)).build())[0];
  const bVel = w.storage.get(bIdx, Velocity)!;
  check(`面朝左时子弹朝左（vx=${bVel.x}）`, bVel.x < 0);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail > 0) {
  (globalThis as any).process?.exit(1);
}
