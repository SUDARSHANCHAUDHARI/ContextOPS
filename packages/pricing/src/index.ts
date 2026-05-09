import type { CostEstimate, ModelPricing, ParsedSession } from "@contextops/core";

export const defaultPricing: Record<string, ModelPricing> = {
  "gpt-4.1": { model: "gpt-4.1", inputPerMillion: 2, outputPerMillion: 8, currency: "USD" },
  "gpt-4.1-mini": {
    model: "gpt-4.1-mini",
    inputPerMillion: 0.4,
    outputPerMillion: 1.6,
    currency: "USD",
  },
  "claude-3.5-sonnet": {
    model: "claude-3.5-sonnet",
    inputPerMillion: 3,
    outputPerMillion: 15,
    currency: "USD",
  },
  "gemini-1.5-pro": {
    model: "gemini-1.5-pro",
    inputPerMillion: 1.25,
    outputPerMillion: 5,
    currency: "USD",
  },
  unknown: { model: "unknown", inputPerMillion: 1, outputPerMillion: 3, currency: "USD" },
};

export const estimateSessionCost = (
  session: ParsedSession,
  customPricing: Record<string, ModelPricing> = {},
): CostEstimate[] => {
  const pricing = { ...defaultPricing, ...customPricing };
  const byModel = new Map<string, { input: number; output: number; confidence: number[] }>();

  for (const message of session.messages) {
    const model = message.model ?? "unknown";
    const current = byModel.get(model) ?? { input: 0, output: 0, confidence: [] };
    current.input += message.tokenEstimate.inputTokens;
    current.output += message.tokenEstimate.outputTokens;
    current.confidence.push(message.tokenEstimate.confidence);
    byModel.set(model, current);
  }

  if (byModel.size === 0) {
    byModel.set("unknown", {
      input: session.tokenEstimate.inputTokens,
      output: session.tokenEstimate.outputTokens,
      confidence: [session.tokenEstimate.confidence],
    });
  }

  return [...byModel.entries()].map(([model, usage]) => {
    const rate = pricing[model] ?? pricing.unknown;
    const estimatedUsd =
      (usage.input / 1_000_000) * rate.inputPerMillion +
      (usage.output / 1_000_000) * rate.outputPerMillion;
    return {
      sessionId: session.id,
      model,
      inputTokens: usage.input,
      outputTokens: usage.output,
      estimatedUsd,
      confidence: average(usage.confidence),
    };
  });
};

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
