import EcsComponent from './EcsComponent';

class Entity {
    private id: number;
    private components: Map<string, EcsComponent> = new Map();
    private componentTypes: Map<Function, string> = new Map();

    constructor(id: number) {
        this.id = id;
    }

    addComponent<T extends EcsComponent>(component: T): T {
        const typeName = component.constructor.name;
        const type = component.constructor;
        
        component.entityId = this.id;
        this.components.set(typeName, component);
        this.componentTypes.set(type, typeName);
        
        return component;
    }

    getComponent<T extends EcsComponent>(type: new () => T): T | null {
        const typeName = this.componentTypes.get(type);
        return typeName ? (this.components.get(typeName) as T) || null : null;
    }

    hasComponent(componentName: string): boolean {
        return this.components.has(componentName);
    }

    getId(): number {
        return this.id;
    }

    getAllComponents<T extends EcsComponent>(): T[] {
        return Array.from(this.components.values()).filter(
            (comp): comp is T => comp instanceof EcsComponent
        );
    }
}

export default Entity;