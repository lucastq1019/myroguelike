var Collision = {
    elastic: function (restitution) {
        this.restitution = restitution || .2;
    },

    displace: function () {

    }
};


var PhysicsEntity = function (collisionName, type) {

    this.type = type || PhysicsEntity.DYNAMIC;

    this.collision = collisionName || PhysicsEntity.ELASTIC;

    this.width = 20;
    this.height = 20;

    this.halfWidth = this.width * .5;
    this.halfHeight = this.height * .5;

    var collision = Collision[this.collision];
    collision.call(this);

    this.x = 0;
    this.y = 0;

    this.vx = 0;
    this.vy = 0;


    this.ax = 0;
    this.ay = 0;

    this.updateBounds();
};


PhysicsEntity.prototype = {

    updateBounds: function () {
        this.halfWidth = this.width * .5;
        this.halfHeight = this.height * .5;
    },

    getMidX: function () {
        return this.halfWidth + this.x;
    },

    getMidY: function () {
        return this.halfHeight + this.y;
    },


    getTop: function () {
        return this.y;
    },
    getLeft: function () {
        return this.x;
    },
    getRight: function () {
        return this.x + this.width;
    },
    getBottom: function () {
        return this.y + this.height;
    }
};

// 表示运动学物理实体，这种物理实体的运动不受重力和其他外力的影响，只受其自身速度的控制。
PhysicsEntity.KINEMATIC = 'kinematic';
// 表示动态物理实体，这种物理实体的运动受重力和其他外力的影响。
PhysicsEntity.DYNAMIC = 'dynamic';
//  表示位移碰撞类型，这种碰撞类型会使物理实体在碰撞时发生位移。
PhysicsEntity.DISPLACE = 'displace';
//  表示弹性碰撞类型，这种碰撞类型会使物理实体在碰撞时发生弹性反弹。
PhysicsEntity.ELASTIC = 'elastic';