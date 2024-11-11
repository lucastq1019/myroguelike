import Component from "../core/objects/Component";
import RenderComponent from "../renderer/RenderComponent";

class Scene {
    private components: Component[];

    /**
     * 创建一个具有给定名称的新Scene实例。
     * @param name 场景的唯一标识符。
     */
    constructor(readonly name: string) {
        this.components = [];
    }

    /**
     * 加载场景所需的资源。
     * 实现此方法以执行任何资源加载逻辑。
     */
    load(): void {
        // 在此处添加资源加载逻辑
    }

    // 卸载场景
    onUnload(): void {
        // 清理资源和状态
    }

    /**
     * 向场景中添加组件。
     * @param component 要添加的组件。
     */
    addComponent(component: Component): void {
        this.components.push(component);
    }

    /**
     * 从场景中移除组件。
     * @param component 要移除的组件。
     * @returns 如果组件成功移除则返回true，否则返回false。
     */
    removeComponent(component: Component): boolean {
        const index = this.components.indexOf(component);
        if (index !== -1) {
            this.components.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 清除场景中的所有组件。
     */
    clearComponents(): void {
        this.components = [];
    }

    /**
     * 处理场景内的键盘事件。
     * 重写此方法以实现自定义键盘事件处理。
     * @param event 键盘事件对象。
     */
    handleKeyboardEvent(event: KeyboardEvent): void {
        // 在此处处理键盘事件
    }

    /**
     * 处理场景内的鼠标事件。
     * 重写此方法以实现自定义鼠标事件处理。
     * @param event 鼠标事件对象。
     */
    handleMouseEvent(event: MouseEvent): void {
        // 在此处处理鼠标事件
    }

    /**
 * 获取场景中的所有组件。
 * @returns 组件数组的浅拷贝。
 */
    getComponents(): Component[] {
        return [...this.components];
    }

    /**
     * 通过传递自上次更新以来的时间（dt）来更新场景中的所有组件。
     * @param dt 自上次更新以来的时间（以秒为单位）。
     */
    update(dt: number): void {
        for (const component of this.components) {
            component.update(dt);
        }
    }
    // 新增方法：获取需要渲染的组件
    getRenderComponents(): Component[] {
        return this.components.filter(component => component instanceof RenderComponent);
    }
}

export default Scene;