/**
 * 无敌帧系统：递减 Invincible 计时器，归零则移除组件
 */
import { World } from '../../GameEngine/ecs';
import { Invincible } from '../components';

export const InvincibilitySystem = {
  name: 'InvincibilitySystem',
  run(world: World, dt: number): void {
    const invs = world.dense(Invincible);
    const entities = world.denseEntities(Invincible);
    const toRemove: number[] = [];
    for (let i = 0; i < invs.length; i++) {
      invs[i].timer -= dt;
      if (invs[i].timer <= 0) toRemove.push(entities[i]);
    }
    for (const idx of toRemove) {
      const e = world.getByIndex(idx);
      if (e) world.removeComponent(e, Invincible);
    }
  },
};
