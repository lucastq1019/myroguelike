import Entity from './Entity';
import Scene from '../sceneManager/Scene';
import SceneComponent from './SceneComponent';

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
}

export default EntityManager;