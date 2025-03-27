# 1. 核心引擎文件
mkdir -p src/GameEngine/core/ability
mkdir -p src/GameEngine/core/data
mkdir -p src/GameEngine/core/objects
mv src/GameEngine/core/ability/IRenderable.ts src/GameEngine/core/ability/
mv src/GameEngine/core/data/dataManager.ts src/GameEngine/core/data/
mv src/GameEngine/core/objects/* src/GameEngine/core/objects/

# 2. ECS系统
mkdir -p src/GameEngine/ecs
mv src/GameEngine/ecs/EntityManager.ts src/GameEngine/ecs/

# 3. 渲染系统
mkdir -p src/GameEngine/renderer
mv src/GameEngine/renderer/CanvasManager.ts src/GameEngine/renderer/
mv src/GameEngine/renderer/ImageRenderer.js src/GameEngine/renderer/
mv src/GameEngine/renderer/RenderSystem.ts src/GameEngine/renderer/
mv src/GameEngine/renderer/TextRenderer.ts src/GameEngine/renderer/
mv src/GameEngine/renderer/UIImage.ts src/GameEngine/renderer/

# 4. 引擎子系统
mkdir -p src/GameEngine/engines
mv src/GameEngine/engines/AIEngine.ts src/GameEngine/engines/
mv src/GameEngine/engines/ScriptingEngine.ts src/GameEngine/engines/

# 5. 场景管理
mkdir -p src/scenes
mv src/scenes/MapScene.ts src/scenes/
mv src/scenes.json src/scenes/

# 6. 工具类
mkdir -p src/utils
mv src/utils/InputHandler.js src/utils/

# 7. 配置文件
mv src/config.json src/
mv src/MainMenuUiConfig.json src/

# 8. 无法定位的文件
mkdir -p src/nouse
mv src/GameEngine/EditorUI.ts src/nouse/
mv src/GameEngine/EntityTreeRenderer.ts src/nouse/
mv src/GameEngine/PropertyPanel.ts src/nouse/