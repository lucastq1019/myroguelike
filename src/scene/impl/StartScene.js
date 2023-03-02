import Scene from "../Scene"
import BtnActor from '@/actor/impl/BtnActor'
import playerImg from "@/assets/img/2.jpeg"
import MainScene from "@/Scene/impl/MainScene";

class StartScene extends Scene {
    constructor(game) {
        super(game)
        this.uiGroup = []

        this.initActor()
    }
    initActor() {
        this.bg = new Image(100, 100)
        this.bg.src = playerImg
        const startBtn = new BtnActor({
            x: this.width / 2,
            y: this.height / 2,
            text: "开始"
        }, () => {
            this.game.Scene = new MainScene(this.game)
        })
        const setBtn = new BtnActor({
            x: this.width / 2,
            y: this.height / 2 + startBtn.height + 30,
            text: "设置"
        })
        this.uiGroup.push(startBtn)
        this.uiGroup.push(setBtn)
    }

    logic() {
        this.uiGroup.forEach(actor => {
            actor.logic()
        });
    }
    draw() {
        this.ctx.drawImage(this.bg, 100, 100, this.width, this.height, 0, 0, this.width, this.height);
        this.uiGroup.forEach(actor => {
            actor.draw(this.ctx)
        })
    }
    onclick(event) {
        var x = event.offsetX;
        var y = event.offsetY;
        this.uiGroup.forEach(actor => {
            if (actor.isInternal(x, y)) {
                actor.onclick(event)
            }
        })
    }
}

export default StartScene