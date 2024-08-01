import Camera2D from './camera/Camera2D';
import Vector2 from './core/common/Vector2';
import GameObject from './core/objects/GameObject';
import DataManager from './dataManager/dataManager';
import AIEngine from './engines/AIEngine';
import AnimationEngine from './engines/AnimationEngine';
import AudioEngine from './engines/AudioEngine';
import NetworkingEngine from './engines/NetworkingEngine';
import ScriptingEngine from './engines/ScriptingEngine';
import EventDispatcher from './events/EventDispatcher';
import PhysicsEngine from './physicsEngine/index';
import RenderingEngine from './renderer/RenderingEngine';
import SceneManager from './sceneManager/SceneManager';
import scenesConfig from '@/scenes.json';

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
        // const physicsEngine = new PhysicsEngine();
        // const audioEngine = AudioEngine.getInstance();
        // const scriptingEngine = new ScriptingEngine();
        // const animationEngine = new AnimationEngine(this);
        // const networkingEngine = new NetworkingEngine(this);
        const sceneManager = new SceneManager(this);
        // const aiEngine = new AIEngine(this);
        // const dataManager = new DataManager(this);
        const eventDispatcher = new EventDispatcher();
        this.camera = new Camera2D({
            position: new Vector2(0, 0), scale: 1,
            size: new Vector2(800, 600), name: "mainCamera",
            gameObject: new GameObject
        });

        this.renderingEngine = renderingEngine;
        // this.physics = physicsEngine;
        // this.audio = audioEngine;
        // this.scripting = scriptingEngine;
        // this.animation = animationEngine;
        // this.networking = networkingEngine;
        this.sceneManager = sceneManager;
        // this.ai = aiEngine;
        // this.dataManager = dataManager;
        this.eventDispatcher = eventDispatcher;
        
        this.sceneManager.registerScenesFromConfig(scenesConfig.scenes);
        this.loadScenesFromConfig();
    }
    async loadScenesFromConfig() {
        const response = await fetch('./scenes.json');
        const scenesConfig = await response.json();
        scenesConfig.scenes.forEach((scene: { autoLoad: any; name: string; }) => {
          if (scene.autoLoad) {
            this.sceneManager.switchScene(scene.name);
            console.log(`自动加载场景：${scene.name}`)
          }
        });
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
        this.renderingEngine.render()
    }

    getActiveCamera(): Camera2D | null {
        return this.camera
    }

    getRenderingEngine(): RenderingEngine {
        return this.renderingEngine;
    }

}

export default GameEngine;