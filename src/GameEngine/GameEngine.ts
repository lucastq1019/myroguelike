import { RenderingEngine } from './renderer/index';
import PhysicsEngine from './physicsEngine/index';
import AudioEngine from './engines/AudioEngine';
import ScriptingEngine from './engines/ScriptingEngine';
import AnimationEngine from './engines/AnimationEngine';
import NetworkingEngine from './engines/NetworkingEngine';
import SceneManager from './sceneManager/SceneManager';
import AIEngine from './engines/AIEngine';
import DataManager from './dataManager/dataManager';
import EventDispatcher from './events/EventDispatcher';
import Camera2D from './camera/Camera2D';

/**
 * 游戏引擎类
 */
class GameEngine {

    private renderingEngine: RenderingEngine;
    private physics: PhysicsEngine;
    private audio: AudioEngine;
    private scripting: ScriptingEngine;
    private animation: AnimationEngine;
    private networking: NetworkingEngine;
    private sceneManager: SceneManager;
    private ai: AIEngine;
    private dataManager: DataManager;
    private eventDispatcher: EventDispatcher;
    private camera: Camera2D;

    /**
     * 获取事件分发器
     * @returns {EventDispatcher} 事件分发器实例
     */
    getEventDispatcher(): EventDispatcher {
        return this.eventDispatcher;
    }


    constructor() {
        const renderingEngine = new RenderingEngine(this);
        const physicsEngine = new PhysicsEngine();
        const audioEngine = AudioEngine.getInstance();
        const scriptingEngine = new ScriptingEngine(this);
        const animationEngine = new AnimationEngine(this);
        const networkingEngine = new NetworkingEngine(this);
        const sceneManager = new SceneManager(this);
        const aiEngine = new AIEngine(this);
        const dataManager = new DataManager(this);
        const eventDispatcher = new EventDispatcher();

        this.renderingEngine = renderingEngine;
        this.physics = physicsEngine;
        this.audio = audioEngine;
        this.scripting = scriptingEngine;
        this.animation = animationEngine;
        this.networking = networkingEngine;
        this.sceneManager = sceneManager;
        this.ai = aiEngine;
        this.dataManager = dataManager;
        this.eventDispatcher = eventDispatcher;
    }

    /**
     * 创建游戏引擎
     * @returns {GameEngine} 游戏引擎实例 暂时空着
     */
    static createGameEngine(): GameEngine {
        return new GameEngine();
    }

    /**
     * 更新逻辑
     * @param {number} dt 时间步长
     */
    update(dt: number): void {
        // ...
    }

    /**
     * 渲染
     */
    render(): void {
        // ...
    }

    getActiveCamera(): Camera2D | null {
        return this.camera
    }

}

export default GameEngine;