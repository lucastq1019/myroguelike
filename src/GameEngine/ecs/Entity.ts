/**
 * Entity —— 实体（改造版）
 *
 * 改造要点：
 * - 旧版：Entity 内部用 Map 存组件（AoS，缓存不友好）。
 * - 新版：Entity **只存 id（index+version）**，组件存在 ComponentStorage（SoA）。
 * - 为兼容外壳代码（`entity.getComponent(类)` / `entity.addComponent(...)`），
 *   Entity 持有 World 引用，方法转发到 storage。
 *
 * 版本号用于防悬空引用：id 复用后 version+1，旧引用失效。
 */
import EcsComponent from './EcsComponent';
import type { ComponentType } from './ComponentStorage';

/** Entity 需要的宿主能力（避免循环依赖，用宽松接口约束） */
export interface EntityHost {
  storage: any;
  addMask(index: number, bit: bigint): void;
  removeMask(index: number, bit: bigint): void;
  maskOf(type: ComponentType<any>): bigint;
}

class Entity {
  /** 实体索引（可被回收复用） */
  readonly index: number;
  /** 版本号（复用 +1，防悬空引用） */
  readonly version: number;
  /** 宿主 World（用于组件操作） */
  private host: EntityHost | null;

  constructor(index: number, version: number, host: EntityHost | null = null) {
    this.index = index;
    this.version = version;
    this.host = host;
  }

  /** 绑定宿主（由 EntityManager 创建后调用） */
  _setHost(host: EntityHost): void {
    this.host = host;
  }

  /** 兼容旧接口：实体 id */
  getId(): number {
    return this.index;
  }

  /** 唯一句柄（index + version 打包） */
  get handle(): number {
    return (this.version << 20) | this.index;
  }

  equals(other: Entity | null): boolean {
    return other !== null && this.index === other.index && this.version === other.version;
  }

  /** 添加组件（转发到 storage） */
  addComponent<T extends EcsComponent>(component: T): T {
    if (!this.host) throw new Error('Entity.addComponent: 未绑定 host');
    const type = component.constructor as ComponentType<T>;
    component.entityId = this.index;
    this.host.storage.add(this.index, type, component);
    this.host.addMask(this.index, this.host.maskOf(type));
    return component;
  }

  /** 获取组件（转发到 storage） */
  getComponent<T extends EcsComponent>(type: ComponentType<T>): T | null {
    if (!this.host) return null;
    return this.host.storage.get(this.index, type) ?? null;
  }

  /** 是否拥有某组件 */
  hasComponent<T extends EcsComponent>(type: ComponentType<T>): boolean {
    if (!this.host) return false;
    return this.host.storage.has(this.index, type);
  }

  /** 移除组件 */
  removeComponent<T extends EcsComponent>(type: ComponentType<T>): boolean {
    if (!this.host) return false;
    const ok = this.host.storage.remove(this.index, type);
    if (ok) this.host.removeMask(this.index, this.host.maskOf(type));
    return ok;
  }

  /** 获取该实体的所有组件 */
  getAllComponents<T extends EcsComponent>(): T[] {
    if (!this.host) return [];
    return this.host.storage.getAllOfEntity(this.index) as T[];
  }

  toString(): string {
    return `Entity(idx=${this.index}, v=${this.version})`;
  }
}

export default Entity;
