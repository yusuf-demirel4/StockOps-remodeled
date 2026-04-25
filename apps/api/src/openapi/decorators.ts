import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { errorResponseSchema } from "./schemas";

export function ApiTokenSecurity() {
  return applyDecorators(
    ApiBearerAuth("ApiKeyAuth"),
    ApiUnauthorizedResponse({
      description: "Missing or invalid API token.",
      schema: errorResponseSchema,
    }),
    ApiForbiddenResponse({
      description: "The token is valid but does not have the required role.",
      schema: errorResponseSchema,
    }),
  );
}

export function ApiValidationError() {
  return ApiBadRequestResponse({
    description: "The request body failed validation.",
    schema: errorResponseSchema,
  });
}
