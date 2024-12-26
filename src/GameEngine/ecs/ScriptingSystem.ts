import System from './System';
import EntityManager from './EntityManager';

export default class ScriptingSystem extends System {
    constructor(entityManager: EntityManager) {
        super(entityManager);
    }

    update(dt: number): void {
    }

    getRequiredComponents(): string[] {
        return ['ScriptComponent'];
    }
}