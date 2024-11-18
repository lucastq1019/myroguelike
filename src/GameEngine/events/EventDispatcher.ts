
class EventDispatcher {
  private listeners: { [eventType: string]: GameEventListener<any>[] } = {};

  /**
   * 添加事件监听器
   * @param eventType 事件类型
   * @param listener 事件监听器函数，接收事件对象作为参数
   */
  addEventListener<T>(eventType: string, listener: GameEventListener<T>): void {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(listener);
  }

  /**
   * 移除事件监听器
   * @param eventType 事件类型
   * @param listener 要移除的事件监听器函数
   */
  removeEventListener<T>(eventType: string, listener: GameEventListener<T>): void {
    const listeners = this.listeners[eventType];
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param eventType 事件类型
   * @param event 事件对象，将传递给所有监听该事件类型的监听器函数
   */
  dispatchEvent<T>(eventType: string, event: T): void {
    const listeners = this.listeners[eventType] as GameEventListener<T>[] | undefined;
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }
}

export default EventDispatcher;