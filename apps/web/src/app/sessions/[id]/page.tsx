import { getSessionData } from "../../data";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSessionData(id) as
    | (Record<string, unknown> & {
        messages?: unknown[];
        replayEvents?: unknown[];
        waste?: unknown[];
      })
    | undefined;
  if (!session) {
    return (
      <section className="panel">
        <p className="warn">Session not found.</p>
      </section>
    );
  }
  const events = (session.replayEvents ?? []) as Record<string, unknown>[];
  const messages = (session.messages ?? []) as Record<string, unknown>[];
  const waste = (session.waste ?? []) as Record<string, unknown>[];
  return (
    <>
      <header className="header">
        <div>
          <h1>Replay</h1>
          <p className="mono">{String(session.id)}</p>
        </div>
        <span className="pill">{String(session.tool_id)}</span>
      </header>
      <section className="grid">
        <Metric label="Tokens" value={String(session.total_tokens ?? 0)} />
        <Metric label="Cost" value={`$${Number(session.estimatedUsd ?? 0).toFixed(4)}`} />
        <Metric label="Messages" value={messages.length} />
        <Metric label="Events" value={events.length} />
      </section>
      <section className="section panel">
        <h2>Timeline</h2>
        <div className="stack">
          {events.map((event) => (
            <div key={String(event.id)}>
              <span className="pill">{String(event.kind)}</span>{" "}
              <span className="mono">{String(event.timestamp)}</span>
              <div>
                {String(event.label)} {event.tokens ? `(${String(event.tokens)} tokens)` : ""}
              </div>
              {event.detail ? <p className="mono">{String(event.detail)}</p> : null}
            </div>
          ))}
        </div>
      </section>
      <section className="section panel">
        <h2>Waste</h2>
        {waste.length === 0 ? (
          <p className="warn">No waste patterns recorded for this session.</p>
        ) : null}
        {waste.map((item) => (
          <p key={String(item.id)}>
            [{String(item.severity)}] {String(item.title)}
          </p>
        ))}
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
