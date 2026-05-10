export type ToolId = "claude-code" | "codex-cli" | "cursor" | "gemini-cli";

export type SourceFormat = "json" | "jsonl" | "plaintext" | "unknown";

export interface ToolDetection {
  id: ToolId;
  name: string;
  installed: boolean;
  confidence: number;
  paths: string[];
  warnings: string[];
}

export interface ContextOpsConfig {
  scanPaths: string[];
  disabledAdapters: ToolId[];
  customPricing: Record<string, ModelPricing>;
  budgetAlerts: BudgetAlert[];
  privacyMode: "strict" | "balanced";
  replayRetentionDays: number;
  ignoredDirectories: string[];
}

export interface BudgetAlert {
  scope: "session" | "project" | "daily" | "monthly";
  amountUsd: number;
}

export interface ModelPricing {
  model: string;
  inputPerMillion: number;
  outputPerMillion: number;
  currency: "USD";
}

export interface ParsedMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | "unknown";
  content: string;
  createdAt: string;
  tokenEstimate: TokenEstimate;
  model?: string;
  toolName?: string;
  metadata?: Record<string, unknown>;
}

export interface TokenEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  confidence: number;
  source: "reported" | "estimated" | "missing";
}

export interface ParsedSession {
  id: string;
  toolId: ToolId;
  projectPath?: string;
  startedAt: string;
  endedAt?: string;
  sourcePath: string;
  sourceFormat: SourceFormat;
  messages: ParsedMessage[];
  replayEvents: ReplayEvent[];
  tokenEstimate: TokenEstimate;
  warnings: ParseWarning[];
  metadata?: Record<string, unknown>;
}

export interface ParseWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  path?: string;
}

export type ReplayEventKind =
  | "prompt"
  | "assistant_response"
  | "tool_call"
  | "file_read"
  | "file_write"
  | "retry"
  | "model_switch"
  | "context_growth"
  | "warning";

export interface ReplayEvent {
  id: string;
  sessionId: string;
  kind: ReplayEventKind;
  timestamp: string;
  label: string;
  detail?: string;
  tokens?: number;
  filePath?: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface CostEstimate {
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
  confidence: number;
}

export type WastePatternKind =
  | "prompt_loop"
  | "repeated_file_read"
  | "context_bloat"
  | "retry_chain"
  | "high_cost_session"
  | "tool_overuse";

export interface WastePattern {
  id: string;
  sessionId: string;
  kind: WastePatternKind;
  severity: "low" | "medium" | "high";
  title: string;
  explanation: string;
  recommendation?: string;
  evidence: string[];
  estimatedWastedTokens: number;
  confidence: number;
}

export interface SessionEfficiency {
  sessionId: string;
  score: number;
  contextGrowthRate: number;
  retryCount: number;
  uniqueFilesRead: number;
  repeatedFileReads: number;
  promptLoopCount: number;
}

export interface Adapter {
  id: ToolId;
  name: string;
  detect(): Promise<ToolDetection>;
  scan(paths: string[]): Promise<AdapterScanResult>;
  parseSession(path: string): Promise<ParsedSession>;
  extractTimeline(session: ParsedSession): ReplayEvent[];
  estimateTokens(text: string): TokenEstimate;
}

export interface AdapterScanResult {
  toolId: ToolId;
  scannedPaths: string[];
  sessions: ParsedSession[];
  warnings: ParseWarning[];
}

export const makeId = (prefix: string, value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(16)}`;
};

export const nowIso = (): string => new Date().toISOString();

export const emptyTokenEstimate = (): TokenEstimate => ({
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  confidence: 0,
  source: "missing",
});
