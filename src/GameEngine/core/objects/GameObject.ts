import Transform from './Transform';
import Component from './Component';
import GameObjectConfig from './GameObjectConfig.1';

export default class GameObject {
    
    id: string;
    tag: string;
    active: boolean;
    transform: Transform;
    components: Map<string, Component>;
    scene: any;

    constructor(config: GameObjectConfig = {}) {
        this.id = config.id || '';
        this.tag = config.tag || '';
        this.active = config.active ?? true;

        this.transform = new Transform();
        this.components = new Map<string, Component>();
    }

    addComponent(component: Component) {
        this.components.set(component.name, component);
        component.gameObject = this;
    }

    removeComponent(name: string) {
        this.components.delete(name);
    }

    onCollisionDetected(other: any) {
        throw new Error('Method not implemented.');
      }
}