const cleanText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
};

const getFirstUrl = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.map(getFirstUrl).find(Boolean) || '';
  }
  if (typeof value === 'object') {
    return getFirstUrl(value.url || value.href || value.source_url || value.google_maps_url || value.website);
  }
  const text = cleanText(value);
  if (!/^https?:\/\//i.test(text)) return '';
  return text;
};

const isPropertyLedBrief = (brief) => (
  brief?.property_led === true
  || brief?.metadata?.property_led === true
  || Boolean(brief?.property_id || brief?.metadata?.property_id)
);

const getPropertyAddress = (brief) => (
  cleanText(brief?.research?.os_ngd_roof_candidate?.nearest_address)
  || cleanText(brief?.research_appendix?.property_signals?.property?.nearest_address)
  || cleanText(brief?.research_appendix?.property_signals?.property?.address)
  || cleanText(brief?.research_appendix?.properties?.primary_property_address)
  || cleanText(brief?.metadata?.property_address)
  || cleanText(brief?.property_address)
  || cleanText(brief?.company_name)
);

const getGoogleMapsUrl = (brief, address) => (
  getFirstUrl(brief?.research?.os_ngd_roof_candidate?.google_maps_url)
  || getFirstUrl(brief?.research_appendix?.property_signals?.property?.google_maps_url)
  || getFirstUrl(brief?.research_appendix?.property_signals?.property?.candidate_occupier?.sources)
  || getFirstUrl(brief?.research?.property_signal_enrichment?.property?.candidate_occupier?.sources)
  || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '')
);

export const getBriefDisplayInfo = ({ row = {}, parsedBrief = null, fallbackName = '', fallbackUrl = '' } = {}) => {
  const brief = parsedBrief || row.final_brief_json || {};
  const isPropertyLed = isPropertyLedBrief(brief);

  if (!isPropertyLed) {
    return {
      isPropertyLed: false,
      displayName: fallbackName || cleanText(row.name) || cleanText(brief.company_name) || cleanText(row.company_id),
      displayUrl: fallbackUrl || cleanText(row.website),
      displayUrlLabel: fallbackUrl || cleanText(row.website)
    };
  }

  const propertyAddress = getPropertyAddress(brief);
  const mapsUrl = getGoogleMapsUrl(brief, propertyAddress);

  return {
    isPropertyLed: true,
    displayName: propertyAddress || fallbackName || cleanText(row.name) || cleanText(brief.company_name) || cleanText(row.company_id),
    displayUrl: mapsUrl,
    displayUrlLabel: mapsUrl ? 'Google Maps' : propertyAddress
  };
};
