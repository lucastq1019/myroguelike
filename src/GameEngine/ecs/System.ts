/**
 * System —— 系统基类（改造版）
 *
 * 改造要点：
 * - 保留旧接口（构造注入 EntityManager、`update(dt)`），兼容外壳。
 * - 推荐新写法：无状态 + `run(world, dt)`（见 ecs-lab）。
 * - 这里保留 entityManager 引用，方便旧系统过渡。
 */
import EntityManager from './EntityManager';

abstract class System {
  protected entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  abstract update(dt: number): void;

  /** 该系统的可选依赖组件名（旧接口保留） */
  getRequiredComponents(): string[] {
    return [];
  }
}

export default System;
