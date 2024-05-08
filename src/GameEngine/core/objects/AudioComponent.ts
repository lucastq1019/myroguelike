// AudioComponent.ts
import  Component from './Component';
import AudioSource from './AudioSource';
import AudioComponentConfig from './AudioComponentConfig';

export class AudioComponent extends Component {
  audioSource: AudioSource;

  constructor(config: AudioComponentConfig) {
    super(config);
    this.audioSource = config.audioSource;
  }

  playSound() {
    this.audioSource.play();
  }

  stopSound() {
    this.audioSource.stop();
  }

  setVolume(volume: number) {
    this.audioSource.setVolume(volume);
  }

  update() {
    // 可能需要根据游戏逻辑更新音频状态，例如循环播放、淡入淡出等
  }
}