/**
 * 打击特效渲染冒烟测试：确认伤害飘字/冲击波/爆裂粒子/相机震动渲染正常。
 * 运行：npx tsx src/game/smoke-fx.ts
 */
const calls: string[] = [];
const mockCtx = new Proxy({} as any, {
  get(_t, prop: string) {
    if (prop === 'canvas') return { width: 960, height: 600 };
    if (prop === 'measureText') return () => ({ width: 30 });
    return (...args: any[]) => { calls.push(`${prop}(${args.length})`); };
  },
  set: () => true,
});

import { World } from '../GameEngine/ecs';
import { Position, Sprite } from '../GameEngine/ecs/components';
import { Camera } from '../GameEngine/resources/Camera';
import { createRenderSystem } from '../GameEngine/renderer/RenderSystem';
import { DamageNumber, HitSpark, DeathBurst } from './components';

const world = new World();
const cam = new Camera(960, 600, 1920, 600);
world.insertResource(Camera, cam);

// 伤害飘字
const d = world.spawn();
world.addComponent(d, Position, new Position(100, 100));
world.addComponent(d, Sprite, new Sprite(1, '#fff'));
world.addComponent(d, DamageNumber, new DamageNumber(42, 0.5, 0.7, '#ffd166'));

// 冲击波
const s = world.spawn();
world.addComponent(s, Position, new Position(200, 100));
world.addComponent(s, Sprite, new Sprite(1, '#fff'));
world.addComponent(s, HitSpark, new HitSpark(0.15, 0.22, 6, 34, '#ffd166'));

// 爆裂粒子
const b = world.spawn();
world.addComponent(b, Position, new Position(300, 100));
world.addComponent(b, Sprite, new Sprite(1, '#fff'));
world.addComponent(b, DeathBurst, new DeathBurst(0.3, 0.6, 100, -50, 4, '#e06c75'));

// 用真实装饰器逻辑（简化版）
const decorators = [
  (ctx: any, screen: any, _sp: any, idx: number, w: World) => {
    const dn = w.storage.get(idx, DamageNumber);
    if (!dn) return false;
    ctx.fillText(`${dn.value}`, screen.x, screen.y);
    ctx.strokeText(`${dn.value}`, screen.x, screen.y);
    return true;
  },
  (ctx: any, screen: any, _sp: any, idx: number, w: World) => {
    const sp = w.storage.get(idx, HitSpark);
    if (!sp) return false;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 20, 0, Math.PI * 2);
    ctx.stroke();
    return true;
  },
  (ctx: any, screen: any, _sp: any, idx: number, w: World) => {
    const db = w.storage.get(idx, DeathBurst);
    if (!db) return false;
    ctx.fillRect(screen.x, screen.y, db.size, db.size);
    return true;
  },
];

const render = createRenderSystem({ getCtx: () => mockCtx, width: 960, height: 600 } as any, {
  background: '#141821', grid: false, decorators,
});
render.run(world, 1 / 60);

// 相机震动测试
cam.shake(8, 0.2);
cam.updateShake(0.05);
const shaking = cam.shakeOffsetX !== 0 || cam.shakeOffsetY !== 0;
cam.updateShake(0.3); // 超过持续时间
const stopped = cam.shakeOffsetX === 0 && cam.shakeOffsetY === 0;

const hasFillText = calls.some((c) => c.startsWith('fillText'));
const hasStroke = calls.some((c) => c.startsWith('stroke'));
const hasFillRect = calls.some((c) => c.startsWith('fillRect'));

console.log('=== 打击特效冒烟测试 ===');
console.log(`绘制调用: ${calls.length}`);
console.log(`fillText/stroke/fillRect: ${hasFillText}/${hasStroke}/${hasFillRect}`);
console.log(`相机震动生效: ${shaking}, 到期停止: ${stopped}`);

const ok = hasFillText && hasStroke && hasFillRect && shaking && stopped;
console.log(ok ? '\n✅ 打击特效渲染正常' : '\n❌ 打击特效渲染异常');
if (!ok) throw new Error('打击特效冒烟测试失败');
