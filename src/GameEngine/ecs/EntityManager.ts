import Entity from './Entity';
import Scene from '../sceneManager/Scene';
import SceneComponent from './SceneComponent';
import Component from './Component';

class EntityManager {
    private entities: Entity[];
    private nextEntityId: number;

    constructor() {
        this.entities = [];
        this.nextEntityId = 0;
    }

    createEntity(): Entity {
        const entity = new Entity(this.nextEntityId++);
        this.entities.push(entity);
        return entity;
    }

    getAllEntities(): Entity[] {
        return this.entities;
    }

    getSceneByName(sceneName: string): Scene | null {
        for (const entity of this.entities) {
            const sceneComponent = entity.getComponent<SceneComponent>('SceneComponent');
            if (sceneComponent && sceneComponent.getScene().name === sceneName) {
                return sceneComponent.getScene();
            }
        }
        return null;
    }
    
    // 跟踪变更的实体
    private changedEntities = new Set<string>();
    
    // 标记实体变更
    public markEntityChanged(entityId: string) {
        this.changedEntities.add(entityId);
    }
    
    // 获取变更集
    public getChangedEntities(): Entity[] {
        return Array.from(this.changedEntities).map(id => this.getEntityById(id));
    }
    
    // 清空变更记录
    public clearChangeRecords() {
        this.changedEntities.clear();
    }
    
    // 添加类型安全查询
    getAllWithComponent<T extends Component>(type: new () => T): Entity[] {
        return this.entities.filter(e => 
            e.getComponent(type) !== null
        );
    }
    
    // 兼容旧版字符串查询
    getEntitiesWithComponent(componentName: string): Entity[] {
        return this.entities.filter(e => 
            e.hasComponent(componentName)
        );
    }
}

export default EntityManager;