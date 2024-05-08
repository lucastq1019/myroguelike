// AudioEngine.ts
import  AudioSource from 'core/objects/AudioSource';
export default class AudioEngine {
  private audioSources: Map<string, AudioSource> = new Map();

  // 单例模式，确保只有一个AudioEngine实例
  private static _instance: AudioEngine;

  static getInstance(): AudioEngine {
    if (!this._instance) {
      this._instance = new AudioEngine();
    }
    return this._instance;
  }

  private constructor() {
    // 初始化音频引擎，例如设置音频设备、初始化音频上下文等
  }

  /**
   * 添加AudioSource到管理器
   * @param audioSource 音频源实例
   */
  public registerAudioSource(audioSource: AudioSource) {
    this.audioSources.set(audioSource.id, audioSource);
  }

  /**
   * 根据ID播放音频
   * @param audioId 音频源的ID
   */
  public playAudio(audioId: string) {
    const audioSource = this.audioSources.get(audioId);
    if (audioSource) {
      audioSource.play();
    } else {
      console.error(`Audio with ID ${audioId} not found.`);
    }
  }

  /**
   * 根据ID停止音频
   * @param audioId 音频源的ID
   */
  public stopAudio(audioId: string) {
    const audioSource = this.audioSources.get(audioId);
    if (audioSource) {
      audioSource.stop();
    } else {
      console.error(`Audio with ID ${audioId} not found.`);
    }
  }

  // ...其他音频管理方法，如淡入淡出、音量控制等
}
