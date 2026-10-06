/**
 * World —— ECS 世界（统一入口）
 *
 * 聚合：
 *   - EntityManager   ：实体分配/回收
 *   - ComponentStorage：组件存储（SoA）
 *   - SystemManager   ：系统调度
 *   - Resources       ：全局单例数据（输入/相机/时间等）
 *
 * Resource 是「全局单例数据」，不是实体，不参与组件查询。
 * 系统通过 world.getResource(类型) 读取。
 */
import Entity from './Entity';
import EntityManager from './EntityManager';
import { ComponentStorage, ComponentType } from './ComponentStorage';
import { Query, QueryBuilder } from './Query';
import SystemManager from './SystemManager';

export class World {
  readonly entities: EntityManager;
  readonly storage: ComponentStorage;
  readonly systemManager: SystemManager;

  /** 全局资源：类型 -> 实例 */
  private resources = new Map<Function, any>();

  constructor() {
    this.storage = new ComponentStorage();
    this.entities = new EntityManager(this.storage);
    this.systemManager = new SystemManager();
  }

  // ---- 实体 ----

  spawn(): Entity {
    return this.entities.createEntity();
  }

  despawn(entity: Entity): void {
    this.entities.destroyEntity(entity);
  }

  /**
   * 回收实体（清空组件 + 加入空闲列表），供对象池使用。
   * 与 despawn 的区别：语义上「保留待复用」，实现上同样释放 index。
   */
  recycle(entity: Entity): void {
    this.entities.destroyEntity(entity);
  }

  /**
   * 按索引复用实体（对象池用）。
   * 若该 index 当前空闲，则复活它（version +1）；否则新建。
   */
  respawn(index: number): Entity {
    return this.entities.reviveEntity(index);
  }

  // ---- 组件 ----

  addComponent<T>(entity: Entity, type: ComponentType<T>, component: T): void {
    this.storage.add(entity.index, type, component);
    this.entities.addMask(entity.index, this.storage.getBitMask(type));
  }

  /**
   * 显式注册组件类型并指定稳定 id（可选）。
   * 不注册的类型会在首次使用时自动分配 id。
   */
  registerComponent<T>(type: ComponentType<T>, id: number): void {
    this.storage.registry.register(type, id);
  }

  getComponent<T>(entity: Entity, type: ComponentType<T>): T | undefined {
    return this.storage.get(entity.index, type);
  }

  removeComponent<T>(entity: Entity, type: ComponentType<T>): boolean {
    const ok = this.storage.remove(entity.index, type);
    if (ok) this.entities.removeMask(entity.index, this.storage.getBitMask(type));
    return ok;
  }

  // ---- 查询 ----

  query(): QueryBuilder {
    return new QueryBuilder();
  }

  /**
   * 查询匹配的实体索引（返回新数组）。
   * 优化：直接用 alive[] 判断存活（不创建 Entity 实例 / 不做 Map 查找）。
   */
  findEntities(query: Query): number[] {
    const result: number[] = [];
    this.findEntitiesInto(query, result);
    return result;
  }

  /**
   * 查询匹配的实体索引，写入调用方提供的数组（复用缓冲，避免分配）。
   * 热路径（每帧多次查询）用这个；调用方负责清空/复用 out。
   */
  findEntitiesInto(query: Query, out: number[]): number[] {
    out.length = 0;
    const count = this.entities.getCount();
    for (let i = 0; i < count; i++) {
      if (!this.entities.isAliveIndex(i)) continue;
      if (query.matches(this.entities.getMask(i))) out.push(i);
    }
    return out;
  }

  dense<T>(type: ComponentType<T>): readonly T[] {
    return this.storage.getDense(type);
  }

  denseEntities<T>(type: ComponentType<T>): readonly number[] {
    return this.storage.getEntities(type);
  }

  // ---- 便捷方法（供系统使用） ----

  /** 实体是否存活 */
  isAlive(entity: Entity): boolean {
    return this.entities.isAlive(entity);
  }

  /** 取组件类型的位掩码 */
  maskOf<T>(type: ComponentType<T>): bigint {
    return this.storage.getBitMask(type);
  }

  /** 按索引取实体 */
  getByIndex(index: number): Entity | null {
    return this.entities.getEntityById(index);
  }

  // ---- 资源（全局单例数据） ----

  /** 注册资源 */
  insertResource<T>(type: new (...args: any[]) => T, resource: T): void {
    this.resources.set(type, resource);
  }

  /** 读取资源（不存在返回 undefined） */
  getResource<T>(type: new (...args: any[]) => T): T | undefined {
    return this.resources.get(type);
  }

  /** 读取资源（不存在抛错，用于必需资源） */
  expectResource<T>(type: new (...args: any[]) => T): T {
    const r = this.resources.get(type);
    if (r === undefined) throw new Error(`World: 资源未注册 ${type.name}`);
    return r;
  }

  /** 移除资源 */
  removeResource<T>(type: new (...args: any[]) => T): boolean {
    return this.resources.delete(type);
  }

  hasResource<T>(type: new (...args: any[]) => T): boolean {
    return this.resources.has(type);
  }

  // ---- 系统 ----

  addSystem(system: { name: string; run(world: World, dt: number): void }): this {
    this.systemManager.registerSystem(system as any);
    return this;
  }

  update(dt: number): void {
    this.systemManager.update(dt, this);
  }
}
