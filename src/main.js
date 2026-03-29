import { initWebGPU, createBlurPipeline } from './webgpu.js';
import {
  SIZES,
  BLUR_RADIUS,
  MEASURED_RUNS,
  runCanvas2DBenchmark,
  runWebGPUBenchmark,
} from './benchmark.js';

// --- UI references ---
const runBtn       = document.getElementById('run-btn');
const skip4kInput  = document.getElementById('skip-4k');
const progressEl   = document.getElementById('progress');
const progressText = document.getElementById('progress-text');
const progressBar  = document.getElementById('progress-bar');
const resultsEl    = document.getElementById('results');
const resultsBody  = document.getElementById('results-body');
const resultsNote  = document.getElementById('results-note');
const deviceInfo   = document.getElementById('device-info');
const adapterInfo  = document.getElementById('adapter-info');

// --- State ---
let gpuDevice   = null;
let blurPipeline = null;
let webGPUError  = null;

// --- Init WebGPU on load ---
async function setupWebGPU() {
  try {
    const { device, adapterInfo: info } = await initWebGPU();
    gpuDevice    = device;
    blurPipeline = createBlurPipeline(device);

    deviceInfo.classList.remove('hidden');
    const descriptionRow = info.description
      ? `<dt>Description</dt> <dd>${info.description}</dd>`
      : '';

    adapterInfo.innerHTML = `
      <dt>Vendor</dt>       <dd>${info.vendor       || '—'}</dd>
      <dt>Architecture</dt> <dd>${info.architecture || '—'}</dd>
      ${descriptionRow}
    `;
  } catch (err) {
    webGPUError = err.message;
  }
}

// --- Helpers ---
function setProgress(text, value, max = 100) {
  progressText.textContent = text;
  progressBar.max   = max;
  progressBar.value = value;
}

function formatMs(ms) {
  return ms < 1 ? `${ms.toFixed(2)}ms` : `${ms.toFixed(1)}ms`;
}

function speedup(canvas2dMs, webgpuMs) {
  if (!webgpuMs) return '—';
  const ratio = canvas2dMs / webgpuMs;
  return ratio >= 1 ? `${ratio.toFixed(1)}×` : `${(1 / ratio).toFixed(1)}× slower`;
}

function addRow(label, pixels, canvas2dMs, webgpuMs) {
  const row = document.createElement('tr');
  const megapixels = (pixels / 1_000_000).toFixed(1);
  row.innerHTML = `
    <td>${label}</td>
    <td>${megapixels} MP</td>
    <td>${formatMs(canvas2dMs)}</td>
    <td>${webgpuMs !== null ? formatMs(webgpuMs) : '<span class="na">N/A</span>'}</td>
    <td>${webgpuMs !== null ? speedup(canvas2dMs, webgpuMs) : '—'}</td>
  `;
  resultsBody.appendChild(row);
}

// --- Main benchmark runner ---
async function runBenchmark() {
  runBtn.disabled = true;
  resultsBody.innerHTML = '';
  resultsEl.classList.remove('hidden');
  progressEl.classList.remove('hidden');

  const skip4k = skip4kInput.checked;
  const sizes = skip4k ? SIZES.filter(s => !s.heavy) : SIZES;

  const totalSteps = sizes.length * 2 * MEASURED_RUNS;
  let completedSteps = 0;

  for (const { label, width, height } of sizes) {
    const pixels = width * height;

    // --- Canvas 2D ---
    setProgress(`Canvas 2D · ${label}…`, completedSteps, totalSteps);

    const canvas2dMs = await runCanvas2DBenchmark(width, height, (run) => {
      completedSteps++;
      setProgress(
        `Canvas 2D · ${label} · run ${run}/${MEASURED_RUNS}`,
        completedSteps, totalSteps,
      );
    });

    // --- WebGPU ---
    let webgpuMs = null;
    if (gpuDevice && blurPipeline) {
      setProgress(`WebGPU · ${label}…`, completedSteps, totalSteps);

      webgpuMs = await runWebGPUBenchmark(gpuDevice, blurPipeline, width, height, (run) => {
        completedSteps++;
        setProgress(
          `WebGPU · ${label} · run ${run}/${MEASURED_RUNS}`,
          completedSteps, totalSteps,
        );
      });
    } else {
      completedSteps += MEASURED_RUNS;
    }

    addRow(label, pixels, canvas2dMs, webgpuMs);
  }

  progressEl.classList.add('hidden');

  const note = [
    `Gaussian blur · radius ${BLUR_RADIUS} · median of ${MEASURED_RUNS} iterations`,
    webGPUError ? `WebGPU unavailable: ${webGPUError}` : null,
  ].filter(Boolean).join(' · ');

  resultsNote.textContent = note;
  runBtn.disabled = false;
}

// --- Boot ---
setupWebGPU();
runBtn.addEventListener('click', runBenchmark);
