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
});
