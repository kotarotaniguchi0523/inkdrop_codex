import { z } from "zod";
import { EncryptedEnvelope } from "./encrypted-envelope.js";
import { MAX_CREDENTIAL_PLAINTEXT_CHARACTERS } from "./limits.js";
import { parseContractJson } from "./parse-contract-json.js";
import { PROTOCOL_VERSION } from "./protocol-version.js";

const HelperRequestSchema = z
  .discriminatedUnion("kind", [
    z.object({
      version: z.literal(PROTOCOL_VERSION),
      kind: z.literal("Encrypt"),
      plaintext: z.string().max(MAX_CREDENTIAL_PLAINTEXT_CHARACTERS),
    }),
    z.object({
      version: z.literal(PROTOCOL_VERSION),
      kind: z.literal("Decrypt"),
      envelope: EncryptedEnvelope.schema,
    }),
    z.object({ version: z.literal(PROTOCOL_VERSION), kind: z.literal("DeleteKey") }),
  ])
  .readonly();

export type HelperRequest = z.infer<typeof HelperRequestSchema>;

export const HelperRequest = {
  schema: HelperRequestSchema,
  parseJson: (text: string) => parseContractJson(HelperRequestSchema, text, "HelperRequest"),
} as const;
