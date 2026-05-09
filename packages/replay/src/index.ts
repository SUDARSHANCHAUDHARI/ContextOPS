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
  };
};

export const summarizeReplay = (timeline: ReplayTimeline): string[] => [
  `${timeline.frames.length} replay frames`,
  `${timeline.fileReadSequences.flat().length} file reference events`,
  `${timeline.retryChains.flat().length} retry or error recovery events`,
  `${timeline.modelSwitches.length} model switches`,
];

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
