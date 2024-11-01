function random(min, max) {
    return Math.random() * (max - min) + min;
}

function buildDataKey(x, y) {
    return x+","+y;
}


export {random,buildDataKey}