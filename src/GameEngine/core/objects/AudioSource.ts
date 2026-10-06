// AudioSource.ts
export default class AudioSource {
  audioClip: any; // 这可能是AudioClip或类似对象
  isPlaying!: boolean;
  volume: number;
  id: string;
  constructor(audioClip: any, id: string,volume: number) {
    this.audioClip = audioClip;
    this.id = id;
    this.volume = volume;
  }
  // ...其他音频属性和方法

  play() {
    // 实现播放音频逻辑
  }

  stop() {
    // 实现停止音频逻辑
  }

  setVolume(volume: number) {
    // 设置音量
  }
}