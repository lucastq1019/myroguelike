class FreeList {
    constructor(name, max, constructor) {
        this.name = name;
        this.constructor = constructor;
        this.max = max;
        this.list = [];
    }
    alloc() {

        var obj =  this.list.length ? this.list.shift() : this.constructor.apply(this)
        obj.velocity = new Vector(random(-10, 10), random(-10, 10))
        obj.color = "RGB("+random(0,255)+","+random(0,255)+","+random(0,255)+")"
        return obj
    }
    free(obj) {
        if (this.list.length < this.max) {
            obj.opacity = 1
            this.list.push(obj)
        }
    }
}