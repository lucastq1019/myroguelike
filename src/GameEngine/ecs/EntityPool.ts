/**
 * EntityPool —— 短命实体对象池
 *
 * 子弹 / 特效 / 伤害飘字等实体频繁 spawn/despawn，会产生：
 *   - 每帧大量实体创建/销毁
 *   - Entity 实例分配（GC 压力）
 *
 * 对象池做法：销毁时不真正 destroy，而是「回收」到池中（清空组件 + 标记空闲），
 * 下次 spawn 时优先复用池中实体（避免 index 增长 + 减少分配）。
 *
 * 注意：本池只复用**实体索引**，组件数据每次重新 addComponent。
 * 复用的实体 version 会 +1（由 EntityManager 处理），旧引用自动失效。
 */
import { World } from './World';
import Entity from './Entity';

export class EntityPool {
  private world: World;
  private free: number[] = [];
  private capacity: number;

  constructor(world: World, capacity = 256) {
    this.world = world;
    this.capacity = capacity;
  }

  /** 从池中取一个实体（池空则新建） */
  acquire(): Entity {
    if (this.free.length > 0) {
      const index = this.free.pop()!;
      return this.world.respawn(index);
    }
    return this.world.spawn();
  }

  /** 回收实体到池（清空组件 + 标记空闲，不真正销毁） */
  release(entity: Entity): void {
    if (this.free.length >= this.capacity) {
      // 池满：真正销毁
      this.world.despawn(entity);
      return;
    }
    this.world.recycle(entity);
    this.free.push(entity.index);
  }

  /** 池中空闲实体数 */
  getFreeCount(): number {
    return this.free.length;
  }

  /** 清空池（销毁所有空闲实体） */
  clear(): void {
    for (const index of this.free) {
      const e = this.world.getByIndex(index);
      if (e) this.world.despawn(e);
    }
    this.free.length = 0;
  }
}
