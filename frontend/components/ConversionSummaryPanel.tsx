type Summary = {
  ppid_count: number;
  ts_count: number;
  generated_rows: number;
  conversion_time_seconds: number;
};

export default function ConversionSummaryPanel({ summary }: { summary: Summary }) {
  return (
    <div className="summary-panel">
      <div className="summary-title">Conversion Completed</div>
      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">PPID Count</span>
          <span className="summary-value">{summary.ppid_count}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">TS Count</span>
          <span className="summary-value">{summary.ts_count}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Generated Rows</span>
          <span className="summary-value">{summary.generated_rows}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Conversion Time</span>
          <span className="summary-value">{summary.conversion_time_seconds.toFixed(2)} sec</span>
        </div>
      </div>
    </div>
  );
}
