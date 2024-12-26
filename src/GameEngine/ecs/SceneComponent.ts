import Scene from '../sceneManager/Scene';

export default class SceneComponent {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    getScene(): Scene {
        return this.scene;
    }
}