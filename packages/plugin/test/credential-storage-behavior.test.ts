import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  EncryptedEnvelope,
  type HelperRequest,
  type HelperSuccess,
} from "@inkdrop-codex/credential-contract";
import { okAsync } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import { type CredentialCryptography, EncryptedCredentialStore } from "../src/index";

class ReversibleCredentialCryptography implements CredentialCryptography {
  execute(request: HelperRequest) {
    switch (request.kind) {
      case "Encrypt":
        return okAsync<HelperSuccess>({
          version: 1,
          kind: "Encrypted",
          envelope: {
            version: 1,
            algorithm: "aes-256-gcm",
            iv: Buffer.alloc(12).toString("base64"),
            ciphertext: Buffer.from(request.plaintext).toString("base64"),
            tag: Buffer.alloc(16).toString("base64"),
          },
        });
      case "Decrypt":
        return okAsync<HelperSuccess>({
          version: 1,
          kind: "Decrypted",
          plaintext: Buffer.from(request.envelope.ciphertext, "base64").toString(),
        });
      case "DeleteKey":
        return okAsync<HelperSuccess>({ version: 1, kind: "KeyDeleted" });
    }
  }
}

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("encrypted credential storage", () => {
  it("persists no plaintext secrets and returns the original credential", async () => {
    // Arrange
    const directory = await mkdtemp(path.join(tmpdir(), "inkdrop-codex-"));
    temporaryDirectories.push(directory);
    const store = new EncryptedCredentialStore(directory, new ReversibleCredentialCryptography());
    const credential = {
      type: "oauth",
      access: "access-secret-value",
      refresh: "refresh-secret-value",
      expires: 1_900_000_000_000,
    } as const;

    // Act
    await store.modify("openai-codex", async () => credential);
    const persisted = await readFile(
      path.join(directory, "inkdrop-codex", "credentials.enc.json"),
      "utf8",
    );
    const restored = await store.read("openai-codex");

    // Assert
    expect(persisted).not.toContain(credential.access);
    expect(persisted).not.toContain(credential.refresh);
    const envelope = EncryptedEnvelope.parseJson(persisted);
    expect(envelope.isOk()).toBe(true);
    expect(
      envelope.match(
        (value) => value,
        () => undefined,
      ),
    ).toMatchObject({
      version: 1,
      algorithm: "aes-256-gcm",
    });
    expect(restored).toEqual(credential);
  });

  it("rejects a decrypted payload that is not a valid credential record", async () => {
    // Arrange
    const directory = await mkdtemp(path.join(tmpdir(), "inkdrop-codex-"));
    temporaryDirectories.push(directory);
    const credentialDirectory = path.join(directory, "inkdrop-codex");
    await mkdir(credentialDirectory, { recursive: true });
    await writeFile(
      path.join(credentialDirectory, "credentials.enc.json"),
      JSON.stringify({
        version: 1,
        algorithm: "aes-256-gcm",
        iv: Buffer.alloc(12).toString("base64"),
        ciphertext: Buffer.from('{"openai-codex":{"type":"oauth"}}').toString("base64"),
        tag: Buffer.alloc(16).toString("base64"),
      }),
    );
    const store = new EncryptedCredentialStore(directory, new ReversibleCredentialCryptography());

    // Act
    const result = store.read("openai-codex");

    // Assert
    await expect(result).rejects.toThrow("Credential payload is invalid");
  });

  it("rejects an oversized credential file before invoking cryptography", async () => {
    // Arrange
    const directory = await mkdtemp(path.join(tmpdir(), "inkdrop-codex-"));
    temporaryDirectories.push(directory);
    const credentialDirectory = path.join(directory, "inkdrop-codex");
    await mkdir(credentialDirectory, { recursive: true });
    await writeFile(path.join(credentialDirectory, "credentials.enc.json"), "x".repeat(2_097_153));
    let executionCount = 0;
    const cryptography: CredentialCryptography = {
      execute: () => {
        executionCount += 1;
        return okAsync({ version: 1, kind: "KeyDeleted" } as const);
      },
    };
    const store = new EncryptedCredentialStore(directory, cryptography);

    // Act
    const result = store.read("openai-codex");

    // Assert
    await expect(result).rejects.toThrow("Credential file read failed");
    expect(executionCount).toBe(0);
  });

  it("rejects an invalid callback credential before persisting it", async () => {
    // Arrange
    const directory = await mkdtemp(path.join(tmpdir(), "inkdrop-codex-"));
    temporaryDirectories.push(directory);
    const store = new EncryptedCredentialStore(directory, new ReversibleCredentialCryptography());

    // Act
    const result = store.modify("openai-codex", async () =>
      JSON.parse('{"type":"oauth","access":"token"}'),
    );

    // Assert
    await expect(result).rejects.toThrow("Credential payload is invalid");
    await expect(
      readFile(path.join(directory, "inkdrop-codex", "credentials.enc.json"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
