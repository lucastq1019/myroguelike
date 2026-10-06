/**
 * EventDispatcher —— 事件分发器（改造版）
 *
 * 补充 subscribe / publish 别名，兼容 GameEngine 的调用。
 */

type GameEventListener<T> = (event: T) => void;

class EventDispatcher {
  private listeners: { [eventType: string]: GameEventListener<any>[] } = {};

  /** 添加事件监听器 */
  addEventListener<T>(eventType: string, listener: GameEventListener<T>): void {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(listener);
  }

  /** 移除事件监听器 */
  removeEventListener<T>(eventType: string, listener: GameEventListener<T>): void {
    const listeners = this.listeners[eventType];
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    }
  }

  /** 触发事件 */
  dispatchEvent<T>(eventType: string, event: T): void {
    const listeners = this.listeners[eventType] as GameEventListener<T>[] | undefined;
    if (listeners) {
      for (const listener of listeners) listener(event);
    }
  }

  // ---- 别名（兼容 GameEngine 的 subscribe / publish 调用） ----

  /** subscribe = addEventListener（别名） */
  subscribe<T>(eventType: string, listener: GameEventListener<T>): void {
    this.addEventListener(eventType, listener);
  }

  /** publish = dispatchEvent（别名） */
  publish<T>(eventType: string, event: T): void {
    this.dispatchEvent(eventType, event);
  }
}

export default EventDispatcher;
