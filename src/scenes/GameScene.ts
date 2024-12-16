import GameObject from "../GameEngine/core/objects/GameObject";
import Scene from "../GameEngine/sceneManager/Scene";
import Vector2 from "../GameEngine/core/common/Vector2";
import Transform from "../GameEngine/core/objects/Transform";
import RenderComponentFactory from "../GameEngine/core/objects/tools/ComponentFactory";
import GameEngine from "../GameEngine/GameEngine"; // 引入GameEngine
import Player from "src/assets/code/Player";
import ComponentFactory from "../GameEngine/core/objects/tools/ComponentFactory";
import ComponentConfig from "../GameEngine/core/objects/ComponentConfig";
export default class GameScene extends Scene {
    constructor(name: string) {
        super(name);
    }

    load(): void {
        const screenWidth = GameEngine.getScreenWidth();
        const screenHeight = GameEngine.getScreenHeight();
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonSpacing = 20;

        // 计算按钮的中心位置
        const buttonX = (screenWidth - buttonWidth) / 2;

        // 创建第一组按钮
        for (let i = 0; i < 4; i++) {
            const buttonY = (screenHeight / 3) - (buttonHeight / 2);
            this.createButton(`Button1_${i}`, `Button1_${i}`, buttonX-100, buttonY + i * (buttonHeight + buttonSpacing),() => {
                console.log(`Button1_${i}`);
            });
        }

        // 创建第二组按钮
        for (let i = 0; i < 4; i++) {
            const buttonY = (2 * screenHeight / 3) - (buttonHeight / 2);
            this.createButton(`Button2_${i}`, `Button2_${i}`, buttonX+100, buttonY + i * (buttonHeight + buttonSpacing),() => {
                console.log(`Button2_${i}`);
            });
        }

        // 创建开始按钮
        const startButtonY = (screenHeight / 2) - (buttonHeight / 2);
        this.createButton("StartButton", "开始", buttonX, startButtonY, () => {
            console.log("开始按钮被点击");
        });
        console.log(this)
        console.log("GameScene loaded");
    }

    private createButton(id: string, text: string, x: number, y: number, onClick?: () => void): void {
        const button = new GameObject({
            id: id,
            tag: "button",
            active: true
        });
        button.transform = new Transform({
            position: new Vector2(x, y),
            rotation: 0,
            scale: new Vector2(1, 1)
        });
        const factory = RenderComponentFactory.getInstance();
        const buttonComponent = factory.createButtonRenderComponent({
            name: text,
            gameObject: button,
            width: 200,
            height: 50,
            onClick: onClick
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
    }

    update(dt: number): void {
        this.getComponents().forEach(element => {
            element.update(dt);
        });
    }

    onUnload(): void {
        console.log("GameScene unloaded");
    }
}