import { getDashboardData } from "../data";
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
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              {["severity", "kind", "title", "explanation", "estimated_wasted_tokens"].map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waste.map((r, i) => (
              <tr key={String(r.id ?? i)}>
                {["severity", "kind", "title", "explanation", "estimated_wasted_tokens"].map(
                  (c) => (
                    <td key={c}>{String(r[c] ?? "")}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {waste.length === 0 ? <p className="warn">No waste patterns stored yet.</p> : null}
      </section>
    </>
  );
}
