/**
 * CSV Export Utility
 * Exports data to CSV with BOM prefix for Excel UTF-8 compatibility.
 */
export function exportToCsv(headers: string[], rows: string[][], filename: string): void {
  const bom = '\uFEFF';
  const csv = headers.join(',') + '\n' +
    rows.map(r =>
      r.map(cell => `"${(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
