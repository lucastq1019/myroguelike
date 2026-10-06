/**
 * 横版平台「冒烟测试」：模拟一局游戏，检查关键行为。
 * 运行：npx tsx src/game/smoke-platformer.ts
 */
// mock 浏览器环境
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

import GameEngine from '../GameEngine/GameEngine';
import { Position, Velocity } from '../GameEngine/ecs/components';
import { EnemyTag, PlayerTag, Platform, MeleeAttack, Health } from './components';
import { PhysicsContacts } from '../GameEngine/physics';
import { Game } from './game';

const engine = GameEngine.getInstance({ screenWidth: 960, screenHeight: 600 });
const game = new Game({ onStateChange: () => {} });
const world = engine.getWorld();

// 跑 300 帧（5 秒）
for (let i = 0; i < 300; i++) world.update(1 / 60);

const contacts = world.getResource(PhysicsContacts)!;
const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
const pPos = world.storage.get(playerIdx, Position)!;

console.log('=== 冒烟测试结果 ===');
console.log(`玩家位置: (${pPos.x.toFixed(0)}, ${pPos.y.toFixed(0)})`);
console.log(`玩家着地: ${contacts.isGrounded(playerIdx)}`);

// 敌人是否落地
const enemyIdxs = world.findEntities(world.query().with(world.maskOf(EnemyTag)).build());
let groundedEnemies = 0;
let outOfBounds = 0;
for (const ei of enemyIdxs) {
  if (contacts.isGrounded(ei)) groundedEnemies++;
  const ep = world.storage.get(ei, Position)!;
  if (ep.y > 620 || ep.y < -100) outOfBounds++;
}
console.log(`敌人总数: ${enemyIdxs.length}, 已着地: ${groundedEnemies}, 越界: ${outOfBounds}`);

// 平台数
const platforms = world.findEntities(world.query().with(world.maskOf(Platform)).build());
console.log(`平台数: ${platforms.length}`);

// 检查所有实体 y 是否在合理范围
let anomalies = 0;
for (const e of world.entities.getAllEntities()) {
  const p = world.storage.get(e.index, Position);
  if (p && (p.y > 700 || p.y < -200 || p.x < -200 || p.x > 4000)) anomalies++;
}
console.log(`位置异常实体: ${anomalies}`);

const ok = contacts.isGrounded(playerIdx) && groundedEnemies > 0 && anomalies === 0;
console.log(ok ? '\n✅ 冒烟测试通过' : '\n❌ 冒烟测试失败');
