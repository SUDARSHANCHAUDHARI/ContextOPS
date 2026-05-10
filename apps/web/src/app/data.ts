import { ContextOpsStore } from "@contextops/storage";

export const getDashboardData = () => {
  try {
    const store = new ContextOpsStore();
    const report = store.buildReport({ limit: 20 }) as {
      summary: Record<string, number>;
      sessions: Record<string, unknown>[];
      waste: Record<string, unknown>[];
      projects: Record<string, unknown>[];
      models: Record<string, unknown>[];
      daily: Record<string, unknown>[];
      tools: Record<string, unknown>[];
    };
    store.close();
    return report;
  } catch {
    return {
      summary: { sessionCount: 0, totalTokens: 0, estimatedUsd: 0, wastePatternCount: 0 },
      sessions: [],
      waste: [],
      projects: [],
      models: [],
      daily: [],
      tools: [],
    };
  }
};

export const getSessionData = (id: string) => {
  try {
    const store = new ContextOpsStore();
    const session = store.getSession(id);
    store.close();
    return session;
  } catch {
    return undefined;
  }
};

export const parseEvidence = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return [value];
  }
};

export const recommendationForWaste = (kind: unknown) =>
  ({
    prompt_loop: "Restate acceptance criteria and ask for one bounded plan before another edit.",
    repeated_file_read:
      "Pin or summarize the file once instead of repeatedly adding it to context.",
    context_bloat: "Start a fresh session with only the current plan, touched files, and blockers.",
    retry_chain: "Combine the failing command, error, and intended fix into one recovery prompt.",
    high_cost_session: "Review the largest timeline context jumps and split completed work out.",
    tool_overuse: "Ask the agent to name the next few files or commands before broad exploration.",
  })[String(kind)] ??
  "Inspect the replay timeline and remove the largest source of repeated context.";
