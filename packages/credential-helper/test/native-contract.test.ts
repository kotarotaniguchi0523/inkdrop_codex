import {
  MAX_CREDENTIAL_PLAINTEXT_CHARACTERS,
  MAX_ENVELOPE_FIELD_CHARACTERS,
  MAX_HELPER_ERROR_CHARACTERS,
  MAX_HELPER_MESSAGE_BYTES,
  PROTOCOL_VERSION,
} from "@inkdrop-codex/credential-contract";
import { describe, expect, it } from "vitest";
import {
  NATIVE_MAX_CREDENTIAL_PLAINTEXT_CHARACTERS,
  NATIVE_MAX_ENVELOPE_FIELD_CHARACTERS,
  NATIVE_MAX_HELPER_ERROR_CHARACTERS,
  NATIVE_MAX_HELPER_MESSAGE_BYTES,
  NATIVE_PROTOCOL_VERSION,
  parseNativeHelperRequest,
} from "../src/native-contract.js";

describe("native credential contract", () => {
  it("keeps native limits aligned with the Zod application contract", () => {
    // Arrange
    const applicationContract = {
      protocol: PROTOCOL_VERSION,
      plaintext: MAX_CREDENTIAL_PLAINTEXT_CHARACTERS,
      envelope: MAX_ENVELOPE_FIELD_CHARACTERS,
      error: MAX_HELPER_ERROR_CHARACTERS,
      message: MAX_HELPER_MESSAGE_BYTES,
    };

    // Act
    const nativeContract = {
      protocol: NATIVE_PROTOCOL_VERSION,
      plaintext: NATIVE_MAX_CREDENTIAL_PLAINTEXT_CHARACTERS,
      envelope: NATIVE_MAX_ENVELOPE_FIELD_CHARACTERS,
      error: NATIVE_MAX_HELPER_ERROR_CHARACTERS,
      message: NATIVE_MAX_HELPER_MESSAGE_BYTES,
    };

    // Assert
    expect(nativeContract).toEqual(applicationContract);
  });

  it("rejects malformed encrypted envelopes before native cryptography", () => {
    // Arrange
    const input = JSON.stringify({
      version: 1,
      kind: "Decrypt",
      envelope: {
        version: 1,
        algorithm: "aes-256-gcm",
        iv: "not-base64-data",
        ciphertext: "AAAA",
        tag: Buffer.alloc(16).toString("base64"),
      },
    });

    // Act
    const parse = () => parseNativeHelperRequest(input);

    // Assert
    expect(parse).toThrow("Credential envelope is invalid");
  });
});
