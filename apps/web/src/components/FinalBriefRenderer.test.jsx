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
