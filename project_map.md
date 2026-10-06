# 项目文件结构映射表

## 核心引擎文件
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/GameEngine.ts` | 引擎主类 |
| `src/GameEngine/core/ability/IRenderable.ts` | 渲染接口定义 |
| `src/GameEngine/core/ability/IClickable.ts` | 点击接口定义 |
| `src/GameEngine/core/ability/IUpdateble.ts` | 更新接口定义 |
| `src/GameEngine/core/data/dataManager.ts` | 数据管理 |
| `src/GameEngine/core/objects/*` | 游戏对象相关类 |
| `src/GameEngine/core/types.ts` | 核心类型定义 |

## 战斗系统
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/battle/BattleEngine.ts` | 战斗引擎 |
| `src/GameEngine/battle/Types.ts` | 战斗类型定义 |

## 相机系统
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/camera/Camera2D.ts` | 2D相机 |

## ECS系统
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/ecs/EcsComponent.ts` | ECS组件基类 |
| `src/GameEngine/ecs/Entity.ts` | 实体类 |
| `src/GameEngine/ecs/EntityManager.ts` | 实体管理系统 |
| `src/GameEngine/ecs/System.ts` | 系统基类 |
| `src/GameEngine/ecs/SystemManager.ts` | 系统管理器 |
| `src/GameEngine/ecs/AISystem.ts` | AI系统 |
| `src/GameEngine/ecs/AnimationSystem.ts` | 动画系统 |
| `src/GameEngine/ecs/NetworkingSystem.ts` | 网络系统 |
| `src/GameEngine/ecs/PhysicsSystem.ts` | 物理系统 |
| `src/GameEngine/ecs/SceneComponent.ts` | 场景组件 |
| `src/GameEngine/ecs/ScriptingSystem.ts` | 脚本系统 |

## 渲染系统
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/renderer/CanvasManager.ts` | 画布管理 |
| `src/GameEngine/renderer/ImageRenderer.js` | 图片渲染组件 |
| `src/GameEngine/renderer/RenderSystem.ts` | 渲染系统 |
| `src/GameEngine/renderer/TextRenderer.ts` | 文本渲染组件 |
| `src/GameEngine/renderer/UIImage.ts` | UI图片组件 |
| `src/GameEngine/renderer/ButtonRenderComponent.ts` | 按钮渲染组件 |
| `src/GameEngine/renderer/ImageRenderComponent.ts` | 图片渲染组件 |
| `src/GameEngine/renderer/PanelRenderComponent.ts` | 面板渲染组件 |
| `src/GameEngine/renderer/RectangleRenderer.js` | 矩形渲染器 |
| `src/GameEngine/renderer/TextRenderComponent.ts` | 文本渲染组件 |
| `src/GameEngine/systems/RenderSystem.ts` | 渲染系统(系统层) |

## 引擎子系统
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/engines/AIEngine.ts` | AI引擎 |
| `src/GameEngine/engines/AnimationEngine.ts` | 动画引擎 |
| `src/GameEngine/engines/AudioEngine.ts` | 音频引擎 |
| `src/GameEngine/engines/NetworkingEngine.ts` | 网络引擎 |
| `src/GameEngine/engines/ScriptingEngine.ts` | 脚本引擎 |

## 事件系统
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/events/EventDispatcher.ts` | 事件分发器 |
| `src/GameEngine/events/EventListener.ts` | 事件监听器 |
| `src/GameEngine/events/InputHandler.ts` | 输入处理器 |

## 场景管理
| 文件路径 | 功能描述 |
|---------|---------|
| `src/scenes/CharacterSelectionScene.ts` | 角色选择场景 |
| `src/scenes/GameScene.ts` | 游戏场景 |
| `src/scenes/MapScene.ts` | 地图场景 |
| `src/scenes/StartScene.ts` | 开始场景 |
| `src/scenes/scenes.json` | 场景配置文件 |

## 服务层
| 文件路径 | 功能描述 |
|---------|---------|
| `src/services/AssetLoader.ts` | 资源加载器 |
| `src/services/DynamicComponentFactory.ts` | 动态组件工厂 |
| `src/services/LoadResource.ts` | 资源加载服务 |

## 工具类
| 文件路径 | 功能描述 |
|---------|---------|
| `src/utils/CommonUtils.js` | 通用工具 |
| `src/utils/Constant.js` | 常量定义 |
| `src/utils/FreeList.js` | 自由列表 |
| `src/utils/InputHandler.js` | 输入处理 |
| `src/utils/KeyConstants.js` | 按键常量 |

## 配置文件
| 文件路径 | 功能描述 |
|---------|---------|
| `src/config.json` | 游戏配置 |
| `src/MainMenuUiConfig.json` | 主菜单UI配置 |

## 未分类文件
| 文件路径 | 处理方式 |
|---------|---------|
| `src/GameEngine/EditorUI.ts` | 已移动到nouse目录 |
| `src/GameEngine/EntityTreeRenderer.ts` | 已移动到nouse目录 |
| `src/GameEngine/PropertyPanel.ts` | 已移动到nouse目录 |

## 资源文件
| 文件路径 | 功能描述 |
|---------|---------|
| `src/assets/code/Enemy.js` | 敌人脚本 |
| `src/assets/code/Platform.js` | 平台脚本 |
| `src/assets/code/Player.js` | 玩家脚本 |
| `src/assets/code/test.js` | 测试脚本 |
| `src/assets/img/*` | 图片资源 |

## 目录结构
```
d:\project\canvas-game/
├── .gitignore
├── .vscode/
├── 20250328开发日报.txt
├── LICENSE
├── README.en.md
├── README.md
├── frame.puml
├── package-lock.json
├── package.json
├── project_map.md
├── src/
│   ├── GameEngine/
│   │   ├── GameEngine.ts
│   │   ├── battle/
│   │   ├── camera/
│   │   ├── core/
│   │   ├── ecs/
│   │   ├── engines/
│   │   ├── events/
│   │   ├── renderer/
│   │   └── systems/
│   ├── MainMenuUiConfig.json
│   ├── assets/
│   │   ├── code/
│   │   └── img/
│   ├── config.json
│   ├── index.ts
│   ├── main.css
│   ├── nouse/
│   ├── scenes/
│   ├── services/
│   └── utils/
├── todo_list.md
├── tsconfig.json
└── webpack.config.js
```