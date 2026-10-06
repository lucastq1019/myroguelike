# mygame —— ECS 引擎 + 动作 Roguelike

> 目标：**学习 ECS 原理** → 做出**动作类 Roguelike 可玩 Demo**（类《死亡细胞》）
> 语言：TypeScript　｜　构建：Vite
> **一套代码、一个入口、一套设计**

---

## 项目结构

```
canvas-game/
├── src/
│   ├── GameEngine/          # ⭐ 唯一引擎
│   │   ├── ecs/             #   ECS 内核
│   │   │   ├── World.ts     #     世界（实体+组件+系统+资源）
│   │   │   ├── Entity.ts / EntityManager.ts / ComponentStorage.ts
│   │   │   ├── Query.ts / System.ts / SystemManager.ts
│   │   │   └── components/  #     通用组件（Position/Velocity/Sprite）
│   │   ├── resources/       #   全局资源
│   │   │   ├── Camera.ts    #     相机（世界↔屏幕坐标、跟随、剔除）
│   │   │   ├── Input.ts     #     输入（键鼠）
│   │   │   └── Time.ts      #     时间
│   │   ├── renderer/        #   渲染（CanvasManager、ECS 式 RenderSystem）
│   │   ├── events/          #   事件分发
│   │   ├── core/            #   配置/类型/错误
│   │   ├── GameEngine.ts    #   引擎主类（单例、循环、资源注册）
│   │   └── verify-engine.ts #   引擎验证
│   │
│   └── game/                # ⭐ 动作 Roguelike 内容
│       ├── components/      #   游戏组件（Health/Collider/Weapon...）
│       ├── systems/         #   游戏系统（Movement/EnemyAI/Collision...）
│       ├── resources/       #   升级词条
│       ├── game.ts          #   游戏装配（房间/升级/波次）
│       ├── main.ts          #   入口（用 GameEngine 启动）
│       └── verify-game.ts   #   游戏验证
│
├── index.html               # 唯一入口
├── vite.config.mts
├── tsconfig.json
└── docs/PLAN.md
```

## 快速开始

```bash
cd canvas-game
npm install
npm run dev     # http://localhost:5173
```

## 玩法

| 操作 | 键 |
|---|---|
| 移动 | WASD / 方向键 |
| 瞄准 | 鼠标 |
| 射击 | 按住鼠标左键 |
| 选升级 | 点击卡片 或 1 / 2 / 3 |
| 重开 | R |

清空房间敌人 → 中央出现传送门 → 走进去 → 升级 3 选 1 → 下一层。

---

## 架构设计

### 三层职责

```
ECS 数据层（数据驱动）        Resource 层（全局单例）      框架层（生命周期）
├── Entity（实体）             ├── Camera（相机）           ├── GameEngine
├── Component（纯数据）        ├── Input（输入）            ├── CanvasManager
├── System（行为）             └── Time（时间）             ├── EventDispatcher
└── World（容器）                                          └── ConfigManager
```

### 为什么不是「全部 ECS 化」

ECS 适合**「大量同类实体 + 每帧批量处理」**。以下**不该** ECS 化：

| 部分 | 归属 | 理由 |
|---|---|---|
| 游戏实体/组件/系统 | ✅ ECS | 大量同类 + 每帧更新 |
| 相机/输入/时间 | 📦 Resource | 全局单例，不参与组件查询 |
| GameEngine / CanvasManager | 🔧 框架 | 生命周期管理，单例 |
| EventDispatcher | 🔧 服务 | 事件总线天然单例 |
| UI（Panel/Button/Text） | 🔧 OOP | 数量少、事件驱动、层级结构 |

### Resource 用法

```typescript
// 注册（GameEngine 构造时）
world.insertResource(Camera, new Camera(960, 600, 1920, 1200));
world.insertResource(Input, new Input());
world.insertResource(Time, new Time());

// 系统里读取
run(world, dt) {
  const camera = world.getResource(Camera)!;
  const input = world.getResource(Input)!;
}
```

### ECS 用法

```typescript
const world = new World();
const e = world.spawn();
world.addComponent(e, Position, new Position(0, 0));
world.addComponent(e, Velocity, new Velocity(1, 0));

world.addSystem({
  name: 'MovementSystem',
  run(w, dt) {
    const positions = w.dense(Position);       // 稠密数组（缓存友好）
    const entities = w.denseEntities(Position);
    for (let i = 0; i < positions.length; i++) {
      const vel = w.storage.get(entities[i], Velocity);
      if (vel) { positions[i].x += vel.x * dt; positions[i].y += vel.y * dt; }
    }
  },
});

world.update(1 / 60);
```

---

## 改造历程

原项目是自研 Canvas 引擎，但**是半成品**（147 个 TS 错误，ECS 是「披着 ECS 皮的 OOP」）。

| 阶段 | 内容 |
|---|---|
| 一 | 手写 ECS 内核（SoA / 位掩码 / 版本号 / FreeList） |
| 二 | 极简动作 Roguelike（移动/射击/敌人/波次） |
| 三 | 地图卷轴 + 房间推进 + 多敌人 AI + 升级 3 选 1 + 手感 |
| 路线 2 | 用新 ECS 内核替换旧 `ecs/`，保留外壳，**TS 错误 147 → 0** |
| 路线 Y | GameEngine 引入 Resource、删 GameObject、相机改 Resource、RenderSystem 改 ECS 式、roguelike 并入 `game/` |

### 改造前后对比

| 维度 | 改造前 | 改造后 |
|---|---|---|
| 组件存储 | Entity 内部 Map（AoS） | ComponentStorage（SoA 稠密数组） |
| 组件行为 | 带 `update(dt)` | 纯数据 |
| 查询 | 全表扫描 | 位掩码筛选 |
| 实体 id | 只增不复用 | FreeList 复用 + 版本号 |
| 相机 | `EcsComponent` 子类 | Resource |
| 输入 | `InputHandler` 类 | Resource |
| 全局数据 | 散落各处 | Resource（统一） |
| OOP 实体 | `GameObject` 体系 | 删除，统一用 ECS |
| 渲染 | `RenderComponent`（OOP） | `Sprite` 组件 + RenderSystem |
| 代码组织 | 引擎 + roguelike 两套 | 引擎 + game 一套 |
| **TS 错误** | **147** | **0** |

---

## 验证

```bash
npx tsx src/GameEngine/verify-engine.ts   # 引擎验证（13 项）
npx tsx src/game/verify-game.ts           # 游戏验证（13 项）
bash scripts/tsc-report.sh                # TS 错误统计
```

### 验证结果

| 验证 | 结果 |
|---|---|
| 全项目 TS 错误 | ✅ 0 |
| 引擎验证（ECS/World/Resource/系统） | ✅ 13/13 |
| 游戏验证（引擎启动/房间/渲染/升级） | ✅ 13/13 |
| Vite 编译 + 页面加载 | ✅ 200 |
