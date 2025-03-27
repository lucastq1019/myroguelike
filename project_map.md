# 项目文件结构映射表

## 核心引擎文件
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/core/ability/IRenderable.ts` | 渲染接口定义 |
| `src/GameEngine/core/ability/IClickable.ts` | 点击接口定义 |
| `src/GameEngine/core/ability/IUpdateble.ts` | 更新接口定义 |
| `src/GameEngine/core/data/dataManager.ts` | 数据管理 |
| `src/GameEngine/core/objects/*` | 游戏对象相关类 |


## ECS系统
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/ecs/EcsComponent.ts` | ECS组件基类 |
| `src/GameEngine/ecs/Entity.ts` | 实体类 |
| `src/GameEngine/ecs/EntityManager.ts` | 实体管理系统 |
| `src/GameEngine/ecs/System.ts` | 系统基类 |
| `src/GameEngine/ecs/SystemManager.ts` | 系统管理器 |

## 删除核心对象系统相关条目
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/ecs/Component.ts` | ECS架构组件基类 (轻量级) |

## 渲染系统
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/renderer/CanvasManager.ts` | 画布管理 |
| `src/GameEngine/renderer/ImageRenderer.js` | 图片渲染组件 |
| `src/GameEngine/renderer/RenderSystem.ts` | 渲染系统 |
| `src/GameEngine/renderer/TextRenderer.ts` | 文本渲染组件 |
| `src/GameEngine/renderer/UIImage.ts` | UI图片组件 |

## 引擎子系统
| 文件路径 | 功能描述 |
|---------|---------|
| `src/GameEngine/engines/AIEngine.ts` | AI引擎 |
| `src/GameEngine/engines/ScriptingEngine.ts` | 脚本引擎 |

## 场景管理
| 文件路径 | 功能描述 |
|---------|---------|
| `src/scenes/MapScene.ts` | 地图场景 |
| `src/scenes.json` | 场景配置文件 |

## 工具类
| 文件路径 | 功能描述 |
|---------|---------|
| `src/utils/InputHandler.js` | 输入处理 |

## 配置文件
| 文件路径 | 功能描述 |
|---------|---------|
| `src/config.json` | 游戏配置 |
| `src/MainMenuUiConfig.json` | 主菜单UI配置 |

## 未分类文件
| 文件路径 | 处理方式 |
|---------|---------|
| `src/GameEngine/EditorUI.ts` | 移动到nouse目录 |
| `src/GameEngine/EntityTreeRenderer.ts` | 移动到nouse目录 |
| `src/GameEngine/PropertyPanel.ts` | 移动到nouse目录 |

## 目录结构
/game_project/
|-- src/
|   |-- assets/           # 游戏资源
|   |   |-- images/       # 图片资源
|   |   |-- sounds/       # 音频资源
|   |
|   |-- components/       # UI组件和游戏元素
|   |   |-- UI/           # UI组件
|   |   |-- GameElements/ # 游戏元素
|   |
|   |-- scenes/           # 游戏场景
|   |   |-- *.ts          # 场景实现
|   |   |-- scenes.json   # 场景配置
|   |
|   |-- services/         # 游戏服务
|   |   |-- *.ts          # 各种服务
|   |
|   |-- GameEngine/       # 引擎核心
|   |   |-- core/         # 核心系统
|   |   |-- renderer/     # 渲染系统
|   |   |-- engines/      # 子系统
|   |   |-- ecs/         # ECS架构
|   |
|   |-- utils/            # 工具类
|   |   |-- *.ts          # 工具函数
|
|-- public/               # 静态资源
|   |-- index.html        # 入口文件
|   |-- *.json            # 配置文件