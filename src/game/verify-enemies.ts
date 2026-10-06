/**
 * 阶段1 敌人回归：飞行敌人（不受重力）+ 分裂敌人（死亡生成小怪）
 *
 * 运行：npx tsx src/game/verify-enemies.ts
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
import {
  Health, Sprite, Collider, EnemyTag, EnemyType, ContactDamage,
  Chase, Patrol, Flying, Splitter, RigidBody, dynamicBody, Circle,
} from './components';
import { LifecycleSystem } from './systems/lifecycle';
import { spawnEnemy } from './systems/level';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (cond) pass++; else fail++;
}

const GRAVITY_Y = 2000;
const DT = 1 / 60;

/** 构造一个只含物理系统的 world */
function makeWorld(): World {
  const w = new World();
  w.addSystem(createPhysicsSystem({ gravityY: GRAVITY_Y }));
  return w;
}

// ============ 1. 飞行敌人不受重力 ============
console.log('\n=== 1. 飞行敌人不受重力 ===');
{
  const world = makeWorld();

  // 飞行敌人：无重力刚体 + Flying
  const flyer = world.spawn();
  world.addComponent(flyer, Position, new Position(300, 200));
  world.addComponent(flyer, Velocity, new Velocity(0, 0));
  world.addComponent(flyer, EnemyTag, new EnemyTag());
  world.addComponent(flyer, EnemyType, new EnemyType('flyer'));
  world.addComponent(flyer, Health, new Health(45, 45));
  world.addComponent(flyer, Sprite, new Sprite(22, '#56b6c2', 'circle'));
  world.addComponent(flyer, Collider, new Collider(11));
  world.addComponent(flyer, ContactDamage, new ContactDamage(0.8));
  world.addComponent(flyer, Flying, new Flying(90, 40, 1.6));
  world.addComponent(flyer, RigidBody, dynamicBody(1, 0.0, 0.0, 0)); // 无重力
  world.addComponent(flyer, Circle, new Circle(11));

  // 对照：普通地面敌人（有重力）
  const grounder = world.spawn();
  world.addComponent(grounder, Position, new Position(100, 200));
  world.addComponent(grounder, Velocity, new Velocity(0, 0));
  world.addComponent(grounder, EnemyTag, new EnemyTag());
  world.addComponent(grounder, Health, new Health(50, 50));
  world.addComponent(grounder, Collider, new Collider(12));
  world.addComponent(grounder, RigidBody, dynamicBody(1, 0.0, 0.6, 1)); // 有重力
  world.addComponent(grounder, Circle, new Circle(12));

  const flyerY0 = world.storage.get(flyer.index, Position)!.y;
  const grounderY0 = world.storage.get(grounder.index, Position)!.y;

  // 跑 60 帧（1 秒），不施加任何 AI（只跑物理）
  for (let i = 0; i < 60; i++) world.update(DT);

  const flyerY1 = world.storage.get(flyer.index, Position)!.y;
  const grounderY1 = world.storage.get(grounder.index, Position)!.y;

  check(`飞行敌人无重力（y ${flyerY0.toFixed(0)} → ${flyerY1.toFixed(0)}，几乎不变）`, Math.abs(flyerY1 - flyerY0) < 5);
  check(`地面敌人受重力下落（y ${grounderY0.toFixed(0)} → ${grounderY1.toFixed(0)}）`, grounderY1 > grounderY0 + 50);
}

// ============ 2. 分裂敌人死亡生成小怪 ============
console.log('\n=== 2. 分裂敌人死亡生成小怪 ===');
{
  const world = makeWorld();
  world.addSystem(LifecycleSystem);

  const splitter = world.spawn();
  world.addComponent(splitter, Position, new Position(400, 300));
  world.addComponent(splitter, Velocity, new Velocity(0, 0));
  world.addComponent(splitter, EnemyTag, new EnemyTag());
  world.addComponent(splitter, EnemyType, new EnemyType('splitter'));
  world.addComponent(splitter, Health, new Health(0, 60)); // 已死
  world.addComponent(splitter, Sprite, new Sprite(34, '#98c379', 'rect'));
  world.addComponent(splitter, Collider, new Collider(17));
  world.addComponent(splitter, ContactDamage, new ContactDamage(0.5));
  world.addComponent(splitter, Splitter, new Splitter(3, 18, 9, 0.4, 0));
  world.addComponent(splitter, Chase, new Chase(55));
  world.addComponent(splitter, RigidBody, dynamicBody(1, 0.0, 0.6, 1));
  world.addComponent(splitter, Circle, new Circle(17));
  world.addComponent(splitter, Patrol, new Patrol(40, 300, 500));

  const enemiesBefore = world.findEntities(world.query().with(world.maskOf(EnemyTag)).build()).length;
  check(`分裂前敌人数量 = ${enemiesBefore}`, enemiesBefore === 1);

  // 跑 1 帧触发 LifecycleSystem
  world.update(DT);

  const enemiesAfter = world.findEntities(world.query().with(world.maskOf(EnemyTag)).build());
  check(`分裂后敌人数量 = ${enemiesAfter.length}（母体销毁 + 3 小怪）`, enemiesAfter.length === 3);

  // 小怪不应再带 Splitter（防止无限分裂）
  let childHasSplitter = 0;
  for (const ei of enemiesAfter) {
    if (world.storage.has(ei, Splitter)) childHasSplitter++;
  }
  check(`小怪不再携带 Splitter（${childHasSplitter} 个）`, childHasSplitter === 0);

  // 小怪应有正确生命值
  let childHpOk = 0;
  for (const ei of enemiesAfter) {
    const hp = world.storage.get(ei, Health);
    if (hp && hp.max === 18) childHpOk++;
  }
  check(`小怪生命值正确（${childHpOk}/3 个 max=18）`, childHpOk === 3);
}

// ============ 3. spawnEnemy 生成飞行/分裂敌人 ============
console.log('\n=== 3. spawnEnemy 按层数生成新敌人 ===');
{
  const world = makeWorld();

  // floor=2 应能生成飞行敌人（多次采样）
  let sawFlyer = false;
  let sawSplitter = false;
  for (let i = 0; i < 200; i++) {
    const e = spawnEnemy(world, 3, 300, 500, 560);
    const t = world.storage.get(e.index, EnemyType);
    if (t?.kind === 'flyer') {
      sawFlyer = true;
      // 飞行敌人应生成在空中（y 明显高于地面）
      const pos = world.storage.get(e.index, Position)!;
      if (pos.y >= 560) check('飞行敌人生成在空中', false);
    }
    if (t?.kind === 'splitter') sawSplitter = true;
  }
  check('floor=3 可生成飞行敌人', sawFlyer);
  check('floor=3 可生成分裂敌人', sawSplitter);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail > 0) {
  // 通过全局对象退出（避免依赖 node 类型定义）
  (globalThis as any).process?.exit(1);
}
