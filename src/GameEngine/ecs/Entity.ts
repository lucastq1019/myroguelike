import Component from './Component';

class Entity {
    private id: number;
    // 显式初始化并优化类型定义
    private components: Record<string, Component> = {};

    constructor(id: number) {
        this.id = id;
        // 确保组件存储被正确初始化
        this.components = {};
    }
    
    // 添加类型安全的组件操作
    addComponent<T extends Component>(component: T): void {
        const typeName = component.constructor.name;
        this.components[typeName] = component;
        
        // 触发组件生命周期
        if (component instanceof SceneComponent) {
            component.onLoad();
        }
    }

    getComponent<T extends Component>(type: new () => T): T | null {
        const typeName = type.prototype.constructor.name;
        return this.components[typeName] as T || null;
    }

    // 保留原有基于字符串的方法
    hasComponent(componentName: string): boolean {
        return componentName in this.components 
            || Object.values(this.components).some(c => c.constructor.name === componentName);
    }
}

export default Entity;