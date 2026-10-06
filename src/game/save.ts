/**
 * 存档（localStorage）
 *
 * 记录跨局持久化的数据：最高层数、最佳连击、总游玩次数、永久货币（灵魂）、已解锁项。
 * 无 localStorage 环境（如测试/SSR）时降级为内存存储。
 *
 * 货币说明：
 *   - 局内金币（__coins）：本局资源，仅用于刷新升级，换局清零，**不入存档**
 *   - 灵魂（souls）：永久货币，跨局保留，用于局外解锁
 */
export interface SaveData {
  /** 历史最高层数 */
  bestFloor: number;
  /** 历史最高连击 */
  bestCombo: number;
  /** 游玩次数 */
  runs: number;
  /** 永久货币：灵魂（局外解锁用） */
  souls: number;
  /** 已解锁项 id 列表 */
  unlocked: string[];
}

const STORAGE_KEY = 'mygame.save.v1';

const DEFAULT_SAVE: SaveData = { bestFloor: 0, bestCombo: 0, runs: 0, souls: 0, unlocked: [] };

/** 内存降级（无 localStorage 时） */
let memoryStore: SaveData = { ...DEFAULT_SAVE };

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

/** 读取存档 */
export function loadSave(): SaveData {
  if (!hasLocalStorage()) return { ...memoryStore, unlocked: [...memoryStore.unlocked] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE, unlocked: [] };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      bestFloor: parsed.bestFloor ?? 0,
      bestCombo: parsed.bestCombo ?? 0,
      runs: parsed.runs ?? 0,
      souls: parsed.souls ?? 0,
      unlocked: Array.isArray(parsed.unlocked) ? [...parsed.unlocked] : [],
    };
  } catch {
    return { ...DEFAULT_SAVE, unlocked: [] };
  }
}

/** 写入存档 */
export function writeSave(data: SaveData): void {
  if (!hasLocalStorage()) {
    memoryStore = { ...data, unlocked: [...data.unlocked] };
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    memoryStore = { ...data, unlocked: [...data.unlocked] };
  }
}

/** 结算灵魂奖励数值（占位，可调） */
export const SOULS_PER_FLOOR = 1;
export const SOULS_NEW_BEST_BONUS = 5;

/** 按层数计算本局灵魂奖励 */
export function soulsForRun(floor: number, isNewBest: boolean): number {
  return floor * SOULS_PER_FLOOR + (isNewBest ? SOULS_NEW_BEST_BONUS : 0);
}

/**
 * 一局结束时更新存档（记录最高层数/连击，游玩次数 +1，结算灵魂）。
 * 返回：存档、是否新纪录、本局获得灵魂数。
 */
export function recordRun(
  floor: number,
  combo: number,
): { save: SaveData; isNewBest: boolean; soulsGained: number } {
  const save = loadSave();
  const isNewBest = floor > save.bestFloor;
  save.bestFloor = Math.max(save.bestFloor, floor);
  save.bestCombo = Math.max(save.bestCombo, combo);
  save.runs += 1;
  const soulsGained = soulsForRun(floor, isNewBest);
  save.souls += soulsGained;
  writeSave(save);
  return { save, isNewBest, soulsGained };
}

/** 消耗灵魂解锁一项（成功返回新存档，失败返回 null） */
export function unlockItem(id: string, cost: number): SaveData | null {
  const save = loadSave();
  if (save.unlocked.includes(id)) return null;
  if (save.souls < cost) return null;
  save.souls -= cost;
  save.unlocked.push(id);
  writeSave(save);
  return save;
}

/** 清空存档（调试用） */
export function clearSave(): void {
  memoryStore = { ...DEFAULT_SAVE, unlocked: [] };
  if (hasLocalStorage()) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
