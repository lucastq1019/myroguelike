// src/GameEngine/core/objects/PanelRenderComponent.ts
import RenderComponent from "./RenderComponent";
import GameObject from "./GameObject";

export default class PanelRenderComponent extends RenderComponent {
    private width: number;
    private height: number;
    private name: string;

    constructor(config: { gameObject: GameObject; width: number; height: number; name: string }) {
        super(config.gameObject);
        this.width = config.width;
        this.height = config.height;
        this.name = config.name;
    }

    public update(dt: number): void {
        // 更新面板逻辑
    }

    public render(context: CanvasRenderingContext2D): void {
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
            this.name,
            this.gameObject.transform.position.x,
            this.gameObject.transform.position.y - this.height / 2 + 30
        );
    }
}