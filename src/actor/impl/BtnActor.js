import Actor from "@/actor/Actor";
class BtnActor extends Actor {
    constructor(data = {},clickFunc) {
        super(data)
        this.mass = 1
        this.width = data.width || 48
        this.height = data.height || 32
        this.text = data.text || "按钮"
        this.color = data.bgColor || "#102410"
        this.textColor = data.textColor ||"#fff"
        this.click = clickFunc
        this.init()
    }
    init(){
    }
    draw(ctx) {
        if(this.img){
            // 图片,起点x,起点y,图片内容的宽度，图片内容的高度
            ctx.drawImage(this.img, this.position.x,this.position.y, this.width, this.height);
        }else{
            ctx.fillStyle = this.color
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
        }
        ctx.fillStyle = this.textColor
        ctx.textAlign = "center"
        ctx.fillText(this.text, this.getTextDrawX(), this.getTextDrawY())
    }
    onclick(event) {
        this.click()
    }
    logic() {
    }
}

export default BtnActor