import { describe, expect, it } from 'vitest';
import {
  isNeutralProductFitTiming,
  normalizeProductFitAssessment,
  normalizeProductFitEvidenceUrl
} from './productFitAssessment.js';

describe('normalizeProductFitAssessment', () => {
  it('returns null for absent and structurally invalid assessments', () => {
    expect(normalizeProductFitAssessment()).toBeNull();
    expect(normalizeProductFitAssessment([])).toBeNull();
    expect(normalizeProductFitAssessment({ assessment_status: 'unknown' })).toBeNull();
  });

  it('normalizes a partial assessment and defaults optional arrays', () => {
    expect(normalizeProductFitAssessment({
      assessment_status: 'recommended',
      best_growth_motion: 'outbound_led',
      primary_offering: {
        key: 'sales_intelligence_outbound',
        label: 'Growth Assist Sales Intelligence — Outbound'
      },
      intelligence_fit: { applicable: true, primary_type: 'Growth Assist Sales Intelligence' },
      confidence: 'high'
    })).toMatchObject({
      assessment_status: 'recommended',
      best_growth_motion: 'outbound_led',
      supporting_offerings: [],
      intelligence_fit: {
        applicable: true,
        primary_type: 'Growth Assist Sales Intelligence',
        supporting_types: []
      },
      growth_assist_contribution: [],
      proposed_outputs: [],
      information_required: [],
      evidence: []
    });
  });

  it('suppresses internal brands and non-Growth Assist offering labels', () => {
    const assessment = normalizeProductFitAssessment({
      assessment_status: 'recommended',
      primary_offering: { key: 'internal', label: 'ODIN Sales Engine' },
      supporting_offerings: [
        { key: 'unbranded', label: 'Partnership Intelligence' },
        { key: 'safe', label: 'Growth Assist Partnership Intelligence' }
      ],
      rationale: 'Selected by FREY.',
      growth_assist_contribution: ['Resce Labs research', 'Map the target market']
    });

    expect(assessment.primary_offering).toBeNull();
    expect(assessment.supporting_offerings).toEqual([
      { key: 'safe', label: 'Growth Assist Partnership Intelligence' }
    ]);
    expect(assessment.rationale).toBe('');
    expect(assessment.growth_assist_contribution).toEqual(['Map the target market']);
  });
});

describe('product-fit evidence URLs', () => {
  it('accepts HTTP(S) links and rejects unsafe or credential-bearing links', () => {
    expect(normalizeProductFitEvidenceUrl('https://example.com/evidence')).toBe('https://example.com/evidence');
    expect(normalizeProductFitEvidenceUrl('javascript:alert(1)')).toBe('');
    expect(normalizeProductFitEvidenceUrl('https://user:pass@example.com/private')).toBe('');
  });
});

describe('product-fit opportunity timing', () => {
  it('recognizes an explicit absence of a confirmed time-bound signal', () => {
    expect(isNeutralProductFitTiming('No time-bound signal was confirmed during research.')).toBe(true);
    expect(isNeutralProductFitTiming('A stadium redevelopment creates a timely opening.')).toBe(false);
  });
});

