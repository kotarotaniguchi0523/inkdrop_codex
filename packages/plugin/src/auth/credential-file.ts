import { mkdir, open, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_HELPER_MESSAGE_BYTES } from "@inkdrop-codex/credential-contract";
import { errAsync, ok, ResultAsync } from "neverthrow";

export type CredentialFileError = Readonly<{
  kind: "CredentialFileError";
  operation: "Read" | "Write" | "Delete";
  cause: unknown;
}>;

export type CredentialFile = Readonly<{
  read: () => ResultAsync<string | undefined, CredentialFileError>;
  write: (content: string) => ResultAsync<void, CredentialFileError>;
  delete: () => ResultAsync<void, CredentialFileError>;
}>;

const getErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return;
  }
  return typeof error.code === "string" ? error.code : undefined;
};

const createError = (
  operation: CredentialFileError["operation"],
  cause: unknown,
): CredentialFileError => ({ kind: "CredentialFileError", operation, cause });

const readCredentialFile = async (file: string): Promise<string> => {
  const handle = await open(file, "r");
  try {
    const metadata = await handle.stat();
    if (metadata.size > MAX_HELPER_MESSAGE_BYTES) {
      throw new RangeError(`Credential file exceeds ${MAX_HELPER_MESSAGE_BYTES} bytes`);
    }
    const content = await handle.readFile("utf8");
    if (Buffer.byteLength(content) > MAX_HELPER_MESSAGE_BYTES) {
      throw new RangeError(`Credential file exceeds ${MAX_HELPER_MESSAGE_BYTES} bytes`);
    }
    return content;
  } finally {
    await handle.close();
  }
};

export const createCredentialFile = (file: string): CredentialFile => ({
  read: () =>
    ResultAsync.fromPromise(readCredentialFile(file), (cause) => createError("Read", cause)).orElse(
      (error) => (getErrorCode(error.cause) === "ENOENT" ? ok(undefined) : errAsync(error)),
    ),
  write: (content) => {
    const temporary = `${file}.${process.pid}.tmp`;
    return ResultAsync.fromPromise(
      mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
        .then(() => writeFile(temporary, content, { mode: 0o600 }))
        .then(() => rename(temporary, file)),
      (cause) => createError("Write", cause),
    );
  },
  delete: () =>
    ResultAsync.fromPromise(unlink(file), (cause) => createError("Delete", cause)).orElse(
      (error) => (getErrorCode(error.cause) === "ENOENT" ? ok(undefined) : errAsync(error)),
    ),
});
