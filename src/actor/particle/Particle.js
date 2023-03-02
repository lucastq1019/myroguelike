class Particle extends Actor {
    constructor() {
        super({width:5,height:5})
        // this.velocity = new Vector(random(-4, 2), random(-6, -1));
        this.velocity = new Vector(random(-10, 10), random(-10, 0));
        this.position = new Vector()
        this.color = '#feca57'
        this.opacity = 1
        this.horizontalVelocity = new Vector()
        this.verticalAcceleration = new Vector(0, 0.6)
    }

    setPosition(x, y) {
        this.position.x = x
        this.position.y = y
    }
    setColor(color){
        this.color = color
    }

    applyForce = (force) => {
        this.velocity.add(force.clone().div(this.mass));
    }

    logic() {
        this.horizontalVelocity.add(new Vector(0,0))
        this.opacity -= 0.02;
        this.velocity.add(this.verticalAcceleration);
        this.position.add(Vector.add(this.velocity, this.horizontalVelocity));
        this.opacity = Math.max(this.opacity, 0);
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        ctx.restore();
    }
}