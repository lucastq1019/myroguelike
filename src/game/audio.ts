/**
 * 音效（Web Audio API，程序生成）
 *
 * 无需音频资源文件，用振荡器 + 增益包络合成简单音效。
 * 无 AudioContext 环境（测试/SSR）时静默降级。
 *
 * 音效类型：跳跃 / 攻击 / 命中 / 受伤 / 死亡 / 升级 / 冲刺。
 */
export type SoundName = 'jump' | 'attack' | 'hit' | 'hurt' | 'death' | 'upgrade' | 'dash' | 'land';

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
}

/** 全局音效管理器（单例） */
export const audio = new AudioManager();
