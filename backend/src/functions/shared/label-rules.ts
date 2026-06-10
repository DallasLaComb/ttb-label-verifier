export type FieldStatus = 'match' | 'mismatch' | 'needs_review';

export type BeverageCategory = 'wine' | 'distilled_spirits' | 'malt_beverage';

/**
 * Mandatory health warning statement text, per 27 CFR 16.21.
 * The leading "GOVERNMENT WARNING:" must appear in capital letters and bold
 * type (27 CFR 16.22(a)(2)); the remainder of this text must not be bold.
 */
export const GOVERNMENT_WARNING_TEXT =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic ' +
  'beverages during pregnancy because of the risk of birth defects. (2) Consumption of ' +
  'alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause ' +
  'health problems.';

/**
 * TTB tolerance for ABV labeling statements, in percentage points.
 * - Distilled spirits: ±0.3 (27 CFR 5.37(b))
 * - Malt beverages: ±0.3 (27 CFR 7.65)
 * - Wine at or below 14% ABV: ±1.5 (27 CFR 4.36)
 * - Wine above 14% ABV: ±1.0 (27 CFR 4.36)
 */
function alcoholContentTolerance(category: BeverageCategory, applicationPercent: number): number {
  if (category === 'wine') return applicationPercent <= 14 ? 1.5 : 1.0;
  return 0.3;
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeAlphanumeric(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9 ]/g, '');
}

/** Case-insensitive, whitespace-normalized comparison for free-text fields. */
export function compareTextField(
  applicationValue: string | undefined,
  extractedValue: string | null,
): FieldStatus {
  if (extractedValue === null || normalizeText(extractedValue) === '') return 'needs_review';
  if (!applicationValue || normalizeText(applicationValue) === '') return 'needs_review';
  return normalizeText(applicationValue) === normalizeText(extractedValue) ? 'match' : 'mismatch';
}

const ALCOHOL_PERCENT_RE = /(\d+(?:\.\d+)?)\s*%/;

export function parseAlcoholPercent(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = ALCOHOL_PERCENT_RE.exec(value);
  if (!match) return null;
  return Number.parseFloat(match[1]);
}

/** Compares ABV statements numerically, allowing the category-specific regulatory tolerance. */
export function compareAlcoholContent(
  applicationValue: string | undefined,
  extractedValue: string | null,
  category: BeverageCategory,
): FieldStatus {
  if (extractedValue === null || normalizeText(extractedValue) === '') return 'needs_review';
  if (!applicationValue || normalizeText(applicationValue) === '') return 'needs_review';

  const applicationPercent = parseAlcoholPercent(applicationValue);
  const labelPercent = parseAlcoholPercent(extractedValue);

  if (applicationPercent === null || labelPercent === null) {
    return compareTextField(applicationValue, extractedValue);
  }

  const tolerance = alcoholContentTolerance(category, applicationPercent);
  return Math.abs(applicationPercent - labelPercent) <= tolerance ? 'match' : 'mismatch';
}

const NET_CONTENTS_RE = /(\d+(?:\.\d+)?)\s*(ml|millilit(?:er|re)s?|l|lit(?:er|re)s?)\b/i;

const ML_PER_UNIT: Record<string, number> = {
  ml: 1,
  l: 1000,
};

function unitToMl(unit: string): number | undefined {
  const key = unit.toLowerCase().startsWith('l') ? 'l' : 'ml';
  return ML_PER_UNIT[key];
}

export function parseNetContentsMl(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = NET_CONTENTS_RE.exec(value);
  if (!match) return null;
  const amount = Number.parseFloat(match[1]);
  const factor = unitToMl(match[2]);
  return factor === undefined ? null : amount * factor;
}

/** Compares net contents statements by normalizing to milliliters. */
export function compareNetContents(
  applicationValue: string | undefined,
  extractedValue: string | null,
): FieldStatus {
  if (extractedValue === null || normalizeText(extractedValue) === '') return 'needs_review';
  if (!applicationValue || normalizeText(applicationValue) === '') return 'needs_review';

  const applicationMl = parseNetContentsMl(applicationValue);
  const labelMl = parseNetContentsMl(extractedValue);

  if (applicationMl === null || labelMl === null) {
    return compareTextField(applicationValue, extractedValue);
  }

  return applicationMl === labelMl ? 'match' : 'mismatch';
}

export interface GovernmentWarningCheck {
  status: FieldStatus;
  issues: string[];
}

/**
 * Checks the extracted government warning against the fixed federal
 * requirement (27 CFR 16.21/16.22) - this does not depend on application
 * data, since the wording and formatting are mandated, not applicant-supplied.
 */
export function checkGovernmentWarning(extractedValue: string | null): GovernmentWarningCheck {
  if (extractedValue === null || extractedValue.trim() === '') {
    return { status: 'needs_review', issues: ['No government warning statement was found on the label.'] };
  }

  const issues: string[] = [];

  if (!extractedValue.trimStart().startsWith('GOVERNMENT WARNING:')) {
    issues.push(
      'The statement must begin with "GOVERNMENT WARNING:" in capital letters and bold type.',
    );
  }

  if (normalizeAlphanumeric(extractedValue) !== normalizeAlphanumeric(GOVERNMENT_WARNING_TEXT)) {
    issues.push('The warning text does not match the federally mandated wording.');
  }

  return { status: issues.length === 0 ? 'match' : 'mismatch', issues };
}
