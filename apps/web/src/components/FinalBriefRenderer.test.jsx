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
      })
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

  it('renders blank route cards when route data is absent', () => {
    renderBrief(baseBriefJson());

    expect(screen.queryByRole('heading', { name: 'Lookup Evidence' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Route Evidence' })).toBeInTheDocument();
    expect(screen.getAllByText('No route identified')).toHaveLength(6);
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
    expect(screen.getByText('Fresh evidence')).toBeInTheDocument();
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
    expect(screen.getAllByText('No route identified')).toHaveLength(6);
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
});

describe('FinalBriefRenderer generated email drafts', () => {
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
