/**
 * 移动/跳跃系统（横版平台）
 *
 * 处理「受重力约束的移动能力」：
 *   - 水平移动：按 Locomotion.moveSpeed 设置水平速度
 *   - 跳跃 / 二段跳：着地或空中按 K 起跳（jumpsLeft 计数，上限 maxJumps）
 *   - 可变高度跳跃：上升途中松开 K → 削减上升速度（跳得矮）
 *   - 蹬墙跳：贴墙 + 按 K → 反向水平速度 + 向上速度，**消耗一次跳跃**；
 *     每次滞空**首次**蹬墙额外 +1 次跳跃（奖励，仅一次），落地重置
 *   - 蹬墙滑落：贴墙下落时减速
 *   - 冲刺（L）：地面/空中均可，水平高速、冲刺期间无视重力，有冷却（默认 0.5s）
 *   - 下穿平台：按住 S + 按 K → 给玩家 IgnorePlatforms 计时，短暂忽略单面平台
 *   - 终端速度：限制最大下落速度
 *
 * 跳跃次数规则（严格）：**只有真正着地才重置 jumpsLeft**；
 * 蹬墙跳 / 冲刺 / 二段跳都只消耗、不补充，杜绝「左脚踩右脚」无限连跳。
 * 例外：蹬墙跳有「每段滞空一次」的奖励（+1），防止蹬墙后无法继续跳跃。
 *
 * 依赖：PhysicsContacts 资源（由 PhysicsSystem 每帧写入接触状态）。
 * 顺序：本系统设置速度 → PhysicsSystem 积分并解算碰撞。
 *
 * 按键：跳跃 K / 攻击 J / 冲刺 L / 下穿 S+K
 */
import { World } from '../../GameEngine/ecs';
import { Velocity } from '../../GameEngine/ecs/components';
import { Locomotion, JumpState, DashState, Facing, PlayerTag, RigidBody } from '../components';
import { PhysicsContacts, ContactDir, IgnorePlatforms } from '../../GameEngine/physics';
import { Input } from '../../GameEngine/resources/Input';
import { audio } from '../audio';

/** 下穿平台时忽略平台的时长（秒） */
const DROP_THROUGH_TIME = 0.25;
/** 蹬墙跳后的水平输入锁定时间（秒） */
const WALL_JUMP_LOCK = 0.16;

export function createLocomotionSystem(input: Input) {
  return {
    name: 'LocomotionSystem',
    run(world: World, dt: number): void {
      const contacts = world.getResource(PhysicsContacts);
      if (!contacts) return;

      const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
      if (playerIdx !== undefined) {
        updatePlayer(world, playerIdx, input, contacts, dt);
      }

      // --- 通用：限制终端下落速度 ---
      const locos = world.dense(Locomotion);
      const locoEntities = world.denseEntities(Locomotion);
      for (let i = 0; i < locos.length; i++) {
        const vel = world.storage.get(locoEntities[i], Velocity);
        if (vel && vel.y > locos[i].maxFallSpeed) {
          vel.y = locos[i].maxFallSpeed;
        }
      }

      // --- 通用：递减 IgnorePlatforms 计时 ---
      const ignores = world.dense(IgnorePlatforms);
      for (const ig of ignores) {
        if (ig.timer > 0) ig.timer -= dt;
      }
    },
  };
}

function updatePlayer(
  world: World,
  playerIdx: number,
  input: Input,
  contacts: PhysicsContacts,
  dt: number,
): void {
  const vel = world.storage.get(playerIdx, Velocity);
  const loco = world.storage.get(playerIdx, Locomotion);
  const jump = world.storage.get(playerIdx, JumpState);
  const dash = world.storage.get(playerIdx, DashState);
  const facing = world.storage.get(playerIdx, Facing);
  if (!vel || !loco) return;

  const grounded = contacts.isGrounded(playerIdx);
  // 注意接触方向语义：ContactDir.Left 表示「法线朝左 = 被向左推」= 墙在右侧。
  const wallOnLeft = contacts.has(playerIdx, ContactDir.Right); // 被向右推 → 墙在左
  const wallOnRight = contacts.has(playerIdx, ContactDir.Left); // 被向左推 → 墙在右
  const onWall = wallOnLeft || wallOnRight;

  // ---- 计时器递减 ----
  if (jump) {
    if (jump.wallJumpLock > 0) jump.wallJumpLock -= dt;
  }
  if (dash) {
    if (dash.cooldown > 0) dash.cooldown -= dt;
    if (dash.timer > 0) dash.timer -= dt;
  }

  // ---- 冲刺（L）：地面/空中均可 ----
  if (dash && input.dashPressed && dash.cooldown <= 0 && dash.timer <= 0) {
    const moveX = input.getMoveX();
    // 冲刺方向：优先输入方向，否则用当前朝向
    const dir: 1 | -1 = moveX !== 0 ? (moveX > 0 ? 1 : -1) : (facing?.dir ?? 1);
    dash.dir = dir;
    dash.timer = loco.dashDuration;
    dash.cooldown = loco.dashCooldown;
    vel.x = dir * loco.dashSpeed;
    vel.y = 0; // 冲刺期间水平为主，清零垂直速度
    if (facing) facing.dir = dir;
    audio.play('dash');
    // 注意：冲刺不重置跳跃次数（防止「冲刺→跳→冲刺→跳」无限连跳）
  }

  // ---- 冲刺进行中：锁定水平速度、无视重力 ----
  if (dash && dash.timer > 0) {
    vel.x = dash.dir * loco.dashSpeed;
    vel.y = 0;
    // 关闭重力（物理系统不再累加重力），冲刺结束再恢复
    const rb = world.storage.get(playerIdx, RigidBody);
    if (rb) rb.gravityScale = 0;
    return;
  } else {
    // 非冲刺：恢复重力
    const rb = world.storage.get(playerIdx, RigidBody);
    if (rb && rb.gravityScale === 0) rb.gravityScale = 1;
  }

  // ---- 下穿平台：按住 S + 按 K ----
  if (input.isDownHeld() && input.jumpPressed && grounded) {
    const entity = world.getByIndex(playerIdx);
    if (entity) {
      let ig = world.storage.get(playerIdx, IgnorePlatforms);
      if (!ig) {
        ig = new IgnorePlatforms(0);
        world.addComponent(entity, IgnorePlatforms, ig);
      }
      ig.timer = DROP_THROUGH_TIME;
    }
    // 给一点向下速度，帮助快速穿下
    vel.y = Math.max(vel.y, 120);
    return;
  }

  // ---- 水平移动（含蹬墙跳后的输入锁定） ----
  const speedMul = (globalThis as any).__playerSpeedMul ?? 1;
  const moveX = input.getMoveX();

  if (jump && jump.wallJumpLock > 0) {
    // 蹬墙跳锁定期间：忽略水平输入，保持蹬出速度
    // （不覆盖 vel.x，让蹬墙冲量生效）
  } else {
    vel.x = moveX * loco.moveSpeed * speedMul;
  }

  // 朝向：按移动方向翻转（不动时保持原朝向）
  if (facing && moveX !== 0 && !(jump && jump.wallJumpLock > 0)) {
    facing.dir = moveX > 0 ? 1 : -1;
  }

  // ---- 跳跃 / 二段跳 / 蹬墙跳（K） ----
  if (jump) {
    // 着地 → 重置跳跃次数 + 蹬墙奖励机会
    if (grounded) {
      jump.jumpsLeft = loco.maxJumps;
      jump.rising = false;
      jump.wallJumpRewardUsed = false;
    }

    if (input.jumpPressed) {
      if (grounded) {
        // 地面跳
        vel.y = -loco.jumpSpeed;
        jump.rising = true;
        jump.jumpsLeft = loco.maxJumps - 1;
        audio.play('jump');
      } else if (onWall && jump.jumpsLeft > 0) {
        // 蹬墙跳：消耗一次跳跃（防止贴墙无限连跳）
        const wallDir: 1 | -1 = wallOnLeft ? 1 : -1; // 墙在左 → 向右蹬
        vel.x = wallDir * loco.wallJumpX;
        vel.y = -loco.wallJumpY;
        jump.rising = true;
        jump.wallJumpLock = WALL_JUMP_LOCK;
        jump.wallJumpDir = wallDir;
        if (facing) facing.dir = wallDir;
        // 蹬墙跳消耗一次跳跃
        jump.jumpsLeft -= 1;
        // 蹬墙奖励：每次滞空**仅一次**，额外 +1 次跳跃
        if (!jump.wallJumpRewardUsed) {
          jump.jumpsLeft += 1;
          jump.wallJumpRewardUsed = true;
        }
        audio.play('jump');
      } else if (jump.jumpsLeft > 0) {
        // 二段跳
        vel.y = -loco.jumpSpeed;
        jump.rising = true;
        jump.jumpsLeft -= 1;
        audio.play('jump');
      }
    }

    // 可变高度：上升途中松开 K → 削减上升速度（只削减一次）
    if (jump.rising && !input.jumpHeld && vel.y < 0) {
      vel.y *= loco.jumpCutMultiplier;
      jump.rising = false;
    }
    // 开始下落 → 结束上升状态
    if (vel.y >= 0) jump.rising = false;

    // 蹬墙滑落：贴墙下落时减速
    if (onWall && !grounded && vel.y > loco.wallSlideSpeed) {
      vel.y = loco.wallSlideSpeed;
    }
  }
}
