import GameEngine from '../GameEngine/GameEngine';
import AssetLoader from './AssetLoader';

// 假设 assets 是一个包含资源路径的对象
interface Assets {
  images: Record<string, string>;
  sounds: Record<string, string>;
  fonts: Record<string, string>;
}

async function assembleGameContent(gameEngine: GameEngine, assets: Assets) {
  // 创建一个 AssetLoader 实例
  const assetLoader = new AssetLoader();

  // 加载图像资源
  const imagePromises = Object.entries(assets.images).map(([key, path]) => {
    return assetLoader.loadImage(path).then((image) => ({ key, image }));
  });

  // 加载音频资源
  const soundPromises = Object.entries(assets.sounds).map(([key, path]) => {
    return assetLoader.loadSound(path).then((sound) => ({ key, sound }));
  });

  // 加载字体资源（假设 AssetLoader 提供了 loadFont 方法）
  const fontPromises = Object.entries(assets.fonts).map(([key, path]) => {
    return assetLoader.loadFont(path).then((font) => ({ key, font }));
  });

  // 等待所有资源加载完成
  const [loadedImages, loadedSounds, loadedFonts] = await Promise.all([
    Promise.all(imagePromises),
    Promise.all(soundPromises),
    Promise.all(fontPromises),
  ]);

  // 将加载完成的资源注入到 GameEngine 或相关组件中
  const resources = {
    images: Object.fromEntries(loadedImages),
    sounds: Object.fromEntries(loadedSounds),
    fonts: Object.fromEntries(loadedFonts),
  };

  // 假设 GameEngine 提供了 addResources 方法用于接收资源
  gameEngine.addResources(resources);

  // 或者将资源注入到具体的游戏对象、场景等组件中
  // ... 根据您的游戏架构进行资源分配

  // 资源组装完成，可以开始游戏逻辑
}

// 示例用法
const gameEngine = new GameEngine();
const assets: Assets = {
  images: {
    hero: 'path/to/hero.png',
    enemy: 'path/to/enemy.png',
    // ...
  },
  sounds: {
    jump: 'path/to/jump.wav',
    hit: 'path/to/hit.mp3',
    // ...
  },
  fonts: {
    mainTitle: 'path/to/main-title.ttf',
    // ...
  },
};

assembleGameContent(gameEngine, assets).catch((error) => {
  console.error('Failed to assemble game content:', error);
});