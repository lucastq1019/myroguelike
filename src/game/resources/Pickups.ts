/**
 * 掉落物配置（阶段C2）
 *
 * 集中定义：
 *   - 掉落概率 / 数值（DROP_CONFIG）
 *   - 临时增益表（BUFF_DEFS）：增益如何影响玩家
 *
 * 数值全部集中在文件顶部常量区，便于调参。
 */
import { World, Entity } from '../../GameEngine/ecs';
import { PickupKind } from '../components';

// ============ 掉落概率与数值（可调） ============

export interface DropConfig {
  /** 击杀必掉金币数量区间 [min, max] */
  coinMin: number;
  coinMax: number;
  /** 血包掉落概率（0~1） */
  healChance: number;
  /** 血包回复量（占最大生命比例） */
  healRatio: number;
  /** 增益掉落概率（0~1） */
  buffChance: number;
  /** 掉落物存活时间（秒） */
  life: number;
}

export const DROP_CONFIG: DropConfig = {
  coinMin: 1,
  coinMax: 5,
  healChance: 0.18,
  healRatio: 0.15,
  buffChance: 0.12,
  life: 14,
};

// ============ 临时增益表 ============

export interface BuffDef {
  id: string;
  name: string;
  /** 增益持续时长（秒） */
  duration: number;
  /** 颜色（渲染 + HUD 显示） */
  color: string;
  /** 应用：拾取瞬间生效（设置全局倍率等） */
  apply: (world: World, player: Entity) => void;
  /** 失效：计时归零时回滚 */
  revert: (world: World, player: Entity) => void;
}

/** 全局倍率载体（与 __playerSpeedMul 同风格，便于各系统读取） */
function setMul(name: string, value: number): void {
  (globalThis as any)[name] = value;
}

export const BUFF_DEFS: BuffDef[] = [
  {
    id: 'rage',
    name: '狂暴',
    duration: 8,
    color: '#ff8c42',
    apply: () => setMul('__buffDamageMul', 1.6),
    revert: () => setMul('__buffDamageMul', 1),
  },
  {
    id: 'haste',
    name: '疾行',
    duration: 8,
    color: '#56b6c2',
    apply: () => setMul('__playerSpeedMul', 1.4),
    revert: () => setMul('__playerSpeedMul', 1),
  },
];

export function getBuffDef(id: string): BuffDef | undefined {
  return BUFF_DEFS.find((b) => b.id === id);
}

/** 随机抽一个增益（掉落用） */
export function rollBuff(): BuffDef {
  return BUFF_DEFS[Math.floor(Math.random() * BUFF_DEFS.length)];
}

/** 掉落物外观（渲染装饰器 + 小地图用） */
export interface PickupStyle {
  color: string;
  shape: 'circle' | 'rect';
  size: number;
}

export const PICKUP_STYLE: Record<PickupKind, PickupStyle> = {
  coin: { color: '#ffd166', shape: 'circle', size: 12 },
  heal: { color: '#e06c75', shape: 'rect', size: 14 },
  buff: { color: '#c678dd', shape: 'circle', size: 14 },
};
