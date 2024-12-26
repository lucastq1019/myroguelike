import Component from './Component';

class Entity {
    private id: number;
    private components: { [key: string]: Component };

    constructor(id: number) {
        this.id = id;
        this.components = {};
    }

    getId(): number {
        return this.id;
    }

    addComponent(component: Component): void {
        this.components[component.constructor.name] = component;
    }

    removeComponent(componentName: string): void {
        delete this.components[componentName];
    }

    hasComponent(componentName: string): boolean {
        return componentName in this.components;
    }

    getComponent<T extends Component>(componentName: string): T | null {
        return this.components[componentName] as T || null;
    }
}

export default Entity;