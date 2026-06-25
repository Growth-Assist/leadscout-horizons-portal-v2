const CONTACT_ROUTE_TYPE_LABELS = {
  owner: 'Owner',
  surveyor: 'Surveyor',
  contractor: 'Contractor',
  occupier: 'Occupier',
  architect: 'Architect',
  consultant: 'Consultant'
};

export const getContactRouteTypeLabel = (routeType) => {
  const normalized = String(routeType || '').trim().toLowerCase();
  if (!normalized) return '';

  if (CONTACT_ROUTE_TYPE_LABELS[normalized]) {
    return CONTACT_ROUTE_TYPE_LABELS[normalized];
  }

  const humanized = normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return humanized ? `${humanized.charAt(0).toUpperCase()}${humanized.slice(1)}` : '';
};
