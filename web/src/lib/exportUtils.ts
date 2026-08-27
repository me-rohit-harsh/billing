export interface ExportField {
  key: string;
  label: string;
  transform?: (value: any, row: any) => any;
}

/**
 * Export data array to a UTF-8 BOM encoded CSV file (Excel compatible).
 */
export function exportToCSV(
  filename: string,
  data: Record<string, any>[],
  fields?: ExportField[]
): boolean {
  if (!data || data.length === 0) {
    return false;
  }

  const exportFields: ExportField[] =
    fields ||
    Object.keys(data[0]).map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
    }));

  const csvRows: string[] = [];

  // Add UTF-8 Header Row
  const headerRow = exportFields
    .map((f) => `"${String(f.label).replace(/"/g, '""')}"`)
    .join(',');
  csvRows.push(headerRow);

  // Add Data Rows
  for (const item of data) {
    const rowValues = exportFields.map((f) => {
      let val = item[f.key];
      if (f.transform) {
        val = f.transform(val, item);
      }
      if (val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(rowValues.join(','));
  }

  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Export data/object to a formatted JSON file.
 */
export function exportToJSON(filename: string, data: any): boolean {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
