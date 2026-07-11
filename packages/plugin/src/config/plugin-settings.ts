import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

export type PredictionMode = "automatic" | "manual" | "disabled";

export type PluginSettingError = Readonly<{
  kind: "PluginSettingError";
  setting: "model" | "predictionMode";
  message: string;
}>;

const PredictionModeSchema = z.enum(["automatic", "manual", "disabled"]);
const ModelIdSchema = z.string().trim().min(1);

const parseSetting = <Output>(
  schema: z.ZodType<Output>,
  value: unknown,
  setting: PluginSettingError["setting"],
): Result<Output, PluginSettingError> => {
  const parsed = schema.safeParse(value);
  return parsed.success
    ? ok(parsed.data)
    : err({ kind: "PluginSettingError", setting, message: z.prettifyError(parsed.error) });
};

export const PluginSettings = {
  parsePredictionMode: (value: unknown): PredictionMode =>
    parseSetting(PredictionModeSchema, value, "predictionMode").unwrapOr("disabled"),
  parseModelId: (value: unknown): string | undefined =>
    parseSetting(ModelIdSchema, value, "model").match(
      (modelId) => modelId,
      () => undefined,
    ),
} as const;
