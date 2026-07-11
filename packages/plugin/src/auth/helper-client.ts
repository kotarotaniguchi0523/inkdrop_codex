import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import {
  type ContractBoundaryError,
  type HelperRequest,
  HelperResponse,
  type HelperSuccess,
  MAX_HELPER_MESSAGE_BYTES,
} from "@inkdrop-codex/credential-contract";
import { err, errAsync, ok, ResultAsync } from "neverthrow";

export type CredentialCryptographyError =
  | Readonly<{ kind: "HelperExecutableUnavailable"; platform: string; architecture: string }>
  | Readonly<{ kind: "HelperProcessFailure"; message: string }>
  | Readonly<{ kind: "HelperProtocolFailure"; cause: ContractBoundaryError }>
  | Readonly<{ kind: "HelperOperationFailure"; message: string }>;

export type CredentialCryptography = Readonly<{
  execute: (request: HelperRequest) => ResultAsync<HelperSuccess, CredentialCryptographyError>;
}>;

type ProcessOutput = Readonly<{ stdout: string }>;

const HELPER_TIMEOUT_MILLISECONDS = 30_000;

const checkAccess = async (candidate: string): Promise<string | undefined> =>
  access(candidate).then(
    () => candidate,
    () => undefined,
  );

export class CredentialHelperClient implements CredentialCryptography {
  private readonly packageRoot: string;

  constructor(packageRoot: string) {
    this.packageRoot = packageRoot;
  }

  private findExecutable(): ResultAsync<string, CredentialCryptographyError> {
    const suffix = process.platform === "win32" ? ".exe" : "";
    const executableName = `credential-helper${suffix}`;
    const candidates = [
      path.join(this.packageRoot, "bin", `${process.platform}-${process.arch}`, executableName),
      path.resolve(
        this.packageRoot,
        "../credential-helper/dist",
        `${process.platform}-${process.arch}`,
        executableName,
      ),
    ];
    return ResultAsync.fromPromise(
      Promise.all(candidates.map(checkAccess)),
      (error): CredentialCryptographyError => ({
        kind: "HelperProcessFailure",
        message: error instanceof Error ? error.message : "Could not inspect helper executables",
      }),
    ).andThen((available) => {
      const executable = available.find((candidate) => candidate !== undefined);
      return executable
        ? ok(executable)
        : err({
            kind: "HelperExecutableUnavailable" as const,
            platform: process.platform,
            architecture: process.arch,
          });
    });
  }

  private runExecutable(
    executable: string,
    request: HelperRequest,
  ): ResultAsync<ProcessOutput, CredentialCryptographyError> {
    const serializedRequest = JSON.stringify(request);
    if (Buffer.byteLength(serializedRequest) > MAX_HELPER_MESSAGE_BYTES) {
      return errAsync({
        kind: "HelperProcessFailure",
        message: `Credential helper request exceeds ${MAX_HELPER_MESSAGE_BYTES} bytes`,
      });
    }
    const execution = new Promise<ProcessOutput>((resolve, reject) => {
      const child = spawn(executable, [], {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
      let stdout = "";
      let stdoutBytes = 0;
      let settled = false;
      const fail = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        child.kill();
        reject(error);
      };
      const timeout = setTimeout(() => {
        fail(new Error(`Credential helper timed out after ${HELPER_TIMEOUT_MILLISECONDS} ms`));
      }, HELPER_TIMEOUT_MILLISECONDS);
      child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
        stdoutBytes += Buffer.byteLength(chunk);
        if (stdoutBytes > MAX_HELPER_MESSAGE_BYTES) {
          fail(new Error(`Credential helper response exceeds ${MAX_HELPER_MESSAGE_BYTES} bytes`));
          return;
        }
        stdout += chunk;
      });
      child.stderr.resume();
      child.on("error", (error) => fail(error));
      child.on("close", () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve({ stdout });
      });
      child.stdin.end(serializedRequest);
    });
    return ResultAsync.fromPromise(
      execution,
      (error): CredentialCryptographyError => ({
        kind: "HelperProcessFailure",
        message: error instanceof Error ? error.message : "Credential helper process failed",
      }),
    );
  }

  execute(request: HelperRequest): ResultAsync<HelperSuccess, CredentialCryptographyError> {
    return this.findExecutable()
      .andThen((executable) => this.runExecutable(executable, request))
      .andThen((output) =>
        HelperResponse.parseJson(output.stdout)
          .mapErr(
            (cause): CredentialCryptographyError => ({
              kind: "HelperProtocolFailure",
              cause,
            }),
          )
          .andThen((response) =>
            response.kind === "Failure"
              ? err({
                  kind: "HelperOperationFailure" as const,
                  message: response.error.message,
                })
              : ok(response),
          ),
      );
  }
}
