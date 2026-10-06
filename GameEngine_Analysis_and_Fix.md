# GameEngine.ts 分析与修复方案

## 1. 设计不合理问题分析与修复

### 1.1 单例模式问题
**问题**：单例模式导致测试困难，不利于扩展。
**修复方案**：
```typescript
// 修改前
private static _instance: GameEngine | null = null;

public static getInstance(): GameEngine {
    if (!GameEngine._instance) {
        GameEngine._instance = new GameEngine();
    }
    return GameEngine._instance;
}

// 修改后 - 增加可测试性
private static _instance: GameEngine | null = null;

public static getInstance(): GameEngine {
    if (!GameEngine._instance) {
        GameEngine._instance = new GameEngine();
    }
    return GameEngine._instance;
}

// 新增方法用于测试
public static resetInstance(): void {
    GameEngine._instance = null;
}
```

### 1.2 依赖注入问题
**问题**：直接在构造函数中创建依赖对象，不利于测试和替换。
**修复方案**：
```typescript
// 修改前
private constructor() {
    // 直接创建依赖
    this.eventDispatcher = new EventDispatcher();
    this.entityManager = new EntityManager();
    // ...
}

// 修改后 - 支持依赖注入
private constructor(
    eventDispatcher: EventDispatcher = new EventDispatcher(),
    entityManager: EntityManager = new EntityManager(),
    systemManager: SystemManager = new SystemManager()
) {
    this.eventDispatcher = eventDispatcher;
    this.entityManager = entityManager;
    this.systemManager = systemManager;
    // ... 其他初始化代码
}
```

### 1.3 导入路径错误
**问题**：SceneLoaderSystem 导入路径可能错误。
**修复方案**：
```typescript
// 修改前
import SceneLoaderSystem from './sceneManager/SceneLoaderSystem';

// 修改后 - 根据项目结构调整路径
import SceneLoaderSystem from './core/sceneManager/SceneLoaderSystem';
```

### 1.4 配置管理问题
**问题**：config 属性未初始化且类型为 any。
**修复方案**：
```typescript
// 修改前
private config: any;

// 修改后
private config: GameConfig;

// 在构造函数中初始化
private constructor(...) {
    // ...
    this.config = this.loadConfig();
    // ...
}

private loadConfig(): GameConfig {
    // 实现配置加载逻辑
    return { /* 默认配置 */ };
}
```

## 2. 功能重叠问题分析与修复

### 2.1 InputHandler 重复实现
**问题**：GameEngine 中导入了 `./events/InputHandler`，而 project_map.md 中还有 `src/utils/InputHandler.js`。
**修复方案**：统一使用一个实现，删除或重构另一个。
```typescript
// 修改前
import InputHandler from './events/InputHandler';

// 修改后 - 统一到一个实现
import InputHandler from '../utils/InputHandler';
```

### 2.2 RenderSystem 重复实现
**问题**：project_map.md 中同时存在 `src/GameEngine/renderer/RenderSystem.ts` 和 `src/GameEngine/systems/RenderSystem.ts`。
**修复方案**：检查两个文件内容，合并功能到一个文件，并删除重复文件。

## 3. 功能不存在清单

1. **SceneManagerSystem**：在 project_map.md 中未列出，文件可能不存在或路径不正确
2. **SceneLoaderSystem**：在 project_map.md 中未列出，文件可能不存在或路径不正确
3. **配置加载功能**：config 属性已声明但未实现加载逻辑
4. **错误处理机制**：缺乏全局错误处理和异常捕获
5. **资源管理集成**：未集成 AssetLoader 等资源管理服务
6. **多相机管理**：当前仅支持一个主相机
7. **游戏状态管理**：缺乏游戏暂停、恢复等状态控制
8. **性能监控**：没有帧率监控或性能统计功能

## 4. 调用逻辑混乱问题分析与修复

### 4.1 系统注册顺序
**问题**：系统注册顺序不明确，可能导致依赖问题。
**修复方案**：明确系统依赖关系，按正确顺序注册，并添加注释说明。
```typescript
private registerSystems(): void {
    // 基础系统先注册
    this.systemManager.registerSystem(new PhysicsSystem(this.entityManager));
    this.systemManager.registerSystem(new ScriptingSystem(this.entityManager));
    this.systemManager.registerSystem(new AnimationSystem(this.entityManager));
    this.systemManager.registerSystem(new AISystem(this.entityManager));
    this.systemManager.registerSystem(new NetworkingSystem(this.entityManager));
    
    // 场景相关系统
    this.systemManager.registerSystem(this.sceneManagerSystem);
    this.systemManager.registerSystem(this.sceneLoaderSystem);
    
    // 渲染系统最后注册
    this.systemManager.registerSystem(this.renderSystem); 
}
```

### 4.2 相机管理改进
**问题**：仅支持一个主相机，缺乏灵活性。
**修复方案**：
```typescript
// 新增相机管理功能
private cameras: Map<string, Camera2D> = new Map();
private activeCameraName: string = 'mainCamera';

// 在构造函数中初始化
this.cameras.set('mainCamera', this.camera);

// 新增方法
public addCamera(name: string, camera: Camera2D): void {
    this.cameras.set(name, camera);
}

public setActiveCamera(name: string): boolean {
    if (this.cameras.has(name)) {
        this.activeCameraName = name;
        return true;
    }
    return false;
}

public getActiveCamera(): Camera2D | null {
    return this.cameras.get(this.activeCameraName) || null;
}
```

### 4.3 事件系统使用扩展
**问题**：事件系统仅在 createEntity 中使用，未充分利用。
**修复方案**：扩展事件系统使用，添加更多事件类型和处理机制。
```typescript
// 在适当位置添加事件分发
public startGame(): void {
    this.eventDispatcher.dispatchEvent({ type: 'gameStarted' });
    // 其他启动逻辑
}

public pauseGame(): void {
    this.eventDispatcher.dispatchEvent({ type: 'gamePaused' });
    // 其他暂停逻辑
}

public resumeGame(): void {
    this.eventDispatcher.dispatchEvent({ type: 'gameResumed' });
    // 其他恢复逻辑
}
```

## 5. 实现建议

1. 创建 `GameConfig` 接口，明确配置结构
2. 实现完善的资源加载和管理机制
3. 添加性能监控和调试工具
4. 编写单元测试，特别是对核心功能
5. 考虑使用依赖注入容器管理服务
6. 完善事件系统，建立清晰的事件类型和处理流程
7. 实现场景切换和过渡效果
8. 添加游戏状态管理（如菜单、游戏中、暂停等）

通过以上修复和改进，可以显著提高 GameEngine 的设计合理性、功能完整性和代码质量。