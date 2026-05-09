export default function SettingsPage() {
  return (
    <>
      <header className="header">
        <div>
          <h1>Local configuration</h1>
          <p>Settings come from contextops.config.json and never require an account.</p>
        </div>
      </header>
      <section className="panel">
        <pre>{`{
  "privacyMode": "strict",
  "replayRetentionDays": 90,
  "disabledAdapters": [],
  "customPricing": {}
}`}</pre>
      </section>
    </>
  );
}
