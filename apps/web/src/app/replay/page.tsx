import Link from "next/link";
import { getDashboardData } from "../data";

export const dynamic = "force-dynamic";

export default function ReplayPage() {
  const { sessions } = getDashboardData();
  return (
    <>
      <header className="header">
        <div>
          <h1>Replay viewer</h1>
          <p>
            Open a stored session to inspect prompts, tool calls, file reads, retries, and context
            growth.
          </p>
        </div>
      </header>
      <section className="panel stack">
        {sessions.length === 0 ? <p className="warn">No sessions stored yet.</p> : null}
        {sessions.map((session) => (
          <div key={String(session.id)}>
            <Link href={`/sessions/${String(session.id)}`}>
              {String(session.started_at)} {String(session.tool_id)}
            </Link>
            <p className="mono">{String(session.source_path ?? "")}</p>
          </div>
        ))}
      </section>
    </>
  );
}
