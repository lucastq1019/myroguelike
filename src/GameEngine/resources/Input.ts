/**
 * Input —— 输入资源
 *
 * 输入是「全局单例数据」（Resource），由系统通过 world.getResource(Input) 读取。
 * 绑定 DOM 键鼠事件，提供移动轴、鼠标位置、按键/鼠标状态。
 *
 * 按键方案（横版动作平台）：
 *   - 移动：A / D（或 ← / →）
 *   - 跳跃 / 二段跳：K
 *   - 攻击：J
 *   - 冲刺：L
 *   - 远程射击：U
 *   - 下穿平台：S（或 ↓）+ K
 */
export class Input {
  private keys = new Set<string>();
  /** 鼠标位置（屏幕坐标） */
  mouseX = 0;
  mouseY = 0;
  /** 鼠标左键是否按下 */
  mouseDown = false;
  /** 本帧是否发生「点击」（按下瞬间） */
  mouseClicked = false;

  /** 本帧是否按下跳跃键 K（边沿触发，按下瞬间为 true） */
  jumpPressed = false;
  /** 跳跃键 K 是否按住（可变高度跳跃用） */
  jumpHeld = false;
  private jumpWasDown = false;

  /** 本帧是否按下冲刺键 L（边沿触发） */
  dashPressed = false;
  private dashWasDown = false;

  /** 本帧是否按下攻击键 J（边沿触发） */
  attackPressed = false;
  private attackWasDown = false;

  /** 本帧是否按下远程射击键 U（边沿触发） */
  firePressed = false;
  private fireWasDown = false;

  /** 绑定 DOM 事件 */
  attach(target: HTMLElement | Window = window): void {
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    const el = target as HTMLElement;
    el.addEventListener('mousemove', (e: Event) => {
      const me = e as MouseEvent;
      this.mouseX = me.clientX;
      this.mouseY = me.clientY;
    });
    el.addEventListener('mousedown', (e: Event) => {
      const me = e as MouseEvent;
      if (me.button === 0) {
        this.mouseDown = true;
        this.mouseClicked = true;
      }
    });
    el.addEventListener('mouseup', (e: Event) => {
      const me = e as MouseEvent;
      if (me.button === 0) this.mouseDown = false;
    });
  }

  isDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  /** 跳跃键 K 是否按住 */
  private isJumpDown(): boolean {
    return this.isDown('k');
  }

  /** 冲刺键 L 是否按住 */
  private isDashDown(): boolean {
    return this.isDown('l');
  }

  /** 攻击键 J 是否按住 */
  private isAttackDown(): boolean {
    return this.isDown('j');
  }

  /** 远程射击键 U 是否按住 */
  private isFireDown(): boolean {
    return this.isDown('u');
  }

  /** 下方向键是否按住（S / ↓），用于下穿平台 */
  isDownHeld(): boolean {
    return this.isDown('s') || this.isDown('arrowdown');
  }

  /** 取水平移动轴（A/D / 方向键），-1 左，1 右，0 不动 */
  getMoveX(): number {
    let x = 0;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;
    return x;
  }

  /** 取移动方向（WASD / 方向键），已归一化（保留兼容旧代码） */
  getMoveAxis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;
    if (this.isDown('w') || this.isDown('arrowup')) y -= 1;
    if (this.isDown('s') || this.isDown('arrowdown')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 0) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  /** 每帧末尾调用：更新各按键的边沿触发状态，清除「本帧点击」标记 */
  endFrame(): void {
    this.mouseClicked = false;

    // 跳跃：边沿触发（本帧按下）+ 按住状态
    const jumpDown = this.isJumpDown();
    this.jumpPressed = jumpDown && !this.jumpWasDown;
    this.jumpHeld = jumpDown;
    this.jumpWasDown = jumpDown;

    // 冲刺：边沿触发
    const dashDown = this.isDashDown();
    this.dashPressed = dashDown && !this.dashWasDown;
    this.dashWasDown = dashDown;

    // 攻击：边沿触发
    const attackDown = this.isAttackDown();
    this.attackPressed = attackDown && !this.attackWasDown;
    this.attackWasDown = attackDown;

    // 远程射击：边沿触发
    const fireDown = this.isFireDown();
    this.firePressed = fireDown && !this.fireWasDown;
    this.fireWasDown = fireDown;
  }
}
