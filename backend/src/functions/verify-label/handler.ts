import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { ok, badRequest, internalError, parseBody } from '../shared/response.js';
import { parseImageData } from '../shared/image.js';

export interface ApplicationData {
  brandName?: string;
  classType?: string;
  alcoholContent?: string;
  netContents?: string;
  producerNameAndAddress?: string;
  countryOfOrigin?: string;
  governmentWarning?: string;
}

export interface VerifyRequest {
  applicationData: ApplicationData;
  /** Base64-encoded label image (data URL or raw base64) */
  imageBase64?: string;
}

export type FieldStatus = 'match' | 'mismatch' | 'needs_review';

export interface FieldResult {
  field: keyof ApplicationData;
  applicationValue: string | undefined;
  extractedValue: string | null;
  status: FieldStatus;
}

export interface VerifyResponse {
  overallStatus: FieldStatus;
  results: FieldResult[];
}

const FIELDS: (keyof ApplicationData)[] = [
  'brandName',
  'classType',
  'alcoholContent',
  'netContents',
  'producerNameAndAddress',
  'countryOfOrigin',
  'governmentWarning',
];

const ExtractedLabelSchema = z.object({
  brandName: z.string().nullable(),
  classType: z.string().nullable(),
  alcoholContent: z.string().nullable(),
  netContents: z.string().nullable(),
  producerNameAndAddress: z.string().nullable(),
  countryOfOrigin: z.string().nullable(),
  governmentWarning: z.string().nullable(),
});

const EXTRACTION_PROMPT = `You are reviewing a photo of an alcohol beverage label for a TTB (Alcohol and Tobacco Tax and Trade Bureau) COLA application review.

Read the label image carefully and extract the following fields exactly as they appear printed on the label. If a field is not present on the label, return null for it.

- brandName: The brand name of the product
- classType: The class/type designation (e.g. "Bourbon Whiskey", "Vodka", "Red Wine")
- alcoholContent: The alcohol content statement, including the "% ALC/VOL" or "alcohol by volume" wording as printed
- netContents: The net contents statement (e.g. "750 mL")
- producerNameAndAddress: The full producer/bottler name and address statement
- countryOfOrigin: The country of origin statement, if present (e.g. "Product of France")
- governmentWarning: The full text of the Surgeon General's government warning statement, if present

Return only the structured fields - do not add commentary.`;

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function compareField(
  applicationValue: string | undefined,
  extractedValue: string | null,
): FieldStatus {
  if (extractedValue === null || normalize(extractedValue) === '') return 'needs_review';
  if (!applicationValue) return 'needs_review';
  return normalize(applicationValue) === normalize(extractedValue) ? 'match' : 'mismatch';
}

function overallStatus(results: FieldResult[]): FieldStatus {
  if (results.some((result) => result.status === 'mismatch')) return 'mismatch';
  if (results.some((result) => result.status === 'needs_review')) return 'needs_review';
  return 'match';
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const origin = event.headers?.['origin'] ?? event.headers?.['Origin'];
  const parsed = parseBody<VerifyRequest>(event.body, origin);
  if (!parsed.ok) return parsed.response;

  const { applicationData, imageBase64 } = parsed.data;

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

  let extracted: z.infer<typeof ExtractedLabelSchema>;
  try {
    const client = new Anthropic({ apiKey });
    const aiResponse = await client.beta.messages.parse({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: image.mediaType, data: image.data },
            },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
      output_format: betaZodOutputFormat(ExtractedLabelSchema),
    });

    if (!aiResponse.parsed_output) {
      return internalError('AI provider did not return structured output', origin);
    }
    extracted = aiResponse.parsed_output;
  } catch (error) {
    console.error('Label extraction failed', error);
    return internalError('Label extraction failed', origin);
  }

  const results: FieldResult[] = FIELDS.map((field) => {
    const extractedValue = extracted[field];
    return {
      field,
      applicationValue: applicationData[field],
      extractedValue,
      status: compareField(applicationData[field], extractedValue),
    };
  });

  const response: VerifyResponse = {
    overallStatus: overallStatus(results),
    results,
  };

  return ok(response, origin);
}
