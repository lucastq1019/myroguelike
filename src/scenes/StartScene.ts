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
        // 给开始场景增加三个按钮
        const button1 = new GameObject({
            id: "button1",
            tag: "button",
            active: true
        });
        button1.transform = new Transform(
            new Vector2(100, 100),
            0,
            new Vector2(1, 1)
        )
        const factory = RenderComponentFactory.getInstance();
        const buttonComponent= factory.createRenderComponent({
            name: 'MyComponent',
            gameObject: button1
          })
        button1.addComponent(buttonComponent);
        this.addComponent(buttonComponent);
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