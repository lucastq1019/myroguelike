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

