import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GOVERNMENT_WARNING_TEXT } from '../shared/label-rules.js';
import type { ApplicationData, VerifyResponse } from './handler.js';

const parse = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    beta = { messages: { parse } };
  },
}));

vi.mock('@anthropic-ai/sdk/helpers/beta/zod', () => ({
  betaZodOutputFormat: () => ({}),
}));

const APPLICATION_DATA: ApplicationData = {
  category: 'distilled_spirits',
  brandName: 'OLD TOM DISTILLERY',
  classType: 'Kentucky Straight Bourbon Whiskey',
  alcoholContent: '45% Alc./Vol. (90 Proof)',
  netContents: '750 mL',
  producerNameAndAddress: 'Distilled and Bottled by Old Tom Distillery, Bardstown, KY',
  countryOfOrigin: 'Product of USA',
};

function buildEvent(body: object): APIGatewayProxyEventV2 {
  return {
    headers: { origin: 'http://localhost:4200' },
    body: JSON.stringify(body),
  } as unknown as APIGatewayProxyEventV2;
}

function parseResponseBody(result: APIGatewayProxyResultV2): VerifyResponse {
  return JSON.parse((result as { body: string }).body) as VerifyResponse;
}

describe('verify-label handler', () => {
  beforeEach(() => {
    process.env['AI_API_KEY'] = 'test-key';
    parse.mockReset();
  });

  afterEach(() => {
    delete process.env['AI_API_KEY'];
  });

  it('returns match for every field when the label matches the application data exactly', async () => {
    const { handler } = await import('./handler.js');

    parse.mockResolvedValue({
      parsed_output: {
        brandName: "Old Tom Distillery",
        classType: 'Kentucky Straight Bourbon Whiskey',
        alcoholContent: '45% Alc./Vol. (90 Proof)',
        netContents: '750 mL',
        producerNameAndAddress: 'Distilled and Bottled by Old Tom Distillery, Bardstown, KY',
        countryOfOrigin: 'Product of USA',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
      },
    });

    const result = await handler(
      buildEvent({ applicationData: APPLICATION_DATA, frontImageBase64: 'data:image/png;base64,abc123' }),
    );

    const body = parseResponseBody(result);
    expect(body.overallStatus).toBe('match');
    expect(body.results).toHaveLength(7);
    expect(body.results.every((field) => field.status === 'match')).toBe(true);
  });

  it('flags a mismatched brand name and reports the extracted value', async () => {
    const { handler } = await import('./handler.js');

    parse.mockResolvedValue({
      parsed_output: {
        brandName: 'New Tom Distillery',
        classType: 'Kentucky Straight Bourbon Whiskey',
        alcoholContent: '45% Alc./Vol. (90 Proof)',
        netContents: '750 mL',
        producerNameAndAddress: 'Distilled and Bottled by Old Tom Distillery, Bardstown, KY',
        countryOfOrigin: 'Product of USA',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
      },
    });

    const result = await handler(
      buildEvent({ applicationData: APPLICATION_DATA, frontImageBase64: 'data:image/png;base64,abc123' }),
    );

    const body = parseResponseBody(result);
    expect(body.overallStatus).toBe('mismatch');
    const brandResult = body.results.find((field) => field.field === 'brandName');
    expect(brandResult?.status).toBe('mismatch');
    expect(brandResult?.extractedValue).toBe('New Tom Distillery');
  });

  it('flags an incorrectly formatted government warning', async () => {
    const { handler } = await import('./handler.js');

    parse.mockResolvedValue({
      parsed_output: {
        brandName: 'Old Tom Distillery',
        classType: 'Kentucky Straight Bourbon Whiskey',
        alcoholContent: '45% Alc./Vol. (90 Proof)',
        netContents: '750 mL',
        producerNameAndAddress: 'Distilled and Bottled by Old Tom Distillery, Bardstown, KY',
        countryOfOrigin: 'Product of USA',
        governmentWarning: GOVERNMENT_WARNING_TEXT.replace('GOVERNMENT WARNING:', 'Government Warning:'),
      },
    });

    const result = await handler(
      buildEvent({ applicationData: APPLICATION_DATA, frontImageBase64: 'data:image/png;base64,abc123' }),
    );

    const body = parseResponseBody(result);
    const warningResult = body.results.find((field) => field.field === 'governmentWarning');
    expect(warningResult?.status).toBe('mismatch');
    expect(warningResult?.issues?.[0]).toContain('GOVERNMENT WARNING:');
  });

  it('marks fields the AI could not read as needing review', async () => {
    const { handler } = await import('./handler.js');

    parse.mockResolvedValue({
      parsed_output: {
        brandName: null,
        classType: 'Kentucky Straight Bourbon Whiskey',
        alcoholContent: '45% Alc./Vol. (90 Proof)',
        netContents: '750 mL',
        producerNameAndAddress: 'Distilled and Bottled by Old Tom Distillery, Bardstown, KY',
        countryOfOrigin: 'Product of USA',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
      },
    });

    const result = await handler(
      buildEvent({ applicationData: APPLICATION_DATA, frontImageBase64: 'data:image/png;base64,abc123' }),
    );

    const body = parseResponseBody(result);
    expect(body.overallStatus).toBe('needs_review');
    const brandResult = body.results.find((field) => field.field === 'brandName');
    expect(brandResult?.status).toBe('needs_review');
  });

  it('returns 400 when frontImageBase64 is missing', async () => {
    const { handler } = await import('./handler.js');

    const result = await handler(buildEvent({ applicationData: APPLICATION_DATA }));

    expect((result as { statusCode: number }).statusCode).toBe(400);
  });

  it('returns 400 when applicationData.category is missing or invalid', async () => {
    const { handler } = await import('./handler.js');

    const { category, ...dataWithoutCategory } = APPLICATION_DATA;

    const result = await handler(
      buildEvent({ applicationData: dataWithoutCategory, frontImageBase64: 'data:image/png;base64,abc123' }),
    );

    expect((result as { statusCode: number }).statusCode).toBe(400);
  });

  it('sends both images to the AI when a back label is provided', async () => {
    const { handler } = await import('./handler.js');

    parse.mockResolvedValue({
      parsed_output: {
        brandName: 'Old Tom Distillery',
        classType: 'Kentucky Straight Bourbon Whiskey',
        alcoholContent: '45% Alc./Vol. (90 Proof)',
        netContents: '750 mL',
        producerNameAndAddress: 'Distilled and Bottled by Old Tom Distillery, Bardstown, KY',
        countryOfOrigin: 'Product of USA',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
      },
    });

    await handler(
      buildEvent({
        applicationData: APPLICATION_DATA,
        frontImageBase64: 'data:image/png;base64,front123',
        backImageBase64: 'data:image/png;base64,back123',
      }),
    );

    const callArgs = parse.mock.calls[0][0];
    const content = callArgs.messages[0].content;
    const imageBlocks = content.filter((block: { type: string }) => block.type === 'image');
    expect(imageBlocks).toHaveLength(2);
    expect(imageBlocks[0].source.data).toBe('front123');
    expect(imageBlocks[1].source.data).toBe('back123');
  });

  it('applies the wine ABV tolerance when category is wine', async () => {
    const { handler } = await import('./handler.js');

    const wineApplicationData: ApplicationData = {
      ...APPLICATION_DATA,
      category: 'wine',
      alcoholContent: '13%',
    };

    parse.mockResolvedValue({
      parsed_output: {
        brandName: 'Old Tom Distillery',
        classType: 'Red Wine',
        alcoholContent: '14.2% Alc./Vol.',
        netContents: '750 mL',
        producerNameAndAddress: 'Distilled and Bottled by Old Tom Distillery, Bardstown, KY',
        countryOfOrigin: 'Product of USA',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
      },
    });

    const result = await handler(
      buildEvent({ applicationData: wineApplicationData, frontImageBase64: 'data:image/png;base64,abc123' }),
    );

    const body = parseResponseBody(result);
    const abvResult = body.results.find((field) => field.field === 'alcoholContent');
    expect(abvResult?.status).toBe('match');
  });
});
