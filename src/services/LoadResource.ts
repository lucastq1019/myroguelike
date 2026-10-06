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
  const imagePromises = Object.keys(assets.images).map((key) => {
    return assetLoader.loadImage(assets.images[key]).then((image) => [key, image]);
  });

  // 加载音频资源
  const soundPromises = Object.keys(assets.sounds).map((key) => {
    return assetLoader.loadSound(assets.sounds[key]).then((sound) => [key, sound]);
  });

  // 加载字体资源（假设 AssetLoader 提供了 loadFont 方法）
  const fontPromises = Object.keys(assets.fonts).map((key) => {
    return assetLoader.loadFont(assets.fonts[key]).then((font) => [key, font]);
  });

  // 等待所有资源加载完成
  const [loadedImages, loadedSounds, loadedFonts] = await Promise.all([
    Promise.all(imagePromises),
    Promise.all(soundPromises),
    Promise.all(fontPromises),
  ]);

  // 将加载完成的资源注入到 GameEngine 或相关组件中
  const resources = {
    images: Object.fromEntries(Array.from(loadedImages)),
    sounds: Object.fromEntries(Array.from(loadedSounds)),
    fonts: Object.fromEntries(Array.from(loadedFonts)),
  };

  // 假设 GameEngine 提供了 addResources 方法用于接收资源
  // gameEngine.addResources(resources);

  // 或者将资源注入到具体的游戏对象、场景等组件中
  // ... 根据您的游戏架构进行资源分配

  // 资源组装完成，可以开始游戏逻辑
}
