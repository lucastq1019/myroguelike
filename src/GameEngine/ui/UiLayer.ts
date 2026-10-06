/**
 * UI 控件体系（画布内轻量 GUI）
 *
 * 移植自旧 GameEngine 的 `core/objects/Panel|UIButton|DialogPanel` 设计：
 *   - 控件自带**命中检测** `hitTest(x, y)`（旧版 `isInside()`）
 *   - 控件自带 `onClick` 回调（旧版 `Clickable` 接口）
 *   - 控件支持 `enabled` 禁用态（旧版无，新增）
 *
 * 为什么不是 ECS：
 *   UI 数量少（个位数）、事件驱动、有层级结构 —— 属于「不该 ECS 化」的部分
 *   （见 README 架构设计）。因此保留轻量 OOP，但**统一到一套控件抽象**，
 *   替代原先 hud.ts / screen.ts 里手写矩形 + 手算命中区的做法。
 *
 * 用法：
 *   const ui = new UiLayer();
 *   ui.begin();
 *   const btn = ui.button({ id: 'reroll', x, y, w, h, label: '刷新', enabled: true });
 *   ui.end();                       // end() 后自动计算命中区域
 *   ui.hitTest('reroll', mx, my)    // → boolean
 *   ui.hit(mx, my)                  // → 命中的控件（含 onClick）
 */

/** 控件基类 */
export abstract class Widget {
  readonly id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 是否可点击（禁用态置灰且不响应命中） */
  enabled: boolean;
  /** 点击回调（可选） */
  onClick?: () => void;
  /** 是否已绘制（未绘制的控件不参与命中检测） */
  visible = true;

  constructor(opts: WidgetOptions) {
    this.id = opts.id;
    this.x = opts.x;
    this.y = opts.y;
    this.w = opts.w;
    this.h = opts.h;
    this.enabled = opts.enabled ?? true;
    this.onClick = opts.onClick;
  }

  /** 命中检测：点 (px, py) 是否落在控件内（禁用态不响应） */
  hitTest(px: number, py: number): boolean {
    if (!this.enabled || !this.visible) return false;
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }

  /** 中心点 */
  get centerX(): number {
    return this.x + this.w / 2;
  }
  get centerY(): number {
    return this.y + this.h / 2;
  }
}

export interface WidgetOptions {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled?: boolean;
  onClick?: () => void;
}

/** 纯命中区域（无绘制）—— 用于卡片等自定义绘制的可点击区域 */
export class HitArea extends Widget {
  /** 附带的任意负载（如卡片 index） */
  payload: unknown;
  constructor(opts: WidgetOptions & { payload?: unknown }) {
    super(opts);
    this.payload = opts.payload;
  }
}

/** 按钮 */
export interface ButtonOptions extends WidgetOptions {
  label: string;
  /** 强调色（边框 + 文字） */
  accent?: string;
  /** 字号 */
  fontSize?: number;
}

export class Button extends Widget {
  label: string;
  accent: string;
  fontSize: number;

  constructor(opts: ButtonOptions) {
    super(opts);
    this.label = opts.label;
    this.accent = opts.accent ?? '#4ec9b0';
    this.fontSize = opts.fontSize ?? 14;
  }

  /** 绘制按钮（禁用态置灰） */
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this;
    ctx.fillStyle = this.enabled ? '#1e1e1e' : '#161616';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = this.enabled ? this.accent : '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = this.enabled ? this.accent : '#666';
    ctx.font = `bold ${this.fontSize}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, x + w / 2, y + h / 2 + 1);
  }
}

/** 面板（容器 + 背景 + 可选标题） */
export interface PanelOptions extends WidgetOptions {
  /** 背景色 */
  background?: string;
  /** 边框色（省略则不画边框） */
  border?: string;
  /** 标题 */
  title?: string;
  /** 标题颜色 */
  titleColor?: string;
}

export class Panel extends Widget {
  background: string;
  border?: string;
  title?: string;
  titleColor: string;
  /** 子控件 */
  children: Widget[] = [];

  constructor(opts: PanelOptions) {
    super(opts);
    this.background = opts.background ?? '#1e1e1e';
    this.border = opts.border;
    this.title = opts.title;
    this.titleColor = opts.titleColor ?? '#4ec9b0';
  }

  add(child: Widget): this {
    this.children.push(child);
    return this;
  }

  /** 绘制面板本身（不含子控件） */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.background;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    if (this.border) {
      ctx.strokeStyle = this.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, this.y, this.w, this.h);
    }
    if (this.title) {
      ctx.fillStyle = this.titleColor;
      ctx.font = 'bold 22px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.title, this.centerX, this.y + 28);
    }
  }

  /** 命中检测：自身或任一子控件命中 */
  override hitTest(px: number, py: number): boolean {
    if (!this.enabled || !this.visible) return false;
    if (super.hitTest(px, py)) return true;
    return this.children.some((c) => c.hitTest(px, py));
  }
}

/**
 * UI 层：收集一帧内的控件，统一做命中检测。
 *
 * 每帧 `begin()` → 注册/绘制控件 → `end()`。
 * `hitTest(id, x, y)` / `hit(x, y)` 在 `end()` 之后可用。
 */
export class UiLayer {
  private widgets: Widget[] = [];
  private byId = new Map<string, Widget>();

  /** 开始新一帧 */
  begin(): void {
    this.widgets = [];
    this.byId.clear();
  }

  /** 注册一个已构造的控件 */
  add<T extends Widget>(w: T): T {
    this.widgets.push(w);
    this.byId.set(w.id, w);
    return w;
  }

  /** 创建并注册按钮 */
  button(opts: ButtonOptions): Button {
    return this.add(new Button(opts));
  }

  /** 创建并注册面板 */
  panel(opts: PanelOptions): Panel {
    return this.add(new Panel(opts));
  }

  /** 创建并注册纯命中区域（卡片等） */
  hitArea(opts: WidgetOptions & { payload?: unknown }): HitArea {
    return this.add(new HitArea(opts));
  }

  /** 结束一帧（预留：可做布局校验/裁剪） */
  end(): void {
    // 目前无需后处理；保留钩子以便将来加布局校验
  }

  /** 按 id 命中检测 */
  hitTest(id: string, px: number, py: number): boolean {
    const w = this.byId.get(id);
    return w ? w.hitTest(px, py) : false;
  }

  /** 返回命中的最上层控件（后注册者优先） */
  hit(px: number, py: number): Widget | null {
    for (let i = this.widgets.length - 1; i >= 0; i--) {
      const w = this.widgets[i];
      if (w.hitTest(px, py)) return w;
    }
    return null;
  }

  /** 命中并触发 onClick，返回是否命中 */
  click(px: number, py: number): boolean {
    const w = this.hit(px, py);
    if (!w) return false;
    w.onClick?.();
    return true;
  }

  /** 当前帧所有控件（调试/测试用） */
  all(): Widget[] {
    return this.widgets;
  }

  /** 按 id 取控件 */
  get(id: string): Widget | undefined {
    return this.byId.get(id);
  }
}

export default UiLayer;
