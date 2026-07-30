import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import FinalBriefRenderer from './FinalBriefRenderer.jsx';

const baseBriefJson = (overrides = {}) => ({
  company_name: 'Acme Manufacturing',
  sales_brief: {
    executive_summary: 'Summary',
    who_to_contact: {},
    ...overrides.sales_brief
  },
  research_appendix: {
    contacts: {
      items: []
    },
    ...overrides.research_appendix
  }
});

const renderBrief = (finalBriefJson) => render(
  <FinalBriefRenderer
    briefData={{
      company_name: finalBriefJson.company_name,
      final_brief_json: finalBriefJson
    }}
  />
);

const capturedContactsSection = () => (
  screen.getByRole('heading', { name: 'Captured Contacts' }).parentElement
);

const contactCardFor = (name) => within(capturedContactsSection()).getByText(name).closest('.bg-card');

describe('FinalBriefRenderer sales guidance sections', () => {
  it('renders sales guidance as collapsed accordion panels and keeps priority cards visible', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        why_now: ['A current growth signal makes timing relevant.'],
        recommended_angle_talk_track: ['Lead with operational continuity.'],
        discovery_questions: ['How are you qualifying new partnership conversations?'],
        objections_and_responses: ['Already have a partner: focus on incremental reach.'],
        suggested_openers: ['Noticed your recent community activation.'],
        next_best_action: ['Start with the partnerships lead.']
      }
    }));

    expect(screen.getByText('Why Now')).toBeInTheDocument();
    expect(screen.getByText('A current growth signal makes timing relevant.')).toBeInTheDocument();
    expect(screen.getByText('Recommended Angle & Talk Track')).toBeInTheDocument();
    expect(screen.getByText('Lead with operational continuity.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Sales Guidance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discovery Questions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Objections & Responses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suggested Openers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next Best Action' })).toBeInTheDocument();

    expect(screen.queryByText('How are you qualifying new partnership conversations?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Discovery Questions' }));
    expect(screen.getByText('How are you qualifying new partnership conversations?')).toBeInTheDocument();
  });

  it('does not render sales guidance when none of the collapsible fields exist', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        why_now: ['A current growth signal makes timing relevant.'],
        recommended_angle_talk_track: ['Lead with operational continuity.']
      }
    }));

    expect(screen.queryByRole('heading', { name: 'Sales Guidance' })).not.toBeInTheDocument();
    expect(screen.getByText('Why Now')).toBeInTheDocument();
    expect(screen.getByText('Recommended Angle & Talk Track')).toBeInTheDocument();
  });

  it('renders why now as visible trigger-style signal rows', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        why_now: [
          'Trigger: Franklyn extended its Sale Sharks partnership. Why it matters: this indicates live sponsorship appetite.',
          'Second trigger should be visible.',
          'Third trigger should be visible.',
          'Fourth trigger should be collapsed.'
        ]
      }
    }));

    expect(screen.getByText('Why Now')).toBeInTheDocument();
    expect(screen.getAllByText('Trigger')).toHaveLength(3);
    expect(screen.getByText('Franklyn extended its Sale Sharks partnership. this indicates live sponsorship appetite.')).toBeInTheDocument();
    expect(screen.queryByText(/^Trigger: Franklyn extended/)).not.toBeInTheDocument();
    expect(screen.getByText('Second trigger should be visible.')).toBeInTheDocument();
    expect(screen.getByText('Third trigger should be visible.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /More triggers \(1\)/ })).toBeInTheDocument();
    expect(screen.queryByText('Fourth trigger should be collapsed.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /More triggers \(1\)/ }));
    expect(screen.getByText('Fourth trigger should be collapsed.')).toBeInTheDocument();
  });

  it('renders why now after executive summary and before captured contacts', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        why_now: ['A current growth signal makes timing relevant.']
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Jane Buyer',
              role: 'Commercial Director'
            }
          ]
        }
      }
    }));

    const summaryHeading = screen.getByRole('heading', { name: 'Executive Summary' });
    const whyNowHeading = screen.getByRole('heading', { name: 'Why Now' });
    const contactsHeading = screen.getByRole('heading', { name: 'Captured Contacts' });
    expect(
      summaryHeading.compareDocumentPosition(whyNowHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      whyNowHeading.compareDocumentPosition(contactsHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('renders structured talk track fields as an ordered flow', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        recommended_angle_talk_track: {
          primary_angle: 'Help a growing clinical network reduce downtime and service friction.',
          secondary_angle: 'Support multi-site consistency across support, security and cloud.',
          discovery_hook: 'Ask how they currently manage IT support across regional sites.',
          value_framing: 'Present Gekko as a practical partner that improves reliability without adding workload.'
        }
      }
    }));

    expect(screen.getByText('Recommended Angle & Talk Track')).toBeInTheDocument();
    expect(screen.getByText('Primary angle')).toBeInTheDocument();
    expect(screen.getByText('Secondary angle')).toBeInTheDocument();
    expect(screen.getByText('Discovery hook')).toBeInTheDocument();
    expect(screen.getByText('Value framing')).toBeInTheDocument();
    expect(screen.getByText('Help a growing clinical network reduce downtime and service friction.')).toBeInTheDocument();
    expect(screen.getByText('Support multi-site consistency across support, security and cloud.')).toBeInTheDocument();
    expect(screen.getByText('Ask how they currently manage IT support across regional sites.')).toBeInTheDocument();
    expect(screen.getByText('Present Gekko as a practical partner that improves reliability without adding workload.')).toBeInTheDocument();
  });

  it('renders recommended angle and talk track after captured contacts', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        recommended_angle_talk_track: {
          primary_angle: 'Lead with service reliability.'
        }
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Jane Buyer',
              role: 'Commercial Director'
            }
          ]
        }
      }
    }));

    const contactsHeading = screen.getByRole('heading', { name: 'Captured Contacts' });
    const talkTrackTitle = screen.getByText('Recommended Angle & Talk Track');
    expect(
      contactsHeading.compareDocumentPosition(talkTrackTitle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByText('Primary angle')).toBeInTheDocument();
    expect(screen.getByText('Lead with service reliability.')).toBeInTheDocument();
  });

  it('omits missing structured talk track fields cleanly', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        recommended_angle_talk_track: {
          primary_angle: 'Lead with service reliability.',
          discovery_hook: 'Ask about current support response times.'
        }
      }
    }));

    expect(screen.getByText('Primary angle')).toBeInTheDocument();
    expect(screen.getByText('Discovery hook')).toBeInTheDocument();
    expect(screen.queryByText('Secondary angle')).not.toBeInTheDocument();
    expect(screen.queryByText('Value framing')).not.toBeInTheDocument();
    expect(screen.getByText('Lead with service reliability.')).toBeInTheDocument();
    expect(screen.getByText('Ask about current support response times.')).toBeInTheDocument();
  });

  it('falls back to bullet rendering for unstructured talk tracks', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        recommended_angle_talk_track: ['Lead with operational continuity.']
      }
    }));

    expect(screen.getByText('Recommended Angle & Talk Track')).toBeInTheDocument();
    expect(screen.getByText('Lead with operational continuity.')).toBeInTheDocument();
    expect(screen.queryByText('Primary angle')).not.toBeInTheDocument();
  });
});

describe('FinalBriefRenderer partnership fit panel', () => {
  it('renders Sale Sharks partnership fit scores and evidence after contact cards when present', () => {
    renderBrief(baseBriefJson({
      fit_score: 53,
      research_appendix: {
        scoring: {
          commercial_fit_score: 32,
          cultural_fit_score: 21,
          commercial_fit_evidence: [
            'Turnover +15 (revenue band indicates buying power for sponsorship).'
          ],
          cultural_fit_evidence: [
            'North West identity and family business positioning support cultural fit.'
          ]
        },
        contacts: {
          items: [
            {
              name: 'Jane Buyer',
              role: 'Commercial Director'
            }
          ]
        }
      }
    }));

    expect(screen.getByRole('heading', { name: 'Partnership Fit' })).toBeInTheDocument();
    expect(screen.getByText('Commercial Fit')).toBeInTheDocument();
    expect(screen.getByText('Cultural Fit')).toBeInTheDocument();
    expect(screen.queryByText(/Total Fit Score/i)).not.toBeInTheDocument();
    expect(screen.getByText('32/60')).toBeInTheDocument();
    expect(screen.getByText('21/40')).toBeInTheDocument();
    expect(screen.queryByText('Why they can buy')).not.toBeInTheDocument();
    expect(screen.queryByText('Why they belong')).not.toBeInTheDocument();
    expect(screen.queryByText('Turnover +15 (revenue band indicates buying power for sponsorship).')).not.toBeInTheDocument();
    expect(screen.queryByText('North West identity and family business positioning support cultural fit.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Commercial Fit/i }));
    expect(screen.getByText('Why they can buy')).toBeInTheDocument();
    expect(screen.getByText('Turnover +15 (revenue band indicates buying power for sponsorship).')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cultural Fit/i }));
    expect(screen.getByText('Why they belong')).toBeInTheDocument();
    expect(screen.getByText('North West identity and family business positioning support cultural fit.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Captured Contacts' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Route Evidence' })).not.toBeInTheDocument();

    const contactsHeading = screen.getByRole('heading', { name: 'Captured Contacts' });
    const fitHeading = screen.getByRole('heading', { name: 'Partnership Fit' });
    expect(
      contactsHeading.compareDocumentPosition(fitHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('renders safely when scores are present but evidence arrays are empty', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        scoring: {
          commercial_fit_score: 40,
          cultural_fit_score: 30,
          commercial_fit_evidence: [],
          cultural_fit_evidence: []
        }
      }
    }));

    expect(screen.getByRole('heading', { name: 'Partnership Fit' })).toBeInTheDocument();
    expect(screen.getByText('40/60')).toBeInTheDocument();
    expect(screen.getByText('30/40')).toBeInTheDocument();
    expect(screen.queryByText(/Total Fit Score/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Commercial Fit/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cultural Fit/i }));
    expect(screen.getAllByText('No supporting evidence captured')).toHaveLength(2);
  });

  it('does not render when partnership fit fields are absent', () => {
    renderBrief(baseBriefJson());

    expect(screen.queryByRole('heading', { name: 'Partnership Fit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Route Evidence' })).not.toBeInTheDocument();
  });
});

describe('FinalBriefRenderer research appendix property gating', () => {
  const propertyAppendix = {
    properties: {
      properties: [
        {
          address: "St James's House, Congleton",
          property_id: 'prop-1',
          ownership_label: 'Leasehold'
        }
      ]
    }
  };

  it('does not render property appendix content for non-property-led briefs', () => {
    renderBrief(baseBriefJson({
      research_appendix: propertyAppendix
    }));

    expect(screen.queryByRole('heading', { name: 'Research Appendix' })).not.toBeInTheDocument();
    expect(screen.queryByText('Properties & Signals')).not.toBeInTheDocument();
    expect(screen.queryByText("St James's House, Congleton")).not.toBeInTheDocument();
  });

  it('renders property appendix content for property-led briefs', () => {
    renderBrief({
      ...baseBriefJson({
        research_appendix: propertyAppendix
      }),
      property_led: true,
      research_appendix: propertyAppendix
    });

    expect(screen.getByText('Properties & Signals')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Properties & Signals' }));
    expect(screen.getByText("St James's House, Congleton")).toBeInTheDocument();
  });

  it('keeps non-property appendix sections available for company-led briefs', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        ...propertyAppendix,
        company: {
          employee_count: '120'
        },
        news: {
          developments: [
            {
              title: 'New regional expansion',
              what: 'Opened a new office.'
            }
          ]
        },
        events: {
          items: [
            {
              title: 'Industry forum',
              what: 'Presented at the forum.'
            }
          ]
        }
      }
    }));

    expect(screen.queryByText('Properties & Signals')).not.toBeInTheDocument();
    expect(screen.getByText('Company Info')).toBeInTheDocument();
    expect(screen.getByText('News & Developments')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
  });
});

describe('FinalBriefRenderer contact route research appendix', () => {
  const contactRoute = {
    selected_route: {
      name: 'Mace',
      role: 'Main contractor',
      confidence: 'high',
      validation_status: 'validated',
      website: 'https://www.macegroup.com/',
      sources: [],
      notes: 'Mace is the validated delivery route for the project.'
    },
    selection_reason: 'Mace has the strongest verified relationship to the active project.',
    owner_fallback_used: true,
    evidence: {
      sources: [
        'https://www.macegroup.com/projects/example-project',
        'https://find-and-update.company-information.service.gov.uk/company/01234567',
        'javascript:alert("unsafe")'
      ],
      notes: 'The project page and company record corroborate the selected route.'
    },
    results: {
      accepted_contact_count: 3,
      rejected_contact_count: 2,
      validation_identity_sources: [
        'provider_organisation_domain',
        'companies_house_record'
      ]
    },
    attempts: [
      {
        route_name: 'Lindner Prater',
        route_role: 'Envelope contractor',
        confidence: 'medium',
        validation_status: 'rejected',
        resolved_website: 'https://www.lindner-prater.com/',
        resolved_domain: 'lindner-prater.com',
        contact_count: 0,
        contact_number_count: 0,
        source_count: 2,
        rejected_contact_count: 2,
        rejection_reasons: [
          'Contacts belonged to the wrong regional entity.',
          'No project-specific identity match.'
        ],
        outcome: 'route_rejected'
      },
      {
        route_name: 'Mace',
        route_role: 'Main contractor',
        confidence: 'high',
        validation_status: 'validated',
        resolved_website: 'https://www.macegroup.com/',
        resolved_domain: 'macegroup.com',
        contact_count: 3,
        contact_number_count: 2,
        source_count: 4,
        rejected_contact_count: 0,
        rejection_reasons: [],
        outcome: 'contacts_accepted'
      }
    ]
  };

  it('renders a simple collapsed route trigger and expands evidence, results, and chronological attempts', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        contact_route: contactRoute
      }
    }));

    expect(screen.getByRole('heading', { name: 'Research Appendix' })).toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Contact Route' });
    expect(screen.queryByText('Mace · Main contractor')).not.toBeInTheDocument();
    expect(screen.queryByText('Accepted 3')).not.toBeInTheDocument();
    expect(screen.queryByText('Rejected 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Owner fallback')).not.toBeInTheDocument();
    expect(screen.queryByText('Mace is the validated delivery route for the project.')).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByText('Owner fallback')).toBeInTheDocument();
    expect(screen.getByText('Mace is the validated delivery route for the project.')).toBeInTheDocument();
    expect(screen.getByText('Mace has the strongest verified relationship to the active project.')).toBeInTheDocument();
    expect(screen.getByText('Provider organisation domain, Companies house record')).toBeInTheDocument();

    const projectLink = screen.getByRole('link', { name: 'macegroup.com' });
    expect(projectLink).toHaveAttribute('href', 'https://www.macegroup.com/projects/example-project');
    expect(projectLink).toHaveAttribute('target', '_blank');
    expect(projectLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'find-and-update.company-information.service.gov.uk' })).toHaveAttribute(
      'href',
      'https://find-and-update.company-information.service.gov.uk/company/01234567'
    );
    expect(document.querySelector('a[href^="javascript:"]')).not.toBeInTheDocument();

    const rejectedAttempt = screen.getByText('Lindner Prater · Envelope contractor');
    const acceptedAttempt = screen.getAllByText('Mace · Main contractor').at(-1);
    expect(
      rejectedAttempt.compareDocumentPosition(acceptedAttempt) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByText('Route rejected')).toBeInTheDocument();
    expect(screen.getByText('Contacts accepted')).toBeInTheDocument();
    expect(screen.getByText('Contacts belonged to the wrong regional entity.')).toBeInTheDocument();
    expect(screen.getByText('No project-specific identity match.')).toBeInTheDocument();
  });

  it('renders a route-only appendix when attempts or result counts are meaningful', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        contact_route: {
          selected_route: null,
          results: {
            accepted_contact_count: 1,
            rejected_contact_count: 0,
            validation_identity_sources: []
          },
          attempts: []
        }
      }
    }));

    expect(screen.getByRole('heading', { name: 'Research Appendix' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contact Route' })).toBeInTheDocument();
  });

  it.each([
    ['missing', undefined],
    ['empty', {}],
    [
      'structurally empty',
      {
        selected_route: null,
        results: {
          accepted_contact_count: 0,
          rejected_contact_count: 0,
          validation_identity_sources: []
        },
        attempts: []
      }
    ]
  ])('does not render the route appendix when contact_route is %s', (_label, routeData) => {
    renderBrief(baseBriefJson({
      research_appendix: routeData === undefined ? {} : { contact_route: routeData }
    }));

    expect(screen.queryByRole('button', { name: 'Contact Route' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Research Appendix' })).not.toBeInTheDocument();
  });
});

describe('FinalBriefRenderer company presence appendix', () => {
  it('renders company-presence fields as a dedicated readable block', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        company: {
          website: 'https://example.com',
          headquarters_location: 'Manchester HQ',
          operating_locations: ['Manchester office', 'Liverpool team hub'],
          regional_presence_evidence: [
            'Careers page references a North West team',
            'Leadership profile references Manchester operations'
          ],
          locations: ['Manchester', 'North West', 'UK-wide customer events'],
          registered_office_address: 'Legal House, London EC1A 1AA'
        }
      }
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Company Info' }));

    expect(screen.getByText('Company Presence')).toBeInTheDocument();
    expect(screen.getByText('HQ / principal location')).toBeInTheDocument();
    expect(screen.getByText('Manchester HQ')).toBeInTheDocument();
    expect(screen.getByText('Operating locations')).toBeInTheDocument();
    expect(screen.getByText('Manchester office')).toBeInTheDocument();
    expect(screen.getByText('Liverpool team hub')).toBeInTheDocument();
    expect(screen.getByText('Regional presence evidence')).toBeInTheDocument();
    expect(screen.getByText('Careers page references a North West team')).toBeInTheDocument();
    expect(screen.getByText('Other locations / served regions')).toBeInTheDocument();
    expect(screen.getByText('Registered office (legal address)')).toBeInTheDocument();
    expect(screen.getByText('Legal House, London EC1A 1AA')).toBeInTheDocument();
    expect(screen.getByText('Website:')).toBeInTheDocument();

    expect(document.body.textContent).not.toContain('["Manchester office"');
    expect(screen.queryByText('Headquarters Location:')).not.toBeInTheDocument();
    expect(screen.queryByText('Operating Locations:')).not.toBeInTheDocument();
    expect(screen.queryByText('Registered Office Address:')).not.toBeInTheDocument();
  });

  it('keeps legacy company info rendering when company-presence fields are absent', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        company: {
          employee_count: '120',
          industry: 'Manufacturing'
        }
      }
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Company Info' }));

    expect(screen.queryByText('Company Presence')).not.toBeInTheDocument();
    expect(screen.getByText('Employee Count:')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('Industry:')).toBeInTheDocument();
    expect(screen.getByText('Manufacturing')).toBeInTheDocument();
  });
});

describe('FinalBriefRenderer project stage diagram', () => {
  it('renders the simplified project stage row after executive summary and before route evidence', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        project_stage: {
          stage_key: 'planning_submitted',
          stage_label: 'Planning submitted',
          display_stage_key: 'planning',
          display_stage_label: 'Planning',
          display_context_label: 'Project Stage',
          opportunity_mode: 'active_project',
          confidence: 'high',
          reason: 'Tender documents and procurement language were found.',
          evidence: 'Procurement notice references roofing package tender.',
          source_signals: ['planning portal', 'tender notice']
        }
      }
    }));

    expect(screen.getByRole('heading', { name: 'Project Stage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Planning' })).toBeInTheDocument();
    expect(screen.getByText('High confidence')).toBeInTheDocument();
    expect(screen.queryByText('Tender documents and procurement language were found.')).not.toBeInTheDocument();
    expect(screen.queryByText('Procurement notice references roofing package tender.')).not.toBeInTheDocument();
    expect(screen.queryByText('planning portal')).not.toBeInTheDocument();
    expect(screen.queryByText('tender notice')).not.toBeInTheDocument();

    expect(screen.getByTestId('project-stage-step-planning')).toHaveAttribute('data-status', 'active');
    expect(screen.getByTestId('project-stage-step-tendering')).toHaveAttribute('data-status', 'pending');
    expect(screen.getByTestId('project-stage-step-onsite')).toHaveAttribute('data-status', 'pending');
    expect(screen.getByTestId('project-stage-step-planning')).toHaveAttribute('aria-current', 'step');

    const summaryHeading = screen.getByRole('heading', { name: 'Executive Summary' });
    const projectHeading = screen.getByRole('heading', { name: 'Project Stage' });
    expect(
      summaryHeading.compareDocumentPosition(projectHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Route Evidence' })).not.toBeInTheDocument();
  });

  it('does not render the project stage diagram when project_stage is missing', () => {
    renderBrief(baseBriefJson());

    expect(screen.queryByRole('heading', { name: 'Project Stage' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Project stage timeline')).not.toBeInTheDocument();
  });

  it('highlights on site for construction map style project stages', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        project_stage: {
          stage_key: 'on_site',
          stage_label: 'On site',
          display_stage_key: 'onsite',
          display_stage_label: 'On Site',
          display_context_label: 'Project Stage',
          confidence: 'medium'
        }
      }
    }));

    expect(screen.getByRole('heading', { name: 'Project Stage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'On Site' })).toBeInTheDocument();
    expect(screen.getByTestId('project-stage-step-planning')).toHaveAttribute('data-status', 'complete');
    expect(screen.getByTestId('project-stage-step-tendering')).toHaveAttribute('data-status', 'complete');
    expect(screen.getByTestId('project-stage-step-onsite')).toHaveAttribute('data-status', 'active');
  });

  it('renders built operational opportunity mode without a timeline', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        project_stage: {
          stage_key: 'complete',
          stage_label: 'Complete',
          display_stage_key: 'built_operational',
          display_stage_label: 'Built / Operational',
          display_context_label: 'Opportunity Mode',
          opportunity_mode: 'built_operational',
          confidence: 'high',
          reason: 'OS NGD and EPC signals indicate an existing operational asset.',
          evidence: 'OS NGD roof material is Metal; large building'
        }
      }
    }));

    expect(screen.getByRole('heading', { name: 'Opportunity Mode' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Built / Operational' })).toBeInTheDocument();
    expect(screen.getByText('High confidence')).toBeInTheDocument();
    expect(screen.getByText('OS NGD and EPC signals indicate an existing operational asset.')).toBeInTheDocument();
    expect(screen.queryByText('OS NGD roof material is Metal')).not.toBeInTheDocument();
    expect(screen.queryByText('large building')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Project stage row')).not.toBeInTheDocument();
    expect(screen.queryByTestId('project-stage-step-planning')).not.toBeInTheDocument();
    expect(screen.queryByText('complete')).not.toBeInTheDocument();
  });

  it('renders older project stage data using the stage label', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        project_stage: {
          stage_key: 'tendering',
          stage_label: 'Tendering',
          confidence: 'medium'
        }
      }
    }));

    expect(screen.getByRole('heading', { name: 'Project Stage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tendering' })).toBeInTheDocument();
    expect(screen.getByTestId('project-stage-step-planning')).toHaveAttribute('data-status', 'complete');
    expect(screen.getByTestId('project-stage-step-tendering')).toHaveAttribute('data-status', 'active');
    expect(screen.getByTestId('project-stage-step-onsite')).toHaveAttribute('data-status', 'pending');
  });

  it('renders metadata for an unknown stage key without highlighting any step', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        project_stage: {
          stage_key: 'awaiting_budget',
          stage_label: 'Awaiting budget',
          confidence: 'medium',
          reason: 'Stage was supplied by the final brief JSON.'
        }
      }
    }));

    expect(screen.getByRole('heading', { name: 'Project Stage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Awaiting budget' })).toBeInTheDocument();
    expect(screen.getByText('Medium confidence')).toBeInTheDocument();
    expect(screen.queryByText('awaiting_budget')).not.toBeInTheDocument();
    expect(screen.queryByText('Stage was supplied by the final brief JSON.')).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^project-stage-step-/)).toHaveLength(3);
    expect(screen.getAllByTestId(/^project-stage-step-/).every((step) => (
      step.getAttribute('data-status') === 'pending' && !step.hasAttribute('aria-current')
    ))).toBe(true);
  });
});

describe('FinalBriefRenderer route evidence cards', () => {
  it('renders route evidence cards above captured contacts and replaces lookup evidence', () => {
    renderBrief({
      ...baseBriefJson({
        sales_brief: {
          who_to_contact: {
            primary_buyer: {
              role: 'Facilities Manager'
            }
          }
        },
        research_appendix: {
          property_signals: {
            organisation_contact_routes: [
              {
                name: 'The Sign Bridge Ltd',
                role: 'main_contractor',
                notes: 'Provided signage works at the site.',
                confidence: 'medium'
              },
              {
                name: 'Northgate Estates',
                role: 'asset_manager',
                notes: 'Controls property maintenance approvals.',
                confidence: 'high'
              }
            ]
          },
          contacts: {
            selected_contact_route: 'asset manager',
            contact_route_reason: 'Asset manager is the recommended property-control route.',
            items: [
              {
                name: 'Jane Buyer',
                role: 'Operations Director',
                email: 'jane@example.com'
              }
            ]
          }
        }
      }),
      property_led: true
    });

    expect(screen.queryByRole('heading', { name: 'Lookup Evidence' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Route Evidence' })).toBeInTheDocument();
    expect(screen.getByText('The Sign Bridge Ltd')).toBeInTheDocument();
    expect(screen.getByText('Northgate Estates')).toBeInTheDocument();
    expect(screen.getByText('Provided signage works at the site.')).toBeInTheDocument();
    expect(screen.getByText('Selected route')).toBeInTheDocument();
    expect(screen.getAllByText('No route identified')).toHaveLength(3);

    const routeHeading = screen.getByRole('heading', { name: 'Route Evidence' });
    const contactsHeading = screen.getByRole('heading', { name: 'Captured Contacts' });
    expect(
      routeHeading.compareDocumentPosition(contactsHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByText('Jane Buyer')).toBeInTheDocument();
  });

  it('does not render route evidence for company-led briefs with consultant-style contacts', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        who_to_contact: {
          primary_buyer: {
            name: 'Ben Preston',
            role: 'Financial Adviser',
            source: 'contact'
          }
        }
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Ben Preston',
              role: 'Financial Adviser',
              email: 'ben@example.com'
            }
          ]
        }
      }
    }));

    expect(screen.queryByRole('heading', { name: 'Route Evidence' })).not.toBeInTheDocument();
    expect(screen.queryByText('No route identified')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Captured Contacts' })).toBeInTheDocument();
    expect(screen.getByText('Ben Preston')).toBeInTheDocument();
  });

  it('does not render route evidence when route data is absent', () => {
    renderBrief(baseBriefJson());

    expect(screen.queryByRole('heading', { name: 'Lookup Evidence' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Route Evidence' })).not.toBeInTheDocument();
    expect(screen.queryByText('No route identified')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Captured Contacts' })).toBeInTheDocument();
  });
});

describe('FinalBriefRenderer OS roof candidate evidence', () => {
  it('renders full OS roof candidate evidence below captured contacts', () => {
    renderBrief({
      ...baseBriefJson({
        research_appendix: {
          contacts: {
            items: [
              {
                name: 'Jane Buyer',
                role: 'Operations Director',
                email: 'jane@example.com'
              }
            ]
          }
        }
      }),
      research: {
        os_ngd_roof_candidate: {
          osid: 'osgb123',
          nearest_address: '149 Broadstone Road, Reddish, Stockport, SK5 7GA',
          geometry_area_m2: 4262.708,
          buildingage_period: '1980-1989',
          buildingage_year: 1985,
          google_maps_url: 'https://www.google.com/maps/search/?api=1&query=53.433,-2.165',
          roofmaterial_confidenceindicator: 'Expected Data Output',
          roofmaterial_evidencedate: '2025-07-12'
        }
      }
    });

    expect(screen.getByRole('heading', { name: 'Property / Site Evidence' })).toBeInTheDocument();
    expect(screen.getByText('OS Roof Candidate')).toBeInTheDocument();
    expect(screen.getByText('149 Broadstone Road, Reddish, Stockport, SK5 7GA')).toBeInTheDocument();
    expect(screen.getByText('4,263 sqm')).toBeInTheDocument();
    expect(screen.getByText('Strong size signal')).toBeInTheDocument();
    expect(screen.getByText('1980-1989 / 1985')).toBeInTheDocument();
    expect(screen.getByText('Strong candidate')).toBeInTheDocument();
    expect(screen.getByText('High confidence')).toBeInTheDocument();
    expect(screen.queryByText('Expected Data Output')).not.toBeInTheDocument();
    expect(screen.getByText('2025-07-12')).toBeInTheDocument();
    expect(screen.getByText('Recent evidence')).toBeInTheDocument();
    expect(screen.getByText('osgb123')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /verify on google maps/i })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=53.433,-2.165'
    );

    const contactsHeading = screen.getByRole('heading', { name: 'Captured Contacts' });
    const propertyHeading = screen.getByRole('heading', { name: 'Property / Site Evidence' });
    expect(
      contactsHeading.compareDocumentPosition(propertyHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('does not render OS roof candidate evidence when absent', () => {
    renderBrief(baseBriefJson());

    expect(screen.queryByRole('heading', { name: 'Property / Site Evidence' })).not.toBeInTheDocument();
    expect(screen.queryByText('OS Roof Candidate')).not.toBeInTheDocument();
  });

  it('renders planning application evidence with planning record and documents links', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        property_signals: {
          planning_application_context: {
            application_reference: '26/12671/LB',
            status: 'Pending consideration',
            authority: 'Bristol, City of LPA',
            proposal: 'Elevation and roof repairs including stone cleaning.',
            council_url: 'https://pa.bristol.gov.uk/online-applications/applicationDetails.do?keyVal=TH6UXADNHHK00&activeTab=summary',
            supporting_documents_url: 'https://pa.bristol.gov.uk/online-applications/applicationDetails.do?activeTab=documents&keyVal=TH6UXADNHHK00'
          }
        }
      }
    }));

    expect(screen.getByRole('heading', { name: 'Property / Site Evidence' })).toBeInTheDocument();
    expect(screen.getByText('Planning Application')).toBeInTheDocument();
    expect(screen.getByText('26/12671/LB')).toBeInTheDocument();
    expect(screen.getByText('Pending consideration')).toBeInTheDocument();
    expect(screen.getByText('Bristol, City of LPA')).toBeInTheDocument();
    expect(screen.getByText('Elevation and roof repairs including stone cleaning.')).toBeInTheDocument();
    expect(screen.getByText('Council planning record')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open planning record/i })).toHaveAttribute(
      'href',
      'https://pa.bristol.gov.uk/online-applications/applicationDetails.do?keyVal=TH6UXADNHHK00&activeTab=summary'
    );
    expect(screen.getByRole('link', { name: /view documents/i })).toHaveAttribute(
      'href',
      'https://pa.bristol.gov.uk/online-applications/applicationDetails.do?activeTab=documents&keyVal=TH6UXADNHHK00'
    );
    expect(screen.queryByRole('link', { name: /verify on google maps/i })).not.toBeInTheDocument();
  });

  it('does not render planning application evidence when planning context is missing', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        property_signals: {
          planning_application_context: {
            application_reference: '26/12671/LB'
          }
        }
      }
    }));

    expect(screen.queryByText('Planning Application')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open planning record/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Property / Site Evidence' })).not.toBeInTheDocument();
  });

  it('renders missing optional fields without empty placeholders', () => {
    renderBrief({
      ...baseBriefJson(),
      research: {
        os_ngd_roof_candidate: {
          nearest_address: 'Nearest known address',
          roofmaterial_confidenceindicator: 'Secondary indicator'
        }
      }
    });

    expect(screen.getByText('OS Roof Candidate')).toBeInTheDocument();
    expect(screen.getByText('Nearest known address')).toBeInTheDocument();
    expect(screen.getByText('Medium confidence')).toBeInTheDocument();
    expect(screen.getByText('Non-standard OS confidence indicator')).toBeInTheDocument();
    expect(screen.queryByText('Footprint Area')).not.toBeInTheDocument();
    expect(screen.queryByText('Size unknown')).not.toBeInTheDocument();
    expect(screen.queryByText('Roof Evidence Date')).not.toBeInTheDocument();
    expect(screen.queryByText('OSID')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /verify on google maps/i })).not.toBeInTheDocument();
  });

  it('does not render OS roof candidate data in lookup evidence', () => {
    renderBrief({
      ...baseBriefJson(),
      research: {
        os_ngd_roof_candidate: {
          nearest_address: 'OS-only address',
          geometry_area_m2: 1500,
          roofmaterial_confidenceindicator: 'Expected Data Output'
        }
      }
    });

    expect(screen.queryByRole('heading', { name: 'Lookup Evidence' })).not.toBeInTheDocument();
    expect(screen.getByText('OS Roof Candidate')).toBeInTheDocument();
  });
});

describe('FinalBriefRenderer contact routing badges', () => {
  it('shows a route type pill from the contact item without changing existing route badges', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        who_to_contact: {
          primary_buyer: {
            name: 'Jane Buyer',
            role: 'Operations Director',
            email: 'jane@example.com'
          }
        }
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Jane Buyer',
              role: 'Operations Director',
              email: 'jane@example.com',
              route_type: 'owner'
            }
          ]
        }
      }
    }));

    const card = within(contactCardFor('Jane Buyer'));
    expect(card.getByText('Owner')).toBeInTheDocument();
    expect(card.getByText('Primary buyer')).toBeInTheDocument();
    expect(card.getByText('Operations Director')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Route Evidence' })).not.toBeInTheDocument();
  });

  it('does not show a route type pill when the contact item has no route_type', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Plain Contact',
              role: 'Operations Manager'
            }
          ]
        }
      }
    }));

    const card = within(contactCardFor('Plain Contact'));
    expect(card.getByText('Plain Contact')).toBeInTheDocument();
    expect(card.getByText('Operations Manager')).toBeInTheDocument();
    expect(card.queryByText('Owner')).not.toBeInTheDocument();
    expect(card.queryByText('Contractor')).not.toBeInTheDocument();
    expect(card.queryByText('Surveyor')).not.toBeInTheDocument();
  });

  it('shows route badges on named contact cards matched by email, LinkedIn, and name plus role', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        who_to_contact: {
          primary_buyer: {
            name: 'Jane Buyer',
            role: 'Operations Director',
            email: 'jane@example.com'
          },
          likely_influencer: {
            name: 'Ian Influence',
            role: 'Energy Manager',
            linkedin: 'https://www.linkedin.com/in/ian-influence/'
          },
          likely_blocker: {
            name: 'Beth Blocker',
            role: 'Finance Director'
          }
        }
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Jane Buyer',
              role: 'Operations Director',
              email: 'JANE@example.com',
              confidence: 'High'
            },
            {
              name: 'Ian Influence',
              title: 'Energy Manager',
              linkedin_url: 'https://linkedin.com/in/ian-influence'
            },
            {
              name: 'Beth Blocker',
              role: 'Finance Director'
            }
          ]
        }
      }
    }));

    expect(within(contactCardFor('Jane Buyer')).getByText('Primary buyer')).toBeInTheDocument();
    expect(within(contactCardFor('Ian Influence')).getByText('Likely influencer')).toBeInTheDocument();
    expect(within(contactCardFor('Beth Blocker')).getByText('Likely blocker')).toBeInTheDocument();
    expect(within(contactCardFor('Jane Buyer')).getByText('Operations Director')).toBeInTheDocument();
    expect(within(contactCardFor('Ian Influence')).getByText('Energy Manager')).toBeInTheDocument();
    expect(within(contactCardFor('Beth Blocker')).getByText('Finance Director')).toBeInTheDocument();
  });

  it('shows multiple badges when route slots map to the same named contact', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        who_to_contact: {
          primary_buyer: {
            name: 'Sam Owner',
            role: 'Managing Director',
            email: 'sam@example.com'
          },
          fallback_route: {
            name: 'Sam Owner',
            role: 'Managing Director',
            email: 'sam@example.com'
          }
        }
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Sam Owner',
              role: 'Managing Director',
              email: 'sam@example.com',
              phone: '01234 567890'
            }
          ]
        }
      }
    }));

    const card = within(contactCardFor('Sam Owner'));
    expect(card.getByText('Primary buyer')).toBeInTheDocument();
    expect(card.getByText('Fallback route')).toBeInTheDocument();
    expect(card.getByText('Managing Director')).toBeInTheDocument();
    expect(card.getByText('01234 567890')).toBeInTheDocument();
  });

  it('does not render a standalone Who to Contact section and preserves who_to_contact data', () => {
    const briefJson = baseBriefJson({
      sales_brief: {
        who_to_contact: {
          primary_buyer: {
            name: 'Jane Buyer',
            role: 'Operations Director',
            email: 'jane@example.com'
          }
        }
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Jane Buyer',
              role: 'Operations Director',
              email: 'jane@example.com'
            }
          ]
        }
      }
    });

    const originalWhoToContact = briefJson.sales_brief.who_to_contact;
    renderBrief(briefJson);

    expect(screen.queryByRole('heading', { name: /who to contact/i })).not.toBeInTheDocument();
    expect(briefJson.sales_brief.who_to_contact).toBe(originalWhoToContact);
    expect(briefJson.sales_brief.who_to_contact.primary_buyer.name).toBe('Jane Buyer');
  });

  it('does not create fake cards or badges for title-only fallback routes', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        who_to_contact: {
          fallback_route: {
            role: 'Facilities Manager'
          }
        }
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Chris Contact',
              role: 'Operations Manager',
              email: 'chris@example.com'
            }
          ]
        }
      }
    }));

    const contactsSection = within(capturedContactsSection());
    expect(contactsSection.getByText('Chris Contact')).toBeInTheDocument();
    expect(contactsSection.queryByText('Facilities Manager')).not.toBeInTheDocument();
    expect(contactsSection.queryByText('Fallback route')).not.toBeInTheDocument();
  });

  it('uses neutral empty-state copy when no named contacts are captured', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        who_to_contact: {
          fallback_route: {
            role: 'Managing Director'
          }
        }
      }
    }));

    expect(screen.getByText('No named contacts were captured yet. Use the ICP-aligned target titles as the recommended starting point.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /who to contact/i })).not.toBeInTheDocument();
  });

  it('does not render the contact match note while preserving it on the input data', () => {
    const briefJson = baseBriefJson({
      research_appendix: {
        contacts: {
          contact_match_note: 'Best-fit outreach route would likely be through senior commercial leadership.',
          items: [
            {
              name: 'Jane Buyer',
              role: 'Operations Director',
              email: 'jane@example.com'
            }
          ]
        }
      }
    });

    renderBrief(briefJson);

    expect(screen.getByText('Jane Buyer')).toBeInTheDocument();
    expect(screen.queryByText(/best-fit outreach route/i)).not.toBeInTheDocument();
    expect(briefJson.research_appendix.contacts.contact_match_note).toBe('Best-fit outreach route would likely be through senior commercial leadership.');
  });

  it('converts verbose contact confidence text into a compact match badge', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Alan Smith',
              role: 'Managing Director',
              email: 'alan@example.com',
              confidence: 'High confidence; verified Apollo contact matched on seniority fallback for Rhopoint Metrology Limited.'
            }
          ]
        }
      }
    }));

    const card = within(contactCardFor('Alan Smith'));
    expect(card.getByText('High Match')).toBeInTheDocument();
    expect(screen.queryByText(/verified Apollo contact matched/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/seniority fallback/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rhopoint Metrology Limited/i)).not.toBeInTheDocument();
  });

  it('shows the company name and preferred company number once above the contact cards', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        contacts: {
          company_contact_numbers: ['+44 1604 678960'],
          items: [
            {
              name: 'Alex Morgan',
              role: 'Operations Director',
              phone: '07700 900123'
            }
          ]
        }
      }
    }));

    const card = within(contactCardFor('Alex Morgan'));
    expect(card.getByText('07700 900123')).toBeInTheDocument();
    expect(card.queryByText('+44 1604 678960')).not.toBeInTheDocument();

    const companyPhoneRow = screen.getByTitle('Company-level number — not a direct personal phone');
    expect(within(companyPhoneRow).getByText('Acme Manufacturing')).toBeInTheDocument();
    expect(within(companyPhoneRow).getByText('Company line')).toBeInTheDocument();
    expect(within(companyPhoneRow).getByText('+44 1604 678960')).toBeInTheDocument();
    expect(
      within(companyPhoneRow).getByText('Company-level number — not a direct personal phone')
    ).toHaveClass('sr-only');
  });

  it('keeps the no-direct-phone state while showing the shared company line above the card', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        contacts: {
          company_contact_numbers: ['+44 1604 678960'],
          items: [
            {
              name: 'No Mobile',
              role: 'Commercial Director',
              email: 'no.mobile@example.com'
            }
          ]
        }
      }
    }));

    const card = within(contactCardFor('No Mobile'));
    expect(card.getByText('—')).toBeInTheDocument();
    expect(card.queryByText('+44 1604 678960')).not.toBeInTheDocument();
    expect(
      screen.getByTitle('Company-level number — not a direct personal phone')
    ).toHaveTextContent('+44 1604 678960');
  });

  it('does not render a company contact strip when company numbers are unavailable', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Direct Only',
              role: 'Sales Director',
              phone: '07700 900456'
            }
          ]
        }
      }
    }));

    const card = within(contactCardFor('Direct Only'));
    expect(card.getByText('07700 900456')).toBeInTheDocument();
    expect(
      screen.queryByTitle('Company-level number — not a direct personal phone')
    ).not.toBeInTheDocument();
  });

  it('shows only the preferred company number once rather than repeating it on every card', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        contacts: {
          company_contact_numbers: [
            '  +44 1604 678960  ',
            '',
            '+44 1604 678961',
            12345,
            '+44 1604 678962'
          ],
          items: [
            {
              name: 'First Contact',
              role: 'Managing Director',
              phone: '07700 900111'
            },
            {
              name: 'Second Contact',
              role: 'Operations Director',
              phone: '07700 900222'
            }
          ]
        }
      }
    }));

    const companyPhoneRows = screen.getAllByTitle('Company-level number — not a direct personal phone');
    expect(companyPhoneRows).toHaveLength(1);
    expect(companyPhoneRows[0]).toHaveTextContent('+44 1604 678960');
    expect(companyPhoneRows[0]).not.toHaveTextContent('+44 1604 678961');
    expect(companyPhoneRows[0]).not.toHaveTextContent('+44 1604 678962');
    expect(companyPhoneRows[0]).not.toHaveTextContent('12345');

    ['First Contact', 'Second Contact'].forEach((name) => {
      const card = within(contactCardFor(name));
      expect(card.queryByText('+44 1604 678960')).not.toBeInTheDocument();
    });
  });

  it('shows the company contact strip when no named contacts were captured', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        contacts: {
          company_contact_numbers: ['+44 1604 678960'],
          items: []
        }
      }
    }));

    const companyPhoneRow = screen.getByTitle('Company-level number — not a direct personal phone');
    expect(companyPhoneRow).toHaveTextContent('Acme Manufacturing');
    expect(companyPhoneRow).toHaveTextContent('Company line');
    expect(companyPhoneRow).toHaveTextContent('+44 1604 678960');
    expect(
      screen.getByText('No named contacts were captured yet. Use the ICP-aligned target titles as the recommended starting point.')
    ).toBeInTheDocument();
  });

  it('uses the selected contractor route name for a property-led company line', () => {
    renderBrief({
      ...baseBriefJson({
        research_appendix: {
          contact_route: {
            selected_route: {
              name: 'Faircloth Construction Limited',
              role: 'main_contractor'
            },
            attempts: []
          },
          contacts: {
            company_contact_numbers: ['+44 1892 784488'],
            items: [
              {
                name: 'Ben Whitewood',
                role: 'Director of Construction',
                phone: '+44 77 5420 7529'
              }
            ]
          }
        }
      }),
      property_led: true,
      property_identity: {
        address: 'Plot 4, Argall Avenue, Leyton, E10 7QE'
      }
    });

    const companyPhoneRow = screen.getByTitle('Company-level number — not a direct personal phone');
    expect(within(companyPhoneRow).getByText('Faircloth Construction Limited')).toBeInTheDocument();
    expect(within(companyPhoneRow).queryByText(/Plot 4, Argall Avenue/)).not.toBeInTheDocument();
    expect(within(companyPhoneRow).getByText('+44 1892 784488')).toBeInTheDocument();
  });
});

describe('FinalBriefRenderer generated email drafts', () => {
  it('uses backend warmup email text from the outreach block when included', () => {
    renderBrief({
      ...baseBriefJson({
        sales_brief: {
          recommended_angle_talk_track: {
            primary_angle: 'fallback copy that should not appear',
            discovery_hook: 'fallback discovery that should not appear'
          }
        },
        research_appendix: {
          contacts: {
            items: [
              {
                name: 'Jane Buyer',
                role: 'Operations Director',
                email: 'jane@example.com'
              }
            ]
          }
        }
      }),
      outreach: {
        include_warmup_email: true,
        warmup_email_text: 'Hi {{first_name}},\n\nBackend-approved Sale Sharks warmup for {{company_name}}.\n\nBest,'
      }
    });

    const card = within(contactCardFor('Jane Buyer'));
    fireEvent.click(card.getByRole('button', { name: /generate email/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toHaveValue('jane@example.com');
    const body = screen.getByLabelText('Body').value;
    expect(body).toContain('Hi Jane,');
    expect(body).toContain('Backend-approved Sale Sharks warmup for Acme Manufacturing.');
    expect(body).not.toContain('fallback copy that should not appear');
    expect(body).not.toContain('fallback discovery that should not appear');
  });

  it('does not show Generate email when outreach explicitly excludes warmup email', () => {
    renderBrief({
      ...baseBriefJson({
        sales_brief: {
          recommended_angle_talk_track: {
            primary_angle: 'fallback copy that should not render',
            discovery_hook: 'fallback discovery that should not render'
          }
        },
        research_appendix: {
          contacts: {
            items: [
              {
                name: 'Jane Buyer',
                role: 'Operations Director',
                email: 'jane@example.com'
              }
            ]
          }
        }
      }),
      outreach: {
        include_warmup_email: false,
        warmup_email_text: 'This should not render.'
      }
    });

    expect(screen.getByText('Jane Buyer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate email/i })).not.toBeInTheDocument();
  });

  it('shows a Generate email action and opens an editable preview draft', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        recommended_angle_talk_track: {
          primary_angle: 'help reduce missed follow-up from inbound leads',
          discovery_hook: 'you recently expanded the sales team',
          value_framing: 'better visibility of warm opportunities'
        }
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Jane Buyer',
              role: 'Operations Director',
              email: 'jane@example.com'
            }
          ]
        }
      }
    }));

    const card = within(contactCardFor('Jane Buyer'));
    fireEvent.click(card.getByRole('button', { name: /generate email/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('Subject')).toHaveValue('Quick question for Acme Manufacturing');
    const body = screen.getByLabelText('Body').value;
    expect(body).toContain('Hi Jane,');
    expect(body).toContain('you recently expanded the sales team');
    expect(body).toContain('help reduce missed follow-up from inbound leads');
    expect(body).toContain('Acme Manufacturing');
  });

  it('does not show Generate email for contacts without an email address', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        recommended_angle_talk_track: {
          primary_angle: 'improve conversion from target accounts',
          discovery_hook: 'you have several active growth signals'
        }
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'No Email',
              role: 'Managing Director'
            }
          ]
        }
      }
    }));

    expect(screen.getByText('No Email')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate email/i })).not.toBeInTheDocument();
  });

  it('does not crash or show Generate email when no angle context exists', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Chris Contact',
              role: 'Operations Manager',
              email: 'chris@example.com'
            }
          ]
        }
      }
    }));

    expect(screen.getByText('Chris Contact')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate email/i })).not.toBeInTheDocument();
  });
});

describe('FinalBriefRenderer generated LinkedIn messages', () => {
  it('uses backend LinkedIn message text from the outreach block when included', () => {
    renderBrief({
      ...baseBriefJson({
        sales_brief: {
          recommended_angle_talk_track: {
            primary_angle: 'fallback LinkedIn copy that should not appear',
            discovery_hook: 'fallback LinkedIn discovery that should not appear'
          }
        },
        research_appendix: {
          contacts: {
            items: [
              {
                name: 'Jane Buyer',
                role: 'Operations Director',
                linkedin_url: 'https://www.linkedin.com/in/jane-buyer/'
              }
            ]
          }
        }
      }),
      outreach: {
        include_linkedin_message: true,
        linkedin_message_text: 'Hi {{first_name}}, backend-approved LinkedIn note for {{company_name}}.'
      }
    });

    const card = within(contactCardFor('Jane Buyer'));
    fireEvent.click(card.getByRole('button', { name: /generate linkedin/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('LinkedIn profile')).toHaveValue('https://www.linkedin.com/in/jane-buyer/');
    const message = screen.getByLabelText('Message').value;
    expect(message).toContain('Hi Jane, backend-approved LinkedIn note for Acme Manufacturing.');
    expect(message).not.toContain('fallback LinkedIn copy that should not appear');
    expect(message).not.toContain('fallback LinkedIn discovery that should not appear');
  });

  it('does not show Generate LinkedIn when outreach explicitly excludes LinkedIn message', () => {
    renderBrief({
      ...baseBriefJson({
        sales_brief: {
          recommended_angle_talk_track: {
            primary_angle: 'fallback copy that should not render',
            discovery_hook: 'fallback discovery that should not render'
          }
        },
        research_appendix: {
          contacts: {
            items: [
              {
                name: 'Jane Buyer',
                role: 'Operations Director',
                linkedin_url: 'https://www.linkedin.com/in/jane-buyer/'
              }
            ]
          }
        }
      }),
      outreach: {
        include_linkedin_message: false,
        linkedin_message_text: 'This should not render.'
      }
    });

    expect(screen.getByText('Jane Buyer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate linkedin/i })).not.toBeInTheDocument();
  });

  it('shows a Generate LinkedIn message action and opens an editable preview message', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        recommended_angle_talk_track: {
          primary_angle: 'help reduce missed follow-up from inbound leads',
          discovery_hook: 'you recently expanded the sales team'
        }
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Jane Buyer',
              role: 'Operations Director',
              linkedin_url: 'https://www.linkedin.com/in/jane-buyer/'
            }
          ]
        }
      }
    }));

    const card = within(contactCardFor('Jane Buyer'));
    fireEvent.click(card.getByRole('button', { name: /generate linkedin/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('LinkedIn profile')).toHaveValue('https://www.linkedin.com/in/jane-buyer/');
    const message = screen.getByLabelText('Message').value;
    expect(message).toContain('Hi Jane,');
    expect(message).toContain('Acme Manufacturing');
    expect(message).toContain('expanded the sales team');
    expect(message.length).toBeLessThanOrEqual(200);
    expect(screen.getByText(`${message.length} / 200`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
  });

  it('does not show Generate LinkedIn message for contacts without a LinkedIn profile', () => {
    renderBrief(baseBriefJson({
      sales_brief: {
        recommended_angle_talk_track: {
          primary_angle: 'improve conversion from target accounts',
          discovery_hook: 'you have several active growth signals'
        }
      },
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'No LinkedIn',
              role: 'Managing Director',
              email: 'person@example.com'
            }
          ]
        }
      }
    }));

    expect(screen.getByText('No LinkedIn')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate linkedin/i })).not.toBeInTheDocument();
  });

  it('does not crash or show Generate LinkedIn message when no angle context exists', () => {
    renderBrief(baseBriefJson({
      research_appendix: {
        contacts: {
          items: [
            {
              name: 'Chris Contact',
              role: 'Operations Manager',
              linkedin: 'https://www.linkedin.com/in/chris-contact/'
            }
          ]
        }
      }
    }));

    expect(screen.getByText('Chris Contact')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate linkedin/i })).not.toBeInTheDocument();
  });
});
