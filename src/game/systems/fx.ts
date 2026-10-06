/**
 * 打击手感特效系统
 *
 * 负责：
 *   - 更新特效实体的位置/寿命（伤害飘字上浮、爆裂粒子飞散、冲击波扩散）
 *   - 到期回收（本系统内处理，避免污染 LifecycleSystem）
 *
 * 特效实体（无碰撞、无物理）：
 *   - DamageNumber：伤害飘字
 *   - HitSpark：命中冲击波（圆环）
 *   - DeathBurst：击杀爆裂粒子
 *
 * 生成由 CollisionSystem 触发（见 spawnDamageNumber / spawnHitSpark / spawnDeathBurst）。
 * 使用 EntityPool 复用短命实体，减少 GC 压力。
 */
import { World, Entity, EntityPool } from '../../GameEngine/ecs';
import { Position } from '../../GameEngine/ecs/components';
import { DamageNumber, HitSpark, DeathBurst } from '../components';

/** 特效实体对象池（模块级，跨帧复用；绑定到 world，world 变化时重建） */
let fxPool: EntityPool | null = null;
let fxPoolWorld: World | null = null;

function pool(world: World): EntityPool {
  if (!fxPool || fxPoolWorld !== world) {
    fxPool = new EntityPool(world, 512);
    fxPoolWorld = world;
  }
  return fxPool;
}

/** 重置池（换局/测试用） */
export function resetFxPool(): void {
  fxPool = null;
  fxPoolWorld = null;
}

export const FxSystem = {
  name: 'FxSystem',
  run(world: World, dt: number): void {
    const p = pool(world);
    const toRecycle: Entity[] = [];

    // 伤害飘字：上浮 + 水平漂移
    const dmgNums = world.dense(DamageNumber);
    const dmgEntities = world.denseEntities(DamageNumber);
    for (let i = 0; i < dmgNums.length; i++) {
      const d = dmgNums[i];
      d.life -= dt;
      const pos = world.storage.get(dmgEntities[i], Position);
      if (pos) {
        pos.y += d.vy * dt;
        pos.x += d.vx * dt;
        d.vy *= 0.96; // 逐渐减速
      }
      if (d.life <= 0) {
        const e = world.getByIndex(dmgEntities[i]);
        if (e) toRecycle.push(e);
      }
    }

    // 冲击波：仅寿命递减（半径在渲染时按 life 插值）
    const sparks = world.dense(HitSpark);
    const sparkEntities = world.denseEntities(HitSpark);
    for (let i = 0; i < sparks.length; i++) {
      sparks[i].life -= dt;
      if (sparks[i].life <= 0) {
        const e = world.getByIndex(sparkEntities[i]);
        if (e) toRecycle.push(e);
      }
    }

    // 爆裂粒子：飞散 + 重力
    const bursts = world.dense(DeathBurst);
    const burstEntities = world.denseEntities(DeathBurst);
    for (let i = 0; i < bursts.length; i++) {
      const b = bursts[i];
      b.life -= dt;
      const pos = world.storage.get(burstEntities[i], Position);
      if (pos) {
        pos.x += b.vx * dt;
        pos.y += b.vy * dt;
        b.vy += 900 * dt; // 重力
        b.vx *= 0.98;
      }
      if (b.life <= 0) {
        const e = world.getByIndex(burstEntities[i]);
        if (e) toRecycle.push(e);
      }
    }

    // 回收（复用，而非真正销毁）
    for (const e of toRecycle) p.release(e);
  },
};

/** 生成伤害飘字 */
export function spawnDamageNumber(world: World, x: number, y: number, value: number, color = '#ffffff'): void {
  const e = pool(world).acquire();
  world.addComponent(e, Position, new Position(x, y));
  world.addComponent(
    e,
    DamageNumber,
    new DamageNumber(Math.round(value), 0.7, 0.7, color, -60, (Math.random() * 2 - 1) * 40),
  );
}

/** 生成命中冲击波 */
export function spawnHitSpark(world: World, x: number, y: number, color = '#ffd166', scale = 1): void {
  const e = pool(world).acquire();
  world.addComponent(e, Position, new Position(x, y));
  world.addComponent(e, HitSpark, new HitSpark(0.22, 0.22, 6 * scale, 34 * scale, color));
}

/** 生成击杀爆裂粒子 */
export function spawnDeathBurst(world: World, x: number, y: number, color = '#e06c75', count = 8): void {
  const p = pool(world);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 120 + Math.random() * 160;
    const e = p.acquire();
    world.addComponent(e, Position, new Position(x, y));
    world.addComponent(
      e,
      DeathBurst,
      new DeathBurst(
        0.4 + Math.random() * 0.2,
        0.6,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        3 + Math.random() * 3,
        color,
      ),
    );
  }
}
