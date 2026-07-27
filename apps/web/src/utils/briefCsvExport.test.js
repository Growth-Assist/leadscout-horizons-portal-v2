import { describe, expect, it } from 'vitest';
import { BRIEF_CSV_HEADERS, buildBriefsCsv, getBriefCsvRowValues, getSuggestedContactExportFields } from './briefCsvExport.js';

const baseRow = (overrides = {}) => ({
  mappedName: 'Acme Manufacturing',
  company_id: 'acme-manufacturing',
  finalBriefRunId: 'run-1',
  campaign_id: 'campaign-1',
  mappedIndustry: 'Manufacturing',
  mappedDecision: 'Target',
  mappedWebsite: 'https://example.com',
  assignment_display_name: '',
  assignment_email: '',
  assignment_status: 'reviewing',
  feedback_verdict: 'good',
  feedback_quick_reason: 'Strong fit',
  feedback_contacted: false,
  feedback_notes: 'Useful note',
  final_brief_generated_at: '2026-07-20T10:00:00Z',
  feedback_created_at: '2026-07-21T10:00:00Z',
  feedback_updated_at: '2026-07-22T10:00:00Z',
  final_brief_json: {
    research_appendix: {
      contacts: {
        items: []
      }
    }
  },
  ...overrides
});

describe('brief CSV export helpers', () => {
  it('exports the first contacts.items contact as the suggested contact', () => {
    const fields = getSuggestedContactExportFields({
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Jane Buyer',
              title: 'Commercial Director',
              email: 'jane@example.com',
              phone: '01234 567890',
              linkedin_url: 'https://linkedin.com/in/jane-buyer',
              route_type: 'owner',
              confidence: 'High'
            },
            {
              name: 'Second Contact',
              role: 'Operations Director',
              email: 'second@example.com'
            }
          ]
        }
      }
    });

    expect(fields).toEqual({
      suggested_contact_name: 'Jane Buyer',
      suggested_contact_role: 'Commercial Director',
      suggested_contact_email: 'jane@example.com',
      suggested_contact_phone: '01234 567890',
      suggested_contact_linkedin: 'https://linkedin.com/in/jane-buyer',
      suggested_contact_route_type: 'owner',
      suggested_contact_confidence: 'High'
    });
  });

  it('only exports one suggested contact when multiple contacts exist', () => {
    const csv = buildBriefsCsv([
      baseRow({
        final_brief_json: {
          research_appendix: {
            contacts: {
              items: [
                {
                  name: 'First Contact',
                  role: 'Managing Director',
                  email: 'first@example.com'
                },
                {
                  name: 'Second Contact',
                  role: 'Finance Director',
                  email: 'second@example.com'
                }
              ]
            }
          }
        }
      })
    ]);

    expect(csv).toContain('First Contact');
    expect(csv).toContain('first@example.com');
    expect(csv).not.toContain('Second Contact');
    expect(csv).not.toContain('second@example.com');
  });

  it('leaves missing contact email blank without dropping the contact', () => {
    const fields = getSuggestedContactExportFields({
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'No Email',
              job_title: 'Operations Manager',
              mobile: '07700 900000'
            }
          ]
        }
      }
    });

    expect(fields.suggested_contact_name).toBe('No Email');
    expect(fields.suggested_contact_role).toBe('Operations Manager');
    expect(fields.suggested_contact_email).toBe('');
    expect(fields.suggested_contact_phone).toBe('07700 900000');
  });

  it('supports the legacy research_appendix.contacts array shape', () => {
    expect(getSuggestedContactExportFields({
      research_appendix: {
        contacts: [
          {
            name: 'Legacy Contact',
            role: 'CEO',
            email: 'legacy@example.com'
          }
        ]
      }
    })).toEqual(expect.objectContaining({
      suggested_contact_name: 'Legacy Contact',
      suggested_contact_role: 'CEO',
      suggested_contact_email: 'legacy@example.com'
    }));
  });

  it('exports blank suggested-contact fields when no contacts exist', () => {
    expect(getSuggestedContactExportFields({
      research_appendix: {
        contacts: {
          items: []
        }
      }
    })).toEqual({
      suggested_contact_name: '',
      suggested_contact_role: '',
      suggested_contact_email: '',
      suggested_contact_phone: '',
      suggested_contact_linkedin: '',
      suggested_contact_route_type: '',
      suggested_contact_confidence: ''
    });
  });

  it('keeps existing base CSV fields before appended suggested-contact fields', () => {
    expect(BRIEF_CSV_HEADERS.slice(0, 16)).toEqual([
      'company_name',
      'company_id',
      'run_id',
      'campaign_id',
      'industry',
      'decision',
      'website',
      'assignee',
      'assignment_status',
      'brief_verdict',
      'quick_reason',
      'contacted',
      'notes',
      'brief_created_at',
      'feedback_created_at',
      'feedback_updated_at'
    ]);

    const rowValues = getBriefCsvRowValues(baseRow({
      final_brief_json: JSON.stringify({
        research_appendix: {
          contacts: {
            items: [
              {
                name: 'String JSON Contact',
                role: 'Owner',
                email: 'owner@example.com'
              }
            ]
          }
        }
      })
    }));

    expect(rowValues.slice(0, 16)).toEqual([
      'Acme Manufacturing',
      'acme-manufacturing',
      'run-1',
      'campaign-1',
      'Manufacturing',
      'Target',
      'https://example.com',
      'Unassigned',
      'assigned',
      'Good',
      'Strong fit',
      false,
      'Useful note',
      '2026-07-20T10:00:00Z',
      '2026-07-21T10:00:00Z',
      '2026-07-22T10:00:00Z'
    ]);
    expect(rowValues.slice(16)).toEqual([
      'String JSON Contact',
      'Owner',
      'owner@example.com',
      '',
      '',
      '',
      ''
    ]);
  });
});
