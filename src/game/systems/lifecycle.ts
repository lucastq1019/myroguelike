/**
 * 生命周期系统：
 *  - 生命值 <= 0 → 销毁实体（带 Splitter 的敌人销毁前先分裂出小怪）
 *  - 子弹存活时间耗尽 → 销毁
 */
import { World, Entity } from '../../GameEngine/ecs';
import { Position, Velocity, Sprite } from '../../GameEngine/ecs/components';
import {
  Health, BulletTag, MeleeLifetime, Afterimage, HitFlash, Collider,
  Splitter, EnemyTag, EnemyType, ContactDamage, Chase, Patrol,
  RigidBody, dynamicBody, Circle,
} from '../components';

/** 分裂出的小怪：地面追击型（不再携带 Splitter，防止无限分裂） */
function spawnSplitChild(world: World, x: number, y: number, s: Splitter): void {
  const c = world.spawn();
  world.addComponent(c, Position, new Position(x, y));
  world.addComponent(c, Velocity, new Velocity(0, 0));
  world.addComponent(c, EnemyTag, new EnemyTag());
  world.addComponent(c, EnemyType, new EnemyType('chaser'));
  world.addComponent(c, Health, new Health(s.childHp, s.childHp));
  world.addComponent(c, Sprite, new Sprite(s.childRadius * 2, '#e5c07b', 'circle'));
  world.addComponent(c, Collider, new Collider(s.childRadius));
  world.addComponent(c, ContactDamage, new ContactDamage(s.childDamage));
  world.addComponent(c, Chase, new Chase(90));
  world.addComponent(c, RigidBody, dynamicBody(1, 0.0, 0.6, 1));
  world.addComponent(c, Circle, new Circle(s.childRadius));
  world.addComponent(c, Patrol, new Patrol(60, x - 80, x + 80));
}

export const LifecycleSystem = {
  name: 'LifecycleSystem',
  run(world: World, dt: number): void {
    const toDestroy: Entity[] = [];
    const toRemoveFlash: number[] = [];

    // 生命耗尽（销毁前处理分裂）
    const healths = world.dense(Health);
    const healthEntities = world.denseEntities(Health);
    for (let i = 0; i < healths.length; i++) {
      if (healths[i].current <= 0) {
        const idx = healthEntities[i];
        const splitter = world.storage.get(idx, Splitter);
        if (splitter && splitter.generation === 0) {
          const pos = world.storage.get(idx, Position);
          if (pos) {
            for (let k = 0; k < splitter.count; k++) {
              // 小怪在母体周围散开
              const offset = (k - (splitter.count - 1) / 2) * 26;
              spawnSplitChild(world, pos.x + offset, pos.y - 6, splitter);
            }
          }
        }
        const e = world.getByIndex(idx);
        if (e) toDestroy.push(e);
      }
    }

    // 子弹寿命
    const bullets = world.dense(BulletTag);
    const bulletEntities = world.denseEntities(BulletTag);
    for (let i = 0; i < bullets.length; i++) {
      bullets[i].life -= dt;
      if (bullets[i].life <= 0) {
        const e = world.getByIndex(bulletEntities[i]);
        if (e) toDestroy.push(e);
      }
    }

    // 近战判定盒寿命
    const melees = world.dense(MeleeLifetime);
    const meleeEntities = world.denseEntities(MeleeLifetime);
    for (let i = 0; i < melees.length; i++) {
      melees[i].life -= dt;
      if (melees[i].life <= 0) {
        const e = world.getByIndex(meleeEntities[i]);
        if (e) toDestroy.push(e);
      }
    }

    // 残影寿命
    const ghosts = world.dense(Afterimage);
    const ghostEntities = world.denseEntities(Afterimage);
    for (let i = 0; i < ghosts.length; i++) {
      ghosts[i].life -= dt;
      if (ghosts[i].life <= 0) {
        const e = world.getByIndex(ghostEntities[i]);
        if (e) toDestroy.push(e);
      }
    }

    // 受击闪白计时（到期移除组件）
    const flashes = world.dense(HitFlash);
    const flashEntities = world.denseEntities(HitFlash);
    for (let i = 0; i < flashes.length; i++) {
      flashes[i].timer -= dt;
      if (flashes[i].timer <= 0) toRemoveFlash.push(flashEntities[i]);
    }

    for (const e of toDestroy) world.despawn(e);
    for (const idx of toRemoveFlash) {
      const e = world.getByIndex(idx);
      if (e) world.removeComponent(e, HitFlash);
    }
  },
};
