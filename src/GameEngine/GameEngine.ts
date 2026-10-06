/**
 * GameEngine —— 游戏引擎主类
 *
 * 改造后：
 * - 用 World（ECS 世界 + 资源）统一管理实体、组件、系统、资源
 * - 相机/输入/时间作为 Resource
 * - 不再有 GameObject / InputHandler / 空壳系统
 * - 单一入口：new GameEngine(config) → 注册系统 → start()
 */
import { World } from './ecs/World';
import { Camera } from './resources/Camera';
import { Input } from './resources/Input';
import { Time } from './resources/Time';
import CanvasManager from './renderer/CanvasManager';
import EventDispatcher from './events/EventDispatcher';
import { ConfigManager } from './core/config/ConfigManager';
import { ErrorHandler } from './core/error/ErrorHandler';
import { GameConfig } from './core/types';

export default class GameEngine {
  private static _instance: GameEngine | null = null;

  readonly world: World;
  readonly canvasManager: CanvasManager;
  readonly eventDispatcher: EventDispatcher;
  readonly configManager: ConfigManager;
  private errorHandler: ErrorHandler;

  private isPaused = false;
  private lastTime = 0;
  private running = false;

  private constructor(config: GameConfig = {}) {
    // 屏幕尺寸
    const width = config.screenWidth ?? 960;
    const height = config.screenHeight ?? 600;

    // 配置
    this.configManager = new ConfigManager({
      screenWidth: width,
      screenHeight: height,
      fpsLimit: 60,
      debugMode: false,
      ...config,
    });

    // 画布
    this.canvasManager = new CanvasManager(width, height);

    // 事件
    this.eventDispatcher = new EventDispatcher();
    this.errorHandler = new ErrorHandler();

    // ECS 世界
    this.world = new World();

    // 注册资源
    this.world.insertResource(Camera, new Camera(width, height, width, height));
    this.world.insertResource(Input, new Input());
    this.world.insertResource(Time, new Time());

    // 输入绑定到 canvas
    const canvas = this.canvasManager.getCanvas();
    if (canvas) this.world.getResource(Input)!.attach(canvas);

    this.lastTime = performance.now();
  }

  /** 单例 */
  static getInstance(config?: GameConfig): GameEngine {
    if (!GameEngine._instance) {
      GameEngine._instance = new GameEngine(config);
    }
    return GameEngine._instance;
  }

  /** 重置单例（测试用） */
  static resetInstance(): void {
    GameEngine._instance = null;
  }

  // ---- 资源访问 ----

  getCamera(): Camera {
    return this.world.expectResource(Camera);
  }

  getInput(): Input {
    return this.world.expectResource(Input);
  }

  getTime(): Time {
    return this.world.expectResource(Time);
  }

  getEventDispatcher(): EventDispatcher {
    return this.eventDispatcher;
  }

  isDebugMode(): boolean {
    return this.configManager.getConfig().debugMode ?? false;
  }

  // ---- 系统 ----

  /** 注册系统 */
  addSystem(system: { name: string; run(world: World, dt: number): void }): this {
    this.world.addSystem(system);
    return this;
  }

  // ---- 生命周期 ----

  /** 启动游戏循环 */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);
  }

  pause(): void {
    this.isPaused = true;
    this.eventDispatcher.publish('gamePause', null);
  }

  resume(): void {
    this.isPaused = false;
    this.lastTime = performance.now();
    this.eventDispatcher.publish('gameResume', null);
  }

  private gameLoop = (currentTime: number): void => {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    if (!this.isPaused) {
      this.getTime().tick(dt);
      try {
        this.world.update(dt);
      } catch (err) {
        this.errorHandler.handleError('游戏循环更新失败', err as Error);
      }
    }

    requestAnimationFrame(this.gameLoop);
  };

  // ---- 兼容旧 API ----

  getWorld(): World {
    return this.world;
  }
}
