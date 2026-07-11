import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type {
  EncryptedEnvelope,
  HelperRequest,
  HelperResponse,
  HelperSuccess,
} from "@inkdrop-codex/credential-contract";
import { keychainDelete, keychainGet, keychainSave } from "perry/system";
import { readBoundedUtf8 } from "./bounded-input.js";
import {
  createNativeFailure,
  createNativeSuccess,
  NATIVE_MAX_HELPER_MESSAGE_BYTES,
  NATIVE_PROTOCOL_VERSION,
  parseNativeHelperRequest,
} from "./native-contract.js";

const SERVICE = "com.inkdrop-codex.credentials";
const ACCOUNT = "envelope-key-v1";

const assertNever = (value: never): never => {
  throw new TypeError(`Unhandled credential request: ${JSON.stringify(value)}`);
};

const getEncryptionKey = (): Buffer => {
  const existing = keychainGet(SERVICE, ACCOUNT);
  if (existing) {
    const parsed = Buffer.from(existing, "base64");
    if (parsed.byteLength !== 32 || parsed.toString("base64") !== existing) {
      throw new Error("Stored encryption key is invalid");
    }
    return parsed;
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
  return createNativeSuccess.encrypted({
    version: NATIVE_PROTOCOL_VERSION,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  });
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
  return createNativeSuccess.decrypted(decrypt(envelope));
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
      return createNativeSuccess.keyDeleted();
    default:
      return assertNever(request);
  }
};

const createResponse = (): HelperResponse => {
  try {
    const input = readBoundedUtf8(0, NATIVE_MAX_HELPER_MESSAGE_BYTES);
    return handleRequest(parseNativeHelperRequest(input));
  } catch (error) {
    return createNativeFailure(error instanceof Error ? error.message : "Credential helper failed");
  }
};

const response = createResponse();

console.log(JSON.stringify(response));
if (response.kind === "Failure") {
  process.exitCode = 1;
}
