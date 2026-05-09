import {
  type ParsedMessage,
  type ParsedSession,
  type SessionEfficiency,
  type WastePattern,
  makeId,
} from "@contextops/core";

export const analyzeSession = (
  session: ParsedSession,
): {
  patterns: WastePattern[];
  efficiency: SessionEfficiency;
  roiScore: number;
} => {
  const patterns = [
    ...detectPromptLoops(session),
    ...detectRepeatedFileReads(session),
    ...detectContextBloat(session),
    ...detectRetryChains(session),
    ...detectHighCostSessions(session),
    ...detectToolOveruse(session),
  ];
  return {
    patterns,
    efficiency: calculateSessionEfficiency(session),
    roiScore: calculateAgentRoiScore(session, patterns),
  };
};

export const detectPromptLoops = (session: ParsedSession): WastePattern[] => {
  const prompts = session.messages.filter((message) => message.role === "user");
  const repeated = new Map<string, ParsedMessage[]>();
  for (const prompt of prompts) {
    const key = normalize(prompt.content).slice(0, 180);
    if (key.length < 20) continue;
    repeated.set(key, [...(repeated.get(key) ?? []), prompt]);
  }
  return [...repeated.entries()]
    .filter(([, messages]) => messages.length >= 3)
    .map(([key, messages]) =>
      pattern(
        session.id,
        "prompt_loop",
        "high",
        "Repeated prompt loop",
        [`Similar prompt repeated ${messages.length} times.`, key],
        wasted(messages),
      ),
    );
};

export const detectRepeatedFileReads = (session: ParsedSession): WastePattern[] => {
  const reads = session.replayEvents.filter(
    (event) => event.kind === "file_read" && event.filePath,
  );
  const byFile = new Map<string, number>();
  for (const read of reads) byFile.set(read.filePath!, (byFile.get(read.filePath!) ?? 0) + 1);
  return [...byFile.entries()]
    .filter(([, count]) => count >= 4)
    .map(([filePath, count]) =>
      pattern(
        session.id,
        "repeated_file_read",
        "medium",
        "Repeated file reads",
        [`${filePath} appears ${count} times in the replay timeline.`],
        count * 350,
      ),
    );
};

export const detectContextBloat = (session: ParsedSession): WastePattern[] => {
  const growth = calculateContextGrowthRate(session);
  if (growth < 1.8 || session.messages.length < 5) return [];
  return [
    pattern(
      session.id,
      "context_bloat",
      "medium",
      "Fast context growth",
      [`Context grew at ${growth.toFixed(2)}x across the session.`],
      Math.round(session.tokenEstimate.totalTokens * 0.18),
    ),
  ];
};

export const detectRetryChains = (session: ParsedSession): WastePattern[] => {
  const retryMessages = session.messages.filter((message) =>
    /try again|retry|failed|error|fix it/i.test(message.content),
  );
  if (retryMessages.length < 3) return [];
  return [
    pattern(
      session.id,
      "retry_chain",
      "high",
      "Retry chain detected",
      [`${retryMessages.length} messages mention failure or retry recovery.`],
      wasted(retryMessages),
    ),
  ];
};

export const detectHighCostSessions = (session: ParsedSession): WastePattern[] => {
  if (session.tokenEstimate.totalTokens < 50_000) return [];
  return [
    pattern(
      session.id,
      "high_cost_session",
      "medium",
      "High token session",
      [`${session.tokenEstimate.totalTokens.toLocaleString()} estimated tokens in one session.`],
      Math.round(session.tokenEstimate.totalTokens * 0.12),
    ),
  ];
};

export const detectToolOveruse = (session: ParsedSession): WastePattern[] => {
  const toolCalls = session.messages.filter(
    (message) => message.role === "tool" || message.toolName,
  );
  if (toolCalls.length < 20) return [];
  return [
    pattern(
      session.id,
      "tool_overuse",
      "low",
      "Heavy tool-call density",
      [`${toolCalls.length} tool-like messages detected.`],
      Math.round(wasted(toolCalls) * 0.25),
    ),
  ];
};

export const calculateAgentRoiScore = (
  session: ParsedSession,
  patterns: WastePattern[] = [],
): number => {
  const wastePenalty = patterns.reduce((sum, item) => sum + severityPenalty(item.severity), 0);
  const confidenceBoost = session.tokenEstimate.confidence * 10;
  return clamp(
    100 - wastePenalty + confidenceBoost - Math.log10(session.tokenEstimate.totalTokens + 1) * 4,
  );
};

export const calculateSessionEfficiency = (session: ParsedSession): SessionEfficiency => {
  const repeatedReadCount = detectRepeatedFileReads(session).length;
  return {
    sessionId: session.id,
    score: calculateAgentRoiScore(session),
    contextGrowthRate: calculateContextGrowthRate(session),
    retryCount: session.messages.filter((message) => /retry|failed|error/i.test(message.content))
      .length,
    uniqueFilesRead: new Set(session.replayEvents.map((event) => event.filePath).filter(Boolean))
      .size,
    repeatedFileReads: repeatedReadCount,
    promptLoopCount: detectPromptLoops(session).length,
  };
};

export const calculateContextGrowthRate = (session: ParsedSession): number => {
  const totals = session.messages
    .map((message) => message.tokenEstimate.totalTokens)
    .filter((value) => value > 0);
  if (totals.length < 2) return 1;
  const early = average(totals.slice(0, Math.ceil(totals.length / 3)));
  const late = average(totals.slice(-Math.ceil(totals.length / 3)));
  return early === 0 ? 1 : late / early;
};

const pattern = (
  sessionId: string,
  kind: WastePattern["kind"],
  severity: WastePattern["severity"],
  title: string,
  evidence: string[],
  estimatedWastedTokens: number,
): WastePattern => ({
  id: makeId("waste", `${sessionId}:${kind}:${evidence.join(":")}`),
  sessionId,
  kind,
  severity,
  title,
  explanation: explain(kind),
  evidence,
  estimatedWastedTokens,
  confidence: 0.7,
});

const explain = (kind: WastePattern["kind"]) =>
  ({
    prompt_loop:
      "Near-duplicate prompts can signal unclear acceptance criteria or a stuck correction loop.",
    repeated_file_read:
      "The same file entering context repeatedly often means retrieval is not being reused.",
    context_bloat:
      "Rapid context expansion can bury relevant state and increase every downstream step.",
    retry_chain:
      "Retry chains are expensive because the model spends tokens recovering instead of progressing.",
    high_cost_session: "Large sessions deserve review even when they eventually succeed.",
    tool_overuse: "Dense tool-call sequences can indicate unfocused exploration.",
  })[kind];

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
const wasted = (messages: ParsedMessage[]) =>
  messages.reduce((sum, message) => sum + message.tokenEstimate.totalTokens, 0);
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const severityPenalty = (severity: WastePattern["severity"]) =>
  severity === "high" ? 24 : severity === "medium" ? 14 : 7;
