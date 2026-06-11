// Output helpers. Two modes: human tables (default) and `--json` (stable,
// machine-readable — the contract for scripts and AI agents).

export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

// Minimal column-aligned table; no dependency, handles empty input.
export function printTable(rows: Array<Record<string, string>>): void {
  if (rows.length === 0) {
    process.stdout.write("(empty)\n");
    return;
  }
  const headers = Object.keys(rows[0]!);
  const widths = headers.map((h) =>
    Math.max(h.length, ...rows.map((r) => (r[h] ?? "").length)),
  );
  const line = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(widths[i]!)).join("  ").trimEnd() + "\n";
  process.stdout.write(line(headers.map((h) => h.toUpperCase())));
  for (const row of rows) {
    process.stdout.write(line(headers.map((h) => row[h] ?? "")));
  }
}

// Parses repeated --column key=value flags into a monday column_values object.
// Values that look like JSON are parsed (status/date/people columns need
// structured values, e.g. status='{"label":"Done"}'); plain strings pass through.
export function parseColumns(pairs: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq <= 0) {
      throw new Error(`Invalid --column "${pair}", expected key=value`);
    }
    const key = pair.slice(0, eq).trim();
    const raw = pair.slice(eq + 1);
    if (raw.startsWith("{") || raw.startsWith("[")) {
      try {
        out[key] = JSON.parse(raw);
      } catch {
        throw new Error(`Invalid JSON in --column "${key}": ${raw}`);
      }
    } else {
      out[key] = raw;
    }
  }
  return out;
}
