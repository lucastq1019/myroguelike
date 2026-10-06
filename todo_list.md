# 待办事项（下次会话使用）

> 状态：A 组（代码结构重构）、C 组（Roguelike 循环，含 C1/C2/C3）全部完成。
> 以下为**待选优化组**（B/D/E），下次会话从中挑选推进。

## 已完成

- [x] **A 代码结构重构**（2026-10-06，commit `3452edf`）
  - 抽出 `src/game/render/decorators.ts`（11 个 SpriteDecorator + `GAME_DECORATORS`），main.ts 413 → 159 行
  - `collision.ts` 抽出 `rollCrit` / `applyLifesteal` / `hitColor`，消除暴击/吸血重复
  - `hud.ts` 布局魔法数字提为文件顶部常量
  - 验收：tsc 0 错误；一键回归逐项与重构前一致（行为零改变）

- [x] **C2 掉落物系统**（2026-10-06）
  - 新增 `components`：`Pickup`（coin/heal/buff）、`Buff`（计时）
  - 新增 `resources/Pickups.ts`：`DROP_CONFIG`（概率/数值）、`BUFF_DEFS`（狂暴/疾行）、`PICKUP_STYLE`
  - 新增 `systems/pickup.ts`：`PickupSystem`（掉落物理+落地+拾取+增益计时/回滚+回收）、`spawnDropsFromEnemy`
  - `lifecycle.ts` 敌人死亡触发掉落；`collision.ts` 伤害乘 `__buffDamageMul`
  - `render/decorators.ts` 加 `pickupDecorator`；`hud.ts` 显示金币 + 增益倒计时；`audio.ts` 加 coin/pickup 音效
  - 验收：tsc 0；pickups 回归 26/26；一键回归全绿

- [x] **C1 升级面板刷新/跳过**（2026-10-06）
  - `game.ts`：`rerollUpgrade()`（每层首次免费，之后递增计价 `REROLL_BASE_COST * n`）、`skipUpgrade()`（回 25% 最大生命）
  - `hud.ts`：升级面板加「刷新」「跳过」按钮 + 命中区域 `getPanelButtons()`，禁用态置灰
  - `main.ts`：点击命中 + 键盘 Q 刷新 / E 跳过
  - 常量：`REROLL_FREE_PER_FLOOR=1`、`REROLL_BASE_COST=10`（占位）、`SKIP_HEAL_RATIO=0.25`
  - 验收：tsc 0；reroll 回归 36/36；一键回归全绿

- [x] **C3 局外永久解锁**（2026-10-06）
  - **两种货币分离**：局内金币（`__coins`，仅用于刷新升级，不入档）+ 灵魂（`souls`，永久货币）
  - `save.ts`：`SaveData` 加 `souls` / `unlocked`；`soulsForRun()`（每层 +1，新纪录 +5，占位常量）、`unlockItem()`（扣灵魂+写入，重复/不足拒绝）
  - `resources/Unlocks.ts`（新）：6 项解锁（健壮体魄/轻盈步伐/锋锐之刃/血之契约/幸运星/军火库）+ `applyUnlocks()`
  - `state.ts` 加 `SHOP` 阶段；`screen.ts` 加解锁商店界面（解锁行 + 命中区域）；结束界面显示灵魂奖励
  - `game.ts`：`start()` 应用已解锁项（`callbacks.getUnlocked`）；`main.ts` 商店导航 + 购买
  - 验收：tsc 0；unlocks 回归 36/36；元游戏冒烟 20 → 29；一键回归全绿

## 待选优化组（下次会话挑选）

### B 战斗深度
- [ ] 敌人受击硬直：新增 `HitStun` 组件，受击后短暂无法行动/被击退
- [ ] 精英怪：血量/体型/伤害放大 + 特殊颜色 + 击杀掉血包
- [ ] Boss：每 5 层一个，多阶段（血量阈值切换攻击模式）

### C Roguelike 循环
- [x] 升级面板加「刷新」（消耗？）/「跳过回血」选项
- [x] 掉落物：金币 / 血包 / 临时增益
- [x] 局外永久解锁：用金币解锁初始词条/角色（改用**灵魂**货币，与局内金币分离）

### D 性能优化
- [ ] 伤害判定加空间分区（复用物理的网格）
- [ ] 查询结果缓存复用（减少每帧分配）

### E 表现打磨
- [ ] 屏幕特效：受击红闪 / 低血红边
- [ ] 敌人血条（受伤后显示）

## 备注

- 推进流程：规划 → 用户确认 → 实现 → 一键回归（`bash canvas-game/scripts/verify-physics.sh`）
- 每组独立可验收，完成后跑回归确认全绿且数字与基线一致
- 当前回归基线：tsc 0 错误；物理 15 / 动作 48 / bigmask 8 / 性能 20 / 游戏 19 / 敌人 8 / 武器 11 / 词条 14 / 掉落物 26 / 刷新 36 / 解锁 36 / 元游戏 29 + 6 冒烟 + build


---

# GameEngine 死代码设计价值审计（2026-10-07）

## 审计方法

从真实入口 `index.html` → `src/game/main.ts` 出发做**传递闭包**（相对 import + `@/` alias 解析），
判定 `src/GameEngine/**` 每个文件是「活」还是「死」。

- **活文件 32 个**（被 game 实际引用）：`ecs/`(World/Entity/EntityManager/ComponentStorage/ComponentRegistry/
  EntityPool/Query/System/SystemManager/EcsComponent/index + components 3)、`physics/`(7)、`renderer/`
  (CanvasManager/RenderSystem)、`resources/`(Camera/Input/Time)、`events/EventDispatcher`、`core/`
  (types/ConfigManager/ErrorHandler)、`GameEngine.ts`
- **死文件 45 个**（不可达）：约 **1900 行**，分布在 `core/objects/`(16)、`renderer/`(9)、`engines/`(5)、
  `battle/`(2)、`core/ability|tools|data|components`(8)、`ecs/components/Transform`、`verify-*`(2) 等

> 结论：**不是「GameEngine 整体没用」**。ECS 内核 + 物理内核 + 相机/输入/时间资源 + 渲染系统是活的，
> 且是当前 game 的骨架。死的是**旧 OOP 外壳**（GameObject / 组件带 update / 场景 / UI / 引擎子系统）。

## 死代码设计价值分级

### ⭐⭐⭐ 高价值 —— 建议移植到新架构（game 目前缺）

| 设计 | 原位置 | 价值点 | 新架构缺什么 |
|---|---|---|---|
| **UI 控件体系** | `core/objects/Panel.ts`(92)、`UIButton.ts`(80)、`DialogPanel.ts`(51)、`renderer/ButtonRenderComponent|PanelRenderComponent|TextRenderComponent|UIImage` | 有**命中检测** `isInside()`、`onClick`、层级、`setMessage/setText` 等状态更新 | 现 HUD/升级面板/商店全是 `hud.ts`/`screen.ts` 里**手写矩形 + 手算命中区**（`getUpgradeCardRects`/`getPanelButtons`），每加一个按钮就要改两处 |
| **UI 工厂** | `core/tools/UIFactory.ts`(61)、`ComponentFactory.ts`(29) | 集中创建控件，避免装配代码散落 | 无；控件创建逻辑散在 hud/screen/main |
| **节点图 / 地图图结构** | `core/objects/MapNode.ts`(20)、`NodeGraphRenderComponent.ts`(77) | `MapNode`（id/name/nextNodes/previousNodes）+ 分层布局 + 连线渲染 | **Roguelike 的核心缺失**：现在只有「清怪→传送门→下一层」线性推进，没有分支地图选择 |
| **战斗引擎（Worker 化）** | `battle/BattleEngine.ts`(83)、`Types.ts`(25) | 战斗逻辑跑在 **Web Worker**，主线程只收消息；含 actionQueue/速度条 | 无；战斗全在主线程，敌人一多就掉帧 |
| **Transform 组件（位置+旋转+缩放）** | `ecs/components/Transform.ts`(83)、`core/objects/Transform.ts`(47) | 含 `serialize/deserialize`、`getTransformMatrix()` | game 只有 `Position`，**无旋转/缩放**；装饰器只能靠参数硬编码角度 |

### ⭐⭐ 中价值 —— 有参考意义，按需再引入

| 设计 | 原位置 | 价值点 | 现状 |
|---|---|---|---|
| **音频引擎（按 id 注册/播放）** | `engines/AudioEngine.ts`(58)、`AudioSource.ts`(24)、`AudioComponent.ts`(28) | 资源化音频管理、音量/淡入淡出扩展点 | `game/audio.ts` 用 Web Audio **程序合成**音效，够用；但**无资源音频文件播放能力** |
| **AI 状态机** | `engines/AIEngine.ts`(87) | `AIState` 枚举 IDLE/PATROL/CHASE/FLEE + 策略模式（ChaseStrategy/FleeStrategy） | game 的 `enemyAI.ts` 是**按 EnemyKind 分支**，敌人种类一多会膨胀；状态机 + 策略更可扩展 |
| **动画引擎 / 组件** | `engines/AnimationEngine.ts`(19)、`core/objects/AnimationComponent.ts`(8) | 遍历实体驱动动画组件 | 空壳；game 用 `afterimage.ts` 残影 + 程序绘制，无帧动画 |
| **序列化 / 反序列化** | `ecs/components/Transform.ts`、`core/data/dataManager.ts`(74) | 组件 `serialize/deserialize` + 数据加载/存档 | `game/save.ts` 只存元进度（souls/unlocked），**不存实体状态**；做「中途存档」需要它 |
| **能力接口** | `core/ability/IRenderable|IClickable|IUpdateble`(9) | 轻量接口约束 | 现用鸭子类型；接口化便于统一 UI/交互契约 |
| **碰撞器抽象** | `core/objects/Collider.ts`(9)、`ColliderComponent.ts`(28) | `checkCollision(other)` 多形状抽象 | game 物理内核已有 `Shapes.ts`(Circle/Box/Platform)，**已覆盖**，无需移植 |
| **渲染组件多态** | `core/objects/RenderComponent.ts`(10)、`CustomRenderComponent`、`renderer/TextRenderer|ImageRenderer|RectangleRenderer` | 渲染器多态 + zIndex | 现用 `Sprite` 组件 + `decorators.ts` 装饰器，**已覆盖**，无需移植 |

### ⭐ 低价值 / 无价值 —— 建议直接删除

| 设计 | 原位置 | 判定 |
|---|---|---|
| 空壳引擎 | `engines/NetworkingEngine.ts`(9)、`ScriptingEngine.ts`(6) | **空实现**，无任何逻辑 |
| 重复 / 坏掉的文件 | `core/components/Transform.ts`(11，`throw new Error`)、`core/objects/PanelRenderComponent.ts`(38，`super(config.gameObject)` 传参错误) | 编译期就坏，是**改造遗留的重复副本** |
| 废弃渲染器 | `renderer/ImageRenderer.js`、`RectangleRenderer.js`（引用了不存在的 `@/common/Vector.js`） | 路径失效，ESM 报错源 |
| 空接口 / 类型 | `events/EventListener.ts`(1)、`core/objects/Clickable.ts`(3)、`core/objects/TextRenderConfig.ts`(9) | 单行类型别名，可内联 |
| 旧 OOP 基类 | `core/objects/RenderComponent.ts`、`SpriteComponent.ts`、`CustomRenderComponent.ts` | 已被 `Sprite` 组件 + RenderSystem 取代 |
| 旧验证脚本 | `verify-engine.ts`(113)、`physics/verify-physics.ts`(186) | 前者验证的是旧 API；后者**仍在 `verify-physics.sh` 中跑**（15/15），需保留 |

## 行动项（全部完成 ✅ 2026-10-07）

- [x] **A. 删除无价值死代码**（2026-10-07）
  - 删除 13 个文件：`engines/Networking|Scripting`、`core/components/Transform`、
    `core/objects/PanelRenderComponent`、`renderer/ImageRenderer.js|RectangleRenderer.js`、
    `events/EventListener`、`core/objects/Clickable`、`TextRenderConfig`、`CustomRenderComponent`、
    `SpriteComponent`、旧 `RenderComponent`、`verify-engine.ts`
  - 验收：tsc 0 错误；回归全绿

- [x] **B. UI 控件体系**（2026-10-07）
  - 新增 `GameEngine/ui/UiLayer.ts`：`Widget` / `Button` / `Panel` / `HitArea` / `UiLayer`
    （移植旧 `Panel/UIButton` 的 `isInside()` 命中检测 + `onClick`，新增 `enabled` 禁用态与层级）
  - `hud.ts` / `screen.ts` 改用它：删除手写矩形命中区（`drawPanelButton`、手算 `mx>=b.x` 判断）
  - `main.ts` 点击分发改为 `ui.hit(mx,my)` 统一入口
  - 验收：新增 `verify-ui.ts` 46/46；6 个冒烟测试全绿

- [x] **C. 节点图地图**（2026-10-07）
  - 新增 `resources/MapGraph.ts`：`MapNode`（双向 next/prev）+ `GameMap` + `generateMap`
    （分层 1~3 节点、起点/Boss 单节点、连通性保证、跨度限制防交叉）+ `layoutMap` 归一化布局
  - 新增 `systems/mapScreen.ts`：画布内地图选择界面（已走路径高亮、可达节点脉动、图例）
  - `state.ts` 加 `MAP` 阶段；`game.ts` 加 `chooseNode/enterMapChoice`，把「线性推进」改为**分支选路**
  - 关卡按节点类型变化：休息层无敌人 / 宝箱层减半 / 精英层强化 / Boss 层翻倍
  - 验收：`verify-map.ts` 39/39；`smoke-mapflow.ts` 端到端跑通

- [x] **D. 战斗 Worker 化**（2026-10-07）
  - 新增 `GameEngine/battle/Protocol.ts`：SoA 扁平快照 + `stepBattle`/`applyDamage` 纯函数
  - 新增 `GameEngine/battle/Worker.ts`：Worker 端消息处理（导出 `handleMessage` 便于单测）
  - 新增 `GameEngine/battle/BattleEngine.ts`：主线程侧，**无 Worker 环境自动降级同步模式**
  - 验收：`verify-battle.ts` 45/45（含主线程开销不随敌人线性增长）

- [x] **E. Transform 组件**（2026-10-07）
  - 新增 `ecs/components/Transform.ts`：rotation + scaleX/scaleY + `serialize/deserialize`
  - `RenderSystem` 集成：有非单位 Transform 时 `save/rotate/scale/restore`，无则零开销
  - 与 `Position` 分离，不破坏 `dense(Position)` 热路径
  - 验收：`verify-transform.ts` 29/29

- [x] **F. 音频资源化**（2026-10-07）
  - `audio.ts` 新增：`registerBuffer` / `load`（fetch+decode）/ `playResource(id, vol, loop)` /
    `stopLoop` / `stopAllLoops` / `clearResources`（移植旧 `AudioEngine` 的按 id 播放）
  - 与原有程序合成音效共存；无 AudioContext 时静默降级
  - 验收：`verify-audio.ts` 35/35

- [x] **G. AI 状态机**（2026-10-07）
  - 新增 `GameEngine/ai/StateMachine.ts`：`AIState` 枚举 + 纯函数 `step()` + 策略/转移条件
    + 预置 `chaserMachine` / `chargerMachine` / `shooterMachine` / `flyerMachine`
  - `enemyAI.ts` 重写：删除按 EnemyKind 的大 switch，改为状态机驱动（状态机按类型复用实例）
  - 验收：`verify-ai.ts` 46/46；`verify-enemies.ts` 保持 8/8

- [x] **H. 实体状态序列化**（2026-10-07）
  - 新增 `ecs/WorldCodec.ts`：**注册制**编解码器（只存注册过的组件）+ 组件自定义
    `serialize/deserialize` + 未知类型容错 + JSON 往返
  - `save.ts` 新增中途存档读写（`writeRunSave`/`loadRunSave`/`hasRunSave`/`clearRunSave`）
  - `game.ts` 加 `exportRun`/`importRun`；`main.ts` 每层自动存档 + 主菜单「继续游戏」
  - 验收：`verify-save.ts` 41/41

> 全部 8 项完成。新增回归：Transform 29 / UI 46 / Map 39 / AI 46 / Audio 35 / Save 41 / Battle 45
> + 地图流程冒烟；原有基线不变（reroll 36 → 41，因新增 5 项地图流程断言）。
