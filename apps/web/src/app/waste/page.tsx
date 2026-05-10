import { getDashboardData, parseEvidence, recommendationForWaste } from "../data";
export const dynamic = "force-dynamic";
export default function WastePage() {
  const { waste } = getDashboardData();
  return (
    <>
      <header className="header">
        <div>
          <h1>Waste analysis</h1>
          <p>Root-cause indicators for expensive or stuck workflows.</p>
        </div>
      </header>
      <section className="stack">
        {waste.map((item, index) => (
          <article className="panel" key={String(item.id ?? index)}>
            <div className="row">
              <span className={`pill severity severity-${String(item.severity)}`}>
                {String(item.severity)}
              </span>
              <span className="pill">{String(item.kind)}</span>
              <span className="mono">
                {Number(item.estimated_wasted_tokens ?? 0).toLocaleString()} wasted tokens
              </span>
            </div>
            <h2>{String(item.title)}</h2>
            <p>{String(item.explanation)}</p>
            <p className="recommendation">{recommendationForWaste(item.kind)}</p>
            <ul className="evidence">
              {parseEvidence(item.evidence_json).map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </article>
        ))}
        {waste.length === 0 ? <p className="warn">No waste patterns stored yet.</p> : null}
      </section>
    </>
  );
}
