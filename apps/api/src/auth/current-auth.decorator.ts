import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { ApiRequest } from "./api-request";

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<ApiRequest>();
    return request.apiAuthContext;
  },
);
