import Actor from "@/actor/Actor"
export default class WallActor extends Actor{
    constructor(data={}){
        super(data)
        this.color = data.color
    }
    draw(ctx){
        ctx.save()
        ctx.fillStyle = this.color
        ctx.fillRect(this.position.x * this.width, this.position.y * this.height,  this.width,  this.height)
        ctx.restore()
    }
}

