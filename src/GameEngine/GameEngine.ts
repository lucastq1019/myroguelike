// GameEngine.ts
// 引入 2D 相机类，用于处理游戏中的 2D 视角
import Camera2D from './camera/Camera2D';
// 引入二维向量类，用于表示游戏中的位置、速度等二维信息
import Vector2 from './core/common/Vector2';
// 引入游戏对象类，是游戏中各种实体的基础类
import GameObject from './core/objects/GameObject';
// 引入事件分发器类，用于处理游戏中的各种事件
import EventDispatcher from './events/EventDispatcher';
// 引入输入处理类，用于处理用户的输入操作
import InputHandler from './events/InputHandler';
// 引入渲染系统类，负责游戏画面的渲染
import RenderSystem from './renderer/RenderSystem';
// 引入实体管理器类，用于管理游戏中的实体
import EntityManager from './ecs/EntityManager';
// 引入系统管理器类，用于管理游戏中的各种系统
import SystemManager from './ecs/SystemManager';
// 引入物理系统类，处理游戏中的物理模拟
import PhysicsSystem from './ecs/PhysicsSystem';
// 引入脚本系统类，处理游戏对象的脚本逻辑
import ScriptingSystem from './ecs/ScriptingSystem';
// 引入动画系统类，处理游戏对象的动画效果
import AnimationSystem from './ecs/AnimationSystem';
// 引入 AI 系统类，处理游戏中的人工智能逻辑
import AISystem from './ecs/AISystem';
// 引入网络系统类，处理游戏中的网络通信
import NetworkingSystem from './ecs/NetworkingSystem';
// 引入场景管理系统类，负责管理游戏中的场景
import SceneManagerSystem from './sceneManager/SceneManagerSystem';
// 引入场景加载系统类，负责加载游戏中的场景
import SceneLoaderSystem from './sceneManager/SceneLoaderSystem';

/**
 * 游戏引擎类
 * 该类是游戏引擎的核心，负责初始化游戏的各个系统，管理游戏循环，以及提供对游戏系统的访问接口。
 */
class GameEngine {

    // 单例模式的实例变量，确保游戏引擎只有一个实例
    private static _instance: GameEngine | null = null;

    // 事件分发器，用于处理游戏中的各种事件
    private eventDispatcher: EventDispatcher;
    // 2D 相机，用于控制游戏的视角
    private camera: Camera2D;
    // 记录上一帧的时间，用于计算时间步长
    private lastTime: number;
    // 输入处理类，用于处理用户的输入操作
    private inputHandler: InputHandler;

    // ECS 相关
    // 实体管理器，用于管理游戏中的所有实体
    private entityManager: EntityManager;
    // 系统管理器，用于管理游戏中的各种系统
    private systemManager: SystemManager;

    // 添加屏幕宽度和高度属性为静态属性
    // 静态屏幕宽度，用于确定游戏画面的宽度
    private static screenWidth: number;
    // 静态屏幕高度，用于确定游戏画面的高度
    private static screenHeight: number;

    // 添加 SceneManagerSystem 和 SceneLoaderSystem 属性
    // 场景管理系统，负责管理游戏中的场景
    private sceneManagerSystem: SceneManagerSystem;
    // 场景加载系统，负责加载游戏中的场景
    private sceneLoaderSystem: SceneLoaderSystem;
    // 渲染系统，负责游戏画面的渲染
    private renderSystem: RenderSystem;

    // 游戏配置对象，用于存储游戏的各种配置信息
    private config: any;

    /**
     * 获取事件分发器
     * @returns {EventDispatcher} 事件分发器实例
     */
    getEventDispatcher(): EventDispatcher {
        return this.eventDispatcher;
    }

    /**
     * 私有构造函数，确保只能通过 getInstance 方法创建实例
     */
    private constructor() {
        // 获取浏览器自动宽高配置   
        // 获取浏览器窗口的宽度
        const windowWidth = window.innerWidth;
        // 获取浏览器窗口的高度
        const windowHeight = window.innerHeight;
        // 设置静态屏幕宽度
        GameEngine.screenWidth = windowWidth;
        // 设置静态屏幕高度
        GameEngine.screenHeight = windowHeight;

        // 创建事件分发器实例
        const eventDispatcher = new EventDispatcher();
        // 创建 2D 相机实例，设置相机的初始位置、缩放比例、大小和名称
        this.camera = new Camera2D({
            position: new Vector2(0, 0), scale: 1,
            size: new Vector2(GameEngine.screenWidth, GameEngine.screenHeight), name: "mainCamera",
            gameObject: new GameObject()
        });

        // 初始化事件分发器
        this.eventDispatcher = eventDispatcher;

        // ECS 初始化
        // 创建实体管理器实例
        this.entityManager = new EntityManager();
        // 创建系统管理器实例
        this.systemManager = new SystemManager();

        // 初始化 RenderSystem, SceneManagerSystem 和 SceneLoaderSystem
        // 创建渲染系统实例，并传入实体管理器
        this.renderSystem = new RenderSystem(this.entityManager);
        // 创建场景管理系统实例，并传入实体管理器
        this.sceneManagerSystem = new SceneManagerSystem(this.entityManager);
        // 创建场景加载系统实例，并传入实体管理器
        this.sceneLoaderSystem = new SceneLoaderSystem(this.entityManager);

        // 注册系统
        this.registerSystems();

        // 记录当前时间作为上一帧的时间
        this.lastTime = performance.now();
        // 创建输入处理类实例
        this.inputHandler = new InputHandler();

        // 启动游戏循环
        this.startGameLoop();
    }

    /**
     * 注册系统到 SystemManager
     * 该方法将各种系统注册到系统管理器中，确保它们能在游戏循环中被更新。
     */
    private registerSystems(): void {
        // 注册物理系统到系统管理器
        this.systemManager.registerSystem(new PhysicsSystem(this.entityManager));
        // 注册脚本系统到系统管理器
        this.systemManager.registerSystem(new ScriptingSystem(this.entityManager));
        /**
         * 注册动画系统到系统管理器
         * 动画系统负责处理游戏对象的动画逻辑
         * 它依赖于实体管理器来获取和管理相关实体
         */
        this.systemManager.registerSystem(new AnimationSystem(this.entityManager));
        // 注册 AI 系统到系统管理器
        this.systemManager.registerSystem(new AISystem(this.entityManager));
        // 注册网络系统到系统管理器
        this.systemManager.registerSystem(new NetworkingSystem(this.entityManager));
        // 注册场景管理系统到系统管理器
        this.systemManager.registerSystem(this.sceneManagerSystem);
        // 注册场景加载系统到系统管理器
        this.systemManager.registerSystem(this.sceneLoaderSystem);
        // 确保 RenderSystem 在最后注册，以保证渲染操作在其他系统更新后进行
        this.systemManager.registerSystem(this.renderSystem); 
    }

    /**
     * 更新逻辑
     * @param {number} dt 时间步长，用于确保游戏逻辑在不同帧率下的一致性
     */
    update(dt: number): void {
        // 调用系统管理器的更新方法，更新所有注册的系统
        this.systemManager.update(dt);
    }

    /**
     * 获取当前激活的相机
     * @returns {Camera2D | null} 当前激活的相机实例，如果没有则返回 null
     */
    getActiveCamera(): Camera2D | null {
        return this.camera;
    }

    /**
     * 获取渲染系统
     * @returns {RenderSystem} 渲染系统实例
     */
    getRenderSystem(): RenderSystem {
        return this.renderSystem;
    }

    /**
     * 获取场景管理系统
     * @returns {SceneManagerSystem} 场景管理系统实例
     */
    getSceneManagerSystem(): SceneManagerSystem {
        return this.sceneManagerSystem;
    }

    /**
     * 获取场景加载系统
     * @returns {SceneLoaderSystem} 场景加载系统实例
     */
    getSceneLoaderSystem(): SceneLoaderSystem {
        return this.sceneLoaderSystem;
    }

    /**
     * 启动游戏循环
     * 该方法使用 requestAnimationFrame 启动游戏循环，确保游戏逻辑以合适的帧率运行。
     */
    private startGameLoop() {
        // 调用 requestAnimationFrame 并绑定 gameLoop 方法，开始游戏循环
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * 游戏循环方法
     * @param {number} currentTime 当前时间，用于计算时间步长
     */
    private gameLoop(currentTime: number) {
        // 计算时间步长，将毫秒转换为秒
        const dt = (currentTime - this.lastTime) / 1000; 
        // 更新上一帧的时间
        this.lastTime = currentTime;

        // 调用更新方法，更新游戏逻辑
        this.update(dt);

        // 继续请求下一帧的动画
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * 获取输入处理类实例
     * @returns {InputHandler} 输入处理类实例
     */
    public getInputHandler(): InputHandler {
        return this.inputHandler;
    }

    // 提供获取屏幕宽度和高度的方法
    /**
     * 获取屏幕宽度
     * @returns {number} 屏幕宽度
     */
    static getScreenWidth(): number {
        return GameEngine.screenWidth;
    }

    /**
     * 获取屏幕高度
     * @returns {number} 屏幕高度
     */
    static getScreenHeight(): number {
        return GameEngine.screenHeight;
    }

    /**
     * 获取游戏引擎的单例实例
     * @returns {GameEngine} 游戏引擎的单例实例
     */
    public static getInstance(): GameEngine {
        // 如果实例不存在，则创建一个新的实例
        if (!GameEngine._instance) {
            GameEngine._instance = new GameEngine();
        }
        // 返回游戏引擎的单例实例
        return GameEngine._instance;
    }
}

export default GameEngine;