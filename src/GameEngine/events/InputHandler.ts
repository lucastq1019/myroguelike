class InputHandler {
    private keys: string[];
    private mousePosition: { x: number, y: number };
    private mouseButtons: { [key: number]: boolean };

    constructor() {
        this.keys = [];
        this.mousePosition = { x: 0, y: 0 };
        this.mouseButtons = {};

        window.addEventListener("keydown", this.handleKeyDown.bind(this));
        window.addEventListener("keyup", this.handleKeyUp.bind(this));
        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
        window.addEventListener("mouseup", this.handleMouseUp.bind(this));
        window.addEventListener("mousedown", this.handleMouseDown.bind(this));
    }

    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.keys.some((pressedKey) => pressedKey === event.key)) {
            this.keys.push(event.key);
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        const index = this.keys.indexOf(event.key);
        if (index !== -1) {
            this.keys.splice(index, 1);
        }
    }

    private handleMouseUp(event: MouseEvent): void {
        this.mouseButtons[event.button] = false;
    }

    private handleMouseDown(event: MouseEvent): void {
        this.mouseButtons[event.button] = true;
    }

    private handleMouseMove(event: MouseEvent): void {
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
    }

    /**
     * 检查是否按下了指定的键
     * @param {string} key 要检查的键名
     * @returns {boolean} 返回是否按下了指定的键
     */
    isKeyPressed(key: string): boolean {
        return this.keys.some((pressedKey) => pressedKey === key);
    }

    /**
     * 检查是否按下了指定的鼠标按钮
     * @param {number} button 要检查的鼠标按钮编号（0: 左键, 1: 中键, 2: 右键）
     * @returns {boolean} 返回是否按下了指定的鼠标按钮
     */
    isMouseButtonPressed(button: number): boolean {
        return this.mouseButtons[button] || false;
    }

    /**
     * 获取当前鼠标的位置
     * @returns {{ x: number, y: number }} 当前鼠标的位置
     */
    getMousePosition(): { x: number, y: number } {
        return this.mousePosition;
    }

    /**
     * 清除所有已记录的按键状态
     */
    clearKeys(): void {
        this.keys.length = 0;
        this.mouseButtons = {};
    }
}

export default InputHandler;