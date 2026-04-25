import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@stockops/core/types";

export const REQUIRED_PERMISSIONS_KEY = "stockops:required_permissions";

export function RequirePermissions(...permissions: Permission[]) {
  return SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
}
