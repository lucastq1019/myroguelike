/**
 * 实体状态序列化（中途存档）
 *
 * 移植自旧 GameEngine 的 `core/data/dataManager` + 组件的 `serialize/deserialize` 设计。
 *
 * 目标：把「本局进行中的世界状态」存下来，下次可继续（区别于 save.ts 的**元进度**）。
 *
 * 设计要点：
 *   - **注册制**：只有显式注册的组件类型会被序列化（避免把 Sprite 等纯表现数据写入存档）
 *   - **组件自定义**：组件可选实现 `serialize()/deserialize()`；否则按字段浅拷贝
 *   - **玩家优先**：玩家实体带 `PlayerTag`，读档时优先恢复
 *   - **容错**：未知组件类型 / 缺失字段一律跳过，不抛错
 *
 * 用法：
 *   const codec = createWorldCodec()
 *     .register(Position, 'position')
 *     .register(Health, 'health')
 *     .register(Transform, 'transform');
 *   const snapshot = codec.serialize(world);
 *   codec.deserialize(world, snapshot);
 */

import type { World } from '../ecs/World';
import type Entity from '../ecs/Entity';
import type { ComponentType } from '../ecs/ComponentStorage';

/** 可自定义序列化的组件 */
export interface Serializable {
  serialize(): unknown;
  deserialize(data: unknown): void;
}

/** 判断组件是否实现了自定义序列化 */
function isSerializable(c: unknown): c is Serializable {
  return (
    typeof c === 'object' &&
    c !== null &&
    typeof (c as Serializable).serialize === 'function' &&
    typeof (c as Serializable).deserialize === 'function'
  );
}

/** 单个组件的存档条目 */
export interface ComponentSnapshot {
  /** 注册名 */
  type: string;
  /** 数据（自定义序列化结果，或字段浅拷贝） */
  data: unknown;
}

/** 单个实体的存档条目 */
export interface EntitySnapshot {
  /** 原实体索引（读档时用于重建，不保证一致） */
  index: number;
  /** 是否玩家实体 */
  isPlayer: boolean;
  components: ComponentSnapshot[];
}

/** 世界快照 */
export interface WorldSnapshot {
  /** 格式版本（便于将来迁移） */
  version: number;
  /** 存档时间戳 */
  savedAt: number;
  entities: EntitySnapshot[];
}

export const SNAPSHOT_VERSION = 1;

/** 组件注册项 */
interface Registration<T> {
  name: string;
  type: ComponentType<T>;
  /** 可选：从数据构造新组件（读档时用；省略则需组件有无参构造） */
  create?: (data: any) => T;
}

/**
 * 世界编解码器：注册哪些组件需要存档。
 */
export class WorldCodec {
  private regs: Registration<any>[] = [];
  private byName = new Map<string, Registration<any>>();

  /**
   * 注册一个需要序列化的组件类型。
   * @param type   组件类
   * @param name   存档中的类型名（稳定标识，勿随意改）
   * @param create 可选：从数据构造组件（省略则用无参构造 + 字段回填）
   */
  register<T>(type: ComponentType<T>, name: string, create?: (data: any) => T): this {
    const reg: Registration<T> = { name, type, create };
    this.regs.push(reg);
    this.byName.set(name, reg);
    return this;
  }

  /** 已注册的组件类型名 */
  registeredNames(): string[] {
    return this.regs.map((r) => r.name);
  }

  isRegistered(name: string): boolean {
    return this.byName.has(name);
  }

  /** 序列化一个实体的所有已注册组件 */
  private serializeEntity(world: World, entity: Entity, isPlayer: boolean): EntitySnapshot {
    const components: ComponentSnapshot[] = [];
    for (const reg of this.regs) {
      const comp = world.storage.get(entity.index, reg.type);
      if (comp === undefined) continue;
      const data = isSerializable(comp) ? comp.serialize() : { ...(comp as any) };
      components.push({ type: reg.name, data });
    }
    return { index: entity.index, isPlayer, components };
  }

  /**
   * 序列化整个世界。
   * @param opts.playerMask 用于识别玩家实体的位掩码（可选）
   */
  serialize(world: World, opts: { playerMask?: bigint } = {}): WorldSnapshot {
    const entities: EntitySnapshot[] = [];
    const all = world.entities.getAllEntities();
    for (const e of all) {
      if (!world.entities.isAlive(e)) continue;
      const isPlayer = opts.playerMask !== undefined && (world.entities.getMask(e.index) & opts.playerMask) !== 0n;
      const snap = this.serializeEntity(world, e, isPlayer);
      // 只保留至少有一个已注册组件的实体
      if (snap.components.length > 0) entities.push(snap);
    }
    return { version: SNAPSHOT_VERSION, savedAt: Date.now(), entities };
  }

  /** 从数据构造组件实例 */
  private buildComponent(reg: Registration<any>, data: any): any {
    if (reg.create) return reg.create(data);
    // 无 create：尝试无参构造 + 回填字段
    try {
      const inst = new (reg.type as any)();
      if (isSerializable(inst)) inst.deserialize(data);
      else if (data && typeof data === 'object') Object.assign(inst, data);
      return inst;
    } catch {
      return null;
    }
  }

  /**
   * 反序列化到世界（**追加**实体，不清理已有实体）。
   * 返回成功恢复的实体数。
   */
  deserialize(world: World, snapshot: WorldSnapshot): number {
    if (!snapshot || !Array.isArray(snapshot.entities)) return 0;
    let restored = 0;

    // 玩家优先恢复（保证玩家实体索引靠前，便于后续查找）
    const ordered = [...snapshot.entities].sort((a, b) => Number(b.isPlayer) - Number(a.isPlayer));

    for (const es of ordered) {
      const e = world.spawn();
      let added = 0;
      for (const cs of es.components) {
        const reg = this.byName.get(cs.type);
        if (!reg) continue; // 未知类型跳过（前向兼容）
        const comp = this.buildComponent(reg, cs.data);
        if (comp === null || comp === undefined) continue;
        world.addComponent(e, reg.type, comp);
        added++;
      }
      if (added > 0) restored++;
      else world.despawn(e); // 没有任何有效组件 → 不留空实体
    }
    return restored;
  }

  /** 清空世界中的实体（读档前调用，保留资源） */
  static clearWorld(world: World): void {
    for (const e of world.entities.getAllEntities()) {
      if (world.entities.isAlive(e)) world.despawn(e);
    }
  }

  /** 读档：先清空世界，再恢复 */
  loadInto(world: World, snapshot: WorldSnapshot): number {
    WorldCodec.clearWorld(world);
    return this.deserialize(world, snapshot);
  }
}

/** 创建编解码器 */
export function createWorldCodec(): WorldCodec {
  return new WorldCodec();
}

/** 快照 JSON 序列化（存 localStorage / 文件） */
export function snapshotToJSON(snapshot: WorldSnapshot): string {
  return JSON.stringify(snapshot);
}

/** 快照 JSON 反序列化（容错：解析失败返回 null） */
export function snapshotFromJSON(json: string): WorldSnapshot | null {
  try {
    const parsed = JSON.parse(json) as WorldSnapshot;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entities)) return null;
    return parsed;
  } catch {
    return null;
  }
}
