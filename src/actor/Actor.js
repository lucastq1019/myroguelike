import Vector from "@/common/Vector";
// 演员类
class Actor {
    constructor({x,y,width,height,img}) {
        this.velocity = new Vector()
        this.position = new Vector(x, y)
        this.width = width || 50
        this.height = height || 50
        this.img = this.initImg(img)
    }
    draw(ctx) {
        throw new Error("请重写该类的draw方法" + this)
    }
    logic() {
    }
    initImg(path){
        if(path){
            let tempImp = new Image(this.width,this.height)
            tempImp.src = path
            return tempImp
        }
        return undefined
    }
    isInternal(x, y) {
        if (x < this.position.x) {
            return false
        }
        if (y < this.position.y) {
            return false
        }
        if (x > this.position.x + this.width) {
            return false
        }
        if (y > this.position.y + this.height) {
            return false
        }
        return true
    }
    getTextDrawX() {
        return this.position.x + this.width / 2
    }
    getTextDrawY() {
        return this.position.y + this.height / 2
    }
    applyForce = (force) => {
        this.velocity.add(force.clone().div(this.mass));
    }
    
}


export default Actor