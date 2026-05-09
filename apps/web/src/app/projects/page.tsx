import { getDashboardData } from "../data";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  const { projects } = getDashboardData();
  return (
    <>
      <header className="header">
        <div>
          <h1>Project analytics</h1>
          <p>Local project-level cost, token, and workflow intelligence rollups.</p>
        </div>
      </header>
      <section className="panel">
        <Table
          rows={projects}
          columns={["projectName", "sessionCount", "totalTokens", "estimatedUsd", "projectPath"]}
        />
      </section>
    </>
  );
}

function Table({ rows, columns }: { rows: Record<string, unknown>[]; columns: string[] }) {
  if (rows.length === 0) return <p className="warn">No project data yet.</p>;
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
          <tr key={String(row.projectPath ?? index)}>
            {columns.map((column) => (
              <td key={column}>{String(row[column] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
