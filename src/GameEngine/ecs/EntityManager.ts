import Entity from './Entity';
import EcsComponent from './EcsComponent';

class EntityManager {
    private entities: Map<number, Entity> = new Map();
    private nextEntityId: number = 0;
    private changedEntities = new Set<number>();  // 改为使用number类型

    createEntity(): Entity {
        const entity = new Entity(this.nextEntityId++);
        this.entities.set(entity.getId(), entity);
        return entity;
    }

    destroyEntity(entityId: number): void {
        this.entities.delete(entityId);
        this.changedEntities.delete(entityId);
    }

    getEntityById(id: number): Entity | null {
        return this.entities.get(id) || null;
    }

    getAllEntities(): Entity[] {
        return Array.from(this.entities.values());
    }

    getAllWithComponent<T extends EcsComponent>(type: new () => T): Entity[] {
        return this.getAllEntities().filter(e => e.getComponent(type) !== null);
    }

    // 改为使用number类型
    markEntityChanged(entityId: number): void {
        this.changedEntities.add(entityId);
    }

    getChangedEntities(): Entity[] {
        return Array.from(this.changedEntities)
            .map(id => this.getEntityById(id))
            .filter(Boolean) as Entity[];
    }

    clearChangeRecords(): void {
        this.changedEntities.clear();
    }
}

export default EntityManager;