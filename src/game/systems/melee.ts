/**
 * 近战攻击系统（3 段连招）
 *
 * 玩家按 J（或鼠标左键）→ 在朝向方向生成「近战判定盒」。
 * 连招：在连招窗口内再次按 J → 进入下一段（1 → 2 → 3），
 *       每段伤害/范围/击退递增；超出窗口则重置回第 1 段。
 *
 * 状态：ComboState.comboIndex（0=未开始，1/2/3=第几段）
 *       ComboState.comboTimer（窗口剩余时间）
 */
import { World } from '../../GameEngine/ecs';
import { Position, Velocity, Sprite, Collider } from '../components';
import {
  MeleeAttack, MeleeHitbox, MeleeLifetime, Facing, PlayerTag, ComboState,
} from '../components';
import { Input } from '../../GameEngine/resources/Input';
import { audio } from '../audio';

/** 连招窗口：每段结束后多久内可接下一段（秒） */
const COMBO_WINDOW = 0.45;

/** 每一段的参数：伤害倍率、范围倍率、击退倍率 */
const COMBO_STAGES = [
  { dmgMul: 1.0, rangeMul: 1.0, kbMul: 1.0, color: '#ffd166' }, // 第 1 段：轻
  { dmgMul: 1.2, rangeMul: 1.1, kbMul: 1.2, color: '#ffb347' }, // 第 2 段：中
  { dmgMul: 1.8, rangeMul: 1.3, kbMul: 2.0, color: '#ff8c42' }, // 第 3 段：重
];

export function createMeleeSystem(input: Input) {
  return {
    name: 'MeleeSystem',
    run(world: World, dt: number): void {
      const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
      if (playerIdx === undefined) return;

      const atk = world.storage.get(playerIdx, MeleeAttack);
      const pos = world.storage.get(playerIdx, Position);
      const facing = world.storage.get(playerIdx, Facing);
      const combo = world.storage.get(playerIdx, ComboState);
      if (!atk || !pos || !facing) return;

      // 冷却计时
      if (atk.timer > 0) atk.timer -= dt;

      // 连招窗口计时：超时 → 重置连招段
      if (combo) {
        if (combo.comboTimer > 0) {
          combo.comboTimer -= dt;
          if (combo.comboTimer <= 0) {
            combo.comboIndex = 0;
            combo.swung = false;
          }
        }
      }

      // 触发攻击：J 键（边沿触发）或鼠标左键
      const wantAttack = input.mouseDown || input.attackPressed;
      if (!wantAttack || atk.timer > 0) return;

      // 计算本次连招段
      let stage = 1;
      if (combo) {
        // 窗口内接续：进入下一段；否则从第 1 段开始
        if (combo.comboTimer > 0 && combo.comboIndex >= 1) {
          stage = Math.min(combo.comboIndex + 1, combo.maxCombo);
        } else {
          stage = 1;
        }
        combo.comboIndex = stage;
        combo.comboTimer = COMBO_WINDOW;
        combo.swung = true;
      }

      const cfg = COMBO_STAGES[Math.min(stage, COMBO_STAGES.length) - 1];

      // 第 3 段（重击）冷却略长，前两段更短（连招更顺）
      atk.timer = stage >= 3 ? atk.cooldown * 1.4 : atk.cooldown * 0.85;
      audio.play('attack');

      // 生成判定盒（在玩家前方）
      const hb = world.spawn();
      const cx = pos.x + facing.dir * (atk.rangeX * cfg.rangeMul + 8);
      world.addComponent(hb, Position, new Position(cx, pos.y));
      world.addComponent(hb, Velocity, new Velocity(0, 0));
      world.addComponent(hb, Sprite, new Sprite(8, cfg.color, 'rect'));
      world.addComponent(hb, Collider, new Collider(atk.rangeY * cfg.rangeMul));
      world.addComponent(
        hb,
        MeleeHitbox,
        new MeleeHitbox(atk.damage * cfg.dmgMul, atk.knockback * cfg.kbMul, true),
      );
      // 判定盒为「传感器」：不参与物理碰撞（无 RigidBody/Shape），仅用于伤害判定
      world.addComponent(hb, MeleeLifetime, new MeleeLifetime(atk.activeTime));
    },
  };
}
