import EntityManager from './EntityManager';

abstract class System {
    protected entityManager: EntityManager;
    
    constructor(entityManager: EntityManager) {
        this.entityManager = entityManager;
    }

    abstract update(dt: number): void;
}

export default System;