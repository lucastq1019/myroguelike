# mygame 开发规划（基于 canvas-game 原项目改造）

> 目标：**学习 ECS 原理** → 做出**动作类 Roguelike 可玩 Demo**（类《死亡细胞》）
> 语言：TypeScript　｜　策略：**在原项目上改造，最大化复用，最小化新增**

---

## 一、核心策略

- **保留原项目 `canvas-game/`**，不推翻重写。
- **外壳复用**：引擎主类、相机、渲染层、事件/输入、工具（FreeList/Vector2）直接复用。
- **ECS 是唯一大改点**：现有 ECS 是「披着 ECS 皮的 OOP」，需改造内部实现。
- **保持对外接口不变**：`GameEngine`、`RenderSystem`、场景代码几乎不动，只改 `ecs/` 内部。

## 二、原项目可复用资产

| 模块 | 文件 | 处置 |
|---|---|---|
| 引擎主类 | `GameEngine.ts` | 保留，微调 |
| 相机 | `camera/Camera2D.ts` | 直接复用 |
| 渲染层 | `renderer/*` | 直接复用 |
| 事件/输入 | `events/EventDispatcher.ts`、`InputHandler.ts` | 直接复用 |
| 场景 | `scenes/*` | 保留，按需用 |
| 服务层 | `services/*` | 保留 |
| 工具 | `utils/FreeList.ts`、`Vector2` | 直接复用 |
| **ECS** | `ecs/*` | **重点改造** |

## 三、现有 ECS 的 5 个核心问题（学习重点）

1. **组件存在 Entity 内部 Map** → 缓存不友好，应改 SoA（按类型集中存储）。
2. **组件带 `update(dt)` 行为** → 违背「组件是纯数据」哲学，行为应属 System。
3. **无 Query 索引** → `getAllWithComponent` 每次全表扫描，应改位掩码/archetype。
4. **实体 ID 无版本号** → 无法防悬空引用，应 id + version，复用 FreeList。
5. **System 直接持 EntityManager** → 耦合、难并行，应改 `update(world, dt)`。

## 四、ECS 改造方案（只动 ecs/ 内部）

```
canvas-game/src/GameEngine/ecs/
├── World.ts              # 新增：统一入口（聚合 EntityManager + ComponentStorage + Query）
├── Entity.ts             # 改：id + version
├── EntityManager.ts      # 改：内部用 FreeList + 位掩码
├── ComponentStorage.ts   # 新增：SoA 存储
├── Query.ts              # 新增：位掩码查询
├── EcsComponent.ts       # 改：去行为，纯数据基类
├── System.ts             # 改：update(world, dt)
├── SystemManager.ts      # 改：调度
└── components/Transform.ts  # 保留
```

新增约 4 个文件，改动约 5 个文件，其余全部复用。

## 五、分阶段任务

### 阶段一：改造 ECS 内核（学习核心）
1. `Entity` 加 version + 复用 `utils/FreeList`
2. 新增 `ComponentStorage`（SoA），`Entity` 改为只存 id
3. `EcsComponent` 去行为，改纯数据
4. 新增 `Query`（位掩码）
5. 新增 `World` 聚合入口
6. `System` 改 `(world, dt)`，`SystemManager` 改调度
7. **对照报告**：`docs/ECS_REFACTOR_NOTES.md`（改造前后 + 5 个坑）
8. **构建工具**：Webpack → Vite（阶段末尾做）

- **验收**：原项目能跑起来（`npm run dev`）+ 10000 实体移动 + 对照报告完成
- **说明**：暂不引入测试框架（用户决定）

### 阶段二：极简动作 Roguelike（复用渲染/输入/相机）
1. 新增游戏组件（Position/Velocity/Health/Hitbox/Sprite）
2. 新增系统（Input/Movement/Collision/Combat）
3. 复用 `CanvasManager` 渲染方块
4. 玩家 + 1 种敌人 + 1 把武器

- **验收**：能移动、攻击、打死敌人、会死、能重开

### 阶段三：Roguelike 元素
1. 房间生成与推进
2. 局内升级（选词条）
3. 多种敌人 + 简单 AI
4. 手感打磨（前摇/后摇、击退、无敌帧）

- **验收**：能完整玩一局（进房间→清怪→升级→下一房间→死亡结算）

## 六、构建工具

- 现状：Webpack（`webpack.config.js`）
- 目标：Vite（阶段一末尾切换）
- 注意：原项目用 `worker-loader`（`battle/Worker.ts`），Vite 用 `?worker` 语法，需小改

## 七、决策记录

- 语言：TypeScript（用户偏好后端语言，排除 Python）
- 游戏形态：动作类 Roguelike（类死亡细胞）
- 复用优先：减少重复生成，省 token、提速
- 暂不引入测试框架


---

# 架构决策（路线 Y）

## 决策：是否需要「全部 ECS 化」？

**结论：不需要。** ECS 适合「大量同类实体 + 每帧批量处理」。

| 部分 | 归属 | 理由 |
|---|---|---|
| 游戏实体/组件/系统 | ✅ ECS | 大量同类 + 每帧更新 |
| 相机/输入/时间 | 📦 Resource | 全局单例，不参与组件查询 |
| GameEngine / CanvasManager | 🔧 框架 | 生命周期管理 |
| EventDispatcher | 🔧 服务 | 事件总线 |
| UI | 🔧 OOP | 数量少、事件驱动、层级结构 |

## 三项改造

1. **引入 Resource**：`world.insertResource/getResource`，相机/输入/时间统一为资源
2. **删除 GameObject**：旧 OOP 实体体系移除，统一用 ECS Entity
3. **相机改 Resource**：`Camera2D`（组件）→ `Camera`（资源），不再 extends EcsComponent

## 目录合并

- `roguelike/` → `game/`（游戏内容）
- `ecs-lab/` → 并入 `GameEngine/ecs/`（删除）
- 入口统一为 `index.html` → `game/main.ts`
- 引擎与游戏：一套代码、一个入口、一套设计

## 最终架构

```
GameEngine/            唯一引擎
├── ecs/               ECS 内核（World/Entity/Component/System/Query）
├── resources/         全局资源（Camera/Input/Time）
├── renderer/          渲染（CanvasManager + ECS 式 RenderSystem）
├── events/            事件
├── core/              配置/类型/错误
└── GameEngine.ts      引擎主类

game/                  动作 Roguelike 内容
├── components/        游戏组件
├── systems/           游戏系统
├── resources/         升级词条
├── game.ts            游戏装配
└── main.ts            入口
```

## 验证

- TS 错误：147 → **0**
- 引擎验证 13/13，游戏验证 13/13
- Vite 编译通过，页面可加载

---

# 物理内核（阶段四）

## 决策：自研轻量物理内核

**结论：自研，零依赖，先能用再逐步完善。** 不引入 matter.js/box2d（与 ECS 适配成本高、偏重）。

## 模块结构

```
GameEngine/physics/
├── Shapes.ts          # 形状：抽象基类 Shape + Circle / Box（AABB）
├── RigidBody.ts       # 刚体：质量/恢复系数/摩擦/静态/重力缩放
├── collision.ts       # 窄相检测：圆-圆 / 圆-矩形 / 矩形-矩形（法线 + 穿透深度）
├── PhysicsSystem.ts   # 物理系统：积分 → 宽相(空间网格) → 窄相 → 冲量解算
├── index.ts           # 统一导出
└── verify-physics.ts  # 自测（11 项，npx tsx 运行）
```

## 设计要点

- **纯 ECS 系统**：`{ name, run(world, dt) }`，只依赖 Position / Velocity / RigidBody / Shape。
- **位置/速度复用通用组件**：不新增 Pos/Vel，刚体只补「体」属性。
- **宽相用空间哈希网格**：避免 O(n²)。
- **冲量解算**：位置分离（松弛 + slop 防抖）+ 法向冲量（反弹）+ 切向摩擦（库仑上限）。
- **静态物体**：`isStatic` → 质量视为无穷大，不受力不移动（墙）。
- **可配置**：`createPhysicsSystem({ gravityY, correctionPercent, slop, cellSize, enableFriction })`。

## 坑记录

1. **组件类型必须是运行时构造函数**：`Shape` 若写成 `interface` 无法作为组件 key，改用**抽象基类**。
2. **子类形状各自占位掩码**：`Circle` 与 `Box` 是不同组件类型，无法用基类 `Shape` 的掩码一次查询 → 分别查询后按 index 去重。
3. **ECS 查询是 AND 语义**：多 tag 场景须分别查询（沿用既有结论）。

## 游戏集成（替换手写碰撞）

- 删除 `game/systems/movement.ts`、`game/systems/wallCollision.ts`。
- 玩家/敌人：`RigidBody`(dynamic) + `Circle`。
- 墙壁：`RigidBody`(static) + `Box`（取代原先「一串小圆近似矩形墙」的 hack）。
- 系统顺序：PlayerControl → EnemyAI → **Physics** → Knockback → Collision → Invincibility → Lifecycle。
- 渲染：新增 `wallDecorator` 按 `Box` 尺寸绘制矩形墙。
- `Collider`（圆半径）仍用于**伤害判定**（游戏逻辑），与物理形状解耦。

## 后续可完善

旋转、连续碰撞检测（CCD）、约束关节（Joint）、休眠（Sleep）、多迭代解算、触发器（Trigger/Sensor）、层与掩码（Layer/Mask）。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**（`npx tsx src/GameEngine/physics/verify-physics.ts`）
- 游戏验证：**19/19**（含重力/跳跃/近战/着地检查）
- 冒烟测试：**通过**（`npx tsx src/game/smoke-platformer.ts`）
- 一键回归：`bash scripts/verify-physics.sh`

---

# 横版动作平台改造（阶段五）

## 决策：俯视射击 → 横版动作平台

**结论：** 从 2D 俯视射击改为**横版动作平台**（类《死亡细胞》）：重力 + 可变高度跳跃 + 左右移动 + 近战为主 + 横向卷轴。远程射击代码**保留备用**。

## 核心差异

| 维度 | 俯视射击（旧） | 横版平台（新） |
|---|---|---|
| 重力 | 无（gravityY=0） | 有（gravityY=2000，向下） |
| 移动 | WASD 全向 | A/D 左右 + 空格/W 跳跃（可变高度） |
| 瞄准 | 鼠标 360° | 面朝方向（左右翻转） |
| 攻击 | 远程子弹 | 近战挥砍（判定盒） |
| 地图 | 房间四壁封闭 | 地面 + 悬浮平台（单面） |
| 相机 | 全向跟随 | 横向卷轴跟随 |

## 物理内核增强

- **单面平台 `Platform`**：只有顶面碰撞，从上方落下可站立，从下方/侧面可穿过。
- **子步进（sub-stepping）**：按「最大位移 / 安全步长」把一帧拆成多个子步，防止高速物体穿透薄壁（关键修复：重力下落穿地）。
- **着地探测（ground probe）**：物体静止时穿透量可能小于 slop 而「恰好不接触」，导致 isGrounded 抖动；在物体下方探一小段距离补记着地。
- **接触记录 `PhysicsContacts`**（Resource）：每帧写入各方向接触状态，`isGrounded` 用于跳跃判定。
- **重力方向**：`gravityY > 0` 表示向下。

## 新增/改动文件

**新增：**
| 文件 | 说明 |
|---|---|
| `physics/PhysicsContacts.ts` | 接触记录 Resource（isGrounded） |
| `game/systems/locomotion.ts` | 移动/跳跃（可变高度 + 终端速度） |
| `game/systems/melee.ts` | 近战攻击（生成判定盒） |
| `game/systems/level.ts` | 横版关卡生成（地面 + 平台 + 敌人） |
| `game/smoke-platformer.ts` | 冒烟测试 |

**改动：**
| 文件 | 改动 |
|---|---|
| `physics/Shapes.ts` | 新增 `Platform` 形状 |
| `physics/collision.ts` | 新增 `detectPlatform`（单面平台） |
| `physics/PhysicsSystem.ts` | 子步进 + 平台解算 + 接触记录 + 着地探测 |
| `game/components/index.ts` | 新增 Facing/Locomotion/JumpState/MeleeAttack/MeleeHitbox/MeleeLifetime/Patrol/Jumper |
| `game/systems/playerControl.ts` | 水平移动 + 朝向（远程代码注释保留） |
| `game/systems/enemyAI.ts` | 受重力的水平 AI（巡逻/追击/射击） |
| `game/systems/collision.ts` | 近战判定盒 × 敌人 |
| `game/systems/lifecycle.ts` | 销毁过期近战判定盒 |
| `game/resources/Upgrades.ts` | 升级改为近战向（伤害/攻速/范围/跳跃等） |
| `game/game.ts` | 重力、系统顺序、玩家组件、关卡生成 |
| `game/main.ts` | HUD/提示、地形/玩家朝向渲染 |
| `GameEngine/resources/Input.ts` | 跳跃键（边沿触发 + 按住）、getMoveX |

**删除：**
- `game/systems/room.ts`（→ `level.ts`）

## 坑记录（横版改造）

1. **重力下落穿地**：单帧位移 > 薄壁厚度 → 穿透。修复：物理系统**子步进**。
2. **`dynamicBody` 默认 gravityScale=0**：敌人忘传第 4 参 → 不受重力、悬空。横版实体须 `dynamicBody(m, r, f, 1)`。
3. **着地抖动**：静止时穿透 < slop → 恰好不接触 → isGrounded 时真时假。修复：**着地探测**（下方 probe 距离内有地形即着地）。
4. **平台单向判定**：需传「上一帧底部 + vy」，仅 `vy >= 0` 且上帧在平台上方才站立。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**（新增重力落地、单面平台上下穿越）
- 游戏验证：**19/19**（新增重力着地、跳跃上升、近战能力）
- 冒烟测试：**通过**（玩家/敌人全部着地，无越界）
- 一键回归：`bash scripts/verify-physics.sh`

---

# 动作能力扩展（阶段六）

## 四个动作能力

| 能力 | 按键 | 说明 |
|---|---|---|
| 下穿平台 | **S + K** | 从单面平台向下穿过 |
| 蹬墙跳 | 贴墙 + **K** | 反向水平速度 + 向上速度，重置二段跳 |
| 冲刺 | **L** | 地面/空中均可，水平高速、期间无视重力，有冷却，重置二段跳 |
| 二段跳 | **K** | 空中可再跳 1 次（共 2 段），着地/蹬墙/冲刺重置 |

**完整按键方案**：移动 A/D · 跳跃/二段跳 K · 攻击 J · 冲刺 L · 下穿 S+K

## 实现要点

- **下穿平台**：`IgnorePlatforms`（引擎级组件，计时），物理系统检测到计时 > 0 时跳过平台碰撞；着地探测也跳过平台。
- **蹬墙跳**：利用 `PhysicsContacts` 的左右接触；蹬墙后给反向水平速度 + 向上速度，并设 `wallJumpLock`（短暂锁定水平输入，避免立刻贴回墙）。
- **冲刺**：`DashState`（timer/cooldown/dir）；冲刺期间把 `RigidBody.gravityScale` 临时设为 0（无视重力），结束恢复为 1。
- **二段跳**：`JumpState.jumpsLeft` 计数；着地/蹬墙/冲刺时重置为 `maxJumps`。
- **蹬墙滑落**：贴墙下落时限制下落速度（`wallSlideSpeed`）。

## 关键坑

1. **接触方向语义**：`ContactDir.Left` 表示「法线朝左 = 被向左推」= **墙在右侧**（不是「左侧有墙」）。蹬墙跳方向判断要用反向映射：`wallOnLeft = has(Right)`。
2. **冲刺无视重力**：物理系统在 locomotion 之后运行并累加重力，所以要在冲刺期间把 `gravityScale` 置 0，而不是每帧清零 `vel.y`。
3. **测试 spawn 位置**：玩家应 spawn 在「地面顶面 - 半径」处（如 y=170），否则会嵌进地面导致着地判定异常。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- **动作能力测试：17/17**（`npx tsx src/game/verify-abilities.ts`）
- 游戏验证：**19/19**
- 冒烟测试：**通过**
- 一键回归：`bash scripts/verify-physics.sh`

---

# 战斗手感与视觉（阶段七）

## 三个功能

| 功能 | 说明 |
|---|---|
| **蹬墙滑墙动画** | 贴墙下落时身体微倾斜 + 墙边火花粒子；下落速度已被 `wallSlideSpeed` 限制 |
| **冲刺残影** | 冲刺期间每 0.03s 生成半透明残影，0.25s 内淡出 |
| **3 段连招** | J 连按触发第 1/2/3 段（伤害 1.0/1.2/1.8×，范围递增），超 0.45s 窗口重置回第 1 段 |
| **命中连击计数** | 命中敌人 combo+1，1.5s 未命中重置；HUD 显示「🔥 连击 xN」 |

## 实现要点

- **连招链**：`ComboState`（comboIndex / comboTimer / maxCombo）；`MeleeSystem` 在窗口内接续下一段，每段用 `COMBO_STAGES` 配置伤害/范围/击退/颜色倍率。
- **连击计数**：`ComboCounter`（count / timer / window）；`CollisionSystem` 近战命中时 `count++`、`timer = window`；`Game.update` 每帧递减 timer，归零则重置。
- **残影**：`AfterimageSystem` 冲刺时生成 `Afterimage` 实体（无碰撞）；`LifecycleSystem` 递减寿命销毁；渲染按 `life/maxLife` 淡出。
- **滑墙**：`playerDecorator` 读取 `PhysicsContacts` 左右接触 + `Velocity.y`，滑墙时 `ctx.rotate` 倾斜 + 绘制火花粒子。
- **冲刺拉伸**：`playerDecorator` 冲刺时 `ctx.scale(1.5, 0.7)`。

## 关键坑

1. **测试实体缺组件**：`makePlayer` 漏了 `Facing` → 近战系统找不到朝向直接 return，连招/命中测试全挂。测试实体要补齐系统依赖的所有组件。
2. **测试世界缺系统**：`makeWorld` 只注册 locomotion+physics，导致碰撞/生命周期不跑 → 命中不计数、残影不消失。测试世界要注册完整系统链。
3. **`require` 在 ESM/tsx 下不可用**：装饰器里临时取组件要用顶层 import。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- **动作能力测试：26/26**（新增连招/连击/残影）
- 游戏验证：**19/19**
- 冒烟测试：**通过**
- 一键回归：`bash scripts/verify-physics.sh`

---

# 轮廓与动画效果（阶段八）

## 背景

角色/敌人/子弹/判定盒原本都是纯矩形/圆（`fillRect` / `arc`），缺乏视觉区分度。本阶段增加**描边轮廓**与动画反馈。

## 新增视觉

| 元素 | 效果 |
|---|---|
| **近战判定盒** | 半透明填充（alpha 0.25）+ 实线描边（alpha 0.9），按连招段变色（黄→橙→红） |
| **子弹** | 圆 + 白色描边 + `shadowBlur` 发光（玩家=黄，敌人=紫） |
| **敌人** | 矩形/圆 + 白色描边轮廓；受击时整体变白（HitFlash） |
| **玩家** | 矩形 + 青色描边轮廓；受击闪白；保留滑墙倾斜/火花、冲刺拉伸 |
| **受击闪白** | 命中时 `HitFlash` 组件（0.1s），到期由 LifecycleSystem 移除 |

## 实现要点

- **判定盒渲染**：`meleeHitboxDecorator` 读 `MeleeHitbox` + `Collider`，绘制半透明填充 + 描边。
- **子弹渲染**：`bulletDecorator` 读 `BulletTag`，`shadowBlur` 发光 + 描边。
- **敌人/玩家渲染**：`enemyDecorator` / `playerDecorator` 读 `HitFlash` 决定是否变白，并绘制描边。
- **饰器顺序**：terrain → afterimage → enemy → player → meleeHitbox → bullet → portal → invincible。

## 关键坑

1. **装饰器里不能用 `require`**（ESM/tsx 下不可用）→ 组件用顶层 import。
2. **`Invincible` 构造函数被误删**（编辑时截断）→ 编辑大块代码后要复查类完整性。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- **动作能力测试：28/28**（新增 HitFlash）
- 游戏验证：**19/19**
- 平台冒烟测试：**通过**
- **渲染冒烟测试：通过**（`npx tsx src/game/smoke-render.ts`）
- 一键回归：`bash scripts/verify-physics.sh`

---

# Bug 修复：无限连跳 + 冲刺 CD（阶段九）

## 问题

1. **左脚踩右脚飞天**：蹬墙跳 / 冲刺都无条件 `jumpsLeft = maxJumps`，导致贴墙反复蹬墙、或冲刺→跳→冲刺→跳，可无限连跳。
2. **冲刺 CD 未生效**（需确认 0.5s）。

## 根因

```ts
// 蹬墙跳分支
jump.jumpsLeft = loco.maxJumps;   // ← 每次都重置为 2（bug）
// 冲刺分支
if (jump) jump.jumpsLeft = loco.maxJumps;  // ← 每次都重置为 2（bug）
```

## 修复（严格模式）

**规则：只有真正着地才重置 `jumpsLeft`；蹬墙跳 / 冲刺 / 二段跳都只消耗、不补充。**

- 移除蹬墙跳对 `jumpsLeft` 的重置 → 改为**消耗一次**（`jump.jumpsLeft -= 1`），且要求 `jumpsLeft > 0` 才能蹬墙。
- 移除冲刺对 `jumpsLeft` 的重置。
- 冲刺 CD 确认为 `dashCooldown = 0.5`（`Locomotion` 第 8 参）。

这样：
- 贴墙反复蹬墙：最多 2 次（耗尽后无法再蹬，直到落地）。
- 冲刺→跳→冲刺→跳：冲刺不补充跳跃，跳完 2 次即止。

## 关键坑

- **蹬墙跳若「不消耗也不补充」**：0 次跳跃时贴墙仍可无限蹬墙 → 仍是左脚踩右脚。必须**消耗**跳跃次数才能堵死。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- **动作能力测试：34/34**（新增「无限连跳防护」「冲刺 CD」共 6 项）
- 游戏验证：**19/19**
- 平台/渲染冒烟测试：**通过**
- 一键回归：`bash scripts/verify-physics.sh`

---

# 蹬墙奖励跳跃（阶段十）

## 需求

蹬墙跳后**可以额外增加一次跳跃次数**，但这个机会**每次滞空只有一次**。

## 规则

- 蹬墙跳本身**消耗**一次跳跃（防无限连跳）。
- 蹬墙跳时，若本次滞空**还没用过**「蹬墙奖励」，则**额外 +1 次跳跃**（奖励）。
- 同一段滞空最多触发一次奖励；**落地后重置**（可再次获得）。

净效果：
- 首次蹬墙：消耗 1 + 奖励 1 = **净不变**（jumpsLeft 保持 2）。
- 第二次蹬墙：只消耗，无奖励 → 2 → 1。
- 第三次蹬墙：1 → 0，之后无法再蹬（直到落地）。

## 实现

- `JumpState` 新增 `wallJumpRewardUsed: boolean`。
- `locomotion.ts` 蹬墙跳分支：`jumpsLeft -= 1`；若 `!wallJumpRewardUsed` 则 `jumpsLeft += 1; wallJumpRewardUsed = true`。
- 着地重置：`jumpsLeft = maxJumps; wallJumpRewardUsed = false`。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- **动作能力测试：41/41**（新增蹬墙奖励 5 项）
- 游戏验证：**19/19**
- 平台/渲染冒烟测试：**通过**
- 一键回归：`bash scripts/verify-physics.sh`

---

# 小地图（阶段十一）

## 需求

右上角显示小地图，展示敌人和地图概要。

## 实现

- 新增 `game/systems/minimap.ts`：`createMinimapSystem(canvasManager, options)`。
- 作为独立系统，在 **RenderSystem 之后**注册（否则会被清屏覆盖）。
- 数据来源：`World`（实体组件）+ `Camera` 资源（关卡尺寸 `worldW/H`、视野 `x/y` + `viewportW/H`）。

## 显示内容

| 元素 | 颜色 | 说明 |
|---|---|---|
| 地形（地面/墙） | 灰 `#4a4a4a` | 按 `Box` 尺寸绘制矩形 |
| 悬浮平台 | 浅灰 `#6a6a6a` | 按 `Platform` 尺寸绘制 |
| 敌人 | 红 `#e06c75` | 圆点（半径 2.5） |
| 玩家 | 绿 `#4ec9b0` | 圆点（半径 3）+ 白描边 |
| 传送门 | 蓝 `#61afef` | 圆点（半径 3） |
| 相机视野框 | 半透明白 | 当前视口范围 |

## 参数

- 尺寸：**200×120**（固定），边距 **12px**，右上角。
- 缩放：`min(mw/worldW, mh/worldH)`，保持比例居中。
- 裁剪：`ctx.clip()` 限制在小地图区域内，防止地形溢出。

## 关键点

- **系统顺序**：小地图必须在 RenderSystem 之后，否则被每帧清屏覆盖。
- **世界→地图坐标**：`toMap(wx, wy) = offX + wx*scale, offY + wy*scale`。
- 地形用 `Box`/`Platform` 的实际半宽半高绘制，而非 Sprite 尺寸。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- 动作能力测试：**41/41**
- 游戏验证：**19/19**
- 平台/渲染冒烟测试：**通过**
- **小地图冒烟测试：通过**（`npx tsx src/game/smoke-minimap.ts`）
- 一键回归：`bash scripts/verify-physics.sh`

---

# HUD 整合到画布（阶段十二）

## 需求

把原本的 DOM HUD 整合进画布内绘制。

## 实现

- 新增 `game/systems/hud.ts`：`createHudSystem(canvasManager)`。
- 在 **RenderSystem 之后**注册（否则被清屏覆盖）。
- 移除 DOM：`hud` / `tip` / `overlay` 三个 `<div>`，`index.html` 精简（去 h1/padding）。

## 画布内绘制内容

| 区域 | 内容 |
|---|---|
| 顶部 HUD 条 | 血条（低血变红）+ 血量数字 + 层数 + 剩余敌人 + 连击/连招（右侧，给小地图留空间） |
| 底部提示 | 操作说明（半透明小字） |
| 死亡提示 | 居中半透明条 + 「你死了」+ 按 R 重开 |
| 升级面板 | 半透明遮罩 + 3 张卡片（序号/名称/描述） |

## 升级卡片点击

- `hudSystem.getUpgradeCardRects()` 暴露卡片命中区域（每帧更新）。
- `main.ts` 在 canvas 上监听 `click`，把鼠标坐标换算到卡片区域做命中检测。
- 键盘 1/2/3 保持不变。

## 关键点

- **系统顺序**：HUD 与 RenderSystem 之后（小地图之后，覆盖在最上层）。
- **状态传递**：HUD 系统需要 `GameState`，通过闭包捕获 `currentState` 传入（系统接口是 `(world, dt)`）。
- **命中区域坐标系**：用 `canvas.getBoundingClientRect()` 换算 `clientX/Y → 画布坐标`。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- 动作能力测试：**41/41**
- 游戏验证：**19/19**
- 平台/渲染/小地图冒烟测试：**通过**
- **HUD 冒烟测试：通过**（`npx tsx src/game/smoke-hud.ts`，验证卡片命中区域 x 递增）
- 一键回归：`bash scripts/verify-physics.sh`

---

# 打击手感（Juice）（阶段十三）

## 四件套

| 效果 | 说明 | 实现 |
|---|---|---|
| **伤害飘字** | 命中时显示伤害值，向上飘 + 淡出 | `DamageNumber` 组件 + `spawnDamageNumber` |
| **命中冲击波** | 命中点扩散圆环 | `HitSpark` 组件 + `spawnHitSpark` |
| **击杀爆裂粒子** | 敌人死亡时粒子向外飞散 | `DeathBurst` 组件 + `spawnDeathBurst` |
| **屏幕震动** | 命中/受击时相机抖动 | `Camera.shake(mag, duration)` |

## 实现要点

- **特效组件**：`DamageNumber` / `HitSpark` / `DeathBurst`（无碰撞、无物理）。
- **FxSystem**：每帧更新特效位置/寿命（飘字上浮、粒子飞散 + 重力、冲击波计时），到期销毁（本系统内处理）。
- **生成触发**：`CollisionSystem` 近战命中时生成飘字 + 冲击波 + 震动；击杀时额外生成爆裂；玩家受击时红字 + 冲击波 + 更强震动。
- **屏幕震动**：`Camera` 加 `shakeTime/shakeMag/shakeOffset`；`worldToScreen` 加上偏移；`Game.update` 每帧 `camera.updateShake(1/60)`。
- **渲染**：`main.ts` 新增三个 decorator（飘字 / 冲击波 / 爆裂），在合适层级绘制。

## 震动强度

- 普通命中：`3 + min(4, damage/15)`，持续 0.12s。
- 击杀：`7`，持续 0.2s。
- 玩家受击：`6`，持续 0.18s。

## 关键点

- **震动偏移加在 `worldToScreen`**：所有经相机变换的绘制（含小地图视野框）都会同步偏移。
- **特效生命周期自管**：FxSystem 内部销毁，不污染 LifecycleSystem。
- **飘字/粒子用 Position 更新**：复用通用组件，渲染走 decorator。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- **动作能力测试：48/48**（新增打击特效 7 项）
- 游戏验证：**19/19**
- 平台/渲染/小地图/HUD 冒烟测试：**通过**
- **打击特效冒烟测试：通过**（`npx tsx src/game/smoke-fx.ts`，含相机震动生效/到期停止）
- 一键回归：`bash scripts/verify-physics.sh`

---

# Bug 修复：组件位掩码超过 31 种（阶段十四）

## 问题

```
Error: ComponentStorage: 组件类型超过 31 种，位掩码不够用
  at ComponentStorage.getBitMask (ComponentStorage.ts:31)
  at World.addComponent → spawnDamageNumber → CollisionSystem
```

## 根因

位掩码用单个 JS `number`（32 位整数）存储，`getBitMask` 里 `1 << nextBit` 最多到 `1 << 30`（31 种组件），`1 << 31` 会变负数。游戏已有 **37+ 种组件**，加入打击特效后越界。

## 修复

**位掩码全部改用 `bigint`**（任意位数，彻底解除限制）：

| 文件 | 改动 |
|---|---|
| `ComponentStorage.ts` | `bitMasks: Map<..., bigint>`；`getBitMask` 返回 `bigint`，`1n << BigInt(nextBit)`，移除 31 上限检查 |
| `EntityManager.ts` | `masks: bigint[]`；`addMask/removeMask/getMask/maskOf` 改 `bigint` |
| `Query.ts` | `allMask/noneMask: bigint`；`matches` 用 `0n`；`build` 用 `0n` 初始值 |
| `World.ts` | `maskOf` 返回 `bigint` |
| `Entity.ts` | `EntityHost` 接口的 mask 方法签名改 `bigint` |

## 关键点

- **BigInt 字面量**：`0n`、`1n << BigInt(n)`；比较用 `=== 0n`。
- **类型传播**：`maskOf` 返回类型从 `number` → `bigint`，所有调用点（系统里的 `world.maskOf(...)`、`query().with(...)`）自动适配（tsc 会报错提示）。
- **性能**：BigInt 运算比 number 略慢，但位掩码只在 `addComponent`/查询时用，不在热路径，可接受。

## 回归测试

`verify-bigmask.ts`：注册 **40 种**组件类型无异常 + 生成打击特效（原崩溃点）+ 特效生命周期 + BigInt 查询正确性。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- 动作能力测试：**48/48**
- **BigInt 回归测试：8/8**（注册 40 种组件无异常）
- 游戏验证：**19/19**
- 平台/渲染/小地图/HUD/特效冒烟测试：**通过**
- 一键回归：`bash scripts/verify-physics.sh`

---

# 元游戏（阶段十五）

## 需求

开始/结束界面、暂停菜单、存档、音效。

## 实现

| 模块 | 文件 | 说明 |
|---|---|---|
| **状态机** | `game/state.ts` | `GamePhase`（MENU/PLAYING/PAUSED/GAMEOVER）+ `GameStateMachine` |
| **存档** | `game/save.ts` | `localStorage`（最高层数/最高连击/游玩次数），无 localStorage 降级内存 |
| **音效** | `game/audio.ts` | Web Audio 程序生成（振荡器 + 增益包络），无资源文件 |
| **界面** | `game/systems/screen.ts` | 画布内绘制主菜单/暂停/结束，暴露按钮命中区域 |

## 状态流转

```
MENU ──开始/Enter──▶ PLAYING ──ESC──▶ PAUSED ──ESC──▶ PLAYING
                        │                 │
                     死亡│              返回│
                        ▼                 ▼
                    GAMEOVER ──重开──▶ PLAYING
                        │
                     返回│
                        ▼
                      MENU
```

## 音效触发点

| 音效 | 触发 |
|---|---|
| jump | 地面跳 / 二段跳 / 蹬墙跳 |
| dash | 冲刺 |
| attack | 挥砍 |
| hit | 命中敌人 |
| hurt | 玩家受击 |
| death | 玩家死亡 |
| upgrade | 选择升级 |

## 关键点

- **游戏逻辑门控**：`GameLogicSystem` 仅在 `PLAYING` 时调用 `game.update()`，暂停/菜单时世界冻结。
- **HUD 门控**：HUD 仅在 `PLAYING` 绘制；界面系统在非 PLAYING 绘制。
- **AudioContext 懒初始化 + unlock**：浏览器策略要求用户交互后才能播放，首次点击/按键调用 `audio.unlock()`。
- **存档降级**：无 `localStorage`（测试环境）时用内存存储，接口不变。
- **按钮命中检测**：`screenSystem.getButtons()` 暴露区域，click 时换算坐标命中。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- 动作能力测试：**48/48**
- BigInt 回归测试：**8/8**
- 游戏验证：**19/19**
- 平台/渲染/小地图/HUD/特效冒烟测试：**通过**
- **元游戏冒烟测试：20/20**（`npx tsx src/game/smoke-meta.ts`）
- 一键回归：`bash scripts/verify-physics.sh`

---

# Bug 修复：界面 emoji 异常 + 内容居中（阶段十六）

## 问题

1. **死亡页面显示「大大的菜字」**：canvas 用 `ui-monospace` 渲染 emoji（`💀`/`⚔`/`⏸`/`🎉`/`🔥`/`🏰`/`👾`/`⬆`）时，等宽字体无 emoji 字形，浏览器 fallback 渲染异常（被放大成乱码/近似「菜」字）。
2. **内容块未垂直居中**：元素用 `H/2 + 硬编码偏移` 布局，整体重心偏下。

## 修复

**1. 移除所有 emoji**（`screen.ts` + `hud.ts`）：
- 死亡标题 `💀 你死了` → `你死了`
- 主菜单 `⚔ 动作 Roguelike` → `动作 Roguelike`
- 暂停 `⏸ 已暂停` → `已暂停`
- 升级 `⬆ 选择升级` → `选择升级`
- HUD `🏰/👾/🔥` → 纯文字

**2. 内容块整体垂直居中**（`screen.ts` 重写为「行列表」布局）：
- 每个界面定义为一个 `Row[]`（title / text / button）。
- `rowHeight(row)` 计算每行高度（含 gap）。
- `drawBlock()` 先算 `totalH = Σ rowHeight`，从 `(H - totalH) / 2` 开始逐行绘制。
- 新增 `getBlockBounds()` 暴露内容块范围（供测试验证居中）。

## 关键点

- **canvas 里避免用 emoji**：等宽/无 emoji 字体下会 fallback 成异常字形。需要图标时用 canvas 图形绘制或纯文字。
- **垂直居中 = 先算总高再布局**：不能靠硬编码偏移，否则内容增减时重心漂移。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- 动作能力测试：**48/48**
- BigInt 回归测试：**8/8**
- 游戏验证：**19/19**
- 平台/渲染/小地图/HUD/特效冒烟测试：**通过**
- **元游戏冒烟测试：20/20**（新增「内容块垂直居中」断言：重心 300 ≈ H/2）
- 一键回归：`bash scripts/verify-physics.sh`

---

# 性能与架构优化（阶段十七）

## 三项优化

### 1. 查询优化（`World.findEntities`）

**问题**：每帧多次全表扫描 + 每次分配新数组 + 循环内 `getEntityById`（Map 查找 + 可能 new Entity）。

**修复**：
- 新增 `EntityManager.isAliveIndex(index)`：直接用 `alive[]` 判断存活，**不创建 Entity / 不做 Map 查找**。
- `findEntities` 内部改用 `isAliveIndex`（仍返回新数组，安全）。
- 新增 `findEntitiesInto(query, out)`：**复用调用方缓冲**，热路径（每帧多次查询）用。
- 热路径接入：`CollisionSystem` 用 4 个模块级复用缓冲。

### 2. 组件 id 显式注册（`ComponentRegistry`）

**问题**：原 `nextBit` 按首次调用顺序递增，顺序依赖运行时代码路径，不稳定。

**修复**：
- 新增 `ComponentRegistry`：支持 `register(type, id)` **显式指定稳定 id**；未注册的自动分配（跳过已占用）。
- `ComponentStorage` 内部改用 `registry.getBitMask()`。
- `World.registerComponent(type, id)` 暴露给游戏层。
- 冲突注册抛错，重复同 id 幂等。

### 3. 短命实体对象池（`EntityPool`）

**问题**：子弹/特效/飘字频繁 spawn/despawn，产生 GC 压力。

**修复**：
- 新增 `EntityPool`：`acquire()` 优先复用池中索引，`release()` 回收（清空组件 + 标记空闲）。
- `EntityManager.reviveEntity(index)`：按索引复活（version +1）。
- `World.recycle/respawn` 暴露给池。
- **接入 FX 系统**：伤害飘字/冲击波/爆裂粒子全部走池；池绑定 world（world 变化时重建）；换局时 `resetFxPool()`。

## 性能基准

`verify-perf.ts` 对 1000 实体查询 2000 次：
- `findEntities`（每次分配）vs `findEntitiesInto`（复用缓冲）
- 复用缓冲减少分配（V8 小数组分配便宜，但长会话下减少 GC 压力）

## 关键点

- **`findEntities` 保持返回新数组**（安全）；热路径用 `findEntitiesInto` + 调用方缓冲。曾误改为共享缓冲，会导致 `collision.ts` 连续 4 次查询互相覆盖 → 已修正。
- **对象池必须绑定 world**：world 重建（换局/测试）后旧索引失效，池需重建。
- **组件注册表**：显式 id 让位掩码顺序稳定、可读、可预测。

## 验证

- TS 错误：**0**
- 物理自测：**15/15**
- 动作能力测试：**48/48**
- BigInt 回归测试：**8/8**
- **性能架构回归测试：20/20**（`npx tsx src/game/verify-perf.ts`，含查询复用/注册表/对象池/基准）
- 游戏验证：**19/19**
- 平台/渲染/小地图/HUD/特效/元游戏冒烟测试：**通过**
- 一键回归：`bash scripts/verify-physics.sh`
