/**
 * 渲染装饰器冒烟测试：确认判定盒/子弹/敌人/玩家轮廓都能触发绘制。
 * 运行：npx tsx src/game/smoke-render.ts
 */
const listeners: Record<string, Function[]> = {};
(globalThis as any).window = {
  innerWidth: 960, innerHeight: 600, devicePixelRatio: 1,
  addEventListener: (t: string, cb: Function) => { (listeners[t] ||= []).push(cb); },
  removeEventListener: () => {},
};
(globalThis as any).requestAnimationFrame = () => 0;
(globalThis as any).performance = { now: () => Date.now() };

// 记录绘制调用
const calls: string[] = [];
const mockCtx = new Proxy({} as any, {
  get(_t, prop: string) {
    if (prop === 'canvas') return { width: 960, height: 600 };
    if (prop === 'save' || prop === 'restore' || prop === 'translate' || prop === 'scale' || prop === 'rotate') {
      return () => calls.push(prop);
    }
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
import { Camera } from '../GameEngine/resources/Camera';
import { createRenderSystem } from '../GameEngine/renderer/RenderSystem';
import {
  PlayerTag, EnemyTag, BulletTag, MeleeHitbox, Facing, HitFlash, Collider,
} from './components';

const world = new World();
world.insertResource(Camera, new Camera(960, 600, 960, 600));

// 玩家
const p = world.spawn();
world.addComponent(p, Position, new Position(0, 0));
world.addComponent(p, Sprite, new Sprite(28, '#4ec9b0'));
world.addComponent(p, PlayerTag, new PlayerTag());
world.addComponent(p, Facing, new Facing(1));

// 敌人
const e = world.spawn();
world.addComponent(e, Position, new Position(100, 0));
world.addComponent(e, Sprite, new Sprite(24, '#e06c75', 'circle'));
world.addComponent(e, EnemyTag, new EnemyTag());
world.addComponent(e, HitFlash, new HitFlash(0.1));

// 子弹
const b = world.spawn();
world.addComponent(b, Position, new Position(50, 0));
world.addComponent(b, Sprite, new Sprite(6, '#ffd166', 'circle'));
world.addComponent(b, BulletTag, new BulletTag(10, 1, false));

// 近战判定盒
const hb = world.spawn();
world.addComponent(hb, Position, new Position(20, 0));
world.addComponent(hb, Sprite, new Sprite(8, '#ffd166', 'rect'));
world.addComponent(hb, Collider, new Collider(20));
world.addComponent(hb, MeleeHitbox, new MeleeHitbox(30, 200, true));

// 注册渲染系统（用与 main.ts 相同的装饰器逻辑）
import { PhysicsContacts } from '../GameEngine/physics';
import { Afterimage } from './components';

const decorators = [
  (ctx: any, screen: any, sprite: any, idx: number, w: World) => {
    if (!w.storage.has(idx, EnemyTag)) return false;
    ctx.fillStyle = sprite.color;
    if (sprite.shape === 'circle') { ctx.beginPath(); ctx.arc(screen.x, screen.y, sprite.size / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    else { ctx.fillRect(screen.x, screen.y, sprite.size, sprite.size); ctx.strokeRect(screen.x, screen.y, sprite.size, sprite.size); }
    return true;
  },
  (ctx: any, screen: any, sprite: any, idx: number, w: World) => {
    if (!w.storage.has(idx, PlayerTag)) return false;
    ctx.fillRect(0, 0, 10, 10); ctx.strokeRect(0, 0, 10, 10);
    return true;
  },
  (ctx: any, screen: any, sprite: any, idx: number, w: World) => {
    if (!w.storage.has(idx, MeleeHitbox)) return false;
    ctx.fillRect(0, 0, 10, 10); ctx.strokeRect(0, 0, 10, 10);
    return true;
  },
  (ctx: any, screen: any, sprite: any, idx: number, w: World) => {
    if (!w.storage.has(idx, BulletTag)) return false;
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    return true;
  },
];

const render = createRenderSystem({ getCtx: () => mockCtx, width: 960, height: 600 } as any, {
  background: '#141821', grid: false, decorators,
});

render.run(world, 1 / 60);

const hasStroke = calls.some((c) => c.startsWith('stroke'));
const hasFill = calls.some((c) => c.startsWith('fill'));
const hasStrokeRect = calls.some((c) => c.startsWith('strokeRect'));
const hasArc = calls.some((c) => c.startsWith('arc'));

console.log('=== 渲染冒烟测试 ===');
console.log(`绘制调用总数: ${calls.length}`);
console.log(`有 fill/strokeRect/stroke/arc: ${hasFill}/${hasStrokeRect}/${hasStroke}/${hasArc}`);

const ok = hasFill && hasStrokeRect && hasStroke && hasArc;
console.log(ok ? '\n✅ 渲染装饰器全部触发' : '\n❌ 渲染装饰器缺失');
if (!ok) throw new Error('渲染冒烟测试失败');
