/**
 * Smart Hardware Device Fingerprint Generator
 * Menghasilkan identitas perangkat yang stabil dan persisten untuk kepatuhan
 * Device Binding (Anti-Titip Absen) OutsourceTrack & KPI Pro Disdik HST.
 */

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'no-webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 'standard-gl';
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return typeof renderer === 'string' ? renderer : 'gl-render';
  } catch (e) {
    return 'gl-fallback';
  }
}

export function getDeviceFingerprint(): string {
  // 1. Cek penyimpanan persisten terlebih dahulu
  const cached = localStorage.getItem('ot_device_id');
  if (cached && cached.trim().length > 6) {
    return cached.trim();
  }

  // 2. Kumpulkan atribut hardware unik smartphone/perangkat
  const screenSpec = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}@${window.devicePixelRatio || 1}`;
  const cpuSpec = `cores:${navigator.hardwareConcurrency || 4}`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Makassar';
  const rawPlatform = (navigator.platform || 'linux').toLowerCase().replace(/[^a-z0-9]/g, '');
  const userAgent = navigator.userAgent || '';
  const gpuSpec = getWebGLRenderer();

  const combinedSpecs = `${rawPlatform}::${screenSpec}::${cpuSpec}::${timeZone}::${gpuSpec}::${userAgent}`;
  const hash1 = simpleHash(combinedSpecs);
  const hash2 = simpleHash(combinedSpecs.split('').reverse().join(''));

  const generatedId = `dev-${rawPlatform.slice(0, 10)}-${hash1}${hash2}`;

  // Simpan ke localStorage agar konsisten di sesi berikutnya
  try {
    localStorage.setItem('ot_device_id', generatedId);
  } catch (e) {}

  return generatedId;
}
