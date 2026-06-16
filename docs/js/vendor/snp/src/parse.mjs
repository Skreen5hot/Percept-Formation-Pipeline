export function detectFormat(input) {
  const trimmed = input.trimStart();
  return (trimmed[0] === '{' || trimmed[0] === '[') ? 'json' : 'csv';
}

export function parseCSV(input) {
  const lines = input.split(/\r?\n/);
  const nonEmpty = lines.filter(l => l.length > 0);
  if (nonEmpty.length === 0) return { header: [], rows: [] };
  const header = splitCSVRow(nonEmpty[0]);
  const rows = nonEmpty.slice(1).map(splitCSVRow);
  return { header, rows };
}

export function toCSV(header, rows) {
  const lines = [header.map(escapeCSVCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCSVCell).join(','));
  }
  return lines.join('\n');
}

function splitCSVRow(line) {
  const cells = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) { cells.push(''); break; }
    if (line[i] === '"') {
      let cell = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { cell += '"'; i += 2; }
          else { i++; break; }
        } else {
          cell += line[i++];
        }
      }
      cells.push(cell);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) { cells.push(line.slice(i)); break; }
      cells.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return cells;
}

function escapeCSVCell(value) {
  const s = value == null ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
