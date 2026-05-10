import { getSessionData, parseEvidence, recommendationForWaste } from "../../data";

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
        <div className="stack">
          {waste.map((item) => (
            <article key={String(item.id)}>
              <div className="row">
                <span className={`pill severity severity-${String(item.severity)}`}>
                  {String(item.severity)}
                </span>
                <strong>{String(item.title)}</strong>
              </div>
              <p>{String(item.explanation)}</p>
              <p className="recommendation">{recommendationForWaste(item.kind)}</p>
              <ul className="evidence">
                {parseEvidence(item.evidence_json).map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
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
