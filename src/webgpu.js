const BLUR_SHADER = /* wgsl */`
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let size   = vec2<i32>(textureDimensions(inputTex));
  let coords = vec2<i32>(i32(id.x), i32(id.y));

  if (coords.x >= size.x || coords.y >= size.y) { return; }

  let radius: i32 = 5;
  var color = vec4<f32>(0.0);
  var count: f32 = 0.0;

  for (var ky: i32 = -radius; ky <= radius; ky++) {
    for (var kx: i32 = -radius; kx <= radius; kx++) {
      let sample = clamp(coords + vec2<i32>(kx, ky), vec2<i32>(0), size - 1);
      color += textureLoad(inputTex, sample, 0);
      count += 1.0;
    }
  }

  textureStore(outputTex, coords, color / count);
}
`;

/**
 * Initialises WebGPU and returns the device and adapter info.
 * Throws if WebGPU is not available.
 *
 * @returns {{ device: GPUDevice, adapterInfo: GPUAdapterInfo }}
 */
export async function initWebGPU() {
  if (!navigator.gpu) throw new Error('WebGPU not supported');

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No GPU adapter found');

  const device = await adapter.requestDevice();
  const adapterInfo = adapter.info;

  return { device, adapterInfo };
}

/**
 * Compiles the blur compute pipeline once.
 * Reuse this across all benchmark iterations to avoid measuring shader compilation.
 *
 * @param {GPUDevice} device
 * @returns {GPUComputePipeline}
 */
export function createBlurPipeline(device) {
  const module = device.createShaderModule({ code: BLUR_SHADER });
  return device.createComputePipeline({
    layout: 'auto',
    compute: { module, entryPoint: 'main' },
  });
}

/**
 * Applies the blur shader to an ImageBitmap via a compute pass.
 * Measures: texture upload + dispatch + GPU sync.
 *
 * @param {GPUDevice} device
 * @param {GPUComputePipeline} pipeline
 * @param {ImageBitmap} imageBitmap
 */
export async function blurWebGPU(device, pipeline, imageBitmap) {
  const { width, height } = imageBitmap;

  const inputTexture = device.createTexture({
    size: [width, height],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: inputTexture },
    [width, height],
  );

  const outputTexture = device.createTexture({
    size: [width, height],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: inputTexture.createView() },
      { binding: 1, resource: outputTexture.createView() },
    ],
  });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16));
  pass.end();

  device.queue.submit([encoder.finish()]);
  await device.queue.onSubmittedWorkDone();

  inputTexture.destroy();
  outputTexture.destroy();
}
