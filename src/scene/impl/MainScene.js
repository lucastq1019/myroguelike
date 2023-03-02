import Scene from "@/Scene/Scene";
import data from "@/data/data"
import BgActor from "@/actor/impl/BgActor";
import WallActor from "@/actor/impl/WallActor";
import Player from "@/actor/impl/Player";
import { buildDataKey } from "../../common/CommonUtils";
class MainScene extends Scene {
    constructor(game) {
        super(game)
        this.backGroup = []
        this.foreGroup = []
        this.actorGroup = [[],[],[],[]]
        this.uiGroup = []
        this.playerLayer = 3

        this.initActor(data)
    }

    // 初始化角色
    initActor(data) {
        this.tempCellSize = 24 * 1
        this.tempWidth = this.width / this.tempCellSize
        this.tempHeight = this.height / this.tempCellSize
        this.backGroup = data.backGroup.map(actor => {
            return new BgActor(actor)
        })
        data.player.game = this.game
        // 角色放在0层
        this.player = new Player(data.player)
        this.actorGroup[this.playerLayer].push(this.player)
    
        this.gameObj = data.gameObj[0]

        this.actorGroup[1] = this.gameObjToArray(this.gameObj)
        console.log(this)
    }

     // 绘制对象
     draw() {
        this.backGroup.forEach(actor => {
            actor.draw(this.ctx)
        });
        this.actorGroup.forEach(actors => {
            actors.forEach(actor => {
                actor.draw(this.ctx)
            })
        })

        this.foreGroup.forEach(actor => {
            actor.draw(this.ctx)
        })
        this.uiGroup.forEach(actor=>{
            actor.draw(this.ctx)
        })
        this.drawLine()
    }
    drawLine() {
        
        this.ctx.beginPath()
        this.ctx.strokeStyle = "#ddd"
        for (var i = 0; i < this.tempWidth; i++) {
            this.ctx.moveTo(i * this.tempCellSize, 0);
            this.ctx.lineTo(i * this.tempCellSize, this.height)
        }

        for (var i = 0; i < this.tempHeight; i++) {
            this.ctx.moveTo(0, i * this.tempCellSize);
            this.ctx.lineTo(this.width, i * this.tempCellSize)
        }
        this.ctx.stroke()
    }
    // 游戏逻辑执行
    logic(deltalTime){
        this.backGroup.forEach(actor => {
            actor.logic()
        });
        this.actorGroup.forEach(actors => {
            actors.forEach(actor => {
                actor.logic(deltalTime)
            })
        })
        this.foreGroup.forEach(actor => {
            actor.logic()
        })
    }
    keyEvent(event){
        const code = event
    }
    gameObjToArray(gameObj){
        let result = []
        for (const key in gameObj) {
            let actorData = gameObj[key]
            actorData.width = this.tempCellSize
            actorData.height = this.tempCellSize
            result.push(new WallActor(actorData))
        }
        return result
    }
    playerIsOnGround(){
        let xNum = Math.floor(this.player.position.x / this.tempCellSize)
        let yNum = Math.floor((this.player.position.y+this.player.height) / this.tempCellSize)
        
        let key = buildDataKey(xNum, yNum)
        // console.log(this.gameObj[key])
        if(this.gameObj[key]){
            return true
        }else{
            return false
        }
    }
} 

export default MainScene