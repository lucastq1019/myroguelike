/**
 * 碰撞系统：
 *  - 玩家子弹 × 敌人 → 扣血 + 击退 + 销毁子弹
 *  - 敌人子弹 × 玩家 → 扣血（无敌帧保护）
 *  - 敌人 × 玩家 → 接触伤害（无敌帧保护）+ 击退玩家
 *
 * 用圆形碰撞（半径之和）。
 */
import { World, Entity } from '../../GameEngine/ecs';
import {
  Position, Velocity, Collider, Health, BulletTag, EnemyTag, PlayerTag,
  ContactDamage, Invincible, Knockback, MeleeHitbox, ComboCounter, HitFlash,
  Lifesteal, CritChance,
} from '../components';
import { Camera } from '../../GameEngine/resources/Camera';
import { spawnDamageNumber, spawnHitSpark, spawnDeathBurst } from './fx';
import { audio } from '../audio';

/** 复用的查询缓冲（模块级，避免每帧分配） */
const bulletBuf: number[] = [];
const meleeBuf: number[] = [];
const enemyBuf: number[] = [];
const playerBuf: number[] = [];

export const CollisionSystem = {
  name: 'CollisionSystem',
  run(world: World): void {
    const bulletMask = world.maskOf(BulletTag);
    const meleeMask = world.maskOf(MeleeHitbox);
    const enemyMask = world.maskOf(EnemyTag);
    const playerMask = world.maskOf(PlayerTag);
    const posMask = world.maskOf(Position);
    const colMask = world.maskOf(Collider);

    // 用复用缓冲查询（避免每帧分配数组）
    const bulletIdxs = world.findEntitiesInto(world.query().with(bulletMask, posMask, colMask).build(), bulletBuf);
    const meleeIdxs = world.findEntitiesInto(world.query().with(meleeMask, posMask, colMask).build(), meleeBuf);
    const enemyIdxs = world.findEntitiesInto(world.query().with(enemyMask, posMask, colMask).build(), enemyBuf);
    const playerIdx = world.findEntitiesInto(world.query().with(playerMask).build(), playerBuf)[0];

    const toDestroy: Entity[] = [];

    // 子弹 × 目标
    for (const bi of bulletIdxs) {
      const bEntity = world.getByIndex(bi);
      if (!bEntity) continue;
      const bPos = world.storage.get(bi, Position)!;
      const bCol = world.storage.get(bi, Collider)!;
      const bullet = world.storage.get(bi, BulletTag)!;

      if (bullet.fromEnemy) {
        // 敌人子弹 → 打玩家
        if (playerIdx === undefined) continue;
        const pPos = world.storage.get(playerIdx, Position);
        const pCol = world.storage.get(playerIdx, Collider);
        if (!pPos || !pCol) continue;
        const dist = Math.hypot(bPos.x - pPos.x, bPos.y - pPos.y);
        if (dist < bCol.radius + pCol.radius) {
          applyDamage(world, playerIdx, bullet.damage);
          toDestroy.push(bEntity);
        }
      } else {
        // 玩家子弹 → 打敌人
        for (const ei of enemyIdxs) {
          const eEntity = world.getByIndex(ei);
          if (!eEntity) continue;
          const ePos = world.storage.get(ei, Position)!;
          const eCol = world.storage.get(ei, Collider)!;
          const dist = Math.hypot(bPos.x - ePos.x, bPos.y - ePos.y);
          if (dist < bCol.radius + eCol.radius) {
            // 暴击判定（玩家子弹）
            const crit = playerIdx !== undefined ? world.storage.get(playerIdx, CritChance) : undefined;
            const isCrit = crit !== undefined && crit.chance > 0 && Math.random() < crit.chance;
            const dmg = isCrit ? bullet.damage * 2 : bullet.damage;

            applyDamage(world, ei, dmg);
            spawnDamageNumber(world, ePos.x, ePos.y - eCol.radius - 6, dmg, isCrit ? '#ff5f5f' : '#ffd166');
            // 吸血（子弹命中）
            if (playerIdx !== undefined) {
              const ls = world.storage.get(playerIdx, Lifesteal);
              const pHp = world.storage.get(playerIdx, Health);
              if (ls && ls.perHit > 0 && pHp) {
                pHp.current = Math.min(pHp.max, pHp.current + ls.perHit);
              }
            }
            // 击退敌人
            const dx = ePos.x - bPos.x;
            const dy = ePos.y - bPos.y;
            const len = Math.hypot(dx, dy) || 1;
            applyKnockback(world, ei, (dx / len) * 160, (dy / len) * 160);
            toDestroy.push(bEntity);
            break;
          }
        }
      }
    }

    // 近战判定盒 × 敌人
    for (const mi of meleeIdxs) {
      const mEntity = world.getByIndex(mi);
      if (!mEntity) continue;
      const mPos = world.storage.get(mi, Position)!;
      const mCol = world.storage.get(mi, Collider)!;
      const hitbox = world.storage.get(mi, MeleeHitbox)!;
      if (!hitbox.fromPlayer) continue;

      let hitAny = false;
      for (const ei of enemyIdxs) {
        const eEntity = world.getByIndex(ei);
        if (!eEntity) continue;
        const ePos = world.storage.get(ei, Position)!;
        const eCol = world.storage.get(ei, Collider)!;
        const dist = Math.hypot(mPos.x - ePos.x, mPos.y - ePos.y);
        if (dist < mCol.radius + eCol.radius) {
          // 暴击判定（玩家近战）：暴击双倍伤害
          const crit = playerIdx !== undefined ? world.storage.get(playerIdx, CritChance) : undefined;
          const isCrit = crit !== undefined && crit.chance > 0 && Math.random() < crit.chance;
          const dmg = isCrit ? hitbox.damage * 2 : hitbox.damage;

          if (applyDamage(world, ei, dmg)) {
            hitAny = true;
            // 伤害飘字 + 命中冲击波（命中点取敌人位置）
            spawnDamageNumber(world, ePos.x, ePos.y - eCol.radius - 6, dmg, isCrit ? '#ff5f5f' : '#ffd166');
            spawnHitSpark(world, (mPos.x + ePos.x) / 2, (mPos.y + ePos.y) / 2, isCrit ? '#ff5f5f' : '#ffd166', isCrit ? 1.4 : 1);
            audio.play('hit');
            // 屏幕震动（命中越重越强）
            const cam = world.getResource(Camera);
            if (cam) cam.shake(3 + Math.min(4, dmg / 15), 0.12);
            // 吸血：命中回复生命
            if (playerIdx !== undefined) {
              const ls = world.storage.get(playerIdx, Lifesteal);
              const pHp = world.storage.get(playerIdx, Health);
              if (ls && ls.perHit > 0 && pHp) {
                pHp.current = Math.min(pHp.max, pHp.current + ls.perHit);
              }
            }
            // 击杀爆裂
            const hp = world.storage.get(ei, Health);
            if (hp && hp.current <= 0) {
              spawnDeathBurst(world, ePos.x, ePos.y, '#e06c75', 10);
              if (cam) cam.shake(7, 0.2);
            }
          }
          // 击退敌人（水平为主）
          const dx = ePos.x - mPos.x;
          const dy = ePos.y - mPos.y;
          const len = Math.hypot(dx, dy) || 1;
          applyKnockback(world, ei, (dx / len) * hitbox.knockback, -60);
        }
      }

      // 命中敌人 → 连击 +1
      if (hitAny && playerIdx !== undefined) {
        const combo = world.storage.get(playerIdx, ComboCounter);
        if (combo) {
          combo.count += 1;
          combo.timer = combo.window;
        }
      }
    }

    // 敌人 × 玩家（接触伤害 + 击退玩家）
    if (playerIdx !== undefined) {
      const pPos = world.storage.get(playerIdx, Position);
      const pCol = world.storage.get(playerIdx, Collider);
      if (pPos && pCol) {
        for (const ei of enemyIdxs) {
          const ePos = world.storage.get(ei, Position);
          const eCol = world.storage.get(ei, Collider);
          const dmg = world.storage.get(ei, ContactDamage);
          if (!ePos || !eCol || !dmg) continue;
          const dist = Math.hypot(pPos.x - ePos.x, pPos.y - ePos.y);
          if (dist < pCol.radius + eCol.radius) {
            if (applyDamage(world, playerIdx, dmg.damage)) {
              // 玩家被击退（远离敌人）
              const dx = pPos.x - ePos.x;
              const dy = pPos.y - ePos.y;
              const len = Math.hypot(dx, dy) || 1;
              applyKnockback(world, playerIdx, (dx / len) * 260, (dy / len) * 260);
              // 玩家受击：红字 + 冲击波 + 较强震动
              spawnDamageNumber(world, pPos.x, pPos.y - pCol.radius - 6, dmg.damage, '#ff5555');
              spawnHitSpark(world, pPos.x, pPos.y, '#ff5555', 1.2);
              audio.play('hurt');
              const cam = world.getResource(Camera);
              if (cam) cam.shake(6, 0.18);
            }
          }
        }
      }
    }

    for (const e of toDestroy) world.despawn(e);
  },
};

/** 扣血；若目标处于无敌帧则免疫。返回是否真的造成伤害 */
function applyDamage(world: World, entityIdx: number, damage: number): boolean {
  if (world.storage.has(entityIdx, Invincible)) return false;
  const hp = world.storage.get(entityIdx, Health);
  if (!hp) return false;
  hp.current -= damage;

  // 受击闪白（视觉反馈）
  const entity = world.getByIndex(entityIdx);
  if (entity) {
    let flash = world.storage.get(entityIdx, HitFlash);
    if (!flash) {
      flash = new HitFlash(0.1);
      world.addComponent(entity, HitFlash, flash);
    } else {
      flash.timer = flash.duration;
    }
  }
  return true;
}

/** 施加击退 */
function applyKnockback(world: World, entityIdx: number, vx: number, vy: number): void {
  const kb = world.storage.get(entityIdx, Knockback);
  if (kb) {
    kb.vx = vx;
    kb.vy = vy;
    kb.timer = 0.15;
  }
}
