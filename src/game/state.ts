/**
 * 游戏状态机
 *
 * MENU      —— 主菜单（开始界面）
 * SHOP      —— 局外解锁商店
 * PLAYING   —— 游戏中
 * PAUSED    —— 暂停
 * GAMEOVER  —— 结束（死亡）
 *
 * 状态切换由 main.ts 的交互（键鼠）驱动；界面绘制由 screen 系统读取。
 */
export enum GamePhase {
  MENU = 'menu',
  SHOP = 'shop',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAMEOVER = 'gameover',
}

/** 状态机（简单实现：当前状态 + 切换） */
export class GameStateMachine {
  private phase: GamePhase = GamePhase.MENU;

  get current(): GamePhase {
    return this.phase;
  }

  set(phase: GamePhase): void {
    this.phase = phase;
  }

  is(phase: GamePhase): boolean {
    return this.phase === phase;
  }

  /** 是否处于「可操作」的游戏进行中状态 */
  isPlaying(): boolean {
    return this.phase === GamePhase.PLAYING;
  }
}
