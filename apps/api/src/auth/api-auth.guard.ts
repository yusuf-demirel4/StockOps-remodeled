import { CanActivate, ExecutionContext, Injectable, Inject } from "@nestjs/common";

import { ApiAuthService } from "./api-auth.service";
import type { ApiRequest } from "./api-request";

@Injectable()
export class ApiAuthGuard implements CanActivate {
  constructor(
    @Inject(ApiAuthService)
    private readonly auth: ApiAuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ApiRequest>();
    request.apiAuthContext = await this.auth.authenticate(
      request.headers.authorization,
    );

    return true;
  }
}
