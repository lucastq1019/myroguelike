

import Actor from "@/actor/Actor";
class BgActor extends Actor{
    constructor(data){
        super(data)
        this.text = data.text|| "无名"
    }
    draw(ctx){
        ctx.fillText(this.text,this.left+this.height/2,this.top+this.width/2)
    }
}
export default BgActor