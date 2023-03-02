import StartScene from "./Scene/impl/StartScene";
import MainScene from "./Scene/impl/MainScene";

class Game {
    constructor() {
        this.initCanvas()
        this.initEvent()
        this.startScene = new StartScene(this)
        this.mainScene = new MainScene(this)
        this.scene = this.mainScene
    }
    // 初始化画布
    initCanvas() {
        let canvas = document.createElement("canvas")
        // 获取到全屏的宽高
        canvas.width = document.documentElement.clientWidth
        canvas.height = document.documentElement.clientHeight
        // 进行宽高放大
        canvas.width = canvas.width * window.devicePixelRatio
        canvas.height = canvas.height * window.devicePixelRatio
        // 实际画布大小
        canvas.style.width = canvas.width  / window.devicePixelRatio + "px"
        canvas.style.height = canvas.height / window.devicePixelRatio+ "px"
        document.body.appendChild(canvas)

        // ctx上下文都进行缩放
        this.ctx = canvas.getContext("2d")
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = canvas.width/window.devicePixelRatio
        this.height = canvas.height/window.devicePixelRatio
        
    }
    // 初始化事件
    initEvent() {
        const that = this
        document.addEventListener("click", (event) => {
            that.scene.onclick(event);
        })
    }


    // 每帧执行
    frameRun(deltalTime) {
        // 优先执行逻辑
        this.logic(deltalTime)
        // 每次先清理 
        this.clear()
        // 执行绘制
        this.draw()
    }
    // 清除画布
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height)
    }
    // 帧逻辑
    logic(deltalTime) {
        this.scene.logic(deltalTime)
    }
    // 帧绘制
    draw() {
        this.scene.draw()
    }

}

const game = new Game()
export default game