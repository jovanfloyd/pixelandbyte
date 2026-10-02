import * as THREE from 'three';
import { StickerConfig } from '../types/cube';
import { isWikiMediaUrl, resolveAnyImageUrl } from './imageUrlResolver';

// In-memory cache of generated textures
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates a high-fidelity 512x512 sticker texture with:
 * 1. Base image
 * 2. Authentic face color filter overlay (e.g., yellow filter for yellow face)
 * 3. Rounded speedcube sticker corners
 * 4. Realistic specular sheen / gloss
 * 5. High-contrast border
 */
export function generateStickerTexture(
  sticker: StickerConfig,
  faceColor: string,
  globalOpacity = 0.42,
  onLoaded?: () => void
): THREE.CanvasTexture {
  const cacheKey = `${sticker.id}-${faceColor}-${sticker.filterOpacity ?? globalOpacity}-${sticker.imageUrl}`;

  const cached = textureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  textureCache.set(cacheKey, texture);

  const drawPlaceholder = () => {
    ctx.clearRect(0, 0, 512, 512);

    // Full square base color fill
    ctx.fillStyle = faceColor;
    ctx.fillRect(0, 0, 512, 512);

    // Label with larger typography
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 10;
    ctx.fillText(sticker.title || 'Cargando...', 256, 256);

    texture.needsUpdate = true;
  };

  drawPlaceholder();

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.clearRect(0, 0, 512, 512);

    const w = 512;
    const h = 512;

    // 1. Draw image with object-fit: cover occupying 100% of the square
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let sWidth = img.width;
    let sHeight = img.height;
    let sx = 0;
    let sy = 0;

    if (imgRatio > boxRatio) {
      sWidth = img.height * boxRatio;
      sx = (img.width - sWidth) / 2;
    } else {
      sHeight = img.width / boxRatio;
      sy = (img.height - sHeight) / 2;
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, w, h);

    // 2. Color tint filter overlay occupying full square (face colored filter)
    const effectiveColor = sticker.colorFilter || faceColor;
    const opacity = sticker.filterOpacity !== undefined ? sticker.filterOpacity : globalOpacity;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = effectiveColor;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // 3. Subtle edge shadow vignette
    const gradVignette = ctx.createRadialGradient(256, 256, 160, 256, 256, 256);
    gradVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradVignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = gradVignette;
    ctx.fillRect(0, 0, w, h);

    // 4. Subtle glossy sheen highlight across upper part
    const sheen = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.38)');
    sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h * 0.55);

    // 5. Scrim banner at bottom for prominent, larger title
    const bannerH = 110;
    const bannerGrad = ctx.createLinearGradient(0, 512 - bannerH, 0, 512);
    bannerGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bannerGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.65)');
    bannerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
    ctx.fillStyle = bannerGrad;
    ctx.fillRect(0, 512 - bannerH, w, bannerH);

    // Title in larger typography (NO subtitle)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillText(sticker.title, 256, 512 - 46);

    // 6. Perimeter fine border
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.strokeRect(0, 0, w, h);

    texture.needsUpdate = true;
    if (onLoaded) {
      onLoaded();
    }
  };

  img.onerror = () => {
    // If anonymous CORS failed, retry without crossOrigin attribute
    if (img.crossOrigin) {
      img.crossOrigin = null as unknown as string;
      img.src = sticker.imageUrl;
      return;
    }
    // Graceful fallback if custom URL fails to load
    drawPlaceholder();
  };

  // Check if it's a Wikipedia / Wikimedia media URL that needs resolving
  if (isWikiMediaUrl(sticker.imageUrl)) {
    resolveAnyImageUrl(sticker.imageUrl).then((res) => {
      img.src = res.imageUrl || sticker.imageUrl;
    }).catch(() => {
      img.src = sticker.imageUrl;
    });
  } else {
    img.src = sticker.imageUrl;
  }

  return texture;
}

/**
 * Clears cached textures (e.g. after batch update)
 */
export function invalidateTextureCache() {
  textureCache.clear();
}
