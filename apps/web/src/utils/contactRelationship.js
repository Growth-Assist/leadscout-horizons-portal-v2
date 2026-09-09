const ROLE_FIT_LABELS = {
  primary_buyer: 'Primary buyer',
  influencer: 'Influencer',
  fallback: 'Fallback contact',
  outside_configured_icp_roles: 'Outside target roles',
  outside_icp_roles: 'Outside target roles',
  // Compatibility with briefs finalized before the output contract was renamed.
  outside_icp: 'Outside target roles'
};

const ROLE_FIT_RANKS = {
  primary_buyer: 2,
  influencer: 3,
  fallback: 4,
  outside_configured_icp_roles: 5,
  outside_icp_roles: 5,
  outside_icp: 5
};

const normalizeText = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeLinkedIn = (value) => normalizeText(value)
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .replace(/\/+$/, '');

export const getContactName = (contact) => (
  contact?.name || contact?.full_name || contact?.person_name || ''
);

export const getContactDisplayTitle = (contact) => (
  contact?.title
  || contact?.job_title
  || contact?.enriched_title
  || (contact?.enrichment_source ? contact?.role : '')
  || contact?.profession
  || contact?.role
  || ''
);

export const getContactEmail = (contact) => (
  contact?.email || contact?.email_address || contact?.contact_email || ''
);

export const getContactPhone = (contact) => (
  contact?.telephone || contact?.phone || contact?.mobile || ''
);

export const getContactLinkedIn = (contact) => (
  contact?.linkedin || contact?.linkedin_url || contact?.linkedin_profile || ''
);

export const getFinalBriefContacts = (finalBrief) => {
  const contacts = finalBrief?.research_appendix?.contacts;
  const contactList = Array.isArray(contacts?.items)
    ? contacts.items
    : (Array.isArray(contacts) ? contacts : []);
  return withRecommendedContact(contactList, finalBrief?.sales_brief?.who_to_contact);
};

export const isKnownNetworkContact = (contact) => Boolean(
  contact?.is_recommended_known_network_contact === true
  || (typeof contact?.relationship_source === 'string' && contact.relationship_source.trim())
);

export const getRoleFitLabel = (roleFit) => ROLE_FIT_LABELS[roleFit] || '';

export const hasEnrichedContactDetails = (contact) => Boolean(
  contact?.enrichment_source
  && (
    getContactEmail(contact)
    || getContactPhone(contact)
    || getContactLinkedIn(contact)
    || contact?.title
    || contact?.job_title
    || contact?.enriched_title
    || contact?.role
  )
);

const buildIdentityKeys = (contact) => {
  if (!contact) return [];
  if (typeof contact === 'string') {
    const value = normalizeText(contact);
    return value ? [`name:${value}`] : [];
  }

  const keys = [];
  const id = normalizeText(contact.contact_id || contact.id || contact.apollo_id);
  const name = normalizeText(getContactName(contact));
  const email = normalizeText(getContactEmail(contact));
  const linkedin = normalizeLinkedIn(getContactLinkedIn(contact));
  const title = normalizeText(getContactDisplayTitle(contact));

  if (id) keys.push(`id:${id}`);
  if (email) keys.push(`email:${email}`);
  if (linkedin) keys.push(`linkedin:${linkedin}`);
  if (name && title) keys.push(`name_title:${name}:${title}`);
  if (name) keys.push(`name:${name}`);
  return keys;
};

export const contactsMatch = (left, right) => {
  const leftKeys = new Set(buildIdentityKeys(left));
  return buildIdentityKeys(right).some((key) => leftKeys.has(key));
};

export const withRecommendedContact = (contacts, whoToContact = {}) => {
  const contactList = Array.isArray(contacts) ? contacts : [];
  const recommended = whoToContact?.recommended_contact;
  if (!recommended || typeof recommended !== 'object' || Array.isArray(recommended)) {
    return contactList;
  }

  const markedRecommended = {
    ...recommended,
    preferred_contact: true,
    is_recommended_known_network_contact: true
  };
  const matchingIndex = contactList.findIndex((contact) => contactsMatch(contact, recommended));

  if (matchingIndex === -1) return [markedRecommended, ...contactList];
  return contactList.map((contact, index) => (
    index === matchingIndex ? { ...contact, ...markedRecommended } : contact
  ));
};

export const getRecommendedKnownContact = (contacts, whoToContact = {}) => {
  const knownContacts = (Array.isArray(contacts) ? contacts : []).filter(isKnownNetworkContact);
  return knownContacts.find((contact) => contact?.is_recommended_known_network_contact === true)
    || knownContacts.find((contact) => contact?.preferred_contact === true)
    || knownContacts.find((contact) => contactsMatch(contact, whoToContact?.recommended_contact))
    || null;
};

const matchesWhoToContactRoute = (contact, whoToContact, routeKeys) => routeKeys.some(
  (key) => contactsMatch(contact, whoToContact?.[key])
);

export const getEffectiveContactRoleFit = (contact, whoToContact = {}) => {
  if (['outside_icp', 'outside_icp_roles'].includes(contact?.role_fit)) {
    return 'outside_configured_icp_roles';
  }
  if (ROLE_FIT_RANKS[contact?.role_fit]) return contact.role_fit;
  if (matchesWhoToContactRoute(contact, whoToContact, ['primary_buyer'])) return 'primary_buyer';
  if (matchesWhoToContactRoute(contact, whoToContact, ['influencer', 'likely_influencer'])) return 'influencer';
  if (matchesWhoToContactRoute(contact, whoToContact, ['fallback', 'fallback_route'])) return 'fallback';
  if (matchesWhoToContactRoute(
    contact,
    whoToContact,
    ['outside_configured_icp_roles', 'outside_icp_roles']
  )) return 'outside_configured_icp_roles';
  return null;
};

const getResearchedContactRank = (contact, whoToContact) => {
  const effectiveRoleFit = getEffectiveContactRoleFit(contact, whoToContact);
  if (ROLE_FIT_RANKS[effectiveRoleFit]) return ROLE_FIT_RANKS[effectiveRoleFit];
  return 4;
};

export const sortContactsForSales = (contacts, whoToContact = {}) => {
  const original = Array.isArray(contacts) ? contacts : [];
  const recommended = getRecommendedKnownContact(original, whoToContact);

  return original
    .map((contact, index) => ({
      contact,
      index,
      rank: recommended && contactsMatch(contact, recommended)
        ? 0
        : isKnownNetworkContact(contact)
          ? 1
          : getResearchedContactRank(contact, whoToContact)
    }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ contact }) => contact);
};

const getPrimaryBuyerTarget = (whoToContact = {}) => {
  const primaryBuyer = whoToContact?.primary_buyer;
  const title = getContactDisplayTitle(primaryBuyer);
  if (title) return title;
  if (typeof primaryBuyer === 'string' && primaryBuyer.trim()) return primaryBuyer.trim();
  return 'the primary buyer';
};

export const getKnownNetworkRouteGuidance = ({ contacts, whoToContact, companyName }) => {
  const contact = getRecommendedKnownContact(contacts, whoToContact);
  if (!contact) return null;

  const name = getContactName(contact) || 'the known contact';
  const company = companyName || 'the company';
  const guidance = [`Use the known network relationship with ${name} as the preferred route into ${company}.`];
  if (getEffectiveContactRoleFit(contact, whoToContact) !== 'primary_buyer') {
    guidance.push(`They may not be the primary buyer, so use the introduction to reach ${getPrimaryBuyerTarget(whoToContact)}.`);
  }

  return { contact, text: guidance.join(' ') };
};

export const getRelationshipAnalyticsProperties = ({ contacts, whoToContact, selectedContact } = {}) => {
  const contactList = Array.isArray(contacts) ? contacts : [];
  const recommended = getRecommendedKnownContact(contactList, whoToContact);
  const selected = selectedContact || recommended || null;

  return {
    known_network_contact_existed: contactList.some(isKnownNetworkContact),
    known_network_contact_recommended: Boolean(recommended),
    selected_contact_role_fit: selected ? getEffectiveContactRoleFit(selected, whoToContact) : null,
    selected_contact_details_enriched: selected ? hasEnrichedContactDetails(selected) : false,
    relationship_source: selected?.relationship_source || null
  };
};

export const emitRelationshipAnalyticsEvent = (eventName, properties) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent('leadscout:analytics', {
    detail: { event: eventName, properties: { ...properties } }
  }));
};
