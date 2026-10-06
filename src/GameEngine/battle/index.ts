/** 战斗子系统统一导出 */
export {
  emptySnapshot,
  snapshotFromEntities,
  entitiesFromSnapshot,
  stepBattle,
  applyDamage,
  aliveCount,
} from './Protocol';
export type {
  BattleEntitySnapshot,
  BattleWorldSnapshot,
  MainToWorker,
  WorkerToMain,
} from './Protocol';
export { BattleEngine } from './BattleEngine';
export type { BattleEngineOptions } from './BattleEngine';
export { handleMessage as handleWorkerMessage } from './Worker';
