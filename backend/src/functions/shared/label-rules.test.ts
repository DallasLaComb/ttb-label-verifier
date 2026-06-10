import { describe, it, expect } from 'vitest';
import {
  GOVERNMENT_WARNING_TEXT,
  checkGovernmentWarning,
  compareAlcoholContent,
  compareNetContents,
  compareTextField,
  parseAlcoholPercent,
  parseNetContentsMl,
} from './label-rules.js';

describe('compareTextField', () => {
  it('matches when only case/whitespace differ', () => {
    expect(compareTextField('STONE\'S THROW', "Stone's   throw")).toBe('match');
  });

  it('flags a real mismatch', () => {
    expect(compareTextField('Old Tom Distillery', 'New Tom Distillery')).toBe('mismatch');
  });

  it('needs review when extraction is missing', () => {
    expect(compareTextField('Old Tom Distillery', null)).toBe('needs_review');
  });

  it('needs review when application data is missing', () => {
    expect(compareTextField(undefined, 'Old Tom Distillery')).toBe('needs_review');
  });
});

describe('parseAlcoholPercent', () => {
  it('extracts the percentage from a label statement', () => {
    expect(parseAlcoholPercent('45% Alc./Vol. (90 Proof)')).toBe(45);
  });

  it('returns null when no percentage is present', () => {
    expect(parseAlcoholPercent('90 Proof')).toBeNull();
  });
});

describe('compareAlcoholContent', () => {
  it('matches identical percentages with different formatting', () => {
    expect(compareAlcoholContent('45%', '45% Alc./Vol. (90 Proof)', 'distilled_spirits')).toBe('match');
  });

  it('matches within the 0.3 point distilled spirits tolerance', () => {
    expect(compareAlcoholContent('45%', '45.3% Alc./Vol.', 'distilled_spirits')).toBe('match');
  });

  it('flags a difference outside the distilled spirits tolerance', () => {
    expect(compareAlcoholContent('45%', '46% Alc./Vol.', 'distilled_spirits')).toBe('mismatch');
  });

  it('matches within the 0.3 point malt beverage tolerance', () => {
    expect(compareAlcoholContent('5%', '5.3% Alc./Vol.', 'malt_beverage')).toBe('match');
  });

  it('flags a difference outside the malt beverage tolerance', () => {
    expect(compareAlcoholContent('5%', '5.4% Alc./Vol.', 'malt_beverage')).toBe('mismatch');
  });

  it('matches within the 1.5 point wine tolerance at or below 14% ABV', () => {
    expect(compareAlcoholContent('13.5%', '14.8% Alc./Vol.', 'wine')).toBe('match');
  });

  it('flags a difference outside the wine tolerance at or below 14% ABV', () => {
    expect(compareAlcoholContent('13%', '14.6% Alc./Vol.', 'wine')).toBe('mismatch');
  });

  it('matches within the 1.0 point wine tolerance above 14% ABV', () => {
    expect(compareAlcoholContent('15%', '16% Alc./Vol.', 'wine')).toBe('match');
  });

  it('flags a difference outside the wine tolerance above 14% ABV', () => {
    expect(compareAlcoholContent('15%', '16.1% Alc./Vol.', 'wine')).toBe('mismatch');
  });
});

describe('parseNetContentsMl', () => {
  it('parses milliliters', () => {
    expect(parseNetContentsMl('750 mL')).toBe(750);
  });

  it('parses liters', () => {
    expect(parseNetContentsMl('1.5 L')).toBe(1500);
  });

  it('returns null for unrecognized units', () => {
    expect(parseNetContentsMl('25 fl oz')).toBeNull();
  });
});

describe('compareNetContents', () => {
  it('matches equivalent values in different units', () => {
    expect(compareNetContents('0.75 L', '750 mL')).toBe('match');
  });

  it('flags a real mismatch', () => {
    expect(compareNetContents('750 mL', '700 mL')).toBe('mismatch');
  });
});

describe('checkGovernmentWarning', () => {
  it('matches the exact mandated text', () => {
    expect(checkGovernmentWarning(GOVERNMENT_WARNING_TEXT)).toEqual({ status: 'match', issues: [] });
  });

  it('needs review when the warning is missing entirely', () => {
    const result = checkGovernmentWarning(null);
    expect(result.status).toBe('needs_review');
  });

  it('flags title case "Government Warning" as a formatting issue', () => {
    const titleCase = GOVERNMENT_WARNING_TEXT.replace('GOVERNMENT WARNING:', 'Government Warning:');
    const result = checkGovernmentWarning(titleCase);
    expect(result.status).toBe('mismatch');
    expect(result.issues).toContain(
      'The statement must begin with "GOVERNMENT WARNING:" in capital letters and bold type.',
    );
  });

  it('flags wording that does not match the mandated text', () => {
    const result = checkGovernmentWarning('GOVERNMENT WARNING: Drink responsibly.');
    expect(result.status).toBe('mismatch');
    expect(result.issues).toContain('The warning text does not match the federally mandated wording.');
  });
});
