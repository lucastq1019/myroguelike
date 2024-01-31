
// 解析弹性碰撞
resolveElastic = function (player, entity) {
    // 获取玩家的中点坐标
    var pMidX = player.getMidX();
    var pMidY = player.getMidY();
    // 获取实体的中点坐标
    var aMidX = entity.getMidX();
    var aMidY = entity.getMidY();

    // 计算两点的差值
    var dx = (aMidX - pMidX) / entity.halfWidth;
    var dy = (aMidY - pMidY) / entity.halfHeight;

    // 计算x轴和y轴的绝对值
    var absDX = abs(dx);
    var absDY = abs(dy);

    // 如果x轴和y轴的差值小于0.1，则表示是弹性碰撞
    if (abs(absDX - absDY) < .1) {
        // 如果x轴的差值小于0，表示实体在玩家的右边
        if (dx < 0) {

            player.x = entity.getRight();

        } else {

            player.x = entity.getLeft() - player.width;
        }

        // 如果y轴的差值小于0，表示实体在玩家的下边
        if (dy < 0) {

            player.y = entity.getBottom();

        } else {

            player.y = entity.getTop() - player.height;
        }

        // 计算x轴和y轴的速度
        if (Math.random() < .5) {

            player.vx = -player.vx * entity.restitution;
            if (abs(player.vx) < STICKY_THRESHOLD) {
                player.vx = 0;
            }
        } else {

            player.vy = -player.vy * entity.restitution;
            if (abs(player.vy) < STICKY_THRESHOLD) {
                player.vy = 0;
            }
        }

    } else if (absDX > absDY) {

        // 如果x轴的差值大于y轴的差值，表示实体在玩家的右边
        if (dx < 0) {
            player.x = entity.getRight();

        } else {
            player.x = entity.getLeft() - player.width;
        }

        // 计算x轴的速度
        player.vx = -player.vx * entity.restitution;

        if (abs(player.vx) < STICKY_THRESHOLD) {
            player.vx = 0;
        }

    } else {

        // 如果y轴的差值大于x轴的差值，表示实体在玩家的下边
        if (dy < 0) {
            player.y = entity.getBottom();

        } else {
            player.y = entity.getTop() - player.height;
        }

        // 计算y轴的速度
        player.vy = -player.vy * entity.restitution;
        if (abs(player.vy) < STICKY_THRESHOLD) {
            player.vy = 0;
        }
    }
};