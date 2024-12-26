// GameEngine.ts
import Camera2D from './camera/Camera2D';
import Vector2 from './core/common/Vector2';
import GameObject from './core/objects/GameObject';
import EventDispatcher from './events/EventDispatcher';
import InputHandler from './events/InputHandler';
import RenderSystem from './renderer/RenderSystem';
import EntityManager from './ecs/EntityManager';
import SystemManager from './ecs/SystemManager';
import PhysicsSystem from './ecs/PhysicsSystem';
import ScriptingSystem from './ecs/ScriptingSystem';
import AnimationSystem from './ecs/AnimationSystem';
import AISystem from './ecs/AISystem';
import NetworkingSystem from './ecs/NetworkingSystem';
import SceneManagerSystem from './sceneManager/SceneManagerSystem';
import SceneLoaderSystem from './sceneManager/SceneLoaderSystem';

/**
 * 游戏引擎类
 */
class GameEngine {

    private static _instance: GameEngine | null = null;

    private eventDispatcher: EventDispatcher;
    private camera: Camera2D;
    private lastTime: number;
    private inputHandler: InputHandler;

    // ECS 相关
    private entityManager: EntityManager;
    private systemManager: SystemManager;

    // 添加屏幕宽度和高度属性为静态属性
    private static screenWidth: number;
    private static screenHeight: number;

    // 添加 SceneManagerSystem 和 SceneLoaderSystem 属性
    private sceneManagerSystem: SceneManagerSystem;
    private sceneLoaderSystem: SceneLoaderSystem;
    private renderSystem: RenderSystem;

    private config: any;

    /**
     * 获取事件分发器
     * @returns {EventDispatcher} 事件分发器实例
     */
    getEventDispatcher(): EventDispatcher {
        return this.eventDispatcher;
    }

    private constructor() {
        // 获取浏览器自动宽高配置   
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        GameEngine.screenWidth = windowWidth;
        GameEngine.screenHeight = windowHeight;

        const eventDispatcher = new EventDispatcher();
        this.camera = new Camera2D({
            position: new Vector2(0, 0), scale: 1,
            size: new Vector2(GameEngine.screenWidth, GameEngine.screenHeight), name: "mainCamera",
            gameObject: new GameObject()
        });

        this.eventDispatcher = eventDispatcher;

        // ECS 初始化
        this.entityManager = new EntityManager();
        this.systemManager = new SystemManager();

        // 初始化 RenderSystem, SceneManagerSystem 和 SceneLoaderSystem
        this.renderSystem = new RenderSystem(this.entityManager);
        this.sceneManagerSystem = new SceneManagerSystem(this.entityManager);
        this.sceneLoaderSystem = new SceneLoaderSystem(this.entityManager);

        // 注册系统
        this.registerSystems();

        this.lastTime = performance.now();
        this.inputHandler = new InputHandler();

        this.startGameLoop();
    }

    /**
     * 注册系统到 SystemManager
     */
    private registerSystems(): void {
        this.systemManager.registerSystem(new PhysicsSystem(this.entityManager));
        this.systemManager.registerSystem(new ScriptingSystem(this.entityManager));
        this.systemManager.registerSystem(new AnimationSystem(this.entityManager));
        this.systemManager.registerSystem(new AISystem(this.entityManager));
        this.systemManager.registerSystem(new NetworkingSystem(this.entityManager));
        this.systemManager.registerSystem(this.sceneManagerSystem);
        this.systemManager.registerSystem(this.sceneLoaderSystem);
        this.systemManager.registerSystem(this.renderSystem); // 确保 RenderSystem 在最后
    }

    /**
     * 更新逻辑
     * @param {number} dt 时间步长
     */
    update(dt: number): void {
        this.systemManager.update(dt);
    }

    getActiveCamera(): Camera2D | null {
        return this.camera;
    }

    getRenderSystem(): RenderSystem {
        return this.renderSystem;
    }

    getSceneManagerSystem(): SceneManagerSystem {
        return this.sceneManagerSystem;
    }

    getSceneLoaderSystem(): SceneLoaderSystem {
        return this.sceneLoaderSystem;
    }

    private startGameLoop() {
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    private gameLoop(currentTime: number) {
        const dt = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        this.update(dt);

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    public getInputHandler(): InputHandler {
        return this.inputHandler;
    }

    // 提供获取屏幕宽度和高度的方法
    static getScreenWidth(): number {
        return GameEngine.screenWidth;
    }

    static getScreenHeight(): number {
        return GameEngine.screenHeight;
    }

    public static getInstance(): GameEngine {
        if (!GameEngine._instance) {
            GameEngine._instance = new GameEngine();
        }
        return GameEngine._instance;
    }
}

export default GameEngine;