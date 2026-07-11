declare module "perry/system" {
  export function keychainSave(service: string, account: string, value: string): boolean;
  export function keychainGet(service: string, account: string): string | null;
  export function keychainDelete(service: string, account: string): boolean;
}
