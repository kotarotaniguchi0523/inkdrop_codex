import type { Credential } from "@earendil-works/pi-ai";
import { err, ok, Result } from "neverthrow";
import { z } from "zod";

export type StoredCredentialsBoundaryError = Readonly<{
  kind: "StoredCredentialsBoundaryError";
  message: string;
}>;

const createBoundaryError = (message: string): StoredCredentialsBoundaryError => ({
  kind: "StoredCredentialsBoundaryError",
  message,
});

const ApiKeyCredentialSchema = z
  .object({
    type: z.literal("api_key"),
    key: z.string().optional(),
    env: z.record(z.string(), z.string()).optional(),
  })
  .readonly();

const OAuthCredentialSchema = z
  .object({
    type: z.literal("oauth"),
    access: z.string().min(1),
    refresh: z.string().min(1),
    expires: z.number().finite(),
  })
  .catchall(z.unknown())
  .readonly();

const StoredCredentialSchema = z.discriminatedUnion("type", [
  ApiKeyCredentialSchema,
  OAuthCredentialSchema,
]);

const StoredCredentialsSchema = z.record(z.string().min(1), StoredCredentialSchema).readonly();

type StoredCredential = z.infer<typeof StoredCredentialSchema>;

const parseJson = Result.fromThrowable(
  (text: string): unknown => JSON.parse(text),
  (): StoredCredentialsBoundaryError => createBoundaryError("Credential payload is not valid JSON"),
);

export type StoredCredentials = Readonly<Record<string, Credential>>;

const toCredential = (credential: StoredCredential): Credential => {
  if (credential.type === "oauth") {
    return credential;
  }
  return {
    type: "api_key",
    ...(credential.key === undefined ? {} : { key: credential.key }),
    ...(credential.env === undefined ? {} : { env: credential.env }),
  };
};

export const StoredCredentials = {
  empty: (): StoredCredentials => ({}),
  parseJson: (text: string): Result<StoredCredentials, StoredCredentialsBoundaryError> =>
    parseJson(text).andThen((value) => {
      const parsed = StoredCredentialsSchema.safeParse(value);
      return parsed.success
        ? ok(
            Object.fromEntries(
              Object.entries(parsed.data).map(([providerId, credential]) => [
                providerId,
                toCredential(credential),
              ]),
            ),
          )
        : err(createBoundaryError(z.prettifyError(parsed.error)));
    }),
  set: (
    credentials: StoredCredentials,
    providerId: string,
    credential: Credential,
  ): StoredCredentials => ({ ...credentials, [providerId]: credential }),
  remove: (credentials: StoredCredentials, providerId: string): StoredCredentials =>
    Object.fromEntries(Object.entries(credentials).filter(([key]) => key !== providerId)),
} as const;

export const StoredCredential = {
  parse: (value: unknown): Result<Credential, StoredCredentialsBoundaryError> => {
    const parsed = StoredCredentialSchema.safeParse(value);
    return parsed.success
      ? ok(toCredential(parsed.data))
      : err(createBoundaryError(z.prettifyError(parsed.error)));
  },
  schema: StoredCredentialSchema,
} as const;
