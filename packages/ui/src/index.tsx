import type { ReactNode } from "react";

export const Metric = ({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "warn" | "good";
}) => (
  <div className={`co-metric co-metric-${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);
