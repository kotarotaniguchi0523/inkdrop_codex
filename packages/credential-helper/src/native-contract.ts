import type {
  EncryptedEnvelope,
  HelperRequest,
  HelperResponse,
  HelperSuccess,
} from "@inkdrop-codex/credential-contract";

export const NATIVE_PROTOCOL_VERSION = 1;
export const NATIVE_MAX_CREDENTIAL_PLAINTEXT_CHARACTERS = 1_048_576;
export const NATIVE_MAX_ENVELOPE_FIELD_CHARACTERS = 1_398_112;
export const NATIVE_MAX_HELPER_ERROR_CHARACTERS = 2048;
export const NATIVE_MAX_HELPER_MESSAGE_BYTES = 2_097_152;

const BASE64_PATTERN = /^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?$/u;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCanonicalBase64 = (value: string): boolean => {
  if (!BASE64_PATTERN.test(value)) {
    return false;
  }
  const decoded = Buffer.from(value, "base64");
  return decoded.toString("base64") === value;
};

const parseEnvelope = (value: unknown): EncryptedEnvelope => {
  if (
    !isRecord(value) ||
    value.version !== NATIVE_PROTOCOL_VERSION ||
    value.algorithm !== "aes-256-gcm" ||
    typeof value.iv !== "string" ||
    value.iv.length !== 16 ||
    !isCanonicalBase64(value.iv) ||
    typeof value.ciphertext !== "string" ||
    value.ciphertext.length === 0 ||
    value.ciphertext.length > NATIVE_MAX_ENVELOPE_FIELD_CHARACTERS ||
    !isCanonicalBase64(value.ciphertext) ||
    typeof value.tag !== "string" ||
    value.tag.length !== 24 ||
    !isCanonicalBase64(value.tag)
  ) {
    throw new TypeError("Credential envelope is invalid");
  }
  return {
    version: NATIVE_PROTOCOL_VERSION,
    algorithm: "aes-256-gcm",
    iv: value.iv,
    ciphertext: value.ciphertext,
    tag: value.tag,
  };
};

const parseJson = (input: string): unknown => {
  try {
    return JSON.parse(input);
  } catch (cause) {
    throw new TypeError("Credential helper request is not valid JSON", { cause });
  }
};

export const parseNativeHelperRequest = (input: string): HelperRequest => {
  const value = parseJson(input);
  if (!isRecord(value) || value.version !== NATIVE_PROTOCOL_VERSION) {
    throw new TypeError("Credential helper request version is invalid");
  }
  switch (value.kind) {
    case "Encrypt":
      if (
        typeof value.plaintext !== "string" ||
        value.plaintext.length > NATIVE_MAX_CREDENTIAL_PLAINTEXT_CHARACTERS
      ) {
        throw new TypeError("Credential plaintext is invalid");
      }
      return { version: NATIVE_PROTOCOL_VERSION, kind: "Encrypt", plaintext: value.plaintext };
    case "Decrypt":
      return {
        version: NATIVE_PROTOCOL_VERSION,
        kind: "Decrypt",
        envelope: parseEnvelope(value.envelope),
      };
    case "DeleteKey":
      return { version: NATIVE_PROTOCOL_VERSION, kind: "DeleteKey" };
    default:
      throw new TypeError("Credential helper request kind is invalid");
  }
};

export const createNativeFailure = (message: string): HelperResponse => ({
  version: NATIVE_PROTOCOL_VERSION,
  kind: "Failure",
  error: {
    kind: "CredentialHelperFailure",
    message: message.slice(0, NATIVE_MAX_HELPER_ERROR_CHARACTERS) || "Credential helper failed",
  },
});

export const createNativeSuccess = {
  decrypted: (plaintext: string): HelperSuccess => ({
    version: NATIVE_PROTOCOL_VERSION,
    kind: "Decrypted",
    plaintext,
  }),
  encrypted: (envelope: EncryptedEnvelope): HelperSuccess => ({
    version: NATIVE_PROTOCOL_VERSION,
    kind: "Encrypted",
    envelope,
  }),
  keyDeleted: (): HelperSuccess => ({
    version: NATIVE_PROTOCOL_VERSION,
    kind: "KeyDeleted",
  }),
} as const;
