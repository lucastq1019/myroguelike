/**
 * 玩家控制系统（横版平台）
 *
 * 职责：
 *   - 水平移动：设置水平速度（含升级加成）
 *   - 朝向：根据移动方向翻转（Facing）
 *   - 攻击：近战由 MeleeSystem 处理；远程由 RangedSystem 处理
 *
 * 跳跃/重力由 LocomotionSystem + PhysicsSystem 处理。
 */
import { World } from '../../GameEngine/ecs';
import { Velocity, PlayerTag, Facing } from '../components';
import { Input } from '../../GameEngine/resources/Input';

const BASE_PLAYER_SPEED = 220;

export function createPlayerControlSystem(input: Input) {
  return {
    name: 'PlayerControlSystem',
    run(world: World): void {
      const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
      if (playerIdx === undefined) return;

      const vel = world.storage.get(playerIdx, Velocity);
      const facing = world.storage.get(playerIdx, Facing);
      if (!vel) return;

      // 水平移动（含升级加成）
      const speedMul = (globalThis as any).__playerSpeedMul ?? 1;
      const moveX = input.getMoveX();
      vel.x = moveX * BASE_PLAYER_SPEED * speedMul;

      // 朝向：按移动方向翻转（不动时保持原朝向）
      if (facing && moveX !== 0) {
        facing.dir = moveX > 0 ? 1 : -1;
      }
    },
  };
}
