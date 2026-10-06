// src/GameEngine/core/objects/DialogPanel.ts
import Panel from "./Panel";
import UIButton from "./UIButton";
import GameEngine from "../../GameEngine";

export default class DialogPanel extends Panel {
    private message: string;

    constructor(config: { id: string; message: string; width: number; height: number }) {
        super({
            id: config.id,
            width: config.width,
            height: config.height,
            active: false
        });
        this.message = config.message;
        this.createDialogButtons();
    }

    private createDialogButtons(): void {
        const screenWidth = GameEngine.getScreenWidth();
        const screenHeight = GameEngine.getScreenHeight();
        const buttonWidth = screenWidth * 0.1;
        const buttonHeight = screenHeight * 0.05;
        const buttonSpacing = screenWidth * 0.05;

        const okButton = new UIButton({
            id: "OkButton",
            text: "确定",
            x: (screenWidth - buttonWidth) / 2,
            y: this.getHeight() - buttonHeight - buttonSpacing,
            onClick: () => {
                this.confirmDialog();
            }
        });
        this.addComponent(okButton);
    }

    private confirmDialog(): void {
        console.log("确认对话框");
        this.hide();
    }

    public setMessage(message: string): void {
        this.message = message;
        // 更新渲染组件以显示新的消息
        const panelComponent = this.getComponentByType("PanelRenderComponent");
        if (panelComponent) {
            panelComponent.setMessage(this.message);
        }
    }
}