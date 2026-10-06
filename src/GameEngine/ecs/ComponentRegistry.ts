/**
 * ComponentRegistry —— 组件类型注册表
 *
 * 为组件类型分配**稳定**的 id / 位掩码，解决「按首次调用顺序递增」的不确定性。
 *
 * 两种注册方式：
 *   1. 显式注册：`registry.register(Position, 0)` —— 指定 id（推荐，顺序稳定）
 *   2. 自动分配：未显式注册的类型，首次使用时分配下一个可用 id
 *
 * 位掩码用 BigInt（1n << id），支持任意多种组件。
 */
import { ComponentType } from './ComponentStorage';

export class ComponentRegistry {
  /** 类型 -> id */
  private ids = new Map<ComponentType<any>, number>();
  /** 类型 -> 位掩码（缓存） */
  private masks = new Map<ComponentType<any>, bigint>();
  /** 已占用的 id（显式注册用） */
  private usedIds = new Set<number>();
  /** 自动分配的下一个 id */
  private nextAutoId = 0;

  /**
   * 显式注册组件类型并指定 id。
   * 若该类型已注册且 id 不同，抛错（防止误用）。
   */
  register<T>(type: ComponentType<T>, id: number): void {
    const existing = this.ids.get(type);
    if (existing !== undefined) {
      if (existing !== id) {
        throw new Error(`ComponentRegistry: ${(type as any).name} 已注册为 id=${existing}，不能改为 ${id}`);
      }
      return;
    }
    if (this.usedIds.has(id)) {
      throw new Error(`ComponentRegistry: id=${id} 已被占用`);
    }
    this.ids.set(type, id);
    this.usedIds.add(id);
  }

  /** 取（或分配）组件 id */
  getId<T>(type: ComponentType<T>): number {
    let id = this.ids.get(type);
    if (id === undefined) {
      // 自动分配：跳过已占用的 id
      while (this.usedIds.has(this.nextAutoId)) this.nextAutoId++;
      id = this.nextAutoId;
      this.usedIds.add(id);
      this.nextAutoId++;
      this.ids.set(type, id);
    }
    return id;
  }

  /** 取（或分配）组件位掩码 */
  getBitMask<T>(type: ComponentType<T>): bigint {
    let mask = this.masks.get(type);
    if (mask === undefined) {
      mask = 1n << BigInt(this.getId(type));
      this.masks.set(type, mask);
    }
    return mask;
  }

  /** 是否已注册（显式或自动） */
  has<T>(type: ComponentType<T>): boolean {
    return this.ids.has(type);
  }

  /** 已注册的组件类型数量 */
  getTypeCount(): number {
    return this.ids.size;
  }
}
