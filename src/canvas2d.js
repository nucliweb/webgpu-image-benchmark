/**
 * Box blur implementation using Canvas 2D API (CPU).
 * Processes each pixel by averaging its neighbors within the given radius.
 *
 * @param {ImageData} imageData - source image data (read-only, not mutated)
 * @param {number} radius - blur radius in pixels
 * @returns {ImageData} new blurred image data
 */
export function blurCanvas2D(imageData, radius) {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const nx = Math.max(0, Math.min(width - 1, x + kx));
          const ny = Math.max(0, Math.min(height - 1, y + ky));
          const i = (ny * width + nx) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }

      const i = (y * width + x) * 4;
      output[i]     = r / count;
      output[i + 1] = g / count;
      output[i + 2] = b / count;
      output[i + 3] = data[i + 3];
    }
  }

  return new ImageData(output, width, height);
}
