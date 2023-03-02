import game from "./Game"
import "./main.css"

let lastTime = 1;
(function animloop(timestamp) {
    const deltalTime = timestamp - lastTime;
    lastTime = timestamp
    game.frameRun(deltalTime)
    window.requestAnimationFrame(animloop);
})(0);