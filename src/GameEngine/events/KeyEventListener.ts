class InputHandler {
    private keys: string[];

    constructor() {
        this.keys = [];
        window.addEventListener("keydown", this.handleKeyDown.bind(this));
        window.addEventListener("keyup", this.handleKeyUp.bind(this));
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

    /**
     * 检查是否按下了指定的键
     * @param {string} key 要检查的键名
     * @returns {boolean} 返回是否按下了指定的键
     */
    isKeyPressed(key: string): boolean {
        return this.keys.some((pressedKey) => pressedKey === key);
    }

    /**
     * 清除所有已记录的按键状态
     */
    clearKeys(): void {
        this.keys.length = 0;
    }
}

export default InputHandler;