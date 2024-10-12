import Scene from "src/GameEngine/sceneManager/Scene";

export default class StartScene extends Scene {
    constructor(name: string) {
        super(name);
    }

    load(): void {
        this.addComponent(new Comment(this.gameEngine, "Hello World!"));
        console.log("StartScene loaded");
    }

    update(dt: number): void {
        this.elements.forEach(element => {
            element.update(dt);
        });
    }

    onUnload(): void {
        console.log("StartScene unloaded");
    }
}