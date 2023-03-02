import Actor from "@/actor/Actor";
import { IdleState, RunState,DownState } from "@/state/State";
import { G } from '@/common/Constant';
import playerImg from "@/assets/img/player.png"
class Player extends Actor {
    constructor(data) {
        data.img = playerImg
        super(data)
        this.text = data.text || "无名"
        this.idleState = new IdleState(this)
        this.runState = new RunState(this)
        this.downState = new DownState(this)
        this.state = this.idleState
        this.speed = 4
        this.spriteAnimations = []
        this.animationStates = [
            {
                name: "idle",
                frames: 7
            },
            {
                name: "jump",
                frames: 7
            },
            {
                name: "down",
                frames: 7
            },
            {
                name: "run",
                frames: 9
            },
            {
                name: "dizzy",
                frames: 11
            },
            {
                name: "set",
                frames: 5
            },
            {
                name: "hit",
                frames: 7
            },
        ]
        this.game = data.game
        this.currFrame = 0
        this.stateName = "idle"
        this.imgWidth = 573
        this.imgHeight = 523
        this.frameTimer = 0
        this.fps = 30
        this.frameInterval = 1000 / this.fps
        this.initPic()
        console.log(this)
    }
    initPic() {
        this.animationStates.forEach((state, index) => {
            let frames = {
                loc: []
            }
            for (let i = 0; i < state.frames; i++) {
                let positionX = i * this.imgWidth
                let positionY = index * this.imgHeight
                frames.loc.push({x:positionX,y:positionY})
            }
            this.spriteAnimations[state.name] = frames
        })
    }


    logic(deltalTime) {
        this.frameTimer = this.frameTimer + deltalTime
        if (this.frameTimer > this.frameInterval) {
            this.currFrame = (this.currFrame + 1) % this.spriteAnimations[this.stateName].loc.length;
            this.frameTimer = 0
        }
        this.state.handleInput()
        
        this.updatePosition()
    }
    draw(ctx) {
        ctx.fillStyle = "#aaa"
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
        if (this.img) {
            let curr = this.spriteAnimations[this.stateName].loc[this.currFrame]
            // console.log(this.stateName,this.currFrame)
            // 图片,起点x,起点y,图片内容的宽度，图片内容的高度
            ctx.drawImage(this.img, curr.x, curr.y, this.imgWidth, this.imgHeight, this.position.x, this.position.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.color
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
        }

    }
    updatePosition() {
        
        if(!this.game.mainScene.playerIsOnGround()){
            this.velocity.y +=0.1
        }else{
            this.velocity.y = 0
        }
        let tempVelocity = this.velocity.clone()
        this.position.add(tempVelocity)
    }
    setState(state) {
        this.state = state
        this.state.enter()
        this.currFrame = 0
    }
    applyG = () => {
        this.velocity.add(G)
    }
    removeG = () => {
        this.velocity.y = 0
        this.velocity.sub(G)
    }
}
export default Player