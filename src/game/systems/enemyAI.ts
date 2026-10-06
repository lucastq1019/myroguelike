/**
 * 敌人 AI 系统（横版平台）
 *
 * 三种敌人行为（均受重力约束，站在地面/平台上）：
 *  - chaser ：地面巡逻；玩家接近时朝玩家水平移动
 *  - charger：接近后蓄力 → 水平冲锋 → 恢复
 *  - shooter：保持水平距离，周期性朝玩家射击
 *  - flyer  ：无视重力，水平追踪玩家 + 垂直正弦漂浮
 *
 * 水平速度由 AI 设置；垂直速度由重力（PhysicsSystem）控制（flyer 除外）。
 */
import { World } from '../../GameEngine/ecs';
import { Position, Velocity } from '../../GameEngine/ecs/components';
import {
  PlayerTag, Chase, Charger, Shooter, Patrol,
  BulletTag, Sprite, Collider, Flying,
} from '../components';

const CHASE_RANGE = 320; // 玩家进入该范围才追击

export const EnemyAISystem = {
  name: 'EnemyAISystem',
  run(world: World, dt: number): void {
    const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
    if (playerIdx === undefined) return;
    const playerPos = world.storage.get(playerIdx, Position);
    if (!playerPos) return;

    // --- chaser：巡逻 + 追击（仅水平） ---
    const chases = world.dense(Chase);
    const chaseEntities = world.denseEntities(Chase);
    for (let i = 0; i < chases.length; i++) {
      const idx = chaseEntities[i];
      const pos = world.storage.get(idx, Position);
      const vel = world.storage.get(idx, Velocity);
      if (!pos || !vel) continue;

      const dist = Math.abs(playerPos.x - pos.x);
      const patrol = world.storage.get(idx, Patrol);

      if (dist < CHASE_RANGE) {
        // 追击：朝玩家水平移动
        const dir = playerPos.x > pos.x ? 1 : -1;
        vel.x = dir * chases[i].speed;
      } else if (patrol) {
        // 巡逻：在边界间来回
        vel.x = patrol.dir * patrol.speed;
        if (pos.x <= patrol.leftBound) patrol.dir = 1;
        if (pos.x >= patrol.rightBound) patrol.dir = -1;
      } else {
        vel.x = 0;
      }
    }

    // --- charger：蓄力 → 水平冲锋 → 恢复 ---
    const chargers = world.dense(Charger);
    const chargerEntities = world.denseEntities(Charger);
    for (let i = 0; i < chargers.length; i++) {
      const idx = chargerEntities[i];
      const c = chargers[i];
      const pos = world.storage.get(idx, Position);
      const vel = world.storage.get(idx, Velocity);
      if (!pos || !vel) continue;

      const dx = playerPos.x - pos.x;
      const dist = Math.abs(dx) + Math.abs(playerPos.y - pos.y);
      const dir = dx > 0 ? 1 : -1;

      c.timer -= dt;
      switch (c.state) {
        case 'idle':
          vel.x = 0;
          if (dist < 320) {
            c.state = 'windup';
            c.timer = c.windup;
          }
          break;
        case 'windup':
          vel.x = 0;
          if (c.timer <= 0) {
            c.state = 'dash';
            c.timer = c.dashTime;
            vel.x = dir * c.dashSpeed;
          }
          break;
        case 'dash':
          if (c.timer <= 0) {
            c.state = 'recover';
            c.timer = 0.5;
            vel.x = 0;
          }
          break;
        case 'recover':
          if (c.timer <= 0) c.state = 'idle';
          break;
      }
    }

    // --- shooter：保持水平距离 + 射击 ---
    const shooters = world.dense(Shooter);
    const shooterEntities = world.denseEntities(Shooter);
    for (let i = 0; i < shooters.length; i++) {
      const idx = shooterEntities[i];
      const s = shooters[i];
      const pos = world.storage.get(idx, Position);
      const vel = world.storage.get(idx, Velocity);
      if (!pos || !vel) continue;

      const dx = playerPos.x - pos.x;
      const dy = playerPos.y - pos.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      // 保持水平距离：太近后退，太远前进
      const ideal = 260;
      if (dist < ideal - 40) {
        vel.x = -nx * 60;
      } else if (dist > ideal + 40) {
        vel.x = nx * 60;
      } else {
        vel.x = 0;
      }

      // 射击
      s.timer -= dt;
      if (s.timer <= 0 && dist < s.range) {
        s.timer = s.cooldown;
        const b = world.spawn();
        world.addComponent(b, Position, new Position(pos.x, pos.y));
        world.addComponent(b, Velocity, new Velocity(nx * s.bulletSpeed, ny * s.bulletSpeed));
        world.addComponent(b, Sprite, new Sprite(8, '#c678dd', 'circle'));
        world.addComponent(b, Collider, new Collider(5));
        world.addComponent(b, BulletTag, new BulletTag(s.damage, 2.5, true));
      }
    }

    // --- flyer：无视重力，水平追踪玩家 + 垂直正弦漂浮 ---
    const flyers = world.dense(Flying);
    const flyerEntities = world.denseEntities(Flying);
    for (let i = 0; i < flyers.length; i++) {
      const idx = flyerEntities[i];
      const f = flyers[i];
      const pos = world.storage.get(idx, Position);
      const vel = world.storage.get(idx, Velocity);
      if (!pos || !vel) continue;

      // 首次运行时记录基准 y（生成高度）
      if (f.baseY === 0) f.baseY = pos.y;

      // 水平：朝玩家靠近，但保持理想距离（太近则后退）
      const dx = playerPos.x - pos.x;
      const dist = Math.abs(dx);
      const dir = dx > 0 ? 1 : -1;
      if (dist > f.idealDist + 30) {
        vel.x = dir * f.speed;
      } else if (dist < f.idealDist - 30) {
        vel.x = -dir * f.speed;
      } else {
        vel.x = 0;
      }

      // 垂直：正弦漂浮（围绕基准 y），直接设置速度让位置跟随目标
      f.phase += f.frequency * dt;
      const targetY = f.baseY + Math.sin(f.phase) * f.amplitude;
      vel.y = (targetY - pos.y) * 6; // 比例控制，平滑趋近目标高度
    }
  },
};
