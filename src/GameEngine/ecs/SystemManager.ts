/**
 * SystemManager —— 系统调度
 *
 * 支持两种系统形态：
 *   1. 旧式：class 继承 System，有 `update(dt)`
 *   2. 新式：对象 `{ name, run(world, dt) }`（推荐，无状态）
 *
 * 按注册顺序执行（顺序即依赖）。
 */
import System from './System';
import type { World } from './World';

/** 新式系统接口 */
export interface RunnableSystem {
  name: string;
  run(world: World, dt: number): void;
}

type AnySystem = System | RunnableSystem;

class SystemManager {
  private systems: AnySystem[] = [];

  registerSystem(system: AnySystem): void {
    this.systems.push(system);
  }

  update(dt: number, world?: World): void {
    for (const system of this.systems) {
      if (typeof (system as RunnableSystem).run === 'function') {
        // 新式系统
        (system as RunnableSystem).run(world as World, dt);
      } else {
        // 旧式系统
        (system as System).update(dt);
      }
    }
  }

  getSystem<T extends AnySystem>(systemType: new (...args: any[]) => T): T | null {
    for (const system of this.systems) {
      if (system instanceof systemType) return system as T;
    }
    return null;
  }

  getSystemCount(): number {
    return this.systems.length;
  }
}

export default SystemManager;
