/**
 * 击退系统：把 Knockback 的瞬时速度应用到位置，并随时间衰减
 */
import { World } from '../../GameEngine/ecs';
import { Position, Knockback } from '../components';

export const KnockbackSystem = {
  name: 'KnockbackSystem',
  run(world: World, dt: number): void {
    const kbs = world.dense(Knockback);
    const entities = world.denseEntities(Knockback);
    for (let i = 0; i < kbs.length; i++) {
      const kb = kbs[i];
      if (kb.timer <= 0) continue;
      const pos = world.storage.get(entities[i], Position);
      if (!pos) continue;
      pos.x += kb.vx * dt;
      pos.y += kb.vy * dt;
      kb.timer -= dt;
      // 衰减
      kb.vx *= 0.85;
      kb.vy *= 0.85;
    }
  },
};
