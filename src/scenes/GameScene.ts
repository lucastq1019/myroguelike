import GameObject from "../GameEngine/core/objects/GameObject";
import Scene from "../GameEngine/sceneManager/Scene";
import Vector2 from "../GameEngine/core/common/Vector2";
import Transform from "../GameEngine/core/objects/Transform";
import RenderComponentFactory from "../GameEngine/core/objects/tools/ComponentFactory";
import GameEngine from "../GameEngine/GameEngine"; // 引入GameEngine
import Player from "src/assets/code/Player";
import ComponentFactory from "../GameEngine/core/objects/tools/ComponentFactory";
import ComponentConfig from "../GameEngine/core/objects/ComponentConfig";
import  BattleEngine from "../GameEngine/battle/BattleEngine";
import { Action } from "../GameEngine/battle/Types";
export default class GameScene extends Scene {

    private battleEngine: BattleEngine;
    constructor(name: string) {
        super(name);
        this.battleEngine = new BattleEngine();
        this.battleEngine.setInputPhaseCallback(this.handleInputPhase.bind(this));
    }

    private handleInputPhase(entityId: number) {
        // 这里可以添加进入指令输入阶段的逻辑，比如显示技能选择界面
        console.log(`Entity ${entityId} is entering input phase`);

        // 假设玩家选择了一个技能并生成了一个动作
        const action: Action = { type: 'skill', sourceId: entityId, targetId: 1, damage: 20 };
        this.battleEngine.endInputPhase([action]);
    }


    load(): void {
        const screenWidth = GameEngine.getScreenWidth();
        const screenHeight = GameEngine.getScreenHeight();
        const buttonWidth = screenHeight * .45;
        const buttonHeight = screenHeight * .45;
        const buttonSpacing = 0;

        const offsetX = (GameEngine.getScreenWidth() * .5 - buttonWidth * 2) / 6
        const offsetY = (GameEngine.getScreenWidth() * .5 - buttonWidth * 2) / 6

        const array1 = [{ x: offsetX + buttonWidth + screenHeight * 0.05, y: offsetY + buttonHeight }
            , { x: offsetX + buttonWidth, y: offsetY + screenHeight * 0.05 }
            , { x: offsetX + screenHeight * 0.1, y: offsetY + buttonHeight + screenHeight * 0.05 }
            , { x: offsetX + screenHeight * 0.05, y: offsetY + screenHeight * 0.1 }]

        const offsetX2 = (GameEngine.getScreenWidth() * .5 - buttonWidth * 2) / 6 * 5 + GameEngine.getScreenWidth() * .5
        const offsetY2 = (GameEngine.getScreenWidth() * .5 - buttonWidth * 2) / 6

        const array2 = [{ x: offsetX2 + screenHeight * 0.05, y: offsetY + screenHeight*.1 }
            , { x: offsetX2 + screenHeight*.1, y: offsetY2+ buttonHeight + screenHeight * 0.05 }
            , { x: offsetX2 + buttonHeight, y: offsetY2 + screenHeight * 0.05 }
            , { x: offsetX2 +buttonWidth + screenHeight * 0.05, y: offsetY+buttonWidth}]
        // 计算按钮的中心位置
        const buttonX = (screenWidth - buttonWidth) / 2;

        // 创建第一组按钮
        for (let i = 0; i < 4; i++) {
            this.createButton(`Button1_${i}`, `Button1_${i}`, array1[i].x, array1[i].y, () => {
                console.log(`Button1_${i}`);
            });
        }

        // 创建第二组按钮
        for (let i = 0; i < 4; i++) {
            this.createButton(`Button2_${i}`, `Button2_${i}`, array2[i].x, array2[i].y, () => {
                console.log(`Button2_${i}`);
            });
        }

        // 创建开始按钮
        const startButtonY = (screenHeight / 2) - (buttonHeight / 2);
        this.createButton("StartButton", "开始", buttonX, startButtonY, () => {
            console.log("开始按钮被点击");
            this.battleEngine.init([
                { id: "player1", speed: 100, health: 100, actionBar: 100, isPlayer: true },
                { id: "player2", speed: 100, health: 100, actionBar: 100, isPlayer: true }
            ]);
            this.battleEngine.startBattle();
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
            width: GameEngine.getScreenHeight() * .35,
            height: GameEngine.getScreenHeight() * .35,
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