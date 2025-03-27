# 游戏开发待办事项列表

## 渲染部分
- [x] 定义渲染组件(ImageRenderComponent)
- [ ] 实现精灵动画渲染

## 相机控制部分
- [x] 完成Camera2D基础功能
- [ ] 实现相机跟随效果

## 物理部分
- [ ] 创建对应的物理对象，使用 `GameEngine.physicsEngine` 实现碰撞检测和运动模拟
- [ ] 设置物理对象的属性

## 音频部分
- [ ] 加载音频资源，使用 `GameEngine.audioEngine` 播放背景音乐和音效
- [ ] 适时触发音频播放

## 脚本部分
- [ ] 设计一套脚本语言或 API，方便游戏设计师编写游戏规则和交互逻辑
- [ ] 使用 `GameEngine.scriptingEngine` 编写游戏逻辑脚本

## 动画部分
- [ ] 创建动画序列，使用 `GameEngine.animationEngine` 实现角色动画和特效动画
- [ ] 将动画序列关联到游戏对象

## 网络部分
- [ ] 实现客户端 - 服务器通信协议和数据包解析
- [ ] 使用 `GameEngine.networkingEngine` 处理多人在线交互和数据同步

## AI 部分
- [ ] 编写 AI 逻辑，实现游戏内 NPC 的行为决策和寻路算法
- [ ] 将 AI 逻辑绑定到对应的 NPC 对象

## 数据管理部分
- [ ] 设计数据模型和存取接口，使用 `GameEngine.dataManager` 存储和读取游戏数据
- [ ] 存储和读取如玩家进度、物品列表等游戏数据

## 事件处理部分
- [ ] 订阅和发布游戏内的各种事件，使用 `GameEngine.eventDispatcher` 实现事件驱动的程序结构
- [ ] 处理点击、按键、游戏状态变化等事件

## 场景管理部分
- [ ] 定义场景类或对象，封装场景相关的逻辑和资源加载
- [ ] 使用 `GameEngine.sceneManager` 加载、切换和管理游戏场景

## 相机控制部分
- [ ] 编写相机控制器，响应用户输入或游戏逻辑的变化
- [ ] 使用 `GameEngine.camera` 实现游戏视口的移动、缩放等操作

## 集成部分
- [ ] 创建 `GameContent.ts` 文件，编写游戏内容代码
- [ ] 将 `GameContent.ts` 以及其他必要的游戏内容代码集成到项目中
- [ ] 调整项目主文件（如 `index.ts` 或 `main.ts`）的结构，确保 `GameEngine` 的实例能在适当的时候被创建和启动