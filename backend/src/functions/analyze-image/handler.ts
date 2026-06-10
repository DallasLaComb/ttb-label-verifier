import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import Anthropic from '@anthropic-ai/sdk';
import { ok, badRequest, internalError, parseBody } from '../shared/response.js';
import { parseImageData } from '../shared/image.js';

export interface AnalyzeImageRequest {
  /** Base64-encoded image (data URL or raw base64) */
  imageBase64?: string;
}

export interface AnalyzeImageResponse {
  description: string;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const origin = event.headers?.['origin'] ?? event.headers?.['Origin'];
  const parsed = parseBody<AnalyzeImageRequest>(event.body, origin);
  if (!parsed.ok) return parsed.response;

  const { imageBase64 } = parsed.data;

  if (!imageBase64) {
    return badRequest('imageBase64 is required', origin);
  }

  const image = parseImageData(imageBase64);
  if (!image) {
    return badRequest('Unsupported image format - use JPEG, PNG, GIF, or WebP', origin);
  }

  const apiKey = process.env['AI_API_KEY'];
  if (!apiKey) {
    return internalError('AI_API_KEY is not configured', origin);
  }

  const model = process.env['AI_MODEL'] || 'claude-sonnet-4-6';

  try {
    const client = new Anthropic({ apiKey });
    const aiResponse = await client.messages.create({
      model,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: image.mediaType, data: image.data },
            },
            { type: 'text', text: 'Briefly describe what this image shows, in 1-2 sentences.' },
          ],
        },
      ],
    });

    const textBlock = aiResponse.content.find((block) => block.type === 'text');
    const description = textBlock?.text?.trim() || 'No description available.';

    return ok({ description } satisfies AnalyzeImageResponse, origin);
  } catch (error) {
    console.error('Image analysis failed', error);
    return internalError('Image analysis failed', origin);
  }
}
