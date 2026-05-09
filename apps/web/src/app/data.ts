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
