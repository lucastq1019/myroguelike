import Transform from './Transform';
import Component from './Component';
import GameObjectConfig from './GameObjectConfig';

/**
 * 游戏对象类，用于创建和管理游戏中的实体对象
 * 一个游戏对象可以有多个组件，通过组件来实现复杂的行为
 */
export default class GameObject {
    
    id: string; // 游戏对象的唯一标识符
    tag: string; // 游戏对象的标签，用于分类
    active: boolean; // 游戏对象的激活状态
    transform: Transform; // 游戏对象的变换组件，用于位置、旋转、缩放等
    components: Map<string, Component>; // 游戏对象的组件集合
    scene: any; // 游戏对象所属的场景

    /**
     * 构造函数，用于创建一个游戏对象
     * @param config 游戏对象的配置参数，包括id、tag、active等
     */
    constructor(config: GameObjectConfig = {id:"",tag:"",active:true}) {
        this.id = config.id || '';
        this.tag = config.tag || '';
        this.active = config.active ?? true;

        this.transform = new Transform();
        this.components = new Map<string, Component>();
    }

    /**
     * 向游戏对象添加一个组件
     * @param component 要添加的组件实例
     * 组件添加后，会将其与游戏对象关联
     */
    addComponent(component: Component) {
        this.components.set(component.name, component);
        component.gameObject = this;
    }

    /**
     * 从游戏对象移除一个组件
     * @param name 要移除的组件的名称
     * 移除组件后，组件将不再与游戏对象关联
     */
    removeComponent(name: string) {
        this.components.delete(name);
    }

    /**
     * 当检测到碰撞时调用的方法
     * 此方法在每个游戏对象上都可以被重写，以实现特定的碰撞逻辑
     * @param other 发生碰撞的另一个对象
     * @throws Error 因为这个方法在基类中未实现，所以抛出错误
     */
    onCollisionDetected(other: any) {
        throw new Error('Method not implemented.');
    }
}