/**
 * 冲刺残影系统
 *
 * 冲刺期间，每隔固定间隔在玩家当前位置生成一个「残影」实体：
 *   - 无碰撞、无物理（仅 Position + Sprite + Afterimage）
 *   - 随寿命递减逐渐淡出，由 LifecycleSystem 销毁
 *
 * 残影数量受间隔控制，避免刷屏。
 */
import { World } from '../../GameEngine/ecs';
import { Position, Sprite } from '../../GameEngine/ecs/components';
import { PlayerTag, DashState, Afterimage } from '../components';

/** 残影生成间隔（秒） */
const SPAWN_INTERVAL = 0.03;
/** 残影寿命（秒） */
const AFTERIMAGE_LIFE = 0.25;

export function createAfterimageSystem() {
  // 每个玩家实体的残影生成计时（用简单 Map 记录）
  const timers = new Map<number, number>();

  return {
    name: 'AfterimageSystem',
    run(world: World, dt: number): void {
      const playerIdx = world.findEntities(world.query().with(world.maskOf(PlayerTag)).build())[0];
      if (playerIdx === undefined) return;

      const dash = world.storage.get(playerIdx, DashState);
      const pos = world.storage.get(playerIdx, Position);
      const sprite = world.storage.get(playerIdx, Sprite);
      if (!dash || !pos || !sprite) return;

      const dashing = dash.timer > 0;

      if (!dashing) {
        timers.set(playerIdx, 0);
        return;
      }

      let t = (timers.get(playerIdx) ?? 0) + dt;
      if (t >= SPAWN_INTERVAL) {
        t = 0;
        // 生成残影
        const ghost = world.spawn();
        world.addComponent(ghost, Position, new Position(pos.x, pos.y));
        world.addComponent(ghost, Sprite, new Sprite(sprite.size, sprite.color, sprite.shape));
        world.addComponent(ghost, Afterimage, new Afterimage(AFTERIMAGE_LIFE, AFTERIMAGE_LIFE, sprite.size, sprite.color));
      }
      timers.set(playerIdx, t);
    },
  };
}
