import { describe, expect, it } from 'vitest';
import {
  getFinalBriefContacts,
  getKnownNetworkRouteGuidance,
  getRelationshipAnalyticsProperties,
  sortContactsForSales
} from './contactRelationship.js';

describe('known-network contact intelligence', () => {
  const recommended = {
    name: 'Sam Network',
    profession: 'Board adviser',
    relationship_source: 'internal_provider',
    enrichment_source: 'apollo.io',
    email: 'sam@example.com',
    preferred_contact: true,
    role_fit: 'outside_configured_icp_roles'
  };

  it('orders warmth first and researched contacts by role fit', () => {
    const contacts = [
      { name: 'Fallback', role_fit: 'fallback' },
      { name: 'Influencer', role_fit: 'influencer' },
      { name: 'Known', relationship_source: 'internal_provider' },
      { name: 'Buyer', role_fit: 'primary_buyer' },
      recommended,
      { name: 'Outside', role_fit: 'outside_configured_icp_roles' }
    ];

    expect(sortContactsForSales(contacts).map((contact) => contact.name)).toEqual([
      'Sam Network', 'Known', 'Buyer', 'Influencer', 'Fallback', 'Outside'
    ]);
  });

  it('matches who_to_contact.recommended_contact when preferred_contact is absent', () => {
    const contacts = [{ ...recommended, preferred_contact: undefined }];
    const sorted = sortContactsForSales(contacts, { recommended_contact: { name: 'Sam Network' } });
    expect(sorted[0].name).toBe('Sam Network');
  });

  it('adds a standalone recommended contact and marks it as the preferred known route', () => {
    const contacts = getFinalBriefContacts({
      sales_brief: {
        who_to_contact: {
          recommended_contact: { name: 'Standalone Network', role: 'Adviser' }
        }
      },
      research_appendix: { contacts: { items: [{ name: 'Research Buyer' }] } }
    });

    expect(contacts.map((contact) => contact.name)).toEqual(['Standalone Network', 'Research Buyer']);
    expect(getRelationshipAnalyticsProperties({ contacts }).known_network_contact_recommended).toBe(true);
  });

  it('leaves older briefs without recommended_contact unchanged', () => {
    const contacts = [{ name: 'Legacy Buyer' }];
    expect(getFinalBriefContacts({ research_appendix: { contacts } })).toEqual(contacts);
  });

  it('uses generic route guidance and retains outside-role qualification', () => {
    const result = getKnownNetworkRouteGuidance({
      contacts: [recommended],
      whoToContact: { primary_buyer: { title: 'Operations Director' } },
      companyName: 'Acme'
    });

    expect(result.text).toBe('Use the known network relationship with Sam Network as the preferred route into Acme. They may not be the primary buyer, so use the introduction to reach Operations Director.');
    expect(result.text).not.toContain('internal_provider');
  });

  it('uses legacy who-to-contact classification when role_fit is absent', () => {
    const contact = {
      name: 'Legacy Warm Buyer',
      relationship_source: 'internal_provider',
      preferred_contact: true
    };
    const whoToContact = { primary_buyer: { name: 'Legacy Warm Buyer' } };

    expect(getKnownNetworkRouteGuidance({ contacts: [contact], whoToContact, companyName: 'Acme' }).text)
      .toBe('Use the known network relationship with Legacy Warm Buyer as the preferred route into Acme.');
    expect(getRelationshipAnalyticsProperties({ contacts: [contact], whoToContact }).selected_contact_role_fit)
      .toBe('primary_buyer');
  });

  it('builds analytics properties without personal contact details', () => {
    expect(getRelationshipAnalyticsProperties({ contacts: [recommended] })).toEqual({
      known_network_contact_existed: true,
      known_network_contact_recommended: true,
      selected_contact_role_fit: 'outside_configured_icp_roles',
      selected_contact_details_enriched: true,
      relationship_source: 'internal_provider'
    });
  });

  it('normalizes legacy outside-role values to the current contract value', () => {
    const legacy = { ...recommended, role_fit: 'outside_icp_roles' };
    expect(getRelationshipAnalyticsProperties({ contacts: [legacy] }).selected_contact_role_fit)
      .toBe('outside_configured_icp_roles');
  });
});
