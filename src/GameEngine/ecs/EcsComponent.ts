/**
 * ECS架构组件基类
 */
abstract class EcsComponent {
    private _enabled: boolean = true;
    public entityId: number = -1;
    
    get enabled(): boolean {
        return this._enabled;
    }
    
    set enabled(value: boolean) {
        this._enabled = value;
    }

    abstract update(dt: number): void;
}

export default EcsComponent;