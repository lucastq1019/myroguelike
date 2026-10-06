class AssetLoader {
  async loadImage(path: string): Promise<HTMLImageElement> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.statusText}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.src = url;
    await new Promise((resolve) => (image.onload = resolve));
    return image;
  }

  async loadSound(path: string): Promise<AudioBufferSourceNode>{
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load sound: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioContext.createBufferSource();
  }

  // 假设 loadFont 使用 FontFace API
  async loadFont(path: string): Promise<FontFace> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load font: ${response.statusText}`);
    }
    const blob = await response.blob();
    const font = new FontFace('fontName', URL.createObjectURL(blob));
    await font.load();
    return font;
  }
}

export default AssetLoader;