import input from "@/common/InputHandler"
import keyCode from "@/common/KeyConstants"

export class State {
    constructor(actor) {
        this.actor = actor
    }

    enter() {
        throw new Error("请实现此方法")
    }
    handleInput() {
        throw new Error("请实现此方法")
    }
}

export class IdleState extends State {
    constructor(actor) {
        super(actor)
    }
    enter() {
        this.actor.velocity.x = 0
        this.actor.velocity.y = 0
        this.actor.stateName = "idle"
    }

    handleInput() {
        const keys = input.keys
        switch (keys[keys.length - 1]) {
            case keyCode.w:
            case keyCode.s:
                break;
            case keyCode.a:
            case keyCode.d:
                this.actor.setState(this.actor.runState)
                break;
            case keyCode.j:
            case keyCode.k:
            case keyCode.l:
            case keyCode.i:
                break;

            default:
        }
    }
}

export class RunState extends State {
    constructor(actor) {
        super(actor)
    }
    enter() {
        this.actor.stateName = "run"
    }
    handleInput() {
        const keys = input.keys
        switch (keys[keys.length - 1]) {
            case keyCode.w:
            case keyCode.s:
                break;
            case keyCode.a:
                this.actor.velocity.x = -this.actor.speed
                break;
            case keyCode.d:
                this.actor.velocity.x = this.actor.speed
                break;
            case keyCode.j:
            case keyCode.k:
            case keyCode.l:
            case keyCode.i:
                break;

            default:
                this.actor.setState(this.actor.idleState)
        }
    }
}

export class JumpState extends State {
    constructor(actor) {
        super(actor)
    }
    enter() {
        this.actor.stateName = "jump"
    }
    handleInput() {
        const keys = input.keys
        switch (keys[keys.length - 1]) {
            case keyCode.w:
            case keyCode.s:
                break;
            case keyCode.a:
                this.actor.velocity.x = -this.actor.speed
                break;
            case keyCode.d:
                this.actor.velocity.x = this.actor.speed
                break;
            case keyCode.j:
            case keyCode.k:
            case keyCode.l:
            case keyCode.i:
                break;

            default:
                this.actor.setState(this.actor.idleState)
        }
    }
}

export class DownState extends State {
    constructor(actor) {
        super(actor)
    }
    enter() {
        this.actor.stateName = "down"
        this.actor.velocity.y += 0.5
    }
    handleInput() {
        const keys = input.keys
        switch (keys[keys.length - 1]) {
            case keyCode.w:
            case keyCode.s:
                break;
            case keyCode.a:
                this.actor.velocity.x = -this.actor.speed
                break;
            case keyCode.d:
                this.actor.velocity.x = this.actor.speed
                break;
            case keyCode.j:
            case keyCode.k:
            case keyCode.l:
            case keyCode.i:
                break;

            default:
        }
    }
}