class EventDispatcher {
    // 输入事件：这些事件通常由用户的输入触发，例如键盘按键、鼠标点击或移动、触摸屏操作等。
    // 游戏状态事件：这些事件通常在游戏状态改变时触发，例如游戏开始、游戏结束、关卡完成、玩家得分等。
    // 物理事件：这些事件通常在游戏物理引擎检测到特定的物理交互时触发，例如碰撞、重力影响、速度改变等。
    // 动画和声音事件：这些事件通常在动画播放完成或声音播放完成时触发。
    // 网络事件：这些事件通常在网络操作完成或网络状态改变时触发，例如数据加载完成、网络连接断开等。
    // 自定义事件：除了以上的标准事件类型，您还可以定义自己的事件类型来满足特定的需求。
    constructor() {
        this.listeners = {};
    }

    addEventListener(eventType, listener) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(listener);
    }

    removeEventListener(eventType, listener) {
        const listeners = this.listeners[eventType];
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    dispatchEvent(eventType, event) {
        const listeners = this.listeners[eventType];
        if (listeners) {
            for (const listener of listeners) {
                listener(event);
            }
        }
    }
}
export default EventDispatcher