// BOM (﻿) para que Excel en español abra UTF-8 correctamente
export function generarCSV(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const esc = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '﻿' + [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}
