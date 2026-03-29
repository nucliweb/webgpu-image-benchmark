# WebGPU vs Canvas 2D — Image Blur Benchmark

**[Live demo →](https://webgpu-image-benchmark.vercel.app/)**

Companion benchmark for the article **[Image processing in the browser with WebGPU](https://joanleon.dev/en/webgpu-image-processing)** on [joanleon.dev](https://joanleon.dev).

Measures the real performance difference between Canvas 2D (CPU) and WebGPU (GPU) when applying a Gaussian blur to images at different resolutions. Results are specific to your device and browser — run it yourself to see how your hardware compares.

## What it measures

- **Algorithm:** box blur (approximation of Gaussian blur), radius 5
- **Resolutions:** 800×600, 1920×1080, 3840×2160 (4K optional)
- **Methodology:** 1 warmup run + 5 measured runs, median reported
- **WebGPU:** pipeline compiled once before measuring (shader compilation excluded)

## Run locally

```bash
npm run dev
```

Then open `http://localhost:3000`.

Requires a static file server because ES modules don't work over `file://`. Any server works — `npx serve .`, `python -m http.server`, VS Code Live Server, etc.

## Browser support

| Browser | WebGPU |
|---------|--------|
| Chrome / Edge 113+ | ✅ |
| Safari 18+ | ✅ |
| Firefox | 🧪 Experimental (flag) |

On browsers without WebGPU, only the Canvas 2D results are shown.

## Author

[Joan León](https://joanleon.dev) · [@nucliweb](https://github.com/nucliweb)
