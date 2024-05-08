import AudioSource from './AudioSource';
import ComponentConfig from './ComponentConfig';


export default interface AudioComponentConfig extends ComponentConfig {
  audioSource: AudioSource;
}
