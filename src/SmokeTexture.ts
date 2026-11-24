/** Generate a small, soft cloud once; animate cached sprites instead of per-frame noise. */
export function createSmokeSprite() {
  const sprite = document.createElement('canvas');
  sprite.width = 256; sprite.height = 160;
  const context = sprite.getContext('2d')!;
  const pixels = context.createImageData(sprite.width, sprite.height);
  const grid = new Float32Array(64 * 64);
  let seed = 7193;
  for (let i = 0; i < grid.length; i++) { seed = (seed * 16807) % 2147483647; grid[i] = seed / 2147483647; }
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x); const iy = Math.floor(y);
    let tx = x - ix; let ty = y - iy;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const a = grid[(iy & 63) * 64 + (ix & 63)];
    const b = grid[(iy & 63) * 64 + ((ix + 1) & 63)];
    const c = grid[((iy + 1) & 63) * 64 + (ix & 63)];
    const d = grid[((iy + 1) & 63) * 64 + ((ix + 1) & 63)];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const nx = x / sprite.width; const ny = y / sprite.height;
      const envelope = Math.pow(Math.max(0, 1 - ((nx - .5) / .5) ** 2), 2) * Math.pow(Math.max(0, 1 - ((ny - .5) / .5) ** 2), 2);
      const wisps = noise(nx * 5, ny * 4) * .55 + noise(nx * 13, ny * 10) * .3 + noise(nx * 27, ny * 20) * .15;
      const index = (y * sprite.width + x) * 4;
      pixels.data[index] = 147; pixels.data[index + 1] = 165; pixels.data[index + 2] = 186;
      pixels.data[index + 3] = Math.pow(Math.max(0, wisps - .18), .95) * envelope * 225;
    }
  }
  context.putImageData(pixels, 0, 0);
  return sprite;
}

