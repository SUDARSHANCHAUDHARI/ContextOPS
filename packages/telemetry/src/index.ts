export interface TelemetryPolicy {
  enabled: false;
  reason: string;
}

export const localOnlyTelemetryPolicy = (): TelemetryPolicy => ({
  enabled: false,
  reason: "ContextOps does not upload telemetry by default. Local SQLite is the only default sink.",
});
