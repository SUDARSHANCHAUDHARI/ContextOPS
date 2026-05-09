import Link from "next/link";
import { getDashboardData } from "../data";

export const dynamic = "force-dynamic";

export default function SessionsPage() {
  const { sessions } = getDashboardData();
  return (
    <>
      <header className="header">
        <div>
          <h1>Session explorer</h1>
          <p>Recent local AI coding sessions.</p>
        </div>
      </header>
      <section className="panel">
        {sessions.length === 0 ? <p className="warn">No sessions stored yet.</p> : null}
        <table className="table">
          <thead>
            <tr>
              {["started", "tool", "tokens", "cost", "source", "open"].map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={String(session.id)}>
                <td>{String(session.started_at ?? "")}</td>
                <td>{String(session.tool_id ?? "")}</td>
                <td>{String(session.total_tokens ?? "")}</td>
                <td>${Number(session.estimatedUsd ?? 0).toFixed(4)}</td>
                <td className="mono">{String(session.source_path ?? "")}</td>
                <td>
                  <Link href={`/sessions/${String(session.id)}`}>Replay</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
