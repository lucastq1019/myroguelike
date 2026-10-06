// CharacterSelectionScene.ts
import GameObject from "../GameEngine/core/objects/GameObject";
import Scene from "../GameEngine/sceneManager/Scene";
import Vector2 from "../GameEngine/core/common/Vector2";
import Transform from "../GameEngine/core/objects/Transform";
import ComponentFactory from "../GameEngine/core/tools/ComponentFactory";
import TextRenderComponent from "../GameEngine/renderer/TextRenderComponent";
import GameEngine from "../GameEngine/GameEngine"; // 引入GameEngine

export default class CharacterSelectionScene extends Scene {
    constructor(name: string) {
        super(name);
    }

    load(): void {
        // 获取屏幕宽度和高度
        const screenWidth = GameEngine.getScreenWidth();
        const screenHeight = GameEngine.getScreenHeight();
        const boxWidth = 200;
        const boxHeight = 100;
        const boxSpacing = 20;
        const textHeight = 50;

        // 计算框的起始位置
        const startX = (screenWidth - (3 * boxWidth + 2 * boxSpacing)) / 2;
        const startY = (screenHeight - (boxHeight + textHeight + 50)) / 2; // 调整起始Y位置

        // 创建角色选择框
        const createBox = (id: string, text: string, description: string, x: number, y: number) => {
            const box = new GameObject({
                id: id,
                tag: "characterBox",
                active: true
            });
            box.transform = new Transform({
                position: new Vector2(x, y),
                rotation: 0,
                scale: new Vector2(1, 1)
            });
            const factory = ComponentFactory.getInstance();
            const boxComponent = factory.createImageRenderComponent({
                name: text,
                gameObject: box,
                width: boxWidth,
                height: boxHeight,
                imageUrl: "assets/2.png"
            });
            box.addComponent(boxComponent);
            this.addComponent(boxComponent);

            // 创建描述文本
            const descriptionBox = new GameObject({
                id: `${id}-description`,
                tag: "description",
                active: true
            });
            descriptionBox.transform = new Transform({
                position: new Vector2(x, y + boxHeight + 10),
                rotation: 0,
                scale: new Vector2(1, 1)
            });
            const descriptionComponent = new TextRenderComponent({
                text: description,
                position: new Vector2(x, y + boxHeight + 10),
                fontSize: 14,
                fontColor: 'black',
                fontFamily: 'Arial'
            });
            descriptionBox.addComponent(descriptionComponent);
            this.addComponent(descriptionComponent);
        };

        // 创建三个角色选择框
        createBox("character1", "角色1", "这是角色1的介绍", startX, startY);
        createBox("character2", "角色2", "这是角色2的介绍", startX + boxWidth + boxSpacing, startY);
        createBox("character3", "角色3", "这是角色3的介绍", startX + 2 * (boxWidth + boxSpacing), startY);

        // 创建确定按钮
        const confirmButtonX = startX + 1.5 * (boxWidth + boxSpacing); // 确认按钮在所有角色选择框的右侧
        const confirmButtonY = startY + boxHeight + textHeight + 50; // 确认按钮在所有角色选择框下方
        const confirmButton = new GameObject({
            id: "confirmButton",
            tag: "button",
            active: true
        });
        confirmButton.transform = new Transform({
            position: new Vector2(confirmButtonX, confirmButtonY),
            rotation: 0,
            scale: new Vector2(1, 1)
        });
        const confirmButtonComponent = ComponentFactory.getInstance().createButtonRenderComponent({
            name: "确定",
            gameObject: confirmButton,
            onClick: () => {
                console.log("确定按钮被点击了");
                // 切换到 GameScene
                GameEngine.getInstance().getSceneManager().switchScene("GameScene");

                // 注册事件监听器
                const eventDispatcher = GameEngine.getInstance().getEventDispatcher();
                eventDispatcher.addEventListener('gameStart', (event) => {
                    console.log('游戏开始事件被触发:', event);
                });
            },
            width: 100,
            height: 50
        });

        // 确保按钮的 update 方法正确处理点击事件
        confirmButtonComponent.update = (dt) => {
            if (GameEngine.getInstance().getInputHandler().isMouseButtonPressed(0)) {
                const mousePosition = GameEngine.getInstance().getInputHandler().getMousePosition();
                if (confirmButtonComponent.isInside(mousePosition)) {
                    confirmButtonComponent.triggerClick();
                }
            }
        };

        confirmButton.addComponent(confirmButtonComponent);
        this.addComponent(confirmButtonComponent);

        console.log("CharacterSelectionScene loaded");
    }

    update(dt: number): void {
        this.getComponents().forEach(element => {
            element.update(dt);
        });
    }

    onUnload(): void {
        console.log("CharacterSelectionScene unloaded");
    }
}