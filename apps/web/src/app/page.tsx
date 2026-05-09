import { getDashboardData } from "./data";

export const dynamic = "force-dynamic";

export default function Page() {
  const { summary, sessions, waste, daily, models } = getDashboardData();
  return (
    <>
      <header className="header">
        <div>
          <h1>Overview</h1>
          <p>Local usage, cost, and workflow inefficiency signals.</p>
        </div>
        <span className="pill">SQLite local only</span>
      </header>
      <section className="grid">
        <Metric label="Sessions" value={summary.sessionCount ?? 0} />
        <Metric label="Estimated tokens" value={(summary.totalTokens ?? 0).toLocaleString()} />
        <Metric label="Estimated cost" value={`$${Number(summary.estimatedUsd ?? 0).toFixed(4)}`} />
        <Metric label="Waste patterns" value={summary.wastePatternCount ?? 0} />
      </section>
      <section className="section panel">
        <h2>Daily Spend</h2>
        <Bars
          rows={daily}
          labelKey="day"
          valueKey="estimatedUsd"
          formatter={(value) => `$${Number(value).toFixed(4)}`}
        />
      </section>
      <section className="section panel">
        <h2>Model Mix</h2>
        <Table
          rows={models}
          columns={["model", "sessionCount", "inputTokens", "outputTokens", "estimatedUsd"]}
        />
      </section>
      <section className="section panel">
        <h2>Recent Sessions</h2>
        <Table
          rows={sessions}
          columns={["started_at", "tool_id", "total_tokens", "estimatedUsd"]}
        />
      </section>
      <section className="section panel">
        <h2>Waste Alerts</h2>
        <Table rows={waste} columns={["severity", "kind", "title", "estimated_wasted_tokens"]} />
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="panel metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Table({ rows, columns }: { rows: Record<string, unknown>[]; columns: string[] }) {
  if (rows.length === 0) return <p className="warn">No local data yet. Run contextops scan.</p>;
  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={String(row.id ?? index)}>
            {columns.map((column) => (
              <td key={column}>{String(row[column] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Bars({
  rows,
  labelKey,
  valueKey,
  formatter,
}: {
  rows: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  formatter: (value: unknown) => string;
}) {
  if (rows.length === 0) return <p className="warn">No local data yet. Run contextops scan.</p>;
  const max = Math.max(...rows.map((row) => Number(row[valueKey] ?? 0)), 1);
  return (
    <div className="bars">
      {rows.slice(0, 10).map((row) => (
        <div className="bar" key={String(row[labelKey])}>
          <span>{String(row[labelKey])}</span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${(Number(row[valueKey] ?? 0) / max) * 100}%` }}
            />
          </span>
          <span>{formatter(row[valueKey])}</span>
        </div>
      ))}
    </div>
  );
}
