import { getDashboardData } from "../data";

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  const { tools, models } = getDashboardData();
  return (
    <>
      <header className="header">
        <div>
          <h1>Tool analytics</h1>
          <p>Adapter detection status and observed model usage.</p>
        </div>
      </header>
      <section className="section panel">
        <h2>Detected Tools</h2>
        <Table rows={tools} columns={["name", "installed", "confidence", "detected_at"]} />
      </section>
      <section className="section panel">
        <h2>Models</h2>
        <Table
          rows={models}
          columns={["model", "sessionCount", "inputTokens", "outputTokens", "estimatedUsd"]}
        />
      </section>
    </>
  );
}

function Table({ rows, columns }: { rows: Record<string, unknown>[]; columns: string[] }) {
  if (rows.length === 0) return <p className="warn">No local data yet.</p>;
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
          <tr key={String(row.id ?? row.model ?? index)}>
            {columns.map((column) => (
              <td key={column}>{String(row[column] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
