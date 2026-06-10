import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { ok, badRequest, internalError, parseBody } from '../shared/response.js';
import { parseImageData } from '../shared/image.js';
import {
  GOVERNMENT_WARNING_TEXT,
  checkGovernmentWarning,
  compareAlcoholContent,
  compareNetContents,
  compareTextField,
  type BeverageCategory,
  type FieldStatus,
} from '../shared/label-rules.js';

const BEVERAGE_CATEGORIES: readonly BeverageCategory[] = ['wine', 'distilled_spirits', 'malt_beverage'];

const CATEGORY_DESCRIPTIONS: Record<BeverageCategory, string> = {
  wine: 'wine',
  distilled_spirits: 'distilled spirits',
  malt_beverage: 'malt beverage',
};

export interface ApplicationData {
  category: BeverageCategory;
  brandName?: string;
  classType?: string;
  alcoholContent?: string;
  netContents?: string;
  producerNameAndAddress?: string;
  countryOfOrigin?: string;
}

export interface VerifyRequest {
  applicationData: ApplicationData;
  /** Base64-encoded front (brand) label image (data URL or raw base64) */
  frontImageBase64?: string;
  /** Base64-encoded back label image (data URL or raw base64), if provided */
  backImageBase64?: string;
}

export interface FieldResult {
  field: keyof ApplicationData | 'governmentWarning';
  applicationValue: string | undefined;
  extractedValue: string | null;
  status: FieldStatus;
  issues?: string[];
}

export interface VerifyResponse {
  overallStatus: FieldStatus;
  results: FieldResult[];
}

const ExtractedLabelSchema = z.object({
  brandName: z.string().nullable(),
  classType: z.string().nullable(),
  alcoholContent: z.string().nullable(),
  netContents: z.string().nullable(),
  producerNameAndAddress: z.string().nullable(),
  countryOfOrigin: z.string().nullable(),
  governmentWarning: z.string().nullable(),
});

function buildExtractionPrompt(category: BeverageCategory, hasBackImage: boolean): string {
  const imageDescription = hasBackImage
    ? 'You are given two images: the first is the front (brand) label, and the second is the back label. Mandatory information may appear on either label.'
    : 'You are given one image of the front (brand) label.';

  return `You are reviewing photos of a ${CATEGORY_DESCRIPTIONS[category]} label for a TTB (Alcohol and Tobacco Tax and Trade Bureau) COLA application review.

${imageDescription}

Read the label images carefully and extract the following fields exactly as they appear printed on the label(s), preserving the original capitalization and punctuation. If a field is not present on either label, return null for it.

- brandName: The brand name of the product
- classType: The class/type designation (e.g. "Bourbon Whiskey", "Vodka", "Red Wine")
- alcoholContent: The alcohol content statement, including the "% ALC/VOL" or "alcohol by volume" wording as printed
- netContents: The net contents statement (e.g. "750 mL")
- producerNameAndAddress: The full producer/bottler name and address statement
- countryOfOrigin: The country of origin statement, if present (e.g. "Product of France")
- governmentWarning: The full text of the Surgeon General's government warning statement, if present, exactly as printed (preserve capitalization)

Return only the structured fields - do not add commentary.`;
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

  const { applicationData, frontImageBase64, backImageBase64 } = parsed.data;

  if (!applicationData?.category || !BEVERAGE_CATEGORIES.includes(applicationData.category)) {
    return badRequest('applicationData.category must be one of: wine, distilled_spirits, malt_beverage', origin);
  }

  if (!frontImageBase64) {
    return badRequest('frontImageBase64 is required', origin);
  }

  const frontImage = parseImageData(frontImageBase64);
  if (!frontImage) {
    return badRequest('Unsupported front image format - use JPEG, PNG, GIF, or WebP', origin);
  }

  const backImage = backImageBase64 ? parseImageData(backImageBase64) : null;
  if (backImageBase64 && !backImage) {
    return badRequest('Unsupported back image format - use JPEG, PNG, GIF, or WebP', origin);
  }

  const apiKey = process.env['AI_API_KEY'];
  if (!apiKey) {
    return internalError('AI_API_KEY is not configured', origin);
  }

  const model = process.env['AI_MODEL'] || 'claude-sonnet-4-6';

  let extracted: z.infer<typeof ExtractedLabelSchema>;
  try {
    const client = new Anthropic({ apiKey });
    const imageBlocks = [frontImage, ...(backImage ? [backImage] : [])].map((image) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: image.mediaType, data: image.data },
    }));
    const aiResponse = await client.beta.messages.parse({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            { type: 'text', text: buildExtractionPrompt(applicationData.category, backImage !== null) },
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

  const governmentWarningCheck = checkGovernmentWarning(extracted.governmentWarning);

  const results: FieldResult[] = [
    {
      field: 'brandName',
      applicationValue: applicationData.brandName,
      extractedValue: extracted.brandName,
      status: compareTextField(applicationData.brandName, extracted.brandName),
    },
    {
      field: 'classType',
      applicationValue: applicationData.classType,
      extractedValue: extracted.classType,
      status: compareTextField(applicationData.classType, extracted.classType),
    },
    {
      field: 'alcoholContent',
      applicationValue: applicationData.alcoholContent,
      extractedValue: extracted.alcoholContent,
      status: compareAlcoholContent(applicationData.alcoholContent, extracted.alcoholContent, applicationData.category),
    },
    {
      field: 'netContents',
      applicationValue: applicationData.netContents,
      extractedValue: extracted.netContents,
      status: compareNetContents(applicationData.netContents, extracted.netContents),
    },
    {
      field: 'producerNameAndAddress',
      applicationValue: applicationData.producerNameAndAddress,
      extractedValue: extracted.producerNameAndAddress,
      status: compareTextField(applicationData.producerNameAndAddress, extracted.producerNameAndAddress),
    },
    {
      field: 'countryOfOrigin',
      applicationValue: applicationData.countryOfOrigin,
      extractedValue: extracted.countryOfOrigin,
      status: compareTextField(applicationData.countryOfOrigin, extracted.countryOfOrigin),
    },
    {
      field: 'governmentWarning',
      applicationValue: GOVERNMENT_WARNING_TEXT,
      extractedValue: extracted.governmentWarning,
      status: governmentWarningCheck.status,
      issues: governmentWarningCheck.issues.length > 0 ? governmentWarningCheck.issues : undefined,
    },
  ];

  const response: VerifyResponse = {
    overallStatus: overallStatus(results),
    results,
  };

  return ok(response, origin);
}
