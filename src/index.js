// import game from "./Game"
import GameEngine from "./GameEngine/GameEngine.js"
import Platfrom from "./assets/code/Platfrom.js";
import "./main.css"
let gameEngine = new GameEngine()

gameEngine.sceneManager.currentScene.addElement(new Platfrom(gameEngine,100,100,100,100))
let lastTime = 1;
(function animloop(timestamp) {
    const deltalTime = timestamp - lastTime;
    lastTime = timestamp
    gameEngine.update(deltalTime)
    gameEngine.render()
    window.requestAnimationFrame(animloop);
})(0);