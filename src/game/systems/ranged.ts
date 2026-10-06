/**
 * 远程武器系统（玩家副武器 + 子弹推进）
 *
 * 1) 发射：玩家按 U（边沿触发）→ 朝当前朝向水平发射一颗子弹。
 *    冷却由 Weapon.timer 控制（升级词条可缩短冷却 / 提高伤害）。
 * 2) 推进：所有子弹（玩家 + 敌人）为「纯弹道」实体，不含 RigidBody/Shape，
 *    因此不会被 PhysicsSystem 积分。本系统按 Velocity 手动推进 Position。
 *    （子弹不需要地形碰撞：命中判定由 CollisionSystem 负责，寿命由 LifecycleSystem 回收。）
 */
import { World } from '../../GameEngine/ecs';
import { Position, Velocity, Sprite, Collider } from '../components';
import { Weapon, BulletTag, Facing, PlayerTag } from '../components';
import { Input } from '../../GameEngine/resources/Input';
import { audio } from '../audio';

export function createRangedSystem(input: Input) {
  return {
    name: 'RangedSystem',
    run(world: World, dt: number): void {
      // ---- 1) 推进所有子弹（纯弹道，无物理刚体） ----
      const bullets = world.dense(BulletTag);
      const bulletEntities = world.denseEntities(BulletTag);
      for (let i = 0; i < bullets.length; i++) {
        const pos = world.storage.get(bulletEntities[i], Position);
        const vel = world.storage.get(bulletEntities[i], Velocity);
        if (pos && vel) {
          pos.x += vel.x * dt;
          pos.y += vel.y * dt;
        }
      }

      // ---- 2) 玩家发射 ----
      const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
      if (playerIdx === undefined) return;

      const weapon = world.storage.get(playerIdx, Weapon);
      const pos = world.storage.get(playerIdx, Position);
      const facing = world.storage.get(playerIdx, Facing);
      if (!weapon || !pos || !facing) return;

      // 冷却计时
      if (weapon.timer > 0) weapon.timer -= dt;

      // 触发：U 键（边沿触发）
      if (!input.firePressed || weapon.timer > 0) return;

      weapon.timer = weapon.cooldown;
      audio.play('attack');

      // 朝朝向水平发射（略微抬高枪口）
      const dir = facing.dir;
      const muzzleX = pos.x + dir * 18;
      const muzzleY = pos.y - 4;

      const b = world.spawn();
      world.addComponent(b, Position, new Position(muzzleX, muzzleY));
      world.addComponent(b, Velocity, new Velocity(dir * weapon.bulletSpeed, 0));
      world.addComponent(b, Sprite, new Sprite(7, '#ffd166', 'circle'));
      world.addComponent(b, Collider, new Collider(4));
      world.addComponent(b, BulletTag, new BulletTag(weapon.damage, 1.4, false));
    },
  };
}
