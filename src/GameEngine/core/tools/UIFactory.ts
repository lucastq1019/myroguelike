import RenderComponent from "../objects/RenderComponent";
import ButtonRenderComponent from "../../renderer/ButtonRenderComponent";
import GameObject from "../objects/GameObject";
import ComponentConfig from "../objects/ComponentConfig";
import ImageRenderComponent from "../../renderer/UIImage";
import ImageRenderConfig from "../objects/ImageRenderConfig";
import PanelRenderComponent from "../../renderer/PanelRenderComponent";
import UIButton from "../objects/UIButton";

export default class UIFactory {
    private static instance: UIFactory;

    private constructor() { }

    static getInstance(): UIFactory {
        if (!UIFactory.instance) {
            UIFactory.instance = new UIFactory();
        }
        return UIFactory.instance;
    }

    createButtonRenderComponent(config: ComponentConfig): ButtonRenderComponent {
        return new ButtonRenderComponent(config);
    }

    createImageRenderComponent(config: ImageRenderConfig): ImageRenderComponent {
        return new ImageRenderComponent(config);
    }

    createPanelRenderComponent(config: { gameObject: GameObject; width: number; height: number; name: string }): PanelRenderComponent {
        return new PanelRenderComponent(config);
    }

    createUIButton(config: {
        width: number;
        height: number;
        id: string;
        text: string;
        x: number;
        y: number;
        onClick?: () => void;
        color?: string;
        gameObject: GameObject;
    }): UIButton {
        return new UIButton(config);
    }

    createPanel(config: { 
        id: string; 
        width: number; 
        height: number; 
        x: number; 
        y: number; 
        onClick?: () => void; 
        color?: string; 
        active?: boolean; 
        gameObject: GameObject 
    }): Panel {
        return new Panel(config);
    }
}
