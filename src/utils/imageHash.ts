import { DailyWorkReport, AiDuplicateFlag } from '../types';

/**
 * Compute Perceptual Difference Hash (dHash) & Average Hash (aHash)
 * from an Image Data URL or SVG Data URL using an HTML5 Canvas.
 */
export async function computeImagePerceptualHash(
  imageDataUrl: string
): Promise<{ hash: string; shortHash: string; featureVector: number[] }> {
  return new Promise((resolve) => {
    // If running in environment without Image or Canvas, fallback deterministically
    if (typeof window === 'undefined' || !imageDataUrl) {
      const fallbackHash = generateDeterministicHash(imageDataUrl || 'empty');
      resolve({
        hash: fallbackHash,
        shortHash: fallbackHash.substring(0, 10),
        featureVector: [0.5, 0.5, 0.5, 0.5],
      });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 16; // 16x16 grid for high-precision 256-bit perceptual fingerprint
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        // Render resized image to canvas
        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        // Convert to grayscale luminance array
        const grays: number[] = [];
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Standard ITU-R BT.601 luminance
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          grays.push(gray);
          sum += gray;
        }

        const avg = sum / grays.length;

        // 1. dHash (Difference Hash): compare adjacent horizontal pixels
        let dHashBits = '';
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size - 1; x++) {
            const left = grays[y * size + x];
            const right = grays[y * size + (x + 1)];
            dHashBits += left > right ? '1' : '0';
          }
        }

        // 2. aHash (Average Hash): compare against mean luminance
        let aHashBits = '';
        for (let i = 0; i < grays.length; i++) {
          aHashBits += grays[i] >= avg ? '1' : '0';
        }

        // 3. Feature Vector: 8-quadrant regional averages normalized 0-1
        const featureVector: number[] = [];
        const quadrantSize = size / 2;
        for (let qy = 0; qy < 2; qy++) {
          for (let qx = 0; qx < 2; qx++) {
            let qSum = 0;
            for (let dy = 0; dy < quadrantSize; dy++) {
              for (let dx = 0; dx < quadrantSize; dx++) {
                const px = qx * quadrantSize + dx;
                const py = qy * quadrantSize + dy;
                qSum += grays[py * size + px];
              }
            }
            featureVector.push(Number((qSum / (quadrantSize * quadrantSize * 255)).toFixed(3)));
          }
        }

        // Convert bit strings to hexadecimal
        const hexD = binaryStringToHex(dHashBits);
        const hexA = binaryStringToHex(aHashBits);
        const fullHash = `ph_${hexD.slice(0, 16)}_${hexA.slice(0, 16)}`;
        const shortHash = `#${hexD.slice(0, 8)}`;

        resolve({ hash: fullHash, shortHash, featureVector });
      } catch (e) {
        const fallback = generateDeterministicHash(imageDataUrl);
        resolve({
          hash: fallback,
          shortHash: fallback.substring(0, 10),
          featureVector: [0.5, 0.5, 0.5, 0.5],
        });
      }
    };

    img.onerror = () => {
      const fallback = generateDeterministicHash(imageDataUrl);
      resolve({
        hash: fallback,
        shortHash: fallback.substring(0, 10),
        featureVector: [0.5, 0.5, 0.5, 0.5],
      });
    };

    img.src = imageDataUrl;
  });
}

/**
 * Convert bitstring to hex representation
 */
function binaryStringToHex(bits: string): string {
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    const chunk = bits.slice(i, i + 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  return hex;
}

/**
 * Deterministic string hash fallback helper
 */
export function generateDeterministicHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const val = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return `ph_${val.toString(16).padStart(12, '0')}`;
}

/**
 * Calculate Hamming Distance & Normalized Similarity Percentage between two hashes
 */
export function compareImageHashes(
  hashA: string,
  hashB: string,
  vectorA?: number[],
  vectorB?: number[]
): {
  similarityScore: number; // 0.0 - 100.0%
  isIdentical: boolean;
  isNearIdentical: boolean;
  hammingDistance: number;
} {
  if (!hashA || !hashB) {
    return { similarityScore: 0, isIdentical: false, isNearIdentical: false, hammingDistance: 99 };
  }

  // Exact match fast path
  if (hashA === hashB) {
    return { similarityScore: 100.0, isIdentical: true, isNearIdentical: true, hammingDistance: 0 };
  }

  // Clean hash prefix
  const cleanA = hashA.replace(/[^0-9a-fA-F]/g, '');
  const cleanB = hashB.replace(/[^0-9a-fA-F]/g, '');

  const minLen = Math.min(cleanA.length, cleanB.length);
  if (minLen === 0) {
    return { similarityScore: 0, isIdentical: false, isNearIdentical: false, hammingDistance: 99 };
  }

  // Calculate Hamming bit differences over hex characters
  let bitDiffs = 0;
  const totalBits = minLen * 4;

  for (let i = 0; i < minLen; i++) {
    const nibbleA = parseInt(cleanA[i], 16) || 0;
    const nibbleB = parseInt(cleanB[i], 16) || 0;
    let xor = nibbleA ^ nibbleB;
    // count set bits in 4-bit nibble
    while (xor > 0) {
      bitDiffs += xor & 1;
      xor >>= 1;
    }
  }

  const hashSimilarity = Math.max(0, (1 - bitDiffs / totalBits) * 100);

  // If feature vectors are present, blend with Euclidean distance
  let finalScore = hashSimilarity;
  if (vectorA && vectorB && vectorA.length === vectorB.length) {
    let diffSq = 0;
    for (let i = 0; i < vectorA.length; i++) {
      diffSq += Math.pow(vectorA[i] - vectorB[i], 2);
    }
    const euclid = Math.sqrt(diffSq);
    const vectorSimilarity = Math.max(0, (1 - euclid) * 100);
    finalScore = Number((0.6 * hashSimilarity + 0.4 * vectorSimilarity).toFixed(1));
  } else {
    finalScore = Number(hashSimilarity.toFixed(1));
  }

  const isIdentical = finalScore >= 96.0 || bitDiffs <= 2;
  const isNearIdentical = finalScore >= 85.0 || bitDiffs <= 6;

  return {
    similarityScore: finalScore,
    isIdentical,
    isNearIdentical,
    hammingDistance: bitDiffs,
  };
}

/**
 * Validate a newly captured photo against a list of previous work reports
 */
export async function validateReportPhotoAgainstHistory(
  currentPhotoUrl: string,
  historicalReports: DailyWorkReport[],
  excludeReportId?: string
): Promise<{
  isDuplicate: boolean;
  currentHash: string;
  currentShortHash: string;
  match?: {
    report: DailyWorkReport;
    similarityScore: number;
    isIdentical: boolean;
    flagSeverity: 'high' | 'medium';
    reason: string;
    matchedHash: string;
    matchedShortHash: string;
  };
}> {
  const currentResult = await computeImagePerceptualHash(currentPhotoUrl);

  let highestScore = 0;
  let bestMatch: DailyWorkReport | null = null;
  let bestComparison: {
    similarityScore: number;
    isIdentical: boolean;
    isNearIdentical: boolean;
    hammingDistance: number;
  } | null = null;
  let bestMatchedHash = '';

  for (const rep of historicalReports) {
    if (rep.id === excludeReportId || !rep.documentationPhotoUrl) continue;

    // Use report's existing hash or compute on the fly
    let repHash = rep.imageHash;
    if (!repHash) {
      const computed = await computeImagePerceptualHash(rep.documentationPhotoUrl);
      repHash = computed.hash;
    }

    const comp = compareImageHashes(
      currentResult.hash,
      repHash,
      currentResult.featureVector
    );

    if (comp.similarityScore > highestScore) {
      highestScore = comp.similarityScore;
      bestMatch = rep;
      bestComparison = comp;
      bestMatchedHash = repHash;
    }
  }

  // Threshold: >= 85% is flagged as duplicate / near-duplicate
  if (bestMatch && bestComparison && bestComparison.isNearIdentical) {
    const isIdentical = bestComparison.isIdentical || highestScore >= 95.0;
    const severity: 'high' | 'medium' = isIdentical ? 'high' : 'medium';
    const reason = isIdentical
      ? `Foto terdeteksi IDENTIK (${highestScore}% kesamaan visual dan pola hash) dengan laporan "${bestMatch.title}" yang telah diunggah sebelumnya.`
      : `Foto terdeteksi HAMPIR IDENTIK (${highestScore}% kesamaan hash perseptual) dengan laporan "${bestMatch.title}". Sudut pandang atau objek identik terindikasi diambil ulang.`;

    return {
      isDuplicate: true,
      currentHash: currentResult.hash,
      currentShortHash: currentResult.shortHash,
      match: {
        report: bestMatch,
        similarityScore: highestScore,
        isIdentical,
        flagSeverity: severity,
        reason,
        matchedHash: bestMatchedHash,
        matchedShortHash: `#${bestMatchedHash.replace(/[^0-9a-fA-F]/g, '').slice(0, 8)}`,
      },
    };
  }

  return {
    isDuplicate: false,
    currentHash: currentResult.hash,
    currentShortHash: currentResult.shortHash,
  };
}
