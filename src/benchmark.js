import { blurCanvas2D } from './canvas2d.js';
import { blurWebGPU } from './webgpu.js';

export const SIZES = [
  { label: '800×600',   width: 800,  height: 600  },
  { label: '1920×1080', width: 1920, height: 1080 },
  { label: '3840×2160', width: 3840, height: 2160, heavy: true },
];

export const BLUR_RADIUS   = 5;
export const WARMUP_RUNS   = 1;
export const MEASURED_RUNS = 5;

/**
 * Returns the median of a numeric array.
 *
 * @param {number[]} values
 * @returns {number}
 */
export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Generates a test ImageBitmap of the given size using OffscreenCanvas.
 * Uses a gradient so every pixel has a distinct value.
 *
 * @param {number} width
 * @param {number} height
 * @returns {ImageBitmap}
 */
export function generateImageBitmap(width, height) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0,   '#e63946');
  gradient.addColorStop(0.5, '#2a9d8f');
  gradient.addColorStop(1,   '#457b9d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.transferToImageBitmap();
}

/**
 * Generates a test ImageData of the given size.
 *
 * @param {number} width
 * @param {number} height
 * @returns {ImageData}
 */
export function generateImageData(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0,   '#e63946');
  gradient.addColorStop(0.5, '#2a9d8f');
  gradient.addColorStop(1,   '#457b9d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return ctx.getImageData(0, 0, width, height);
}

/**
 * Runs the Canvas 2D blur benchmark for a given size.
 *
 * @param {number} width
 * @param {number} height
 * @param {function} onProgress - called after each measured run
 * @returns {number} median time in ms
 */
export async function runCanvas2DBenchmark(width, height, onProgress) {
  const imageData = generateImageData(width, height);
  const times = [];

  for (let i = 0; i < WARMUP_RUNS + MEASURED_RUNS; i++) {
    const t0 = performance.now();
    blurCanvas2D(imageData, BLUR_RADIUS);
    const elapsed = performance.now() - t0;

    if (i >= WARMUP_RUNS) {
      times.push(elapsed);
      onProgress?.(i - WARMUP_RUNS + 1, MEASURED_RUNS);
    }

    // Yield to the event loop so the UI can update between iterations
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return median(times);
}

/**
 * Runs the WebGPU blur benchmark for a given size.
 * Pipeline must be pre-compiled to avoid measuring shader compilation time.
 *
 * @param {GPUDevice} device
 * @param {GPUComputePipeline} pipeline
 * @param {number} width
 * @param {number} height
 * @param {function} onProgress - called after each measured run
 * @returns {number} median time in ms
 */
export async function runWebGPUBenchmark(device, pipeline, width, height, onProgress) {
  const imageBitmap = generateImageBitmap(width, height);
  const times = [];

  for (let i = 0; i < WARMUP_RUNS + MEASURED_RUNS; i++) {
    const t0 = performance.now();
    await blurWebGPU(device, pipeline, imageBitmap);
    const elapsed = performance.now() - t0;

    if (i >= WARMUP_RUNS) {
      times.push(elapsed);
      onProgress?.(i - WARMUP_RUNS + 1, MEASURED_RUNS);
    }
  }

  imageBitmap.close();
  return median(times);
}
