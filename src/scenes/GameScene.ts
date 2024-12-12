import GameObject from "../GameEngine/core/objects/GameObject";
import Scene from "../GameEngine/sceneManager/Scene";
import Vector2 from "../GameEngine/core/common/Vector2";
import Transform from "../GameEngine/core/objects/Transform";
import RenderComponentFactory from "../GameEngine/core/objects/tools/ComponentFactory";
import GameEngine from "../GameEngine/GameEngine"; // 引入GameEngine

export default class GameScene extends Scene {
    constructor(name: string) {
        super(name);
    }

    load(): void {
        console.log("GameScene loaded");
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