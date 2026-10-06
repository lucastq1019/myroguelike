/**
 * 升级词条（局内成长）
 *
 * 每个词条是一个「应用到玩家」的函数。清空房间后随机抽 3 个供选择。
 * 词条带稀有度（common / rare / epic），HUD 按稀有度着色。
 */
import { World, Entity } from '../../GameEngine/ecs';
import {
  Health, Sprite, Collider, MeleeAttack, Locomotion, Weapon,
  Lifesteal, CritChance,
} from '../components';

/** 稀有度 */
export type Rarity = 'common' | 'rare' | 'epic';

/** 稀有度 → 颜色 / 名称 */
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa0a6', // 灰
  rare: '#569cd6', // 蓝
  epic: '#c678dd', // 紫
};

export const RARITY_NAME: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
};

/** 抽取权重（越稀有越难出） */
const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 6,
  rare: 3,
  epic: 1,
};

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  rarity: Rarity;
  /** 应用到玩家 */
  apply: (world: World, player: Entity) => void;
}

export const UPGRADES: Upgrade[] = [
  // ============ 普通 ============
  {
    id: 'damage',
    name: '锋利刀刃',
    desc: '近战伤害 +10',
    rarity: 'common',
    apply: (w, p) => {
      const atk = w.getComponent(p, MeleeAttack);
      if (atk) atk.damage += 10;
    },
  },
  {
    id: 'attackspeed',
    name: '快速挥砍',
    desc: '攻击速度 +20%',
    rarity: 'common',
    apply: (w, p) => {
      const atk = w.getComponent(p, MeleeAttack);
      if (atk) atk.cooldown = Math.max(0.08, atk.cooldown * 0.8);
    },
  },
  {
    id: 'range',
    name: '长刃',
    desc: '攻击范围 +30%',
    rarity: 'common',
    apply: (w, p) => {
      const atk = w.getComponent(p, MeleeAttack);
      if (atk) {
        atk.rangeX *= 1.3;
        atk.rangeY *= 1.3;
      }
    },
  },
  {
    id: 'maxhp',
    name: '强健体魄',
    desc: '最大生命 +30 并回满',
    rarity: 'common',
    apply: (w, p) => {
      const hp = w.getComponent(p, Health);
      if (hp) {
        hp.max += 30;
        hp.current = hp.max;
      }
    },
  },
  {
    id: 'heal',
    name: '治疗',
    desc: '回复 40 生命',
    rarity: 'common',
    apply: (w, p) => {
      const hp = w.getComponent(p, Health);
      if (hp) hp.current = Math.min(hp.max, hp.current + 40);
    },
  },
  {
    id: 'speed',
    name: '疾风步',
    desc: '移动速度 +15%',
    rarity: 'common',
    apply: (w, p) => {
      const loco = w.getComponent(p, Locomotion);
      if (loco) loco.moveSpeed *= 1.15;
    },
  },
  {
    id: 'jump',
    name: '弹簧腿',
    desc: '跳跃高度 +12%',
    rarity: 'common',
    apply: (w, p) => {
      const loco = w.getComponent(p, Locomotion);
      if (loco) loco.jumpSpeed *= 1.12;
    },
  },
  {
    id: 'size',
    name: '巨大化',
    desc: '体型 +20%（碰撞体也变大）',
    rarity: 'common',
    apply: (w, p) => {
      const sprite = w.getComponent(p, Sprite);
      const col = w.getComponent(p, Collider);
      if (sprite) sprite.size *= 1.2;
      if (col) col.radius *= 1.2;
    },
  },
  {
    id: 'knockback',
    name: '重击',
    desc: '击退力度 +50%',
    rarity: 'common',
    apply: (w, p) => {
      const atk = w.getComponent(p, MeleeAttack);
      if (atk) atk.knockback *= 1.5;
    },
  },

  // ============ 稀有 ============
  {
    id: 'bulletpower',
    name: '强化弹药',
    desc: '子弹伤害 +8',
    rarity: 'rare',
    apply: (w, p) => {
      const wp = w.getComponent(p, Weapon);
      if (wp) wp.damage += 8;
    },
  },
  {
    id: 'firerate',
    name: '速射装置',
    desc: '射击冷却 -25%',
    rarity: 'rare',
    apply: (w, p) => {
      const wp = w.getComponent(p, Weapon);
      if (wp) wp.cooldown = Math.max(0.08, wp.cooldown * 0.75);
    },
  },
  {
    id: 'bulletspeed',
    name: '高速弹丸',
    desc: '子弹速度 +30%',
    rarity: 'rare',
    apply: (w, p) => {
      const wp = w.getComponent(p, Weapon);
      if (wp) wp.bulletSpeed *= 1.3;
    },
  },
  {
    id: 'crit',
    name: '致命一击',
    desc: '暴击率 +20%（暴击双倍伤害）',
    rarity: 'rare',
    apply: (w, p) => {
      const crit = w.getComponent(p, CritChance);
      if (crit) crit.chance = Math.min(1, crit.chance + 0.2);
    },
  },

  // ============ 史诗 ============
  {
    id: 'lifesteal',
    name: '吸血之刃',
    desc: '命中回复 1 点生命',
    rarity: 'epic',
    apply: (w, p) => {
      const ls = w.getComponent(p, Lifesteal);
      if (ls) ls.perHit += 1;
    },
  },
  {
    id: 'doublejump',
    name: '三段跳',
    desc: '最大跳跃次数 +1',
    rarity: 'epic',
    apply: (w, p) => {
      const loco = w.getComponent(p, Locomotion);
      if (loco) loco.maxJumps += 1;
    },
  },
];

/** 按稀有度加权随机抽 n 个不重复词条 */
export function rollUpgrades(n: number): Upgrade[] {
  const pool = [...UPGRADES];
  const result: Upgrade[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    // 计算总权重
    let total = 0;
    for (const u of pool) total += RARITY_WEIGHT[u.rarity];
    // 加权随机
    let r = Math.random() * total;
    let pick = 0;
    for (let k = 0; k < pool.length; k++) {
      r -= RARITY_WEIGHT[pool[k].rarity];
      if (r <= 0) {
        pick = k;
        break;
      }
    }
    result.push(pool.splice(pick, 1)[0]);
  }
  return result;
}
