"use client";

/**
 * Background removal for pictures, in the browser, with transformers.js (Apache-2.0). Nothing is sent to a server for it:
 * the model is downloaded from the Hugging Face hub the first time and then cached by the browser.
 *  - "best": ormbg (Apache-2.0), a general remover for any kind of subject: people, pets, objects (~45 MB, or ~90 MB on a graphics card, the first time)
 *  - "fast": MODNet (Apache-2.0), a small portrait model (~25 MB): quick, but it can cut away parts of a subject, or leave background in
 *  (BiRefNet was tried too: better edges, but it ran out of memory in the browser without a strong graphics card.)
 */
export type CutQuality = "best" | "fast";
type Raw = { data: Uint8ClampedArray; width: number; height: number; channels: number };
type Segmenter = (img: string) => Promise<Raw>;

/** which model file to use on the graphics card and on the processor (they differ, so a fallback never reuses a broken session) */
const MODELS: Record<CutQuality, { id: string; gpu: string; cpu: string }> = {
  best: { id: "onnx-community/ormbg-ONNX", gpu: "fp16", cpu: "uint8" },
  fast: { id: "Xenova/modnet", gpu: "fp32", cpu: "fp32" },
};
type Device = "webgpu" | "wasm";
const loading: Partial<Record<string, Promise<Segmenter>>> = {};
/** the graphics card when the browser offers one (much faster); it falls back to the processor if the card can't run the model */
let gpuOk: boolean | null = null;

/** a graphics card that can run the half-precision model (it needs the "shader-f16" feature; without it the model fails to run) */
async function hasGpu() {
  if (gpuOk !== null) return gpuOk;
  const nav = typeof navigator === "undefined" ? null : (navigator as unknown as { gpu?: { requestAdapter: () => Promise<{ features: Set<string> } | null> } });
  const adapter = nav?.gpu ? await nav.gpu.requestAdapter().catch(() => null) : null;
  gpuOk = !!adapter?.features?.has("shader-f16");
  return gpuOk;
}

function segmenter(q: CutQuality, device: Device): Promise<Segmenter> {
  const key = `${q}:${device}`;
  loading[key] ??= (async () => {
    const { pipeline } = await import("@huggingface/transformers"); // loaded only when someone asks for it
    const dtype = device === "webgpu" ? MODELS[q].gpu : MODELS[q].cpu;
    return (await pipeline("background-removal", MODELS[q].id, { dtype, device } as never)) as unknown as Segmenter;
  })().catch((err) => {
    delete loading[key]; // let a later click try again
    throw err;
  });
  return loading[key]!;
}

async function segment(src: string, q: CutQuality): Promise<Raw> {
  const href = new URL(src, window.location.href).href;
  if (await hasGpu()) {
    try {
      return await (await segmenter(q, "webgpu"))(href);
    } catch (err) {
      console.warn("The graphics card could not run the background remover; using the processor instead.", err);
      gpuOk = false;
    }
  }
  return (await segmenter(q, "wasm"))(href);
}

/** The picture with the model's cut-out mask in its alpha channel (kept in memory, so the edge can be tuned without running the model again). */
export type Cutout = { data: Uint8ClampedArray; width: number; height: number };

export async function cutOut(src: string, q: CutQuality): Promise<Cutout> {
  const out = await segment(src, q);
  // always RGBA
  if (out.channels === 4) return { data: out.data, width: out.width, height: out.height };
  const rgba = new Uint8ClampedArray(out.width * out.height * 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += out.channels) {
    rgba[i] = out.data[j];
    rgba[i + 1] = out.data[j + 1] ?? out.data[j];
    rgba[i + 2] = out.data[j + 2] ?? out.data[j];
    rgba[i + 3] = out.channels > 3 ? out.data[j + 3] : 255;
  }
  return { data: rgba, width: out.width, height: out.height };
}

/** Turn a cut-out into a PNG. `keep` from -100 (remove more) to 100 (keep more) bends the mask:
 *  keeping more brings back faint parts of the subject the model was unsure about; removing more clears leftover background. */
export async function toPng(c: Cutout, keep: number): Promise<Blob> {
  const g = Math.pow(2, -keep / 50); // 0.25 … 4: below 1 lifts faint areas, above 1 sinks them
  const lut = new Uint8ClampedArray(256);
  for (let a = 0; a < 256; a++) lut[a] = Math.round(Math.pow(a / 255, g) * 255);
  const px = new Uint8ClampedArray(c.data);
  for (let i = 3; i < px.length; i += 4) px[i] = lut[px[i]];
  const canvas = document.createElement("canvas");
  canvas.width = c.width;
  canvas.height = c.height;
  canvas.getContext("2d")!.putImageData(new ImageData(px, c.width, c.height), 0, 0);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not make the picture"))), "image/png"));
}
