import Phaser from 'phaser';

const CREAM = [246, 238, 226];
const STRIPE = [214, 186, 142]; // a zebra's stripes go pale gold
const OUTLINE_MAX_LUM = 70;

/**
 * Easter egg (D132): a pale copy of an animal's sprite sheet, made once at runtime. Fur
 * becomes cream with its shading kept; dark marks inside the body turn gold; the outline
 * stays. Returns the new texture key.
 */
export function albinoTexture(scene: Phaser.Scene, key: string): string {
  const out = `${key}-albino`;
  if (scene.textures.exists(out) || !scene.textures.exists(key)) return out;
  const source = scene.textures.get(key);
  const img = source.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return key;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height);
  const px = data.data;
  const w = img.width;
  const alphaAt = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= w || y >= img.height ? 0 : (px[(y * w + x) * 4 + 3] ?? 0);
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if ((px[i + 3] ?? 0) === 0) continue;
      const lum = 0.3 * (px[i] ?? 0) + 0.59 * (px[i + 1] ?? 0) + 0.11 * (px[i + 2] ?? 0);
      const edge =
        alphaAt(x - 1, y) === 0 ||
        alphaAt(x + 1, y) === 0 ||
        alphaAt(x, y - 1) === 0 ||
        alphaAt(x, y + 1) === 0;
      if (lum < OUTLINE_MAX_LUM && edge) continue; // keep the outline
      const base = lum < OUTLINE_MAX_LUM ? STRIPE : CREAM;
      const shade = 0.7 + 0.3 * Math.min(1, lum / 180);
      px[i] = Math.round((base[0] ?? 0) * shade);
      px[i + 1] = Math.round((base[1] ?? 0) * shade);
      px[i + 2] = Math.round((base[2] ?? 0) * shade);
    }
  ctx.putImageData(data, 0, 0);
  const tex = scene.textures.addCanvas(out, canvas);
  if (!tex) return key;
  for (const name of source.getFrameNames()) {
    const f = source.get(name);
    tex.add(name, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
  }
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return out;
}
