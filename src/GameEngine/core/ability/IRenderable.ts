import CanvasManager from '../../renderer/CanvasManager';


export default interface IRenderable {
    render(canvasManager: CanvasManager): void;
}