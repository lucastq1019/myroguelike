/** AI 状态机统一导出 */
export {
  AIState,
  createRuntime,
  step,
  idleStrategy,
  patrolStrategy,
  chaseStrategy,
  keepDistanceStrategy,
  dashStrategy,
  playerInRange,
  playerOutOfRange,
  timerDone,
  elapsedOver,
  chaserMachine,
  chargerMachine,
  shooterMachine,
  flyerMachine,
} from './StateMachine';
export type {
  AIContext,
  Strategy,
  Transition,
  StateMachine,
  MachineRuntime,
} from './StateMachine';
