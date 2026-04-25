import type { AuthContext } from "@stockops/core/types";

export type ApiRequest = {
  headers: Record<string, string | string[] | undefined>;
  apiAuthContext?: AuthContext;
};
