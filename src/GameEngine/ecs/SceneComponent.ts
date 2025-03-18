import Component from '../core/objects/Component';
import Scene from '../sceneManager/Scene';

export default class SceneComponent extends Component {
    // 保持与Component基类的兼容性
    public readonly scene: Scene;
    private propertyStore = new Map<string, any>();
    private changeListeners = new Map<string, Set<(newVal: any) => void>>();

    constructor(scene: Scene) {
        super({ name: 'SceneComponent' });
        this.scene = scene;
    }

    // 兼容原有接口
    getScene(): Scene {
        return this.scene;
    }

    // 类型安全的属性操作
    setProperty<T>(key: string, value: T): void {
        const oldValue = this.propertyStore.get(key);
        this.propertyStore.set(key, value);
        
        // 触发变更通知
        this.triggerPropertyChange(key, value, oldValue);
    }

    getProperty<T>(key: string): T | undefined {
        return this.propertyStore.get(key);
    }

    // 新增生命周期方法
    onLoad(): void {
        this.scene.load();
    }

    onUnload(): void {
        this.scene.onUnload();
    }

    private triggerPropertyChange(key: string, newVal: any, oldVal: any) {
        const listeners = this.changeListeners.get(key);
        listeners?.forEach(cb => cb(newVal));
        
        // 保持与旧版回调的兼容
        this.onPropertyChange?.(key, newVal);
    }

    // 兼容旧版接口
    watchProperty<T>(key: string, callback: (newVal: T) => void): void {
        if (!this.changeListeners.has(key)) {
            this.changeListeners.set(key, new Set());
        }
        this.changeListeners.get(key)?.add(callback);
    }

    // 保持原有接口的兼容性
    public onPropertyChange?: (key: string, value: any) => void;
}