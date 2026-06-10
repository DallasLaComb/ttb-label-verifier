import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const ALLOWED_ORIGINS = (process.env['ALLOWED_ORIGINS'] || 'http://localhost:4200')
  .split(',')
  .map((origin) => origin.trim());

function corsHeaders(requestOrigin?: string): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}

export function ok(data: unknown, requestOrigin?: string): APIGatewayProxyResultV2 {
  return { statusCode: 200, headers: corsHeaders(requestOrigin), body: JSON.stringify(data) };
}

export function badRequest(message = 'Bad request', requestOrigin?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 400,
    headers: corsHeaders(requestOrigin),
    body: JSON.stringify({ error: message }),
  };
}

export function internalError(
  message = 'Internal server error',
  requestOrigin?: string,
): APIGatewayProxyResultV2 {
  return {
    statusCode: 500,
    headers: corsHeaders(requestOrigin),
    body: JSON.stringify({ error: message }),
  };
}

type ParseBodyResult<T> = { ok: true; data: T } | { ok: false; response: APIGatewayProxyResultV2 };

export function parseBody<T>(rawBody: string | undefined, requestOrigin?: string): ParseBodyResult<T> {
  if (!rawBody) {
    return { ok: false, response: badRequest('Request body is required', requestOrigin) };
  }
  try {
    return { ok: true, data: JSON.parse(rawBody) as T };
  } catch {
    return { ok: false, response: badRequest('Invalid JSON body', requestOrigin) };
  }
}
