/**
 * Helper untuk pembuatan ID Dokumen Unik Baku Resmi Disdik HST
 * Format: [prefix]-rk-[YYYYMM]-[hash6]
 * Contoh: rk-rk-202610-d185b6, ts-rk-202610-a4f21c
 */

export function generateDocumentId(
  prefix: "rk" | "ts" | "kk" | "sp" | "ot",
  seed: string | number,
  dateInput?: string | Date | null
): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = isNaN(d.getFullYear()) ? 2026 : d.getFullYear();
  const month = isNaN(d.getMonth())
    ? "10"
    : String(d.getMonth() + 1).padStart(2, "0");
  const yearMonth = `${year}${month}`;

  const str = `${prefix}-${seed}-${yearMonth}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }

  const hexHash = Math.abs(hash).toString(16).padStart(6, "0").slice(0, 6);
  return `${prefix}-rk-${yearMonth}-${hexHash}`;
}
