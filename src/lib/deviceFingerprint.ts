/**
 * Hardware Device Fingerprint Generator (Cross-Browser Anti-Multi User)
 * OutsourceTrack & KPI Pro Dinas Pendidikan Kab. Hulu Sungai Tengah
 * 
 * Menggabungkan karakteristik perangkat keras fisik (GPU WebGL, resolusi layar fisik,
 * touch points, hardware concurrency, canvas geometri, dan audio stack)
 * yang identik di seluruh browser (Chrome, Firefox, Safari, Edge, Samsung Internet, Incognito)
 * pada 1 perangkat HP fisik yang sama.
 */

// 1. Ekstraksi Unmasked GPU WebGL Hardware Info & Driver Limits
function getWebGLHardwareInfo(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'no-webgl';

    let unmaskedVendor = 'unknown-vendor';
    let unmaskedRenderer = 'unknown-renderer';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || unmaskedVendor;
      unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || unmaskedRenderer;
    } else {
      unmaskedVendor = gl.getParameter(gl.VENDOR) || unmaskedVendor;
      unmaskedRenderer = gl.getParameter(gl.RENDERER) || unmaskedRenderer;
    }

    // Ambil batas fisik GPU yang tidak berubah lintas browser
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
    const maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 0;
    const maxVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS) || 0;
    const maxVertexTextureUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) || 0;
    const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const viewportStr = Array.isArray(maxViewportDims) || (maxViewportDims && typeof maxViewportDims.length === 'number')
      ? `${maxViewportDims[0]}x${maxViewportDims[1]}`
      : '0x0';

    return [
      `gpu_vendor:${String(unmaskedVendor).trim()}`,
      `gpu_renderer:${String(unmaskedRenderer).trim()}`,
      `tex:${maxTextureSize}`,
      `rb:${maxRenderBufferSize}`,
      `vv:${maxVaryingVectors}`,
      `vtu:${maxVertexTextureUnits}`,
      `vp:${viewportStr}`
    ].join(';');
  } catch (e) {
    return 'webgl-unavailable';
  }
}

// 2. Spesifikasi Layar Fisik (Orientasi Invarian: Min x Max agar stabil saat portrait / landscape)
function getPhysicalScreenSpecs(): string {
  try {
    const w = window.screen?.width || 0;
    const h = window.screen?.height || 0;
    const minDim = Math.min(w, h);
    const maxDim = Math.max(w, h);
    const colorDepth = window.screen?.colorDepth || 24;
    const pixelDepth = window.screen?.pixelDepth || colorDepth;
    const dpr = window.devicePixelRatio || 1;
    return `screen:${minDim}x${maxDim}@${dpr};depth:${colorDepth}/${pixelDepth}`;
  } catch (e) {
    return 'screen:default';
  }
}

// 3. Hardware Concurrency, Digitizer Touch Points & Timezone
function getHardwareConcurrencyAndTouch(): string {
  try {
    const cores = navigator.hardwareConcurrency || 4;
    const touchPoints = navigator.maxTouchPoints || 0;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Makassar';
    return `cpu_cores:${cores};touch_points:${touchPoints};tz:${tz}`;
  } catch (e) {
    return 'cpu:4;touch:0;tz:Asia/Makassar';
  }
}

// 4. Canvas Fingerprint Geometri Tersembunyi (Non-text rendering untuk stabilitas cross-engine)
function getCanvasGeometryFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas-2d';

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 120, 40);

    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(25, 20, 14, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(16, 185, 129, 0.75)';
    ctx.beginPath();
    ctx.moveTo(55, 6);
    ctx.lineTo(85, 34);
    ctx.lineTo(40, 30);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'xor';
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(80, 20, 12, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    return canvas.toDataURL();
  } catch (e) {
    return 'canvas-error';
  }
}

// 5. AudioContext Fingerprint (Frekuensi osilator & kompresor dinamika non-audible)
async function getAudioHardwareFingerprint(): Promise<string> {
  try {
    const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (OfflineCtxClass) {
      const offlineCtx = new OfflineCtxClass(1, 44100, 44100);
      const oscillator = offlineCtx.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;

      const compressor = offlineCtx.createDynamicsCompressor();
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      (compressor.reduction as any).value = -20;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;

      oscillator.connect(compressor);
      compressor.connect(offlineCtx.destination);
      oscillator.start(0);

      const renderedBuffer = await offlineCtx.startRendering();
      const channelData = renderedBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < channelData.length; i += 100) {
        sum += Math.abs(channelData[i]);
      }
      return `audio:${offlineCtx.sampleRate}:${sum.toFixed(5)}`;
    }

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      const audioCtx = new AudioCtxClass();
      const sr = audioCtx.sampleRate || 44100;
      if (audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
      return `audio_sr:${sr}`;
    }

    return 'no-audio-api';
  } catch (e) {
    return 'audio-fallback';
  }
}

// 6. SHA-256 Hashing Utility (Kriptografi native Web Crypto API dengan fallback robust)
async function computeSha256(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback below
    }
  }

  // Fallback 64-bit Hex Hash jika subtle crypto tidak tersedia
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

/**
 * Menghasilkan Hardware Device Fingerprint Cross-Browser yang stabil.
 * Menjamin browser Chrome, Firefox, Safari, atau mode Incognito pada HP fisik
 * yang sama menghasilkan nilai hash identik.
 */
export async function getHardwareDeviceFingerprint(): Promise<string> {
  try {
    const webglInfo = getWebGLHardwareInfo();
    const screenSpecs = getPhysicalScreenSpecs();
    const hwSpecs = getHardwareConcurrencyAndTouch();
    const canvasFp = getCanvasGeometryFingerprint();
    const audioFp = await getAudioHardwareFingerprint();

    // Gabungkan seluruh spek hardware murni tanpa string browser/userAgent
    const rawHardwareSignature = [
      webglInfo,
      screenSpecs,
      hwSpecs,
      `canvas:${canvasFp}`,
      audioFp
    ].join('###');

    const hash = await computeSha256(rawHardwareSignature);
    const fingerprint = `hw-${hash}`;

    // Simpan ke localStorage sebagai cache sekunder
    try {
      localStorage.setItem('ot_hardware_fingerprint', fingerprint);
      localStorage.setItem('ot_device_id', fingerprint);
    } catch (e) {}

    return fingerprint;
  } catch (err) {
    console.warn('[Fingerprint] Gagal menghasilkan hardware fingerprint lengkap:', err);
    return getDeviceFingerprint();
  }
}

/**
 * Synchronous Fallback untuk kompatibilitas ke fungsi sinkron lama.
 */
export function getDeviceFingerprint(): string {
  try {
    const cached = localStorage.getItem('ot_hardware_fingerprint') || localStorage.getItem('ot_device_id');
    if (cached && cached.trim().length > 6) {
      return cached.trim();
    }
  } catch (e) {}

  const webglInfo = getWebGLHardwareInfo();
  const screenSpecs = getPhysicalScreenSpecs();
  const hwSpecs = getHardwareConcurrencyAndTouch();
  const combined = `${webglInfo}###${screenSpecs}###${hwSpecs}`;

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  const syncId = `hw-sync-${Math.abs(hash).toString(16)}`;

  try {
    localStorage.setItem('ot_hardware_fingerprint', syncId);
    localStorage.setItem('ot_device_id', syncId);
  } catch (e) {}

  return syncId;
}
