import Render from "./renderer/Render.js";
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
    constructor() {
        // 渲染引擎
        this.renderer = new Render(this);
        // 物理引擎
        this.physics = new PhysicsEngine(this);
        // 音效
        this.audio = new AudioEngine(this);
        // 脚本
        this.scripting = new ScriptingEngine(this);
        // 动画
        this.animation = new AnimationEngine(this);
        // 网络
        this.networking = new NetworkingEngine(this);
        // 场景管理
        this.sceneManager = new SceneManager(this);
        // ai
        this.ai = new AIEngine(this);
        // 数据管理
        this.dataManager = new DataManager(this);
        // 事件分发
        this.EventDispatcher = new EventDispatcher();
        //相机
        this.camera = new Camera2D()
    }
    
    update(dt) {
        // 更新游戏逻辑
        this.scripting.update(dt);
        
        // 更新物理引擎
        this.physics.update(dt);
        
        // 更新动画
        this.animation.update(dt);
        
        // 更新 AI
        this.ai.update(dt);
        
        // 更新场景管理器
        this.sceneManager.update(dt);
        //相机
        this.camera.update(dt)
    }
    
    render() {
        // 渲染游戏画面
        this.renderer.render();
    }
}

export default GameEngine
