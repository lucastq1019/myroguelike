// src/scenes/GameScene.ts
import GameObject from "../GameEngine/core/objects/GameObject";
import Scene from "../GameEngine/sceneManager/Scene";
import Vector2 from "../GameEngine/core/common/Vector2";
import Transform from "../GameEngine/core/objects/Transform";
import RenderComponentFactory from "../GameEngine/core/tools/ComponentFactory";
import GameEngine from "../GameEngine/GameEngine"; // 引入GameEngine
import Player from "src/assets/code/Player";
import ComponentFactory from "../GameEngine/core/tools/ComponentFactory";
import ComponentConfig from "../GameEngine/core/objects/ComponentConfig";
import BattleEngine from "../GameEngine/battle/BattleEngine";
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
        const buttonWidth = screenHeight * 0.45;
        const buttonHeight = screenHeight * 0.45;
        const buttonSpacing = 0;

        const offsetX = (GameEngine.getScreenWidth() * 0.5 - buttonWidth * 2) / 6;
        const offsetY = (GameEngine.getScreenWidth() * 0.5 - buttonWidth * 2) / 6;

        const array1 = [
            { x: offsetX + buttonWidth + screenHeight * 0.05, y: offsetY + buttonHeight },
            { x: offsetX + buttonWidth, y: offsetY + screenHeight * 0.05 },
            { x: offsetX + screenHeight * 0.1, y: offsetY + buttonHeight + screenHeight * 0.05 },
            { x: offsetX + screenHeight * 0.05, y: offsetY + screenHeight * 0.1 }
        ];

        const offsetX2 = (GameEngine.getScreenWidth() * 0.5 - buttonWidth * 2) / 6 * 5 + GameEngine.getScreenWidth() * 0.5;
        const offsetY2 = (GameEngine.getScreenWidth() * 0.5 - buttonWidth * 2) / 6;

        const array2 = [
            { x: offsetX2 + screenHeight * 0.05, y: offsetY + screenHeight * 0.1 },
            { x: offsetX2 + screenHeight * 0.1, y: offsetY2 + buttonHeight + screenHeight * 0.05 },
            { x: offsetX2 + buttonHeight, y: offsetY2 + screenHeight * 0.05 },
            { x: offsetX2 + buttonWidth + screenHeight * 0.05, y: offsetY + buttonWidth }
        ];

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

        console.log(this);
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
            width: GameEngine.getScreenHeight() * 0.35,
            height: GameEngine.getScreenHeight() * 0.35,
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

    // 在GameScene类中添加新的UI方法

    private createSkillSelectionUI(): void {
        // 创建角色选择界面
        this.createCharacterSelectionUI();

        // 创建技能选择界面（初始状态下隐藏）
        this.createSkillSelectionPanel();
    }

    private createCharacterSelectionUI(): void {
        const screenWidth = GameEngine.getScreenWidth();
        const screenHeight = GameEngine.getScreenHeight();
        const characterButtonWidth = screenWidth * 0.2;
        const characterButtonHeight = screenHeight * 0.1;
        const characterSpacing = screenWidth * 0.05;

        const characters = ["角色1", "角色2", "角色3", "角色4"]; // 假设有四个角色

        characters.forEach((character, index) => {
            const x = (index % 2) * (characterButtonWidth + characterSpacing) + characterSpacing;
            const y = Math.floor(index / 2) * (characterButtonHeight + characterSpacing) + characterSpacing;
            this.createButton(`Character_${character}`, character, x, y, () => {
                this.showSkillSelectionPanel(character);
            });
        });
    }

    private createSkillSelectionPanel(): void {
        const screenWidth = GameEngine.getScreenWidth();
        const screenHeight = GameEngine.getScreenHeight();
        const skillPanel = new GameObject({
            id: "SkillSelectionPanel",
            tag: "panel",
            active: false
        });
        skillPanel.transform = new Transform({
            position: new Vector2(screenWidth / 2, screenHeight / 2),
            rotation: 0,
            scale: new Vector2(1, 1)
        });

        const factory = RenderComponentFactory.getInstance();
        const panelComponent = factory.createPanelRenderComponent({
            name: "Skill Selection",
            gameObject: skillPanel,
            width: screenWidth * 0.6,
            height: screenHeight * 0.6
        });

        skillPanel.addComponent(panelComponent);
        this.addComponent(skillPanel);
    }

    private showSkillSelectionPanel(character: string): void {
        // 显示技能选择面板
        const skillPanel = this.getComponentById("SkillSelectionPanel");
        if (skillPanel) {
            skillPanel.active = true;
            // 根据选择的角色加载技能按钮
            this.loadSkillsForCharacter(character);
        }
    }

    private hideSkillSelectionPanel(): void {
        // 隐藏技能选择面板
        const skillPanel = this.getComponentById("SkillSelectionPanel");
        if (skillPanel) {
            skillPanel.active = false;
        }
    }

    private loadSkillsForCharacter(character: string): void {
        // 假设每个角色有三个技能
        const skills = ["技能1", "技能2", "技能3"];

        const screenWidth = GameEngine.getScreenWidth();
        const screenHeight = GameEngine.getScreenHeight();
        const skillButtonWidth = screenWidth * 0.1;
        const skillButtonHeight = screenHeight * 0.05;
        const skillSpacing = screenWidth * 0.05;

        // 清除之前的技能按钮
        this.removeSkillButtons();

        skills.forEach((skill, index) => {
            const x = (index % 2) * (skillButtonWidth + skillSpacing) + skillSpacing;
            const y = Math.floor(index / 2) * (skillButtonHeight + skillSpacing) + skillSpacing;
            this.createButton(`Skill_${skill}`, skill, x, y, () => {
                this.selectSkill(skill);
            });
        });
    }

    private removeSkillButtons(): void {
        // 移除之前的技能按钮
        const skillPanel = this.getComponentById("SkillSelectionPanel");
        if (skillPanel) {
            skillPanel.getComponents().forEach(component => {
                if (component.gameObject.id.startsWith("Skill_")) {
                    skillPanel.removeComponent(component);
                }
            });
        }
    }

    private selectSkill(skill: string): void {
        // 选择技能的逻辑
        console.log(`选择了技能: ${skill}`);
    }

    private confirmSkillSelection(): void {
        // 确认技能选择的逻辑
        console.log("确认技能选择");
        this.hideSkillSelectionPanel();
    }

    private getComponentById(id: string): GameObject | undefined {
        return this.getComponents().find(component => component.gameObject.id === id)?.gameObject;
    }
}