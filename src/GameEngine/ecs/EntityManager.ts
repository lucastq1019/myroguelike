/**
 * EntityManager —— 实体分配与回收（改造版）
 *
 * 改造要点：
 * - 旧版：`nextEntityId++` 只增不减，无版本号。
 * - 新版：FreeList 回收 index + 版本号防悬空引用 + 位掩码（供 Query）。
 * - 兼容旧 API：createEntity / destroyEntity / getEntityById / getAllEntities / getAllWithComponent。
 */
import Entity, { EntityHost } from './Entity';
import { ComponentStorage, ComponentType } from './ComponentStorage';

class EntityManager implements EntityHost {
  readonly storage: ComponentStorage;

  private versions: number[] = [];
  private alive: boolean[] = [];
  private freeList: number[] = [];
  private count = 0;
  private masks: bigint[] = [];
  /** index -> Entity 实例缓存（兼容旧 getEntityById 返回同一实例） */
  private entityCache = new Map<number, Entity>();

  constructor(storage: ComponentStorage = new ComponentStorage()) {
    this.storage = storage;
  }

  /** 兼容旧接口：创建实体 */
  createEntity(): Entity {
    let index: number;
    if (this.freeList.length > 0) {
      index = this.freeList.pop()!;
      this.versions[index] = (this.versions[index] ?? 0) + 1;
    } else {
      index = this.count++;
      this.versions[index] = 0;
    }
    this.alive[index] = true;
    this.masks[index] = 0n;

    const entity = new Entity(index, this.versions[index], this);
    this.entityCache.set(index, entity);
    return entity;
  }

  /** 兼容旧接口：销毁实体 */
  destroyEntity(entityOrId: Entity | number): void {
    const index = typeof entityOrId === 'number' ? entityOrId : entityOrId.index;
    if (index < 0 || index >= this.count || !this.alive[index]) return;
    this.storage.removeAll(index);
    this.alive[index] = false;
    this.masks[index] = 0n;
    this.freeList.push(index);
    this.entityCache.delete(index);
  }

  /**
   * 按索引复用实体（对象池用）：
   * 若该 index 当前空闲，则从 freeList 移除并复活（version +1）；
   * 否则回退到 createEntity。
   */
  reviveEntity(index: number): Entity {
    if (index >= 0 && index < this.count && !this.alive[index]) {
      // 从 freeList 移除该 index
      const pos = this.freeList.indexOf(index);
      if (pos >= 0) this.freeList.splice(pos, 1);
      this.versions[index] = (this.versions[index] ?? 0) + 1;
      this.alive[index] = true;
      this.masks[index] = 0n;
      const entity = new Entity(index, this.versions[index], this);
      this.entityCache.set(index, entity);
      return entity;
    }
    return this.createEntity();
  }

  /** 兼容旧接口：按 id 取实体 */
  getEntityById(id: number): Entity | null {
    if (id < 0 || id >= this.count || !this.alive[id]) return null;
    let e = this.entityCache.get(id);
    if (!e) {
      e = new Entity(id, this.versions[id], this);
      this.entityCache.set(id, e);
    }
    return e;
  }

  /** 兼容旧接口：所有实体 */
  getAllEntities(): Entity[] {
    const result: Entity[] = [];
    for (let i = 0; i < this.count; i++) {
      if (this.alive[i]) {
        const e = this.getEntityById(i);
        if (e) result.push(e);
      }
    }
    return result;
  }

  /** 兼容旧接口：拥有某组件的实体 */
  getAllWithComponent<T>(type: ComponentType<T>): Entity[] {
    const result: Entity[] = [];
    const entities = this.storage.getEntities(type);
    for (const idx of entities) {
      const e = this.getEntityById(idx);
      if (e) result.push(e);
    }
    return result;
  }

  // ---- 新内核 API ----

  /** 实体是否存活（版本号匹配） */
  isAlive(entity: Entity): boolean {
    return (
      entity.index < this.count &&
      this.alive[entity.index] === true &&
      this.versions[entity.index] === entity.version
    );
  }

  getAliveCount(): number {
    return this.count - this.freeList.length;
  }

  getCount(): number {
    return this.count;
  }

  /** 按索引判断实体是否存活（不创建 Entity 实例，热路径用） */
  isAliveIndex(index: number): boolean {
    return index >= 0 && index < this.count && this.alive[index] === true;
  }

  forEachAlive(callback: (index: number) => void): void {
    for (let i = 0; i < this.count; i++) {
      if (this.alive[i]) callback(i);
    }
  }

  // ---- 位掩码 ----

  addMask(index: number, bit: bigint): void {
    this.masks[index] = (this.masks[index] ?? 0n) | bit;
  }
  removeMask(index: number, bit: bigint): void {
    this.masks[index] = (this.masks[index] ?? 0n) & ~bit;
  }
  getMask(index: number): bigint {
    return this.masks[index] ?? 0n;
  }
  maskOf(type: ComponentType<any>): bigint {
    return this.storage.getBitMask(type);
  }
}

export default EntityManager;
