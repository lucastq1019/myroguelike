Engine.prototype.step = function(elapsed) {
    // 计算重力加速度
    var gx = GRAVITY_X * elapsed;
    var gy = GRAVITY_Y * elapsed;
    var entity;
    var entities = this.entities;

    // 遍历实体
    for (var i = 0, length = entities.length; i < length; i++) {
        entity = entities[i];
        switch (entity.type) {
            case PhysicsEntity.DYNAMIC:
                // 计算动态实体的速度和位置
                entity.vx += entity.ax * elapsed + gx;
                entity.vy += entity.ay * elapsed + gy;
                entity.x  += entity.vx * elapsed;
                entity.y  += entity.vy * elapsed;
                break;
            case PhysicsEntity.KINEMATIC:
                // 计算静态实体的速度和位置
                entity.vx += entity.ax * elapsed;
                entity.vy += entity.ay * elapsed;
                entity.x  += entity.vx * elapsed;
                entity.y  += entity.vy * elapsed;
                break;
        }
    }

    // 检测碰撞
    var collisions = this.collider.detectCollisions(
        this.player,
        this.collidables
    );

    // 如果有碰撞，则解决碰撞
    if (collisions != null) {
        this.solver.resolve(this.player, collisions);
    }
};