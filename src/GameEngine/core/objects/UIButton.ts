// src/GameEngine/core/objects/UIButton.ts
import Component from "./Component";
import Vector2 from "../common/Vector2";
import RenderComponentFactory from "../tools/UIFactory";
import ButtonRenderComponent from "../../renderer/ButtonRenderComponent";
import GameEngine from "../../GameEngine";
import IClickable from "../ability/IClickable";
import IUpdateble from "../ability/IUpdateble";
import IRenderable from "../ability/IRenderable";
import CanvasManager from "src/GameEngine/renderer/CanvasManager";
import GameObject from "./GameObject";

export default class UIButton extends GameObject implements IClickable, IUpdateble, IRenderable {
    private text: string;
    width: number;
    height: number;
    private color: string; // 添加颜色属性

    constructor(config: {
        width: number;
        height: number; id: string; text: string; x: number; y: number; onClick?: () => void; color?: string; gameObject: GameObject 
}) {
        super({ id: config.id, tag: "", active: true }); // 修改构造函数参数
        this.text = config.text;
        this.width = config.width || GameEngine.getScreenHeight() * 0.35; // 使用配置中的宽度
        this.height = config.height || GameEngine.getScreenHeight() * 0.35; // 使用配置中的高度
        this.color = config.color || 'blue'; // 使用配置中的颜色
        this.onClick = config.onClick || (() => {});

        this.getTransform().position = new Vector2(config.x, config.y);
        this.getTransform().rotation = 0;
        this.getTransform().scale = new Vector2(1, 1);
    }

    // 实现 IClickable 接口的 onClick 方法
    onClick: () => void;

    // 实现 IRenderable 接口的 render 方法
    render(canvasManager: CanvasManager): void {
        const context = canvasManager.getCtx()!;
        const transform = this.getTransform();
        const pos = transform.position;

        context.fillStyle = this.color; // 使用颜色属性
        context.fillRect(pos.x, pos.y, this.width, this.height);

        context.fillStyle = 'white';
        context.font = '20px Arial';
        context.textAlign = 'center';
        context.fillText(this.text, pos.x + this.width / 2, pos.y + this.height / 2);
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

    // 检查鼠标是否在按钮内部
    isInside(mousePosition: { x: number; y: number; }): boolean {
        const transform = this.getTransform();
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