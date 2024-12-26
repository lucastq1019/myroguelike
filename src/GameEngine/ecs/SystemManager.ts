import System from './System';

class SystemManager {
    private systems: System[];

    constructor() {
        this.systems = [];
    }

    registerSystem(system: System): void {
        this.systems.push(system);
    }

    update(dt: number): void {
        for (const system of this.systems) {
            system.update(dt);
        }
    }

    getSystem<T extends System>(systemType: new (...args: any[]) => T): T | null {
        for (const system of this.systems) {
            if (system instanceof systemType) {
                return system as T;
            }
        }
        return null;
    }
}

export default SystemManager;