import GameObject from "../GameEngine/core/objects/GameObject";
import Component from "../GameEngine/core/objects/Component";
import Scene from "../GameEngine/sceneManager/Scene";
import Vector2 from "../GameEngine/core/common/Vector2";
import Transform from "../GameEngine/core/objects/Transform";
import RenderComponent from "../GameEngine/renderer/RenderComponent";
import RenderComponentFactory from "../GameEngine/renderer/RenderComponentFactory";

export default class StartScene extends Scene {
    constructor(name: string) {
        super(name);
    }

    load(): void {
        // 获取屏幕中心位置
        const screenWidth = 800; // 假设屏幕宽度为800
        const screenHeight = 600; // 假设屏幕高度为600
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonSpacing = 20;

        // 计算按钮的中心位置
        const buttonX = (screenWidth - buttonWidth) / 2;
        const buttonY = (screenHeight - (3 * buttonHeight + 2 * buttonSpacing)) / 2;

        // 创建三个按钮
        const createButton = (id: string, text: string, y: number) => {
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
            const buttonComponent = factory.createRenderComponent({
                name: text,
                gameObject: button
            });
            button.addComponent(buttonComponent);
            this.addComponent(buttonComponent);
        };

        // 创建开始按钮
        createButton("startButton", "开始", buttonY);

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