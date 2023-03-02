class TestScene extends Scene {
    constructor(ctx) {
        super(ctx)
        this.uiGroup = []
        this.particleGroup = []
        this.particles = new FreeList("particles", 1000, function () {
            var particle = new Particle()
            return particle
        })

        this.initActor()
        this.initParticleGroup()
    }
    initActor() {
        console.log(this.width, this.height)
        // this.uiGroup.push(new ImgActor(
        //     {
        //         x: this.width / 2, y: this.height / 2,
        //         width: 50, height: 40, imgPath:"canvasUtils/resource/img/2.png"
        //     }
        // ))
    }
    initParticleGroup(x = this.width / 2, y = this.height / 2) {
        var i = 50;
        while (i-- > 0) {
            new Particle()
            var particle = this.particles.alloc()
            particle.setPosition(x, y)
            this.particleGroup.push(particle)
        }
    }

    logic() {
        this.uiGroup.forEach(actor => {
            actor.logic()
        });
        var tempArray = []
        this.particleGroup.forEach(actor => {
            actor.logic()
            if (actor.opacity == 0) {
                this.particles.free(actor)
            } else {
                tempArray.push(actor)
            }

        });
        this.particleGroup = tempArray
    }
    draw() {
        this.ctx.fillStyle = "#000"
        this.ctx.fillRect(0, 0, this.width, this.height)
        this.uiGroup.forEach(actor => {
            actor.draw(this.ctx)
        })
        this.particleGroup.forEach(actor => {
            actor.draw(this.ctx)
        })
    }
    onclick(event) {
        var x = event.offsetX;
        var y = event.offsetY;
        this.initParticleGroup(x, y)
        console.log(this.particleGroup)
        this.uiGroup.forEach(actor => {
            if (actor.isInternal(x, y)) {
                actor.onclick(event)
            }
        })
    }
}