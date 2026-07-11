export type ContractBoundarySource = "HelperRequest" | "HelperResponse" | "EncryptedEnvelope";

export type ContractBoundaryError = Readonly<{
  kind: "ContractBoundaryError";
  source: ContractBoundarySource;
  message: string;
}>;
