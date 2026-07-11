import { z } from "zod";
import { MAX_ENVELOPE_FIELD_CHARACTERS } from "./limits.js";
import { parseContractJson } from "./parse-contract-json.js";
import { PROTOCOL_VERSION } from "./protocol-version.js";

const EncryptedEnvelopeSchema = z
  .object({
    version: z.literal(PROTOCOL_VERSION),
    algorithm: z.literal("aes-256-gcm"),
    iv: z.string().length(16),
    ciphertext: z.string().min(1).max(MAX_ENVELOPE_FIELD_CHARACTERS),
    tag: z.string().length(24),
  })
  .readonly();

export type EncryptedEnvelope = z.infer<typeof EncryptedEnvelopeSchema>;

export const EncryptedEnvelope = {
  schema: EncryptedEnvelopeSchema,
  parseJson: (text: string) =>
    parseContractJson(EncryptedEnvelopeSchema, text, "EncryptedEnvelope"),
} as const;
