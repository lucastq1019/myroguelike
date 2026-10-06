/**
 * 音效（Web Audio API，程序生成）
 *
 * 无需音频资源文件，用振荡器 + 增益包络合成简单音效。
 * 无 AudioContext 环境（测试/SSR）时静默降级。
 *
 * 音效类型：跳跃 / 攻击 / 命中 / 受伤 / 死亡 / 升级 / 冲刺。
 */
export type SoundName =
  | 'jump' | 'attack' | 'hit' | 'hurt' | 'death' | 'upgrade' | 'dash' | 'land'
  | 'coin' | 'pickup' | 'reroll' | 'unlock';

interface ToneSpec {
  type: OscillatorType;
  freq: number;
  /** 频率终点（滑音），省略则不滑 */
  freqEnd?: number;
  duration: number;
  volume: number;
}

const SPECS: Record<SoundName, ToneSpec> = {
  jump: { type: 'square', freq: 320, freqEnd: 620, duration: 0.12, volume: 0.12 },
  attack: { type: 'sawtooth', freq: 480, freqEnd: 220, duration: 0.09, volume: 0.1 },
  hit: { type: 'square', freq: 200, freqEnd: 90, duration: 0.08, volume: 0.14 },
  hurt: { type: 'sawtooth', freq: 180, freqEnd: 70, duration: 0.18, volume: 0.16 },
  death: { type: 'sawtooth', freq: 300, freqEnd: 50, duration: 0.5, volume: 0.2 },
  upgrade: { type: 'sine', freq: 520, freqEnd: 880, duration: 0.25, volume: 0.16 },
  dash: { type: 'triangle', freq: 700, freqEnd: 300, duration: 0.12, volume: 0.1 },
  land: { type: 'square', freq: 140, freqEnd: 80, duration: 0.06, volume: 0.08 },
  coin: { type: 'square', freq: 880, freqEnd: 1320, duration: 0.09, volume: 0.1 },
  pickup: { type: 'sine', freq: 620, freqEnd: 940, duration: 0.14, volume: 0.13 },
  reroll: { type: 'triangle', freq: 420, freqEnd: 700, duration: 0.1, volume: 0.1 },
  unlock: { type: 'sine', freq: 480, freqEnd: 960, duration: 0.3, volume: 0.16 },
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterVolume = 0.5;

  /** 懒初始化 AudioContext（需在用户交互后调用，浏览器策略） */
  private ensureCtx(): AudioContext | null {
    if (!this.enabled) return null;
    if (this.ctx) return this.ctx;
    try {
      const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** 用户首次交互后调用，解锁音频上下文 */
  unlock(): void {
    const ctx = this.ensureCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** 播放音效 */
  play(name: SoundName): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const spec = SPECS[name];
    if (!spec) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.freq, now);
      if (spec.freqEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.freqEnd), now + spec.duration);
      }

      // 音量包络（快速起音 + 衰减）
      const vol = spec.volume * this.masterVolume;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + spec.duration + 0.02);
    } catch {
      /* 忽略音频错误，不影响游戏 */
    }
  }

  // ============ 音频资源（按 id 播放音频文件） ============
  // 移植自旧 GameEngine 的 `engines/AudioEngine`（registerAudioSource + playAudio(id)）：
  // 支持加载音频文件（AudioBuffer）并按 id 播放；无 AudioContext 时静默降级。

  /** 已加载的音频资源：id → AudioBuffer */
  private buffers = new Map<string, AudioBuffer>();
  /** 正在播放的循环音源：id → AudioBufferSourceNode */
  private loops = new Map<string, AudioBufferSourceNode>();

  /**
   * 注册一个已解码的音频缓冲。
   * 测试环境可直接注入，无需真实解码。
   */
  registerBuffer(id: string, buffer: AudioBuffer): void {
    this.buffers.set(id, buffer);
  }

  /**
   * 从 URL 加载音频文件并注册为 id。
   * 无 AudioContext / fetch 失败时返回 false（静默降级，不抛错）。
   */
  async load(id: string, url: string): Promise<boolean> {
    const ctx = this.ensureCtx();
    if (!ctx) return false;
    try {
      const res = await fetch(url);
      if (!res.ok) return false;
      const arr = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);
      this.buffers.set(id, buf);
      return true;
    } catch {
      return false;
    }
  }

  /** 是否已加载某音频资源 */
  has(id: string): boolean {
    return this.buffers.has(id);
  }

  /** 已加载的音频 id 列表 */
  loadedIds(): string[] {
    return [...this.buffers.keys()];
  }

  /**
   * 按 id 播放音频资源。
   * @param volume 相对音量（0~1，默认 1）
   * @param loop   是否循环（循环音源可用 stopLoop 停止）
   * @returns 是否成功播放
   */
  playResource(id: string, volume = 1, loop = false): boolean {
    const ctx = this.ensureCtx();
    if (!ctx) return false;
    const buf = this.buffers.get(id);
    if (!buf) return false;

    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = loop;
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume)) * this.masterVolume;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      if (loop) this.loops.set(id, src);
      return true;
    } catch {
      return false;
    }
  }

  /** 停止某个循环音源 */
  stopLoop(id: string): boolean {
    const src = this.loops.get(id);
    if (!src) return false;
    try {
      src.stop();
    } catch {
      /* 已停止 */
    }
    this.loops.delete(id);
    return true;
  }

  /** 停止所有循环音源 */
  stopAllLoops(): void {
    for (const id of [...this.loops.keys()]) this.stopLoop(id);
  }

  /** 清空已加载资源（测试/切场景用） */
  clearResources(): void {
    this.stopAllLoops();
    this.buffers.clear();
  }
}

/** 全局音效管理器（单例） */
export const audio = new AudioManager();
