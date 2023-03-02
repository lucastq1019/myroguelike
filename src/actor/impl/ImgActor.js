import Actor from "@/actor/Actor";
class ImgActor extends Actor {
    constructor(data = {}) {
        super(data)
        this.mass = 1
        this.text = data.text || "无名"
        this.init()
    }
    init(){
    }
    draw(ctx) {
        if(this.img){
            // 图片,起点x,起点y,图片内容的宽度，图片内容的高度
            ctx.drawImage(this.img, this.position.x,this.position.y, this.width, this.height);
        }
        ctx.fillStyle = '#f0f000'
        // ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
        ctx.fillStyle = '#000'
        ctx.textAlign = "center"
        ctx.fillText(this.text, this.getTextDrawX(), this.getTextDrawY())
    }
    onclick(event) {
        game.Scene = new TestScene(game.ctx)
    }
    logic() {
    }
}
export default ImgActor