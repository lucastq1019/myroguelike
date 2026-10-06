/**
 * 引擎验证：确认改造后的 GameEngine / World / Resource / ECS 能跑通
 *
 * 运行：npx tsx src/GameEngine/verify-engine.ts
 */
import { World } from './ecs/World';
import EntityManager from './ecs/EntityManager';
import { Position, Velocity, Sprite } from './ecs/components';
import { Camera } from './resources/Camera';
import { Time } from './resources/Time';

function section(t: string) {
  console.log('\n' + '='.repeat(52));
  console.log('  ' + t);
  console.log('='.repeat(52));
}
function check(name: string, cond: boolean) {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
}

// 1. ECS 内核
section('1. ECS 内核（实体/组件/版本号）');
{
  const em = new EntityManager();
  const e = em.createEntity();
  check(`创建实体 ${e} getId=${e.getId()}`, e.getId() === 0);

  em.destroyEntity(e);
  check('销毁后 isAlive=false', em.isAlive(e) === false);

  const e2 = em.createEntity();
  check('index 复用 + 版本递增', e2.getId() === e.getId() && e2.version !== e.version);
}

// 2. World + 组件 + 查询
section('2. World（组件 + 查询）');
{
  const world = new World();
  const e = world.spawn();
  world.addComponent(e, Position, new Position(3, 4));
  world.addComponent(e, Velocity, new Velocity(1, 0));

  check('getComponent(Position)', world.getComponent(e, Position)?.x === 3);

  const mask = world.maskOf(Position);
  const found = world.findEntities(world.query().with(mask).build());
  check(`Query 命中 ${found.length} 个（应 1）`, found.length === 1);

  check('dense(Position) 长度 1', world.dense(Position).length === 1);
}

// 3. Resource
section('3. Resource（全局单例数据）');
{
  const world = new World();
  world.insertResource(Camera, new Camera(960, 600, 1920, 1200));
  world.insertResource(Time, new Time());

  const cam = world.getResource(Camera);
  check('getResource(Camera)', cam !== undefined);

  // 相机坐标转换
  cam!.follow(960, 600);
  const screen = cam!.worldToScreen(960, 600);
  check('worldToScreen 中心 = 视口中心', Math.abs(screen.x - 480) < 0.01 && Math.abs(screen.y - 300) < 0.01);

  const back = cam!.screenToWorld(480, 300);
  check('screenToWorld 往返一致', Math.abs(back.x - 960) < 0.01 && Math.abs(back.y - 600) < 0.01);

  const time = world.getResource(Time)!;
  time.tick(1 / 60);
  time.tick(1 / 60);
  check('Time 累计正确', Math.abs(time.elapsed - 2 / 60) < 1e-6 && time.frame === 2);

  check('expectResource 缺资源抛错', (() => {
    try {
      world.expectResource(Sprite as any);
      return false;
    } catch {
      return true;
    }
  })());
}

// 4. 系统（新式 run(world, dt)）
section('4. 系统调度（run(world, dt)）');
{
  const world = new World();
  const e = world.spawn();
  world.addComponent(e, Position, new Position(0, 0));
  world.addComponent(e, Velocity, new Velocity(10, -5));

  world.addSystem({
    name: 'MovementSystem',
    run(w, dt) {
      const positions = w.dense(Position);
      const entities = w.denseEntities(Position);
      for (let i = 0; i < positions.length; i++) {
        const vel = w.storage.get(entities[i], Velocity);
        if (vel) {
          positions[i].x += vel.x * dt;
          positions[i].y += vel.y * dt;
        }
      }
    },
  });

  world.update(1);
  const pos = world.getComponent(e, Position)!;
  check(`移动 1 秒后 (${pos.x}, ${pos.y})`, pos.x === 10 && pos.y === -5);
}

console.log('\n✅ 引擎验证完成');
