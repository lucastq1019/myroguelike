class ElasticResolver {
    resolve(player, entity) {
        //找到实体和玩家的中点
        var pMidX = player.getMidX();
        var pMidY = player.getMidY();
        var aMidX = entity.getMidX();
        var aMidY = entity.getMidY();

        // 根据归一化边长计算的边长
        var dx = (aMidX - pMidX) / entity.halfWidth;
        var dy = (aMidY - pMidY) / entity.halfHeight;

        // 计算x和y的绝值
        var absDX = abs(dx);
        var absDY = abs(dy);

        // 如果归一化的x和y位置之间的距离小于一个小阈值(;1在这个例子中)那么这个物体从一个角落靠近
        if (abs(absDX - absDY) < .1) {

            //如果玩家正从X方向靠近
            if (dx < 0) {

                //将玩家x设置到右侧
                player.x = entity.getRight();

                //如果玩家从负X方向靠近
            } else {

                //将玩家x设置到左边
                player.x = entity.getLeft() - player.width;
            }

            //如果玩家从正Y方向靠近
            if (dy < 0) {

                //设置玩家y到底部
                player.y = entity.getBottom();

                //如果玩家从负Y方向靠近
            } else {

                // 设置玩家y为顶部
                player.y = entity.getTop() - player.height;
            }

            // 随机选择一个x/y方向反射速度
            if (Math.random() < .5) {

                // 反映速度的降低速率
                player.vx = -player.vx * entity.restitution;

                // STICKY_THRESHOLD is set to .0004
                // 如果物体的速度接近0，将其设置为0
                if (abs(player.vx) < STICKY_THRESHOLD) {
                    player.vx = 0;
                }
            } else {

                player.vy = -player.vy * entity.restitution;
                if (abs(player.vy) < STICKY_THRESHOLD) {
                    player.vy = 0;
                }
            }

            //如果物体从侧面靠近
        } else if (absDX > absDY) {

            //如果玩家正从X方向靠近
            if (dx < 0) {
                player.x = entity.getRight();

            } else {
                //如果玩家从负X方向靠近
                player.x = entity.getLeft() - player.width;
            }

            //如果玩家从负X方向靠近
            player.vx = -player.vx * entity.restitution;

            if (abs(player.vx) < STICKY_THRESHOLD) {
                player.vx = 0;
            }

            //如果这个碰撞来自顶部或底部
        } else {

            //如果玩家从正Y方向靠近
            if (dy < 0) {
                player.y = entity.getBottom();

            } else {
                //如果玩家从负Y方向靠近
                player.y = entity.getTop() - player.height;
            }

            //如果玩家从负Y方向靠近
            player.vy = -player.vy * entity.restitution;
            if (abs(player.vy) < STICKY_THRESHOLD) {
                player.vy = 0;
            }
        }
    }
}

export default ElasticResolver;