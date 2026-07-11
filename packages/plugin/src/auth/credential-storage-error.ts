import type { ContractBoundaryError, HelperRequest } from "@inkdrop-codex/credential-contract";
import type { CredentialFileError } from "./credential-file";
import type { CredentialCryptographyError } from "./helper-client";
import type { StoredCredentialsBoundaryError } from "./stored-credentials";

export type CredentialStorageError =
  | Readonly<{ kind: "CredentialFileFailed"; cause: CredentialFileError }>
  | Readonly<{ kind: "CredentialEnvelopeInvalid"; cause: ContractBoundaryError }>
  | Readonly<{ kind: "CredentialPayloadInvalid"; cause: StoredCredentialsBoundaryError }>
  | Readonly<{ kind: "CredentialCryptographyFailed"; cause: CredentialCryptographyError }>
  | Readonly<{ kind: "UnexpectedHelperResponse"; request: HelperRequest["kind"] }>;

const assertNever = (value: never): never => {
  throw new TypeError(`Unhandled credential storage error: ${JSON.stringify(value)}`);
};

export const CredentialStorageError = {
  format: (error: CredentialStorageError): string => {
    switch (error.kind) {
      case "CredentialFileFailed":
        return `Credential file ${error.cause.operation.toLowerCase()} failed`;
      case "CredentialEnvelopeInvalid":
        return `Credential envelope is invalid: ${error.cause.message}`;
      case "CredentialPayloadInvalid":
        return `Credential payload is invalid: ${error.cause.message}`;
      case "CredentialCryptographyFailed":
        return `Credential cryptography failed: ${error.cause.kind}`;
      case "UnexpectedHelperResponse":
        return `Credential helper returned an unexpected response to ${error.request}`;
      default:
        return assertNever(error);
    }
  },
} as const;
