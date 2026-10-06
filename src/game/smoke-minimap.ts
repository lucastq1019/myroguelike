/**
 * 小地图渲染冒烟测试：确认小地图系统能正确绘制地形/敌人/玩家/传送门/视野框。
 * 运行：npx tsx src/game/smoke-minimap.ts
 */
const calls: string[] = [];
const mockCtx = new Proxy({} as any, {
  get(_t, prop: string) {
    if (prop === 'canvas') return { width: 960, height: 600 };
    return (...args: any[]) => { calls.push(`${prop}(${args.length})`); };
  },
  set: () => true,
});

import { World } from '../GameEngine/ecs';
import { Position, Sprite } from '../GameEngine/ecs/components';
import { Camera } from '../GameEngine/resources/Camera';
import {
  Wall, Platform, EnemyTag, PlayerTag, Portal,
} from './components';
import { staticBody, RigidBody, Box } from './components';
import { createMinimapSystem } from './systems/minimap';

const world = new World();
// 关卡 1920 × 600
world.insertResource(Camera, new Camera(960, 600, 1920, 600));

// 地面
const ground = world.spawn();
world.addComponent(ground, Position, new Position(960, 580));
world.addComponent(ground, RigidBody, staticBody());
world.addComponent(ground, Box, new Box(960, 20));
world.addComponent(ground, Wall, new Wall());

// 悬浮平台
const plat = world.spawn();
world.addComponent(plat, Position, new Position(500, 400));
world.addComponent(plat, RigidBody, staticBody());
world.addComponent(plat, Platform, new Platform(60, 8));

// 敌人
for (let i = 0; i < 3; i++) {
  const e = world.spawn();
  world.addComponent(e, Position, new Position(300 + i * 400, 540));
  world.addComponent(e, EnemyTag, new EnemyTag());
}

// 玩家
const p = world.spawn();
world.addComponent(p, Position, new Position(200, 540));
world.addComponent(p, PlayerTag, new PlayerTag());

// 传送门
const portal = world.spawn();
world.addComponent(portal, Position, new Position(1800, 500));
world.addComponent(portal, Portal, new Portal());

// 相机跟随玩家
const cam = world.getResource(Camera)!;
cam.follow(200, 540);

const minimap = createMinimapSystem({ getCtx: () => mockCtx, width: 960, height: 600 });
minimap.run(world);

const hasFillRect = calls.some((c) => c.startsWith('fillRect'));
const hasArc = calls.some((c) => c.startsWith('arc'));
const hasStrokeRect = calls.some((c) => c.startsWith('strokeRect'));
const hasClip = calls.some((c) => c.startsWith('clip'));

console.log('=== 小地图渲染冒烟测试 ===');
console.log(`绘制调用总数: ${calls.length}`);
console.log(`fillRect/arc/strokeRect/clip: ${hasFillRect}/${hasArc}/${hasStrokeRect}/${hasClip}`);

const ok = hasFillRect && hasArc && hasStrokeRect && hasClip;
console.log(ok ? '\n✅ 小地图渲染正常' : '\n❌ 小地图渲染缺失');
if (!ok) throw new Error('小地图冒烟测试失败');
