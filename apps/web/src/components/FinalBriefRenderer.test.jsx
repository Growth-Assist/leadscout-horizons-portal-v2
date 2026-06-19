import React from 'react';
import { render, screen, within } from '@testing-library/react';
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

const contactCardFor = (name) => screen.getByText(name).closest('.bg-card');

describe('FinalBriefRenderer contact routing badges', () => {
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

    expect(screen.getByText('Chris Contact')).toBeInTheDocument();
    expect(screen.queryByText('Facilities Manager')).not.toBeInTheDocument();
    expect(screen.queryByText('Fallback route')).not.toBeInTheDocument();
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
});
