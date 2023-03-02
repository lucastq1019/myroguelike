
class Scene{
    constructor(game){
        this.game = game
        this.ctx = game.ctx
        this.width = game.width
        this.height = game.height
    }

    logic(){
    }
    draw(){
        throw new Error("请复写Scene的draw方法")
    }
    onclick(event){

    }
    keyEvent(event){

    }
}

export default Scene