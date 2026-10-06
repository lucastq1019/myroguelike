/**
 * 存档（localStorage）
 *
 * 记录跨局持久化的数据：最高层数、最佳连击、总游玩次数。
 * 无 localStorage 环境（如测试/SSR）时降级为内存存储。
 */
export interface SaveData {
  /** 历史最高层数 */
  bestFloor: number;
  /** 历史最高连击 */
  bestCombo: number;
  /** 游玩次数 */
  runs: number;
}

const STORAGE_KEY = 'mygame.save.v1';

const DEFAULT_SAVE: SaveData = { bestFloor: 0, bestCombo: 0, runs: 0 };

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
  if (!hasLocalStorage()) return { ...memoryStore };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      bestFloor: parsed.bestFloor ?? 0,
      bestCombo: parsed.bestCombo ?? 0,
      runs: parsed.runs ?? 0,
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

/** 写入存档 */
export function writeSave(data: SaveData): void {
  if (!hasLocalStorage()) {
    memoryStore = { ...data };
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    memoryStore = { ...data };
  }
}

/** 一局结束时更新存档（记录最高层数/连击，游玩次数 +1） */
export function recordRun(floor: number, combo: number): { save: SaveData; isNewBest: boolean } {
  const save = loadSave();
  const isNewBest = floor > save.bestFloor;
  save.bestFloor = Math.max(save.bestFloor, floor);
  save.bestCombo = Math.max(save.bestCombo, combo);
  save.runs += 1;
  writeSave(save);
  return { save, isNewBest };
}

/** 清空存档（调试用） */
export function clearSave(): void {
  memoryStore = { ...DEFAULT_SAVE };
  if (hasLocalStorage()) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
