import CollisionDetector from "./CollisionDetector"
import ResolveElastic from './ResolveElastic';
var World2d = function (vec2) {
    // 横向摩檫力,重力
    this.GLOBAL_VEC = vec2
    this.entities = []
    this.collidables=[]
    this.collider = new  CollisionDetector()
}
World2d.prototype.step = function (dt) {
    // dt 为游戏的帧数的时间间隔
    var gx = this.GLOBAL_VEC.x * dt;
    var gy = this.GLOBAL_VEC.y * dt;
    var entity;
    var entities = this.entities;

    for (var i = 0, length = entities.length; i < length; i++) {
        entity = entities[i];
        switch (entity.type) {
            case PhysicsEntity.DYNAMIC:
                entity.vx += entity.ax * dt + gx;
                entity.vy += entity.ay * dt + gy;
                entity.x += entity.vx * dt;
                entity.y += entity.vy * dt;
                break;
            case PhysicsEntity.KINEMATIC:
                entity.vx += entity.ax * dt;
                entity.vy += entity.ay * dt;
                entity.x += entity.vx * dt;
                entity.y += entity.vy * dt;
                break;
        }
    }

    var collisions = this.collider.detectCollisions(
        this.player,
        this.collidables
    );

    if (collisions != null) {
        this.solver.resolve(this.player, collisions);
    }
};
World2d.prototype.addEntity = function(entity) {
    this.entities.push(entity);
};
World2d.prototype.addPlayer = function(player) {
    this.player = player
};
World2d.prototype.solver = new ResolveElastic()
export default World2d