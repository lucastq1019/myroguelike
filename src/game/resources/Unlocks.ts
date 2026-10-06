/**
 * 局外永久解锁（阶段C3）
 *
 * 用「灵魂」（永久货币）解锁新一局的初始加成 / 初始角色属性。
 * 解锁项在 Game.start() 时应用到玩家。
 *
 * 数值全部集中在文件顶部，便于调参。
 */
import { World, Entity } from '../../GameEngine/ecs';
import { Health, Locomotion, MeleeAttack, Weapon, Lifesteal, CritChance, Sprite, Collider } from '../components';

export interface UnlockDef {
  id: string;
  name: string;
  desc: string;
  /** 消耗灵魂 */
  cost: number;
  /** 应用到新一局的玩家 */
  apply: (world: World, player: Entity) => void;
}

export const UNLOCKS: UnlockDef[] = [
  {
    id: 'vitality',
    name: '健壮体魄',
    desc: '初始最大生命 +20',
    cost: 10,
    apply: (w, p) => {
      const hp = w.getComponent(p, Health);
      if (hp) {
        hp.max += 20;
        hp.current = hp.max;
      }
    },
  },
  {
    id: 'swift',
    name: '轻盈步伐',
    desc: '初始移动速度 +10%',
    cost: 10,
    apply: (w, p) => {
      const loco = w.getComponent(p, Locomotion);
      if (loco) loco.moveSpeed *= 1.1;
    },
  },
  {
    id: 'sharp',
    name: '锋锐之刃',
    desc: '初始近战伤害 +8',
    cost: 15,
    apply: (w, p) => {
      const atk = w.getComponent(p, MeleeAttack);
      if (atk) atk.damage += 8;
    },
  },
  {
    id: 'vampire',
    name: '血之契约',
    desc: '开局自带吸血 1（命中回血）',
    cost: 25,
    apply: (w, p) => {
      const ls = w.getComponent(p, Lifesteal);
      if (ls) ls.perHit += 1;
    },
  },
  {
    id: 'lucky',
    name: '幸运星',
    desc: '开局自带 10% 暴击',
    cost: 25,
    apply: (w, p) => {
      const crit = w.getComponent(p, CritChance);
      if (crit) crit.chance = Math.min(1, crit.chance + 0.1);
    },
  },
  {
    id: 'arsenal',
    name: '军火库',
    desc: '初始子弹伤害 +6',
    cost: 20,
    apply: (w, p) => {
      const wp = w.getComponent(p, Weapon);
      if (wp) wp.damage += 6;
    },
  },
];

export function getUnlockDef(id: string): UnlockDef | undefined {
  return UNLOCKS.find((u) => u.id === id);
}

/** 把已解锁项应用到玩家（新一局开始时调用） */
export function applyUnlocks(world: World, player: Entity, unlocked: string[]): void {
  for (const id of unlocked) {
    const def = getUnlockDef(id);
    if (def) def.apply(world, player);
  }
}
