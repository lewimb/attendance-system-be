import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiExtraModels,
  ApiHeader,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

type EnvelopeOptions = {
  status?: number;
  message?: string;
  description?: string;
  isArray?: boolean;
  paginated?: boolean;
  headers?: Record<string, { description: string }>;
};

export function ApiEnvelope(
  model: Type | null,
  {
    status = 200,
    message,
    description = 'Success',
    isArray = false,
    paginated = false,
    headers,
  }: EnvelopeOptions = {},
) {
  const item = model ? { $ref: getSchemaPath(model) } : undefined;
  const data = !item
    ? undefined
    : paginated
      ? {
          type: 'object',
          properties: {
            items: { type: 'array', items: item },
            total: { type: 'integer', example: 120 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
          },
        }
      : isArray
        ? { type: 'array', items: item }
        : item;

  return applyDecorators(
    ...(model ? [ApiExtraModels(model)] : []),
    ApiResponse({
      status,
      description,
      headers: headers
        ? Object.fromEntries(
            Object.entries(headers).map(([name, header]) => [
              name,
              { ...header, schema: { type: 'string' } },
            ]),
          )
        : undefined,
      schema: {
        type: 'object',
        properties: {
          ...(data && { data }),
          statusCode: { type: 'integer', example: status },
          ...(message && { message: { type: 'string', example: message } }),
        },
      },
    }),
  );
}

export function ApiError(
  status: number,
  message: string,
  codes: string[] = [],
  withStatusCode = true,
) {
  return ApiResponse({
    status,
    description: codes.length > 0 ? codes.join(', ') : message,
    schema: {
      type: 'object',
      properties: {
        ...(withStatusCode && {
          statusCode: { type: 'integer', example: status },
        }),
        ...(codes.length > 0 && {
          code: { type: 'string', enum: codes, example: codes[0] },
        }),
        message: { type: 'string', example: message },
      },
    },
  });
}

export function ApiValidationError(
  example: string | string[] = ['email must be an email'],
) {
  return ApiResponse({
    status: 400,
    description: 'Invalid body, query or path parameter',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', example: 400 },
        message: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
          example,
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  });
}

export function ApiCsrf(forbiddenCodes: string[] = []) {
  return applyDecorators(
    ApiHeader({
      name: 'X-Requested-With',
      required: true,
      description: 'Required on every write request (CSRF protection)',
      schema: { type: 'string', default: 'XMLHttpRequest' },
    }),
    ApiError(
      403,
      'X-Requested-With header is required',
      [...forbiddenCodes, 'CSRF_HEADER_MISSING'],
      false,
    ),
  );
}

export function ApiAuth({
  hrOnly = false,
  write = false,
}: { hrOnly?: boolean; write?: boolean } = {}) {
  const forbiddenCodes = hrOnly ? ['FORBIDDEN'] : [];

  return applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth(),
    ApiError(
      401,
      'Missing token',
      ['UNAUTHENTICATED', 'TOKEN_EXPIRED', 'TOKEN_INVALID'],
      false,
    ),
    ...(write
      ? [ApiCsrf(forbiddenCodes)]
      : hrOnly
        ? [ApiError(403, 'Insufficient role', forbiddenCodes, false)]
        : []),
  );
}
