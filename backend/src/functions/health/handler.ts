import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ok } from '../shared/response.js';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return ok(
    { status: 'ok', timestamp: new Date().toISOString() },
    event.headers?.['origin'] ?? event.headers?.['Origin'],
  );
}
