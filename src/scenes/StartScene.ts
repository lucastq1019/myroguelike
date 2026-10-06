// StartScene.ts
import GameObject from "../GameEngine/core/objects/GameObject";
import Scene from "../GameEngine/sceneManager/Scene";
import Vector2 from "../GameEngine/core/common/Vector2";
import Transform from "../GameEngine/core/objects/Transform";
import RenderComponentFactory from "../GameEngine/core/tools/ComponentFactory";
import GameEngine from "../GameEngine/GameEngine"; // 引入GameEngine

export default class StartScene extends Scene {
    constructor(name: string) {
        super(name);
    }

    load(): void {
        // 获取屏幕宽度和高度
        const screenWidth = GameEngine.getScreenWidth();
        const screenHeight = GameEngine.getScreenHeight();
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonSpacing = 20;

        // 计算按钮的中心位置
        const buttonX = (screenWidth - buttonWidth) / 2;
        const buttonY = (screenHeight - (3 * buttonHeight + 2 * buttonSpacing)) / 2;

        // 创建三个按钮
        const createButton = (id: string, text: string, y: number, onClick?: () => void) => {
            const button = new GameObject({
                id: id,
                tag: "button",
                active: true
            });
            button.transform = new Transform({
                position: new Vector2(buttonX, y),
                rotation: 0,
                scale: new Vector2(1, 1)
            });
            const factory = RenderComponentFactory.getInstance();
            const buttonComponent = factory.createButtonRenderComponent({
                name: text,
                gameObject: button
            });
            buttonComponent.update = (dt) => {
                if (GameEngine.getInstance().getInputHandler().isMouseButtonPressed(0)) {
                    // 判断是不是当前按钮被点击了
                    const mousePosition = GameEngine.getInstance().getInputHandler().getMousePosition();
                    if (buttonComponent.isInside(mousePosition)) {
                        buttonComponent.triggerClick();
                    }
                }
            };
            button.addComponent(buttonComponent);
            this.addComponent(buttonComponent);

            // 添加点击事件
            if (onClick) {
                buttonComponent.onClick = onClick;
            }
        };

        // 创建开始按钮
        createButton("startButton", "开始", buttonY, () => {
            // 切换到 CharacterSelectionScene
            GameEngine.getInstance().getSceneManager().switchScene("CharacterSelectionScene");

            // 注册事件监听器
            const eventDispatcher = GameEngine.getInstance().getEventDispatcher();
            eventDispatcher.addEventListener('gameStart', (event) => {
                console.log('游戏开始事件被触发:', event);
            });

            console.log("开始按钮被点击");
        });

        // 创建设置按钮
        createButton("settingsButton", "设置", buttonY + buttonHeight + buttonSpacing);

        // 创建关于按钮
        createButton("aboutButton", "关于", buttonY + 2 * buttonHeight + 2 * buttonSpacing);

        console.log("StartScene loaded");
    }

    update(dt: number): void {
        this.getComponents().forEach(element => {
            element.update(dt);
        });
    }

    onUnload(): void {
        console.log("StartScene unloaded");
    }
}