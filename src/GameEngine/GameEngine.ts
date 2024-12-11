import CharacterSelectionScene from '../scenes/CharacterSelectionScene';
import StartScene from '../scenes/StartScene';
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
import InputHandler from './events/InputHandler';
import PhysicsEngine from './physicsEngine/index';
import RenderingEngine from './renderer/RenderingEngine';
import SceneManager from './sceneManager/SceneManager';

/**
 * 游戏引擎类
 */
class GameEngine {

    private static _instance: GameEngine;

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
    private lastTime: number;
    private inputHandler: InputHandler;

    /**
     * 获取事件分发器
     * @returns {EventDispatcher} 事件分发器实例
     */
    getEventDispatcher(): EventDispatcher {
        return this.eventDispatcher;
    }

    private constructor() {
        const renderingEngine = new RenderingEngine(this);
        const eventDispatcher = new EventDispatcher();
        this.camera = new Camera2D({
            position: new Vector2(0, 0), scale: 1,
            size: new Vector2(800, 600), name: "mainCamera",
            gameObject: new GameObject()
        });

        this.renderingEngine = renderingEngine;
        this.renderingEngine.setActiveCamera(this.camera);
        this.eventDispatcher = eventDispatcher;
        const sceneManager = new SceneManager(this);
        this.sceneManager = sceneManager;
        this.physics = new PhysicsEngine(this);
        this.audio = new AudioEngine(this);
        this.scripting = new ScriptingEngine(this);
        this.animation = new AnimationEngine(this);
        this.networking = new NetworkingEngine(this);
        this.ai = new AIEngine(this);
        this.dataManager = new DataManager(this);
        this.lastTime = performance.now();
        this.inputHandler = new InputHandler();

        this.init();
        this.startGameLoop();
    }

    static getInstance(): GameEngine {
        if (!GameEngine._instance) {
            GameEngine._instance = new GameEngine();
        }
        return GameEngine._instance;
    }

    async loadScenesFromConfig() {
        const response = await fetch('./scenes.json');
        const scenesConfig = await response.json();
        console.log(scenesConfig);
        this.sceneManager.registerScenesFromConfig(scenesConfig.scenes);
    }

    /**
     * 更新逻辑
     * @param {number} dt 时间步长
     */
    update(dt: number): void {
        this.physics.update(dt);
        this.scripting.update(dt);
        // this.animation.update(dt);
        this.ai.update(dt);
        this.networking.update(dt);
        this.sceneManager.update(dt);
    }

    /**
     * 渲染
     */
    render(): void {
        this.renderingEngine.render();
    }

    getActiveCamera(): Camera2D | null {
        return this.camera;
    }

    getRenderingEngine(): RenderingEngine {
        return this.renderingEngine;
    }

    getSceneManager(): SceneManager {
        return this.sceneManager;
    }

    init() {
        const startScene = new StartScene('start');
        this.sceneManager.registerScene(startScene);

        const characterSelectionScene = new CharacterSelectionScene('CharacterSelectionScene');
        this.sceneManager.registerScene(characterSelectionScene);
        this.sceneManager.switchScene(startScene.name);
    }

    private startGameLoop() {
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    private gameLoop(currentTime: number) {
        const dt = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        this.update(dt);
        this.render();

        requestAnimationFrame(this.gameLoop.bind(this));
    }
    public getInputHandler(): InputHandler {
        return this.inputHandler;
    }
}

export default GameEngine;