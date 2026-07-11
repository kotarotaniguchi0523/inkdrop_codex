import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  type EncryptedEnvelope,
  HelperRequest,
  type HelperResponse,
  type HelperSuccess,
  MAX_HELPER_MESSAGE_BYTES,
  PROTOCOL_VERSION,
} from "@inkdrop-codex/credential-contract";
import { keychainDelete, keychainGet, keychainSave } from "perry/system";
import { z } from "zod";
import { readBoundedUtf8 } from "./bounded-input.js";

const SERVICE = "com.inkdrop-codex.credentials";
const ACCOUNT = "envelope-key-v1";

const EncryptionKeySchema = z
  .base64()
  .transform((encoded) => Buffer.from(encoded, "base64"))
  .refine((key) => key.byteLength === 32, "Encryption key must be 32 bytes");

const createFailure = (message: string): HelperResponse => ({
  version: PROTOCOL_VERSION,
  kind: "Failure",
  error: { kind: "CredentialHelperFailure", message },
});

const assertNever = (value: never): never => {
  throw new TypeError(`Unhandled credential request: ${JSON.stringify(value)}`);
};

const getEncryptionKey = (): Buffer => {
  const existing = keychainGet(SERVICE, ACCOUNT);
  if (existing) {
    const parsed = EncryptionKeySchema.safeParse(existing);
    if (!parsed.success) {
      throw new Error("Stored encryption key is invalid");
    }
    return parsed.data;
  }
  const created = randomBytes(32);
  if (!keychainSave(SERVICE, ACCOUNT, created.toString("base64"))) {
    throw new Error("Could not save encryption key");
  }
  return created;
};

const encrypt = (plaintext: string): HelperSuccess => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    version: PROTOCOL_VERSION,
    kind: "Encrypted",
    envelope: {
      version: PROTOCOL_VERSION,
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
    },
  };
};

const decrypt = (envelope: EncryptedEnvelope): string => {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

function createDecryptionResponse(
  envelope: Extract<HelperRequest, { kind: "Decrypt" }>["envelope"],
): HelperSuccess {
  return { version: PROTOCOL_VERSION, kind: "Decrypted", plaintext: decrypt(envelope) };
}

const handleRequest = (request: HelperRequest): HelperSuccess => {
  switch (request.kind) {
    case "Encrypt":
      return encrypt(request.plaintext);
    case "Decrypt":
      return createDecryptionResponse(request.envelope);
    case "DeleteKey":
      if (!keychainDelete(SERVICE, ACCOUNT)) {
        throw new Error("Could not delete encryption key");
      }
      return { version: PROTOCOL_VERSION, kind: "KeyDeleted" };
    default:
      return assertNever(request);
  }
};

const createResponse = (): HelperResponse => {
  try {
    const input = readBoundedUtf8(0, MAX_HELPER_MESSAGE_BYTES);
    return HelperRequest.parseJson(input).match(
      (request) => {
        try {
          return handleRequest(request);
        } catch (error) {
          return createFailure(error instanceof Error ? error.message : "Credential helper failed");
        }
      },
      (error) => createFailure(error.message),
    );
  } catch (error) {
    return createFailure(error instanceof Error ? error.message : "Credential helper failed");
  }
};

const response = createResponse();

console.log(JSON.stringify(response));
if (response.kind === "Failure") {
  process.exitCode = 1;
}
