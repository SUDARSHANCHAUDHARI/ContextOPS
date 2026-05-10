import { getConfigData } from "../data";

export default function SettingsPage() {
  const config = getConfigData();
  return (
    <>
      <header className="header">
        <div>
          <h1>Local configuration</h1>
          <p>Settings come from contextops.config.json and never require an account.</p>
        </div>
      </header>
      <section className="grid">
        <Metric label="Privacy mode" value={String(config.privacyMode)} />
        <Metric label="Retention days" value={String(config.replayRetentionDays)} />
        <Metric label="Scan paths" value={String(config.scanPaths.length)} />
        <Metric label="Disabled adapters" value={String(config.disabledAdapters.length)} />
      </section>
      {"error" in config ? <p className="warn">{String(config.error)}</p> : null}
      <section className="section panel">
        <h2>Resolved Config</h2>
        <pre>{JSON.stringify(config, null, 2)}</pre>
      </section>
      <section className="section panel">
        <h2>Local API</h2>
        <div className="stack">
          <a href="/api/config">/api/config</a>
          <a href="/api/export/sessions.csv">/api/export/sessions.csv</a>
          <a href="/api/export/report.json">/api/export/report.json</a>
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
