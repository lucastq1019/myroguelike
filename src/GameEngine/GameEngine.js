import RenderingEngine from "./renderer/index.js";
import PhysicsEngine from "./physicsEngine/index.js";
import AudioEngine from "./audioEngine/index.js";
import ScriptingEngine from "./scriptingEngine/index.js";
import AnimationEngine from "./animationEngine/AnimationEngine.js";
import NetworkingEngine from "./networkingEngine/index.js";
import SceneManager from "./sceneManager/SceneManager.js";
import AIEngine from "./aiEngine/index.js";
import DataManager from "./dataManager/index.js";
import EventDispatcher from "./eventDispatcher/EventDispatcher.js";
import Camera2D from "./camera/Camera2D.js";

class GameEngine {
    /**
     * 游戏引擎类
     * @param {RenderingEngine} renderingEngine 渲染器
     * @param {PhysicsEngine} physics 物理引擎
     * @param {AudioEngine} audio 音频引擎
     * @param {ScriptingEngine} scripting 脚本引擎
     * @param {AnimationEngine} animation 动画引擎
     * @param {NetworkingEngine} networking 网络引擎
     * @param {SceneManager} sceneManager 场景管理器
     * @param {AIEngine} ai AI引擎
     * @param {DataManager} dataManager 数据管理器
     * @param {EventDispatcher} eventDispatcher 事件分发器
     * @param {Camera2D} camera 相机
     */
    constructor(renderingEngine, physics, audio, scripting, animation, networking, sceneManager, ai, dataManager, eventDispatcher, camera) {
        this.renderingEngine = renderingEngine;
        this.physics = physics;
        this.audio = audio;
        this.scripting = scripting;
        this.animation = animation;
        this.networking = networking;
        this.sceneManager = sceneManager;
        this.ai = ai;
        this.dataManager = dataManager;
        this.EventDispatcher = eventDispatcher;
        this.camera = camera;
    }
    
    /**
     * 创建游戏引擎
     * @returns {GameEngine} 游戏引擎实例
     */
    static createGameEngine() {
        try {
            const renderingEngine = new RenderingEngine();
            const physics = new PhysicsEngine();
            const audio = new AudioEngine();
            const scripting = new ScriptingEngine();
            const animation = new AnimationEngine();
            const networking = new NetworkingEngine();
            const sceneManager = new SceneManager();
            const ai = new AIEngine();
            const dataManager = new DataManager();
            const eventDispatcher = new EventDispatcher();
            const camera = new Camera2D();
            
            return new GameEngine(renderingEngine, physics, audio, scripting, animation, networking, sceneManager, ai, dataManager, eventDispatcher, camera);
        } catch (error) {
            console.error("创建游戏引擎失败:", error);
            throw error;
        }
    }
    
    /**
     * 更新逻辑
     * @param {number} dt 时间步长
     */
    update(dt) {
        this.scripting.update(dt);
        this.physics.update(dt);
        this.animation.update(dt);
        this.ai.update(dt);
        this.sceneManager.update(dt);
        this.camera.update(dt);
    }
    
    /**
     * 渲染
     */
    render() {
        this.renderingEngine.render();
    }
}

export default GameEngine;