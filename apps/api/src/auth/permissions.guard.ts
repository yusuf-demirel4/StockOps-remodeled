import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { can } from "@stockops/core/inventory";
import type { Permission } from "@stockops/core/types";

import type { ApiRequest } from "./api-request";
import { REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ApiRequest>();
    const role = request.apiAuthContext?.role;

    if (!role || !required.every((permission) => can(role, permission))) {
      throw new ForbiddenException("Insufficient role permissions.");
    }

    return true;
  }
}
