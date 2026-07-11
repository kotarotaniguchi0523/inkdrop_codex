import { err, ok, Result } from "neverthrow";
import { z } from "zod";
import type { ContractBoundaryError, ContractBoundarySource } from "./contract-boundary-error.js";

const parseJson = Result.fromThrowable(
  (text: string): unknown => JSON.parse(text),
  (): string => "Input is not valid JSON",
);

const createBoundaryError = (
  source: ContractBoundarySource,
  message: string,
): ContractBoundaryError => ({ kind: "ContractBoundaryError", source, message });

export const parseContractJson = <Output>(
  schema: z.ZodType<Output>,
  text: string,
  source: ContractBoundarySource,
): Result<Output, ContractBoundaryError> =>
  parseJson(text)
    .mapErr((message) => createBoundaryError(source, message))
    .andThen((value) => {
      const parsed = schema.safeParse(value);
      return parsed.success
        ? ok(parsed.data)
        : err(createBoundaryError(source, z.prettifyError(parsed.error)));
    });
