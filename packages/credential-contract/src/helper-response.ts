import { z } from "zod";
import { EncryptedEnvelope } from "./encrypted-envelope.js";
import { MAX_CREDENTIAL_PLAINTEXT_CHARACTERS, MAX_HELPER_ERROR_CHARACTERS } from "./limits.js";
import { parseContractJson } from "./parse-contract-json.js";
import { PROTOCOL_VERSION } from "./protocol-version.js";

const HelperSuccessSchema = z
  .discriminatedUnion("kind", [
    z.object({
      version: z.literal(PROTOCOL_VERSION),
      kind: z.literal("Encrypted"),
      envelope: EncryptedEnvelope.schema,
    }),
    z.object({
      version: z.literal(PROTOCOL_VERSION),
      kind: z.literal("Decrypted"),
      plaintext: z.string().max(MAX_CREDENTIAL_PLAINTEXT_CHARACTERS),
    }),
    z.object({ version: z.literal(PROTOCOL_VERSION), kind: z.literal("KeyDeleted") }),
  ])
  .readonly();

const HelperFailureSchema = z
  .object({
    version: z.literal(PROTOCOL_VERSION),
    kind: z.literal("Failure"),
    error: z
      .object({
        kind: z.literal("CredentialHelperFailure"),
        message: z.string().min(1).max(MAX_HELPER_ERROR_CHARACTERS),
      })
      .readonly(),
  })
  .readonly();

const HelperResponseSchema = z.union([HelperSuccessSchema, HelperFailureSchema]).readonly();

export type HelperSuccess = z.infer<typeof HelperSuccessSchema>;
export type HelperResponse = z.infer<typeof HelperResponseSchema>;

export const HelperResponse = {
  schema: HelperResponseSchema,
  parseJson: (text: string) => parseContractJson(HelperResponseSchema, text, "HelperResponse"),
} as const;
