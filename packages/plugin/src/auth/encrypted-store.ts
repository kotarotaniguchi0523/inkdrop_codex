import path from "node:path";
import type { Credential, CredentialStore } from "@earendil-works/pi-ai";
import { EncryptedEnvelope, type HelperRequest } from "@inkdrop-codex/credential-contract";
import { err, errAsync, ok, type ResultAsync } from "neverthrow";
import { type CredentialFile, createCredentialFile } from "./credential-file";
import {
  CredentialStorageError,
  type CredentialStorageError as StorageError,
} from "./credential-storage-error";
import type { CredentialCryptography } from "./helper-client";
import { StoredCredential, StoredCredentials } from "./stored-credentials";

const createUnexpectedResponse = (request: HelperRequest["kind"]): StorageError => ({
  kind: "UnexpectedHelperResponse",
  request,
});

const unwrap = async <Value>(result: ResultAsync<Value, StorageError>): Promise<Value> =>
  result.match(
    (value) => value,
    (error) => Promise.reject(new Error(CredentialStorageError.format(error))),
  );

export class EncryptedCredentialStore implements CredentialStore {
  private chain: Promise<unknown> = Promise.resolve();
  private readonly file: CredentialFile;
  private readonly cryptography: CredentialCryptography;

  constructor(userDataPath: string, cryptography: CredentialCryptography) {
    this.cryptography = cryptography;
    this.file = createCredentialFile(
      path.join(userDataPath, "inkdrop-codex", "credentials.enc.json"),
    );
  }

  private decryptEnvelope(
    serializedEnvelope: string,
  ): ResultAsync<StoredCredentials, StorageError> {
    return EncryptedEnvelope.parseJson(serializedEnvelope).match(
      (envelope) =>
        this.cryptography
          .execute({ version: 1, kind: "Decrypt", envelope })
          .mapErr((cause): StorageError => ({ kind: "CredentialCryptographyFailed", cause }))
          .andThen((response) =>
            response.kind === "Decrypted"
              ? StoredCredentials.parseJson(response.plaintext).mapErr(
                  (cause): StorageError => ({ kind: "CredentialPayloadInvalid", cause }),
                )
              : err(createUnexpectedResponse("Decrypt")),
          ),
      (cause) =>
        errAsync<StoredCredentials, StorageError>({ kind: "CredentialEnvelopeInvalid", cause }),
    );
  }

  private load(): ResultAsync<StoredCredentials, StorageError> {
    return this.file
      .read()
      .mapErr((cause): StorageError => ({ kind: "CredentialFileFailed", cause }))
      .andThen((serialized) =>
        serialized === undefined ? ok(StoredCredentials.empty()) : this.decryptEnvelope(serialized),
      );
  }

  private save(credentials: StoredCredentials): ResultAsync<void, StorageError> {
    return this.cryptography
      .execute({ version: 1, kind: "Encrypt", plaintext: JSON.stringify(credentials) })
      .mapErr((cause): StorageError => ({ kind: "CredentialCryptographyFailed", cause }))
      .andThen((response) =>
        response.kind === "Encrypted"
          ? ok(response.envelope)
          : err(createUnexpectedResponse("Encrypt")),
      )
      .andThen((envelope) =>
        this.file
          .write(JSON.stringify(envelope))
          .mapErr((cause): StorageError => ({ kind: "CredentialFileFailed", cause })),
      );
  }

  private serialize<Value>(task: () => Promise<Value>): Promise<Value> {
    const result = this.chain.then(task, task);
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  read(providerId: string): Promise<Credential | undefined> {
    return this.serialize(async () => (await unwrap(this.load()))[providerId]);
  }

  modify(
    providerId: string,
    update: (current: Credential | undefined) => Promise<Credential | undefined>,
  ): Promise<Credential | undefined> {
    return this.serialize(async () => {
      const credentials = await unwrap(this.load());
      const next = await update(credentials[providerId]);
      if (next === undefined) {
        return credentials[providerId];
      }
      return unwrap(
        StoredCredential.parse(next)
          .mapErr((cause): StorageError => ({ kind: "CredentialPayloadInvalid", cause }))
          .asyncAndThen((validated) =>
            this.save(StoredCredentials.set(credentials, providerId, validated)).map(
              () => validated,
            ),
          ),
      );
    });
  }

  delete(providerId: string): Promise<void> {
    return this.serialize(async () => {
      const credentials = StoredCredentials.remove(await unwrap(this.load()), providerId);
      if (Object.keys(credentials).length > 0) {
        await unwrap(this.save(credentials));
        return;
      }
      await unwrap(
        this.file
          .delete()
          .mapErr((cause): StorageError => ({ kind: "CredentialFileFailed", cause })),
      );
    });
  }
}
