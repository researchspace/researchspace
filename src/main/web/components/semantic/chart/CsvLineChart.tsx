import * as React from 'react';
import { Dictionary } from 'lodash';

// Use your existing renderer and types from ResearchSpace
import { ChartJsRenderer } from './ChartJsRenderer';
import { ChartType, BuiltData } from './ChartingCommons';

export interface CsvLineChartProps {
  csvUrl?: string;
  xColumn: string;
  yColumns: string[];
  seriesLabels?: string[];
  delimiter?: string;      // default: ','
  hasHeader?: boolean;     // default: true
  width?: number;          // 0/undefined => responsive width
  height?: number;         // default: 400
  className?: string;
  title?: string;
}

interface CsvLineChartState {
  csvRows: string[][];
  error: string | null;
  fileName: string | null;
}

/* -------- CSV helpers (no Object.fromEntries; no optional chaining) -------- */
// Strip leading UTF-8 BOM if present
// --- helpers: BOM + key normalizer ------------------------------------------
function stripBom(s: string): string {
  if (!s) return s;
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}
function normKey(s: string): string {
  return stripBom(String(s || ''))
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, ''); // spaces/underscores/hyphens ignored
}
/** Resolve the actual header for the requested xColumn.
 * - Accepts header name (any case, spaces/_/- ignored)
 * - Accepts numeric index (number or string like "0")
 * - Falls back to the first non-empty header
 */
function resolveXKey(headers: string[], requested: any): string {
  const hdrs = headers.map(h => stripBom(h).trim());
  const byNorm = new Map<string, string>();
  for (const h of hdrs) byNorm.set(normKey(h), h);

  if (typeof requested === 'number' && hdrs[requested] != null) return hdrs[requested];

  const reqStr = stripBom(String(requested || '')).trim();
  if (/^\d+$/.test(reqStr)) {
    const idx = parseInt(reqStr, 10);
    if (hdrs[idx] != null) return hdrs[idx];
  }
  const wanted = normKey(reqStr);
  if (byNorm.has(wanted)) return byNorm.get(wanted)!;

  // fuzzy contains match (last resort)
  for (const h of hdrs) if (normKey(h).indexOf(wanted) >= 0) return h;

  for (const h of hdrs) if (h) return h; // first non-empty
  return hdrs[0] || '';
}

// --- 1) CSV parser (supports trailing commas) --------------------------------
function parseCsv(text: string, delimiter: string): string[][] {
  const src = text && text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;

  const flushField = () => { row.push(cur); cur = ''; };
  const flushRow = () => {
    // Trim trailing empty fields to support trailing commas per row
    while (row.length > 0 && row[row.length - 1] === '') row.pop();

    // Only push rows that have at least one non-empty cell
    let nonEmpty = false;
    for (let i = 0; i < row.length; i++) { if (row[i].trim() !== '') { nonEmpty = true; break; } }
    if (row.length > 0 && nonEmpty) rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === delimiter && !inQuotes) {
      flushField();
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++; // CRLF
      flushField();
      flushRow();
    } else {
      cur += ch;
    }
  }

  flushField();
  flushRow();
  return rows;
}


// --- 2) Rows -> objects (trim + BOM-safe headers, drop empty trailing header) -
// --- 2) Rows -> objects (trim + BOM-safe headers, drop empty trailing header) -
function rowsToObjects(rows: string[][], hasHeader: boolean): Array<Record<string, string>> {
  if (!rows || rows.length === 0) return [];

  if (!hasHeader) {
    let maxLen = 0;
    for (let i = 0; i < rows.length; i++) if (rows[i].length > maxLen) maxLen = rows[i].length;
    const header: string[] = [];
    for (let i = 0; i < maxLen; i++) header.push('c' + i);

    const out: Array<Record<string, string>> = [];
    for (let r = 0; r < rows.length; r++) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < header.length; i++) obj[header[i]] = rows[r][i] !== undefined ? rows[r][i].trim() : '';
      out.push(obj);
    }
    return out;
  }

  // sanitize header
  const headerRaw = rows[0];
  const header: string[] = [];
  for (let i = 0; i < headerRaw.length; i++) {
    const h = i === 0 ? stripBom(headerRaw[i]) : headerRaw[i];
    const t = (h || '').trim();
    if (t.length === 0) continue; // skip empty header created by trailing comma
    header.push(t);
  }

  const data = rows.slice(1);
  const out: Array<Record<string, string>> = [];
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      const key = header[i];
      obj[key] = row[i] !== undefined ? row[i].trim() : '';
    }
    out.push(obj);
  }
  return out;
}







/* ------------------------------ Component --------------------------------- */
export class CsvLineChart extends React.Component<CsvLineChartProps, CsvLineChartState> {
  static defaultProps = { delimiter: ',', hasHeader: true, height: 400 } as Partial<CsvLineChartProps>;
  private fileInputRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: CsvLineChartProps) {
    super(props);
    this.state = { csvRows: [], error: null, fileName: null };
  }

  componentDidMount() {
    if (this.props.csvUrl) this.loadFromUrl(this.props.csvUrl, this.props.delimiter || ',');
  }

  componentDidUpdate(prevProps: CsvLineChartProps) {
    const urlChanged = this.props.csvUrl !== prevProps.csvUrl;
    const delimiterChanged = (this.props.delimiter || ',') !== (prevProps.delimiter || ',');
    if (urlChanged || (delimiterChanged && this.props.csvUrl)) {
      this.loadFromUrl(this.props.csvUrl!, this.props.delimiter || ',');
    }
    if (prevProps.csvUrl && !this.props.csvUrl) {
      this.setState({ csvRows: [], fileName: null, error: null });
    }
  }

  private async loadFromUrl(url: string, delimiter: string) {
    try {
      this.setState({ error: null });
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Failed to load CSV (' + res.status + ')');
      const text = await res.text();
      const rows = parseCsv(text, delimiter);
      this.setState({ csvRows: rows, fileName: url });
    } catch (e) {
      const msg = (e && (e as any).message) ? (e as any).message : String(e);
      this.setState({ error: msg });
    }
  }

  private onPickFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target && ev.target.files ? ev.target.files[0] : null;
    if (!file) return;
    this.setState({ error: null });
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const rows = parseCsv(text, this.props.delimiter || ',');
        this.setState({ csvRows: rows, fileName: file.name });
      } catch (e) {
        const msg = (e && (e as any).message) ? (e as any).message : String(e);
        this.setState({ error: msg });
      }
    };
    reader.onerror = () => { this.setState({ error: 'Failed to read file.' }); };
    reader.readAsText(file, 'utf-8');
  };

  private buildDataObjects(): Array<Record<string, string>> {
    return rowsToObjects(this.state.csvRows, !!this.props.hasHeader);
  }

  /** Normalize yColumns: accept array, single string, or comma-separated string */
  private getYColumns(): string[] {
    const raw: any = (this.props as any).yColumns;
    if (Array.isArray(raw)) return raw.slice();
    if (raw == null) return [];
    const parts = String(raw).split(',');
    const out: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const t = parts[i].trim();
      if (t) out.push(t);
    }
    return out;
  }

  /** IMPORTANT FIX: wrap each scalar as { value: string } for propertyValue(...) */
  // --- 3) BuildData with canonical __x__ (guarantees x lookup works) -----------
  private makeBuiltData(): BuiltData {
    const rawObjects = this.buildDataObjects();

    // Resolve x header robustly against actual headers in the CSV
    const headers = rawObjects.length ? Object.keys(rawObjects[0]) : [];
    const resolvedX = resolveXKey(headers, this.props.xColumn);

    // Convert each row to RDF-like nodes and inject a canonical __x__ field
    const X_KEY = '__x__';
    const nodePoints: Array<Record<string, { value: string }>> = [];

    for (let r = 0; r < rawObjects.length; r++) {
      const row = rawObjects[r];
      const nodeRow: Record<string, { value: string }> = {} as any;

      // copy all fields as { value: string }
      for (const k in row) {
        if (Object.prototype.hasOwnProperty.call(row, k)) {
          nodeRow[k] = { value: String(row[k]).trim() };
        }
      }

      // inject canonical X from the resolved header
      const xRaw = row.hasOwnProperty(resolvedX) ? row[resolvedX] : '';
      nodeRow[X_KEY] = { value: String(xRaw).trim() };

      nodePoints.push(nodeRow);
    }

    // Normalize yColumns (array, single string, or comma-separated)
    const yCols: string[] = Array.isArray((this.props as any).yColumns)
      ? (this.props as any).yColumns.slice()
      : String((this.props as any).yColumns || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

    const sets: any[] = [];
    for (let i = 0; i < yCols.length; i++) {
      const yCol = yCols[i];
      const label =
        (this.props.seriesLabels && this.props.seriesLabels[i])
          ? this.props.seriesLabels[i]
          : yCol;

      sets.push({
        name: label,
        iri: undefined,
        mapping: { x: X_KEY, y: yCol }, // always resolvable X
        points: nodePoints as any,
      });
    }

    return { sets } as BuiltData;
  }





  private makeLabels(): Dictionary<string> {
    return {} as Dictionary<string>;
  }

  /** Force linear x-axis & add titles via the style override hook in ChartJsRenderer */
  private makeConfig(): any {
  const w = this.props.width != null ? this.props.width : 0; // responsive width
  const h = this.props.height != null ? this.props.height : 0;

  // safe Y-axis title (optional)
  const yCols = Array.isArray((this.props as any).yColumns)
    ? (this.props as any).yColumns : String((this.props as any).yColumns || '');
  const yTitle = Array.isArray(this.props.seriesLabels)
    ? this.props.seriesLabels.join(', ')
    : (Array.isArray(yCols) ? yCols.join(', ') : yCols);

  return {
    type: 'line' as ChartType,
    dimensions: { width: w, height: h },
    styles: [
      {
        provider: 'chartjs',
        style: {
          options: {
            // make points smaller (works in Chart.js v2 & v3)
            elements: {
              point: {
                radius: 1.5,       // <- size of the dots
                hoverRadius: 3,    // size on hover
                hitRadius: 4       // click/hover target area
              }
            },
            scales: {
              x: { type: 'linear', position: 'bottom', title: { display: true, text: this.props.xColumn } },
              y: { title: { display: !!yTitle, text: yTitle } }
            }
          }
        }
      }
    ],
    disableTooltips: false
  };
}



  render() {
    const dataObjects = this.buildDataObjects();
    const builtData = this.makeBuiltData();
    const labels = this.makeLabels();
    const config = this.makeConfig();
    const widthStyle: any = this.props.width != null ? this.props.width : '100%';

    return (
      <div className={this.props.className} style={{ width: widthStyle }}>
        {this.props.title ? <h3 style={{ margin: '0 0 8px 0' }}>{this.props.title}</h3> : null}

        {!this.props.csvUrl ? (
          <div style={{ marginBottom: 12, display: 'flex', gap: 8 as any, alignItems: 'center' }}>
            <input ref={this.fileInputRef} type="file" accept=".csv,text/csv" onChange={this.onPickFile} />
            {this.state.fileName ? <span style={{ opacity: 0.75 }}>Loaded: {this.state.fileName}</span> : null}
          </div>
        ) : null}

        {this.state.error ? (
          <div style={{ color: '#b00020', marginBottom: 12 }}>Error: {this.state.error}</div>
        ) : null}

        {dataObjects.length === 0 ? (
          <div style={{ padding: 8, opacity: 0.7 }}>
            {this.props.csvUrl ? 'Loading CSV…' : 'Pick a CSV file to render the chart.'}
          </div>
        ) : (
          <ChartJsRenderer
            className={undefined as any}
            config={config}
            builtData={builtData}
            labels={labels}
          />
        )}
      </div>
    );
  }
}

export default CsvLineChart;
