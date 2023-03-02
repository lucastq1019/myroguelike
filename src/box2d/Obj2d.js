var Collision = {
    elastic: function(restitution) {
        this.restitution = restitution || .2;
    },

    displace: function() {
      
    }
};


var PhysicsEntity = function(collisionName, type) {

    this.type = type || PhysicsEntity.DYNAMIC;

    this.collision = collisionName || PhysicsEntity.ELASTIC;

    this.width  = 20;
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

    updateBounds: function() {
        this.halfWidth = this.width * .5;
        this.halfHeight = this.height * .5;
    },

    getMidX: function() {
        return this.halfWidth + this.x;
    },

    getMidY: function() {
        return this.halfHeight + this.y;
    },


    getTop: function() {
        return this.y;
    },
    getLeft: function() {
        return this.x;
    },
    getRight: function() {
        return this.x + this.width;
    },
    getBottom: function() {
        return this.y + this.height;
    }
};

// Constants

// Engine Constants

// These constants represent the 3 different types of
// entities acting in this engine
// These types are derived from Box2D's engine that
// model the behaviors of its own entities/bodies

// Kinematic entities are not affected by gravity, and
// will not allow the solver to solve these elements
// These entities will be our platforms in the stage
PhysicsEntity.KINEMATIC = 'kinematic';

// Dynamic entities will be completely changing and are
// affected by all aspects of the physics system
PhysicsEntity.DYNAMIC   = 'dynamic';

// Solver Constants

// These constants represent the different methods our
// solver will take to resolve collisions

// The displace resolution will only move an entity
// outside of the space of the other and zero the
// velocity in that direction
PhysicsEntity.DISPLACE = 'displace';

// The elastic resolution will displace and also bounce
// the colliding entity off by reducing the velocity by
// its restituion coefficient
PhysicsEntity.ELASTIC = 'elastic';