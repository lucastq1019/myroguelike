// src/GameEngine/core/objects/PanelRenderComponent.ts
import RenderComponent from "../core/objects/RenderComponent";
import GameObject from "../core/objects/GameObject";
import CanvasManager from "src/GameEngine/renderer/CanvasManager";
import IRenderable from "../core/ability/IRenderable";


export default class PanelRenderComponent extends GameObject implements IRenderable {
    private width: number;
    private height: number;

    constructor(config: { gameObject: GameObject; width: number; height: number }) {
        super(config.gameObject);
        this.width = config.width;
        this.height = config.height;
    }

    public update(dt: number): void {
        // 更新面板逻辑
    }

    public render(canvasManager: CanvasManager): void {
        const context = canvasManager.getCtx();
        // 渲染面板逻辑
        context.fillStyle = "rgba(255, 255, 255, 0.8)";
        context.fillRect(
            this.gameObject.transform.position.x - this.width / 2,
            this.gameObject.transform.position.y - this.height / 2,
            this.width,
            this.height
        );
        context.fillStyle = "black";
        context.font = "20px Arial";
        context.textAlign = "center";
        context.fillText(
            "Panel", // 使用固定文本或通过其他方式传递名称
            this.gameObject.transform.position.x,
            this.gameObject.transform.position.y - this.height / 2 + 30
        );
    }
}