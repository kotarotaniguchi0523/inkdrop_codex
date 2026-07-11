import { describe, expect, it } from "vitest";
import { EncryptedEnvelope, HelperRequest, HelperResponse } from "../src/index.js";

describe("credential helper protocol", () => {
  it("returns a typed encrypt request for valid external JSON", () => {
    // Arrange
    const input = JSON.stringify({ version: 1, kind: "Encrypt", plaintext: "secret" });

    // Act
    const result = HelperRequest.parseJson(input);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(
      result.match(
        (value) => value,
        () => undefined,
      ),
    ).toEqual({
      version: 1,
      kind: "Encrypt",
      plaintext: "secret",
    });
  });

  it("rejects an invalid response before it enters the application", () => {
    // Arrange
    const input = JSON.stringify({ version: 1, kind: "Encrypted" });

    // Act
    const result = HelperResponse.parseJson(input);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(
      result.match(
        () => undefined,
        (error) => error,
      ),
    ).toMatchObject({
      kind: "ContractBoundaryError",
      source: "HelperResponse",
    });
  });

  it("rejects oversized encrypted credential fields at the contract boundary", () => {
    // Arrange
    const input = JSON.stringify({
      version: 1,
      algorithm: "aes-256-gcm",
      iv: Buffer.alloc(12).toString("base64"),
      ciphertext: "A".repeat(1_398_113),
      tag: Buffer.alloc(16).toString("base64"),
    });

    // Act
    const result = EncryptedEnvelope.parseJson(input);

    // Assert
    expect(result.isErr()).toBe(true);
  });
});
