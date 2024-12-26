// src/GameEngine/core/objects/Panel.ts
import Vector2 from "../common/Vector2";
import IClickable from "../ability/IClickable";
import IUpdatable from "../ability/IUpdateble";
import IRenderable from "../ability/IRenderable";
import CanvasManager from "src/GameEngine/renderer/CanvasManager";
import GameEngine from "../../GameEngine";
import GameObject from "./GameObject";

export default class Panel extends GameObject implements IClickable, IUpdatable, IRenderable {
    private width: number;
    private height: number;
    private color: string; // 添加颜色属性
    onClick: () => void; // 添加 onClick 属性

    constructor(config: { 
        id: string; 
        width: number; 
        height: number; 
        x: number; 
        y: number; 
        onClick?: () => void; 
        color?: string; 
        active?: boolean; 
        gameObject: GameObject 
    }) {
        super({ name: config.id, gameObject: config.gameObject });
        this.width = config.width;
        this.height = config.height;
        this.color = config.color || 'gray'; // 使用配置中的颜色
        this.onClick = config.onClick || (() => {});

        this.getTransform().position = new Vector2(config.x, config.y);
        this.getTransform().rotation = 0;
        this.getTransform().scale = new Vector2(1, 1);
    }

    // Getter for width
    public getWidth(): number {
        return this.width;
    }



    // Method to show the panel
    public show(): void {
        this.setActive(true);
    }

    // Method to hide the panel
    public hide(): void {
        this.setActive(false);
    }

    // 实现 IRenderable 接口的 render 方法
    render(canvasManager: CanvasManager): void {
        const context = canvasManager.getCtx()!;
        const transform = this.getTransform();
        const pos = transform.position;

        context.fillStyle = this.color; // 使用颜色属性
        context.fillRect(pos.x, pos.y, this.width, this.height);
    }

    // 实现 IUpdatable 接口的 update 方法
    update(dt: number): void {
        if (GameEngine.getInstance().getInputHandler().isMouseButtonPressed(0)) {
            const mousePosition = GameEngine.getInstance().getInputHandler().getMousePosition();
            if (this.isInside(mousePosition)) {
                this.triggerClick();
            }
        }
    }

    // 触发点击事件
    triggerClick() {
        this.onClick();
    }

    // 检查鼠标是否在面板内部
    isInside(mousePosition: { x: number; y: number; }): boolean {
        const transform = this.gameObject.getTransform();
        if (!transform || !transform.position) return false; // 如果没有有效的 transform 或 position，直接返回 false
        const pos = transform.position;

        return (
            mousePosition.x >= pos.x &&
            mousePosition.x <= pos.x + this.width &&
            mousePosition.y >= pos.y &&
            mousePosition.y <= pos.y + this.height
        );
    }
}