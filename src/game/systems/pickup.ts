/**
 * 掉落物系统（阶段C2）
 *
 * 职责：
 *   1) 掉落物物理：按 vy 弹跳 + 重力下落 + 落地停住（简化的「弹一下」视觉）
 *   2) 拾取判定：玩家圆 × 掉落物圆 → 生效（金币 / 血包 / 增益）
 *   3) 增益计时：Buff.timer 递减，归零时 revert 并移除组件
 *   4) 寿命回收：Pickup.life 归零 → 销毁
 *
 * 掉落物无 RigidBody/Shape，不参与 PhysicsSystem；本系统自行处理位置。
 * 掉落生成见 spawnDrop / spawnDropsFromEnemy（由 LifecycleSystem 调用）。
 */
import { World, Entity } from '../../GameEngine/ecs';
import { Position, Health, Sprite, Collider, PlayerTag, Box, Platform, Wall } from '../components';
import { Pickup, Buff, PickupKind } from '../components';
import { DROP_CONFIG, PICKUP_STYLE, getBuffDef, rollBuff } from '../resources/Pickups';
import { audio } from '../audio';

/** 掉落物重力（像素/秒²） */
const DROP_GRAVITY = 1400;
/** 拾取半径加成（玩家半径 + 该值） */
const PICKUP_PADDING = 6;
/** 掉落物落地后的最小弹跳速度（小于则该次弹跳视为停止） */
const DROP_MIN_BOUNCE = 60;
/** 掉落物水平摩擦（落地后逐渐停住） */
const DROP_FRICTION = 0.86;

/** 复用的查询缓冲 */
const pickupBuf: number[] = [];
const playerBuf: number[] = [];

/** 生成一个掉落物 */
export function spawnDrop(
  world: World,
  kind: PickupKind,
  x: number,
  y: number,
  value: number,
  buffId = '',
  life = DROP_CONFIG.life,
): Entity {
  const style = PICKUP_STYLE[kind];
  const e = world.spawn();
  world.addComponent(e, Position, new Position(x, y));
  world.addComponent(e, Sprite, new Sprite(style.size, style.color, style.shape));
  world.addComponent(e, Collider, new Collider(style.size / 2));
  const pk = new Pickup(kind, value, life, buffId);
  pk.vx = (Math.random() * 2 - 1) * 60; // 随机水平散开
  world.addComponent(e, Pickup, pk);
  return e;
}

/**
 * 敌人死亡掉落：金币必掉，血包 / 增益按概率。
 * 返回生成的掉落物数量。
 */
export function spawnDropsFromEnemy(world: World, x: number, y: number, maxHp: number): number {
  let count = 0;
  const cfg = DROP_CONFIG;

  // 金币必掉（1~N 枚，散开）
  const coins = cfg.coinMin + Math.floor(Math.random() * (cfg.coinMax - cfg.coinMin + 1));
  for (let i = 0; i < coins; i++) {
    const dx = (Math.random() * 2 - 1) * 18;
    spawnDrop(world, 'coin', x + dx, y - 8, 1);
    count++;
  }

  // 血包（按概率）
  if (Math.random() < cfg.healChance) {
    spawnDrop(world, 'heal', x, y - 10, Math.round(maxHp * cfg.healRatio));
    count++;
  }

  // 临时增益（按概率）
  if (Math.random() < cfg.buffChance) {
    const def = rollBuff();
    spawnDrop(world, 'buff', x, y - 10, 1, def.id);
    count++;
  }

  return count;
}

/**
 * 找到掉落物本帧跨越的最近可站立面（顶面 y）。
 * 支持：实心 Box（地面/墙）与单面 Platform。
 * prevBottom / newBottom 为「上一帧 / 本帧」的底边 y；面顶在区间内即视为落地。
 * 返回 null 表示本帧未跨越任何面。
 */
function findLandingY(world: World, x: number, prevBottom: number, newBottom: number): number | null {
  let best: number | null = null;

  const consider = (top: number, left: number, right: number): void => {
    if (x < left || x > right) return;
    // 面顶在「上一帧底边」与「本帧底边」之间 → 本帧跨越
    if (top >= prevBottom - 1 && top <= newBottom + 1) {
      if (best === null || top < best) best = top;
    }
  };

  // 实心 Box
  const boxs = world.dense(Box);
  const boxEntities = world.denseEntities(Box);
  for (let i = 0; i < boxs.length; i++) {
    const b = boxs[i];
    const pos = world.storage.get(boxEntities[i], Position);
    if (!pos) continue;
    consider(pos.y - b.halfH, pos.x - b.halfW, pos.x + b.halfW);
  }

  // 单面平台
  const plats = world.dense(Platform);
  const platEntities = world.denseEntities(Platform);
  for (let i = 0; i < plats.length; i++) {
    const pl = plats[i];
    const pos = world.storage.get(platEntities[i], Position);
    if (!pos) continue;
    consider(pos.y - pl.halfH, pos.x - pl.halfW, pos.x + pl.halfW);
  }

  return best;
}

export const PickupSystem = {
  name: 'PickupSystem',
  run(world: World, dt: number): void {
    const pickups = world.dense(Pickup);
    const pickupEntities = world.denseEntities(Pickup);

    // ---- 1) 掉落物物理 + 寿命 ----
    const toDestroy: Entity[] = [];
    for (let i = 0; i < pickups.length; i++) {
      const idx = pickupEntities[i];
      const p = pickups[i];
      const pos = world.storage.get(idx, Position);
      const col = world.storage.get(idx, Collider);
      if (pos) {
        const half = col?.radius ?? 6;
        const prevBottom = pos.y + half;
        // 重力积分
        p.vy += DROP_GRAVITY * dt;
        pos.y += p.vy * dt;
        // 水平漂移（弹跳时保留一点横向惯性）
        if (p.vx !== 0) {
          pos.x += p.vx * dt;
          p.vx *= DROP_FRICTION;
          if (Math.abs(p.vx) < 1) p.vx = 0;
        }

        // 落地判定：本帧底边从「面上方」跨越到「面下方」
        if (p.vy > 0) {
          const landY = findLandingY(world, pos.x, prevBottom, pos.y + half);
          if (landY !== null) {
            pos.y = landY - half;
            if (p.vy > DROP_MIN_BOUNCE * 2) {
              p.vy = -p.vy * 0.35; // 弹一下
              p.vx *= 0.6;
            } else {
              p.vy = 0; // 停住
              p.vx = 0;
            }
          }
        }
      }
      if (p.life > 0) {
        p.life -= dt;
        if (p.life <= 0) {
          const e = world.getByIndex(idx);
          if (e) toDestroy.push(e);
        }
      }
    }

    // ---- 2) 拾取判定 ----
    const playerIdx = world.findEntitiesInto(world.query().with(world.maskOf(PlayerTag)).build(), playerBuf)[0];
    if (playerIdx !== undefined) {
      const pPos = world.storage.get(playerIdx, Position);
      const pCol = world.storage.get(playerIdx, Collider);
      const pHp = world.storage.get(playerIdx, Health);
      if (pPos && pCol) {
        const pickupIdxs = world.findEntitiesInto(
          world.query().with(world.maskOf(Pickup)).build(),
          pickupBuf,
        );
        for (const pi of pickupIdxs) {
          if (pi === playerIdx) continue;
          const pos = world.storage.get(pi, Position);
          const col = world.storage.get(pi, Collider);
          const pk = world.storage.get(pi, Pickup);
          if (!pos || !col || !pk) continue;
          const dist = Math.hypot(pos.x - pPos.x, pos.y - pPos.y);
          if (dist > pCol.radius + col.radius + PICKUP_PADDING) continue;

          const e = world.getByIndex(pi);
          if (!e) continue;

          if (pk.kind === 'coin') {
            (globalThis as any).__coins = ((globalThis as any).__coins ?? 0) + pk.value;
            audio.play('coin');
          } else if (pk.kind === 'heal') {
            if (pHp) pHp.current = Math.min(pHp.max, pHp.current + pk.value);
            audio.play('pickup');
          } else if (pk.kind === 'buff') {
            applyBuff(world, playerIdx, pk.buffId);
            audio.play('pickup');
          }
          toDestroy.push(e);
        }
      }
    }

    // ---- 3) 增益计时 ----
    const buffs = world.dense(Buff);
    const buffEntities = world.denseEntities(Buff);
    const toRemoveBuff: number[] = [];
    for (let i = 0; i < buffs.length; i++) {
      const b = buffs[i];
      b.timer -= dt;
      if (b.timer <= 0) {
        const def = getBuffDef(b.id);
        const e = world.getByIndex(buffEntities[i]);
        if (def && e) def.revert(world, e);
        toRemoveBuff.push(buffEntities[i]);
      }
    }
    for (const idx of toRemoveBuff) {
      const e = world.getByIndex(idx);
      if (e) world.removeComponent(e, Buff);
    }

    // ---- 4) 回收 ----
    for (const e of toDestroy) world.despawn(e);
  },
};

/** 施加增益：已存在则刷新计时，否则新增并 apply */
export function applyBuff(world: World, playerIdx: number, buffId: string): void {
  const def = getBuffDef(buffId);
  if (!def) return;
  const existing = world.storage.get(playerIdx, Buff);
  if (existing && existing.id === buffId) {
    existing.timer = def.duration; // 刷新
    return;
  }
  const e = world.getByIndex(playerIdx);
  if (!e) return;
  const buff = new Buff(buffId, def.duration);
  buff.timer = def.duration;
  world.addComponent(e, Buff, buff);
  def.apply(world, e);
}

/** 清空所有增益（换局用）：回滚倍率 + 移除组件 */
export function clearBuffs(world: World): void {
  const buffs = world.dense(Buff);
  const buffEntities = world.denseEntities(Buff);
  for (let i = 0; i < buffs.length; i++) {
    const def = getBuffDef(buffs[i].id);
    const e = world.getByIndex(buffEntities[i]);
    if (def && e) def.revert(world, e);
  }
  const all = world.entities.getAllEntities();
  for (const e of all) {
    if (world.storage.has(e.index, Buff)) world.removeComponent(e, Buff);
  }
  (globalThis as any).__buffDamageMul = 1;
}
