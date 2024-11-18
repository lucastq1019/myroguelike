import GameObject from './GameObject';

// Component.ts

export default interface ComponentConfig {
  onClick: () => void;
  name: string;
  gameObject: GameObject;
}
