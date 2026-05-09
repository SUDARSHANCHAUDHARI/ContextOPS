import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { ContextOpsConfig } from "@contextops/core";

const pricingSchema = z.object({
  model: z.string(),
  inputPerMillion: z.number().nonnegative(),
  outputPerMillion: z.number().nonnegative(),
  currency: z.literal("USD").default("USD"),
});

const configSchema = z.object({
  scanPaths: z.array(z.string()).optional(),
  disabledAdapters: z
    .array(z.enum(["claude-code", "codex-cli", "cursor", "gemini-cli"]))
    .optional(),
  customPricing: z.record(pricingSchema).optional(),
  budgetAlerts: z
    .array(
      z.object({
        scope: z.enum(["session", "project", "daily", "monthly"]),
        amountUsd: z.number().positive(),
      }),
    )
    .optional(),
  privacyMode: z.enum(["strict", "balanced"]).optional(),
  replayRetentionDays: z.number().int().positive().optional(),
  ignoredDirectories: z.array(z.string()).optional(),
});

export const defaultConfig = (home = process.env.HOME ?? "."): ContextOpsConfig => ({
  scanPaths: [
    join(home, ".claude"),
    join(home, ".codex"),
    join(home, ".cursor"),
    join(home, ".gemini"),
  ],
  disabledAdapters: [],
  customPricing: {},
  budgetAlerts: [],
  privacyMode: "strict",
  replayRetentionDays: 90,
  ignoredDirectories: ["node_modules", ".git", "dist", ".next"],
});

export const loadConfig = (cwd = process.cwd()): ContextOpsConfig => {
  const base = defaultConfig();
  const path = join(cwd, "contextops.config.json");
  if (!existsSync(path)) return base;

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid contextops.config.json: malformed JSON (${message})`);
  }

  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid contextops.config.json: ${parsed.error.message}`);
  }

  const { customPricing, ...overrides } = parsed.data;
  return {
    ...base,
    ...definedValues(overrides),
    customPricing: { ...base.customPricing, ...(customPricing ?? {}) },
  };
};

export const validateConfig = (value: unknown): ContextOpsConfig => {
  const parsed = configSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid ContextOps config: ${parsed.error.message}`);
  }
  const base = defaultConfig();
  const { customPricing, ...overrides } = parsed.data;
  return {
    ...base,
    ...definedValues(overrides),
    customPricing: { ...base.customPricing, ...(customPricing ?? {}) },
  };
};

const definedValues = <T extends Record<string, unknown>>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
