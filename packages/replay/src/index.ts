import type { ParsedSession, ReplayEvent } from "@contextops/core";

export interface ReplayFrame {
  index: number;
  timestamp: string;
  title: string;
  event: ReplayEvent;
  cumulativeTokens: number;
  contextSize: number;
}

export interface ReplayTimeline {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  frames: ReplayFrame[];
  modelSwitches: ReplayEvent[];
  retryChains: ReplayEvent[][];
  fileReadSequences: ReplayEvent[][];
  metrics: ReplayMetrics;
}

export interface ReplayMetrics {
  durationMinutes: number;
  maxContextSize: number;
  contextGrowthRate: number;
  eventCounts: Record<string, number>;
  uniqueFilesRead: number;
  retryEventCount: number;
}

export const buildReplayTimeline = (session: ParsedSession): ReplayTimeline => {
  const events = [...session.replayEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  let cumulativeTokens = 0;
  const frames = events.map((event, index) => {
    cumulativeTokens += event.tokens ?? 0;
    return {
      index,
      timestamp: event.timestamp,
      title: event.label,
      event,
      cumulativeTokens,
      contextSize: cumulativeTokens,
    };
  });

  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    frames,
    modelSwitches: events.filter((event) => event.kind === "model_switch"),
    retryChains: groupAdjacent(
      events.filter((event) => /retry|failed|error/i.test(event.detail ?? event.label)),
    ),
    fileReadSequences: groupAdjacent(events.filter((event) => event.kind === "file_read")),
    metrics: replayMetrics(session, events, frames),
  };
};

export const summarizeReplay = (timeline: ReplayTimeline): string[] => [
  `${timeline.frames.length} replay frames`,
  `${timeline.fileReadSequences.flat().length} file reference events`,
  `${timeline.retryChains.flat().length} retry or error recovery events`,
  `${timeline.modelSwitches.length} model switches`,
  `${timeline.metrics.maxContextSize.toLocaleString()} max context tokens`,
];

const replayMetrics = (
  session: ParsedSession,
  events: ReplayEvent[],
  frames: ReplayFrame[],
): ReplayMetrics => {
  const eventCounts = events.reduce<Record<string, number>>((counts, event) => {
    counts[event.kind] = (counts[event.kind] ?? 0) + 1;
    return counts;
  }, {});
  const maxContextSize = frames.reduce(
    (max, frame) => Math.max(max, frame.contextSize, frame.cumulativeTokens),
    0,
  );
  return {
    durationMinutes: durationMinutes(session.startedAt, session.endedAt),
    maxContextSize,
    contextGrowthRate: contextGrowthRate(frames),
    eventCounts,
    uniqueFilesRead: new Set(events.map((event) => event.filePath).filter(Boolean)).size,
    retryEventCount: eventCounts.retry ?? 0,
  };
};

const groupAdjacent = (events: ReplayEvent[]) => {
  const groups: ReplayEvent[][] = [];
  for (const event of events) {
    const last = groups.at(-1);
    if (!last || minutesBetween(last.at(-1)!, event) > 10) {
      groups.push([event]);
    } else {
      last.push(event);
    }
  }
  return groups.filter((group) => group.length > 0);
};

const minutesBetween = (left: ReplayEvent, right: ReplayEvent) =>
  Math.abs(new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()) / 60_000;

const durationMinutes = (startedAt: string, endedAt?: string) => {
  if (!endedAt) return 0;
  const duration = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration / 60_000) : 0;
};

const contextGrowthRate = (frames: ReplayFrame[]) => {
  const contextFrames = frames.filter((frame) => frame.contextSize > 0);
  if (contextFrames.length < 2) return 1;
  const first = contextFrames[0]?.contextSize ?? 1;
  const last = contextFrames.at(-1)?.contextSize ?? first;
  return first === 0 ? 1 : Number((last / first).toFixed(2));
};
