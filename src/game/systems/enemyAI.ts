/**
 * 敌人 AI 系统（横版平台）
 *
 * 行为由 **AI 状态机**（`GameEngine/ai`）驱动，不再按 EnemyKind 写大 switch：
 *  - chaser ：PATROL ⇄ CHASE（玩家接近时追击）
 *  - charger：IDLE → WINDUP → DASH → RECOVER → IDLE
 *  - shooter：KEEP_DISTANCE（保持水平距离 + 周期射击）
 *  - flyer  ：FLOAT（无视重力，水平保持距离 + 垂直正弦漂浮）
 *
 * 状态机是纯函数（吃上下文快照，吐期望水平速度），实体引用只在本系统内处理。
 * 水平速度由 AI 设置；垂直速度由重力（PhysicsSystem）控制（flyer 除外）。
 */
import { World } from '../../GameEngine/ecs';
import { Position, Velocity } from '../../GameEngine/ecs/components';
import {
  AIState,
  createRuntime,
  step,
  chaserMachine,
  chargerMachine,
  shooterMachine,
  flyerMachine,
} from '../../GameEngine/ai';
import type { AIContext, MachineRuntime, StateMachine } from '../../GameEngine/ai';
import {
  PlayerTag, Chase, Charger, Shooter, Patrol,
  BulletTag, Sprite, Collider, Flying,
} from '../components';

const CHASE_RANGE = 320; // 玩家进入该范围才追击
const SHOOTER_IDEAL = 260; // shooter 保持的理想距离

/** 状态机是「配置」而非「状态」：按类型复用同一实例，避免每帧重建导致运行时被重置 */
const CHASER_SM = chaserMachine(CHASE_RANGE);
const CHARGER_SM = chargerMachine();
const SHOOTER_SM = shooterMachine(SHOOTER_IDEAL);

/** 每个实体一份状态机运行时（按实体索引存） */
const runtimes = new Map<number, { rt: MachineRuntime; sm: StateMachine }>();

/** 取得（或初始化）某实体的状态机运行时 */
function runtimeFor(idx: number, sm: StateMachine): MachineRuntime {
  let entry = runtimes.get(idx);
  if (!entry || entry.sm !== sm) {
    entry = { rt: createRuntime(sm), sm };
    runtimes.set(idx, entry);
  }
  return entry.rt;
}

/** 清理已销毁实体的运行时（避免 Map 无限增长） */
function pruneRuntimes(world: World): void {
  if (runtimes.size === 0) return;
  for (const idx of runtimes.keys()) {
    if (!world.entities.isAliveIndex(idx)) runtimes.delete(idx);
  }
}

/** 构造上下文快照 */
function makeContext(x: number, y: number, playerX: number, playerY: number): AIContext {
  const dx = playerX - x;
  const dy = playerY - y;
  return {
    x,
    y,
    playerX,
    playerY,
    dx,
    dist: Math.hypot(dx, dy),
    dir: dx > 0 ? 1 : -1,
    elapsed: 0,
  };
}

export const EnemyAISystem = {
  name: 'EnemyAISystem',
  run(world: World, dt: number): void {
    const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
    if (playerIdx === undefined) return;
    const playerPos = world.storage.get(playerIdx, Position);
    if (!playerPos) return;

    pruneRuntimes(world);

    // --- chaser：PATROL ⇄ CHASE ---
    const chases = world.dense(Chase);
    const chaseEntities = world.denseEntities(Chase);
    for (let i = 0; i < chases.length; i++) {
      const idx = chaseEntities[i];
      const pos = world.storage.get(idx, Position);
      const vel = world.storage.get(idx, Velocity);
      if (!pos || !vel) continue;

      const rt = runtimeFor(idx, CHASER_SM);
      const ctx = makeContext(pos.x, pos.y, playerPos.x, playerPos.y);
      const patrol = world.storage.get(idx, Patrol);
      if (patrol) {
        ctx.patrolLeft = patrol.leftBound;
        ctx.patrolRight = patrol.rightBound;
        ctx.patrolDir = patrol.dir;
      }

      vel.x = step(CHASER_SM, rt, ctx, chases[i].speed, dt);

      // 写回巡逻方向
      if (patrol && ctx.patrolDir !== undefined) patrol.dir = ctx.patrolDir as 1 | -1;
    }

    // --- charger：IDLE → WINDUP → DASH → RECOVER ---
    const chargers = world.dense(Charger);
    const chargerEntities = world.denseEntities(Charger);
    for (let i = 0; i < chargers.length; i++) {
      const idx = chargerEntities[i];
      const c = chargers[i];
      const pos = world.storage.get(idx, Position);
      const vel = world.storage.get(idx, Velocity);
      if (!pos || !vel) continue;

      const rt = runtimeFor(idx, CHARGER_SM);
      const ctx = makeContext(pos.x, pos.y, playerPos.x, playerPos.y);

      // 冲锋速度在 DASH 状态用 dashSpeed，其余为 0
      const speed = rt.state === AIState.DASH ? c.dashSpeed : 0;
      vel.x = step(CHARGER_SM, rt, ctx, speed, dt, {
        windup: c.windup,
        dashTime: c.dashTime,
        recover: 0.5,
      });

      // 状态 → 组件字段同步（保持旧接口 c.state / c.timer 语义）
      c.state = rt.state as unknown as Charger['state'];
      c.timer = -rt.elapsed;
    }

    // --- shooter：KEEP_DISTANCE + 射击 ---
    const shooters = world.dense(Shooter);
    const shooterEntities = world.denseEntities(Shooter);
    for (let i = 0; i < shooters.length; i++) {
      const idx = shooterEntities[i];
      const s = shooters[i];
      const pos = world.storage.get(idx, Position);
      const vel = world.storage.get(idx, Velocity);
      if (!pos || !vel) continue;

      const rt = runtimeFor(idx, SHOOTER_SM);
      const ctx = makeContext(pos.x, pos.y, playerPos.x, playerPos.y);
      vel.x = step(SHOOTER_SM, rt, ctx, 60, dt);

      // 射击
      const dist = ctx.dist || 1;
      const nx = ctx.dx / dist;
      const ny = (playerPos.y - pos.y) / dist;
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

    // --- flyer：FLOAT（水平保持距离 + 垂直正弦漂浮） ---
    const flyers = world.dense(Flying);
    const flyerEntities = world.denseEntities(Flying);
    for (let i = 0; i < flyers.length; i++) {
      const idx = flyerEntities[i];
      const f = flyers[i];
      const pos = world.storage.get(idx, Position);
      const vel = world.storage.get(idx, Velocity);
      if (!pos || !vel) continue;

      const sm = flyerMachine(f.idealDist);
      const rt = runtimeFor(idx, sm);
      const ctx = makeContext(pos.x, pos.y, playerPos.x, playerPos.y);
      vel.x = step(sm, rt, ctx, f.speed, dt);

      // 垂直：正弦漂浮（围绕基准 y），比例控制平滑趋近目标高度
      if (f.baseY === 0) f.baseY = pos.y;
      f.phase += f.frequency * dt;
      const targetY = f.baseY + Math.sin(f.phase) * f.amplitude;
      vel.y = (targetY - pos.y) * 6;
    }
  },
};
