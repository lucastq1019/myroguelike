/**
 * ComponentStorage —— 组件存储（SoA 核心）
 *
 * 每个组件类型对应一个 Storage，内部用「稠密数组 + 稀疏索引」：
 *   dense[]   : 紧凑存放组件数据（遍历友好，缓存命中高）
 *   sparse[]  : entityIndex -> dense 下标（O(1) 查找）
 *   entities[]: dense 下标 -> entityIndex（反向映射，删除时 swap-remove）
 *
 * 删除用 swap-remove：把最后一个元素填到被删位置，保持 dense 紧凑（O(1)）。
 */

/** 组件类型：用构造函数作为运行时标识（支持 abstract 类） */
export type ComponentType<T> = abstract new (...args: any[]) => T;

import { ComponentRegistry } from './ComponentRegistry';

interface Storage<T> {
  dense: T[];
  sparse: number[];
  entities: number[];
}

export class ComponentStorage {
  private stores = new Map<ComponentType<any>, Storage<any>>();
  /** 组件类型注册表（稳定 id / 位掩码） */
  readonly registry = new ComponentRegistry();

  /** 为一个组件类型分配（或获取）位掩码（BigInt，支持任意多种组件） */
  getBitMask<T>(type: ComponentType<T>): bigint {
    return this.registry.getBitMask(type);
  }

  private getStore<T>(type: ComponentType<T>): Storage<T> {
    let store = this.stores.get(type);
    if (!store) {
      store = { dense: [], sparse: [], entities: [] };
      this.stores.set(type, store);
    }
    return store as Storage<T>;
  }

  add<T>(entityIndex: number, type: ComponentType<T>, component: T): void {
    const store = this.getStore(type);
    const existing = store.sparse[entityIndex];
    if (existing !== undefined && existing !== -1) {
      store.dense[existing] = component;
      return;
    }
    const denseIndex = store.dense.length;
    store.dense.push(component);
    store.sparse[entityIndex] = denseIndex;
    store.entities.push(entityIndex);
  }

  get<T>(entityIndex: number, type: ComponentType<T>): T | undefined {
    const store = this.stores.get(type) as Storage<T> | undefined;
    if (!store) return undefined;
    const denseIndex = store.sparse[entityIndex];
    if (denseIndex === undefined || denseIndex === -1) return undefined;
    return store.dense[denseIndex];
  }

  has<T>(entityIndex: number, type: ComponentType<T>): boolean {
    return this.get(entityIndex, type) !== undefined;
  }

  remove<T>(entityIndex: number, type: ComponentType<T>): boolean {
    const store = this.stores.get(type) as Storage<T> | undefined;
    if (!store) return false;
    const denseIndex = store.sparse[entityIndex];
    if (denseIndex === undefined || denseIndex === -1) return false;

    const lastDenseIndex = store.dense.length - 1;
    if (denseIndex !== lastDenseIndex) {
      const lastEntity = store.entities[lastDenseIndex];
      store.dense[denseIndex] = store.dense[lastDenseIndex];
      store.entities[denseIndex] = lastEntity;
      store.sparse[lastEntity] = denseIndex;
    }
    store.dense.pop();
    store.entities.pop();
    store.sparse[entityIndex] = -1;
    return true;
  }

  /** 移除某实体的所有组件（实体销毁时调用） */
  removeAll(entityIndex: number): void {
    for (const type of this.stores.keys()) {
      this.remove(entityIndex, type as ComponentType<any>);
    }
  }

  /** 获取某实体的所有组件（兼容旧 Entity.getAllComponents） */
  getAllOfEntity(entityIndex: number): any[] {
    const result: any[] = [];
    for (const store of this.stores.values()) {
      const denseIndex = store.sparse[entityIndex];
      if (denseIndex !== undefined && denseIndex !== -1) {
        result.push(store.dense[denseIndex]);
      }
    }
    return result;
  }

  getDense<T>(type: ComponentType<T>): readonly T[] {
    const store = this.stores.get(type) as Storage<T> | undefined;
    return store ? store.dense : [];
  }

  getEntities<T>(type: ComponentType<T>): readonly number[] {
    const store = this.stores.get(type) as Storage<T> | undefined;
    return store ? store.entities : [];
  }

  getTypeCount(): number {
    return this.stores.size;
  }
}
