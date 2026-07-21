import { describe, expect, it } from 'vitest';
import { getBriefDisplayInfo } from './briefDisplay.js';

describe('getBriefDisplayInfo', () => {
  it('keeps company-led display name and website for non-property-led briefs', () => {
    expect(getBriefDisplayInfo({
      row: {
        name: 'GOODDIES',
        website: 'https://gooddies.co.uk',
        company_id: 'gooddies'
      },
      parsedBrief: {
        company_name: 'GOODDIES'
      }
    })).toEqual({
      isPropertyLed: false,
      displayName: 'GOODDIES',
      displayUrl: 'https://gooddies.co.uk',
      displayUrlLabel: 'https://gooddies.co.uk'
    });
  });

  it('uses property address and Google Maps link for property-led briefs', () => {
    expect(getBriefDisplayInfo({
      row: {
        name: 'GOODDIES',
        website: 'https://gooddies.co.uk',
        company_id: 'gooddies'
      },
      parsedBrief: {
        property_led: true,
        company_name: 'UNITY PLACE, WATERSIDE, HADFIELD, GLOSSOP, SK13 1FN',
        research: {
          os_ngd_roof_candidate: {
            nearest_address: 'UNITY PLACE, WATERSIDE, HADFIELD, GLOSSOP, SK13 1FN',
            google_maps_url: 'https://www.google.com/maps/search/?api=1&query=53.4662918,-1.974101'
          }
        }
      }
    })).toEqual(expect.objectContaining({
      isPropertyLed: true,
      displayName: 'UNITY PLACE, WATERSIDE, HADFIELD, GLOSSOP, SK13 1FN',
      displayUrl: 'https://www.google.com/maps/search/?api=1&query=53.4662918,-1.974101',
      displayUrlLabel: 'Google Maps'
    }));
  });

  it('generates a Google Maps search URL from property identity address and postcode', () => {
    expect(getBriefDisplayInfo({
      row: {
        name: 'Orchard Street Business Centre',
        website: 'https://www.orchardstbristol.com/privacy-policy/',
        company_id: 'planning-26-12671-lb'
      },
      parsedBrief: {
        property_led: true,
        company_name: 'Offices 13-14 and 25-29 Orchard Street',
        property_identity: {
          address: 'Offices 13-14 and 25-29 Orchard Street',
          postcode: 'BS1 5EH'
        },
        research_appendix: {
          property_signals: {
            property: {
              address: 'Offices 13-14 and 25-29 Orchard Street',
              candidate_occupier: {
                sources: [
                  'https://www.orchardstbristol.com/privacy-policy/',
                  'https://www.orchardstbristol.com/about-us/'
                ]
              }
            },
            planning_application_context: {
              council_url: 'https://pa.bristol.gov.uk/online-applications/applicationDetails.do?keyVal=TH6UXADNHHK00&activeTab=summary',
              searchland_url: 'https://app.searchland.co.uk/?planningId=252_26%2F12671%2FLB'
            }
          }
        }
      }
    })).toEqual(expect.objectContaining({
      isPropertyLed: true,
      displayName: 'Offices 13-14 and 25-29 Orchard Street BS1 5EH',
      displayUrl: 'https://www.google.com/maps/search/?api=1&query=Offices%2013-14%20and%2025-29%20Orchard%20Street%20BS1%205EH',
      displayUrlLabel: 'Google Maps'
    }));
  });

  it('ignores non-Google explicit map-like evidence URLs and falls back to property address search', () => {
    expect(getBriefDisplayInfo({
      row: {
        name: 'Planning Opportunity',
        website: 'https://www.kitesenterprises.com/',
        company_id: 'planning-26-12671-lb'
      },
      parsedBrief: {
        property_led: true,
        research_appendix: {
          property_signals: {
            property: {
              address: 'Offices 13-14 and 25-29 Orchard Street',
              google_maps_url: 'https://app.searchland.co.uk/?planningId=252_26%2F12671%2FLB'
            },
            planning_application_context: {
              postcode: 'BS1 5EH',
              site_address: 'Offices 13-14 and 25-29 Orchard Street'
            }
          }
        }
      }
    })).toEqual(expect.objectContaining({
      displayUrl: 'https://www.google.com/maps/search/?api=1&query=Offices%2013-14%20and%2025-29%20Orchard%20Street%20BS1%205EH',
      displayUrlLabel: 'Google Maps'
    }));
  });

  it('does not fall back to a website URL when a property-led brief has no usable address', () => {
    expect(getBriefDisplayInfo({
      row: {
        name: 'Planning Opportunity',
        website: 'https://www.kitesenterprises.com/',
        company_id: 'planning-26-12671-lb'
      },
      parsedBrief: {
        property_led: true,
        company_name: 'Property opportunity at unknown address'
      }
    })).toEqual(expect.objectContaining({
      isPropertyLed: true,
      displayName: 'Planning Opportunity',
      displayUrl: '',
      displayUrlLabel: ''
    }));
  });
});
