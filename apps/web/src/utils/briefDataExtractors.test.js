import { describe, expect, it } from 'vitest';
import { getLookupEvidenceCards, getOsRoofCandidateEvidence, getPropertyRouteCards } from './briefDataExtractors.js';

const withEnrichment = (propertySignalEnrichment) => ({
  research: {
    property_signal_enrichment: propertySignalEnrichment
  }
});

const yearsAgoDate = (yearsAgo) => {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - yearsAgo);
  return date.toISOString().slice(0, 10);
};

describe('getLookupEvidenceCards', () => {
  it('returns an occupier card when a candidate occupier is present', () => {
    const cards = getLookupEvidenceCards(withEnrichment({
      property: {
        candidate_occupier: {
          company_name: 'Acme Foods Ltd',
          website: 'https://acme.example',
          evidence: 'Trading name appears on the site directory.',
          confidence: 'high'
        }
      }
    }));

    expect(cards).toEqual([
      expect.objectContaining({
        category: 'Occupier / Site Operator',
        title: 'Acme Foods Ltd',
        body: expect.stringContaining('Trading name appears on the site directory.'),
        confidence: 'high',
        href: 'https://acme.example'
      })
    ]);
  });

  it('returns an owner or asset route card for qualifying related organisations', () => {
    const cards = getLookupEvidenceCards(withEnrichment({
      related_organisations: [
        {
          organisation_name: 'Northgate Property Holdings',
          role: 'Landlord',
          evidence: 'Listed as landlord in the property notice.',
          confidence: 'medium'
        }
      ],
      organisation_contact_routes: [
        {
          organisation_name: 'Northgate Property Holdings',
          role: 'Asset manager route',
          source: 'Companies House filing'
        }
      ]
    }));

    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual(expect.objectContaining({
      category: 'Owner / Asset Route',
      title: 'Northgate Property Holdings',
      body: expect.stringContaining('Landlord'),
      confidence: 'medium'
    }));
    expect(cards[0].body).toContain('Asset manager route');
  });

  it('returns a contractor card for contractor candidates', () => {
    const cards = getLookupEvidenceCards(withEnrichment({
      job_contractor_candidates: [
        {
          company_name: 'BuildRight Roofing',
          role: 'Specialist contractor',
          summary: 'Referenced on the roofing package tender.',
          confidence: 'High'
        }
      ]
    }));

    expect(cards).toEqual([
      expect.objectContaining({
        category: 'Contractor Identified',
        title: 'BuildRight Roofing',
        body: expect.stringContaining('Referenced on the roofing package tender.'),
        confidence: 'High'
      })
    ]);
  });

  it('returns one combined survey/specification card for matching survey signals', () => {
    const cards = getLookupEvidenceCards(withEnrichment({
      property: {
        survey_signals: {
          tendering_stage_possible: {
            summary: 'Tender language appears in the planning documents.',
            confidence: 'medium'
          },
          metal_roof_or_cladding_system: {
            evidence: 'Building photos show metal cladding.',
            confidence: 'high'
          },
          large_building: true
        }
      }
    }));

    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual(expect.objectContaining({
      category: 'Survey / Specification',
      title: 'Tendering stage possible',
      confidence: 'high'
    }));
    expect(cards[0].body).toContain('Tender language appears in the planning documents.');
    expect(cards[0].body).toContain('Building photos show metal cladding.');
    expect(cards[0].body).toContain('Large building');
  });

  it('returns no cards when lookup fields are missing or irrelevant', () => {
    expect(getLookupEvidenceCards({})).toEqual([]);
    expect(getLookupEvidenceCards(withEnrichment({
      property: {
        candidate_occupier: {
          evidence: 'Missing company name'
        },
        roof_candidate_provenance: {
          source: 'OS NGD'
        }
      },
      related_organisations: [
        {
          organisation_name: 'Generic Supplier',
          role: 'Supplier'
        }
      ],
      job_contractor_candidates: [
        {
          company_name: 'Unqualified Business',
          role: 'Consultant'
        }
      ]
    }))).toEqual([]);
  });

  it('supports property_signals payloads from the research appendix', () => {
    const cards = getLookupEvidenceCards({
      research_appendix: {
        property_signals: {
          property: {
            candidate_occupier: {
              company_name: 'JOE DAVIES (MANCHESTER) LTD',
              confidence: 'medium',
              sources: [
                'https://www.google.com/maps/search/?api=1&query=53.4332091,-2.1653957'
              ]
            },
            survey_signals: [
              {
                signal: 'metal_roof_or_cladding_system',
                summary: 'OS NGD roof material is Metal.',
                confidence: 'high',
                source_url: 'https://www.google.com/maps/search/?api=1&query=53.4332091,-2.1653957'
              },
              {
                signal: 'survey_activity_possible',
                summary: 'A contractor describes initial site surveys before installation.',
                confidence: 'medium',
                party_name: 'The Sign Bridge Ltd'
              }
            ]
          },
          related_organisations: [
            {
              name: 'The Sign Bridge Ltd',
              role: 'main_contractor',
              notes: 'Provided illuminated signage work at the headquarters.',
              confidence: 'medium',
              website: 'https://www.thesignbridge.com/'
            }
          ],
          organisation_contact_routes: [
            {
              name: 'The Sign Bridge Ltd',
              role: 'main_contractor',
              notes: 'Provided illuminated signage work at the headquarters.',
              confidence: 'medium'
            }
          ]
        }
      }
    });

    expect(cards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Occupier / Site Operator',
        title: 'JOE DAVIES (MANCHESTER) LTD',
        confidence: 'medium',
        href: 'https://www.google.com/maps/search/?api=1&query=53.4332091,-2.1653957'
      }),
      expect.objectContaining({
        category: 'Contractor Identified',
        title: 'The Sign Bridge Ltd',
        body: expect.stringContaining('Provided illuminated signage work at the headquarters.'),
        href: 'https://www.thesignbridge.com/'
      }),
      expect.objectContaining({
        category: 'Survey / Specification',
        title: 'Metal roof or cladding system',
        confidence: 'high'
      })
    ]));
  });

  it('does not return lookup cards for OS roof candidate data alone', () => {
    expect(getLookupEvidenceCards({
      research: {
        os_ngd_roof_candidate: {
          nearest_address: '149 Broadstone Road, Stockport',
          geometry_area_m2: 4262.708,
          roofmaterial_confidenceindicator: 'Expected Data Output'
        }
      }
    })).toEqual([]);
  });
});

describe('getPropertyRouteCards', () => {
  it('returns six cards in the stable route order', () => {
    const cards = getPropertyRouteCards({});

    expect(cards.map((card) => card.type)).toEqual([
      'contractor',
      'owner',
      'surveyor',
      'occupier',
      'architect',
      'consultant'
    ]);
    expect(cards).toHaveLength(6);
    expect(cards.every((card) => card.isEmpty)).toBe(true);
  });

  it('normalizes present routes from organisation contact routes', () => {
    const cards = getPropertyRouteCards({
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
        }
      }
    });

    expect(cards.find((card) => card.type === 'contractor')).toEqual(expect.objectContaining({
      label: 'Contractor',
      name: 'The Sign Bridge Ltd',
      confidence: 'medium',
      evidence: expect.stringContaining('Provided signage works at the site.'),
      isEmpty: false
    }));
    expect(cards.find((card) => card.type === 'owner')).toEqual(expect.objectContaining({
      label: 'Owner',
      name: 'Northgate Estates',
      confidence: 'high',
      evidence: expect.stringContaining('Controls property maintenance approvals.'),
      isEmpty: false
    }));
  });

  it('normalizes routes from related organisations', () => {
    const cards = getPropertyRouteCards({
      research_appendix: {
        property_signals: {
          related_organisations: [
            {
              name: 'Civic Design Studio',
              role: 'architect',
              notes: 'Named on planning design documents.',
              confidence: 'medium'
            }
          ]
        }
      }
    });

    expect(cards.find((card) => card.type === 'architect')).toEqual(expect.objectContaining({
      name: 'Civic Design Studio',
      evidence: expect.stringContaining('Named on planning design documents.'),
      isEmpty: false
    }));
  });

  it('returns blank placeholder cards for absent route types', () => {
    const cards = getPropertyRouteCards({
      research_appendix: {
        property_signals: {
          organisation_contact_routes: [
            {
              name: 'The Sign Bridge Ltd',
              role: 'contractor'
            }
          ]
        }
      }
    });

    expect(cards.find((card) => card.type === 'contractor').isEmpty).toBe(false);
    expect(cards.find((card) => card.type === 'surveyor')).toEqual(expect.objectContaining({
      label: 'Surveyor',
      name: '',
      evidence: '',
      isEmpty: true
    }));
  });

  it('does not expose client_contact_routing as route evidence', () => {
    const cards = getPropertyRouteCards({
      research_appendix: {
        property_signals: {
          organisation_contact_routes: [
            {
              role: 'asset_manager',
              title: 'Asset Manager',
              source: 'client_contact_routing'
            },
            {
              route: 'client_contact_routing',
              source: 'client_contact_routing'
            }
          ]
        }
      }
    });

    expect(cards.find((card) => card.type === 'owner')).toEqual(expect.objectContaining({
      name: 'Asset Manager',
      evidence: '',
      isEmpty: false
    }));
    expect(cards.find((card) => card.type === 'contractor')).toEqual(expect.objectContaining({
      name: '',
      evidence: '',
      isEmpty: true
    }));
    expect(cards.some((card) => card.name === 'client_contact_routing')).toBe(false);
    expect(cards.some((card) => card.evidence === 'client_contact_routing')).toBe(false);
  });

  it('highlights the selected route when present', () => {
    const cards = getPropertyRouteCards({
      research_appendix: {
        contacts: {
          selected_contact_route: 'asset manager',
          contact_route_reason: 'Asset manager is the recommended property-control route.'
        },
        property_signals: {
          organisation_contact_routes: [
            {
              name: 'Northgate Estates',
              role: 'asset_manager'
            }
          ]
        }
      }
    });

    expect(cards.find((card) => card.type === 'owner')).toEqual(expect.objectContaining({
      name: 'Northgate Estates',
      isSelected: true,
      isEmpty: false
    }));
  });

  it('preserves selected route reason as evidence without an organisation', () => {
    const cards = getPropertyRouteCards({
      research_appendix: {
        contacts: {
          selected_contact_route: 'building surveyor',
          contact_route_reason: 'Surveyor is likely to own specification and condition assessment.'
        }
      }
    });

    expect(cards.find((card) => card.type === 'surveyor')).toEqual(expect.objectContaining({
      name: 'building surveyor',
      evidence: 'Surveyor is likely to own specification and condition assessment.',
      isSelected: true,
      isEmpty: false
    }));
  });
});

describe('getOsRoofCandidateEvidence', () => {
  it('normalizes a full OS NGD roof candidate object', () => {
    const evidence = getOsRoofCandidateEvidence({
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

    expect(evidence).toEqual({
      title: 'OS Roof Candidate',
      nearestAddress: '149 Broadstone Road, Reddish, Stockport, SK5 7GA',
      footprintArea: '4,263 sqm',
      roofSizeBand: expect.objectContaining({
        key: 'strong',
        label: 'Strong size signal'
      }),
      buildingAge: '1980-1989 / 1985',
      buildingAgeBand: expect.objectContaining({
        key: 'strong',
        label: 'Strong candidate'
      }),
      roofConfidence: {
        level: 'high',
        label: 'High confidence',
        indicator: 'Expected Data Output'
      },
      roofEvidenceDate: '2025-07-12',
      roofEvidenceDateBand: expect.objectContaining({
        key: 'strong',
        label: 'Fresh evidence'
      }),
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=53.433,-2.165',
      osid: 'osgb123'
    });
  });

  it('degrades cleanly when optional fields are missing', () => {
    const evidence = getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          nearest_address: 'Nearest known address'
        }
      }
    });

    expect(evidence).toEqual(expect.objectContaining({
      title: 'OS Roof Candidate',
      nearestAddress: 'Nearest known address',
      footprintArea: '',
      roofSizeBand: expect.objectContaining({
        key: 'unknown',
        label: 'Size unknown'
      }),
      buildingAge: '',
      buildingAgeBand: expect.objectContaining({
        key: 'unknown',
        label: 'Age unknown'
      }),
      roofConfidence: expect.objectContaining({
        level: 'low',
        label: 'Unknown confidence'
      }),
      roofEvidenceDate: '',
      roofEvidenceDateBand: null,
      googleMapsUrl: '',
      osid: ''
    }));
  });

  it('maps Expected Data Output to high confidence', () => {
    const evidence = getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          roofmaterial_confidenceindicator: 'Expected Data Output'
        }
      }
    });

    expect(evidence.roofConfidence).toEqual({
      level: 'high',
      label: 'High confidence',
      indicator: 'Expected Data Output'
    });
  });

  it('maps non-standard confidence indicators to medium confidence with caveat', () => {
    const evidence = getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          roofmaterial_confidenceindicator: 'Observed from secondary source'
        }
      }
    });

    expect(evidence.roofConfidence).toEqual({
      level: 'medium',
      label: 'Medium confidence',
      indicator: 'Observed from secondary source',
      caveat: 'Non-standard OS confidence indicator'
    });
  });

  it('returns null when OS NGD roof candidate data is absent', () => {
    expect(getOsRoofCandidateEvidence({ research: {} })).toBeNull();
    expect(getOsRoofCandidateEvidence({})).toBeNull();
  });

  it('normalizes embedded OS NGD roof evidence from research appendix property signals', () => {
    const evidence = getOsRoofCandidateEvidence({
      research_appendix: {
        properties: {
          primary_property_address: '149 Broadstone Road, Reddish, Stockport, Cheshire, SK5 7GA'
        },
        property_signals: {
          property: {
            address: 'JOE DAVIES (MANCHESTER) LTD, 149, BROADSTONE ROAD, STOCKPORT, SK5 7GA',
            building_age: '1980-1989',
            building_size_sq_m: 4262.708,
            sources: [
              'https://www.google.com/maps/search/?api=1&query=53.4332091,-2.1653957'
            ],
            survey_signals: [
              {
                signal: 'metal_roof_or_cladding_system',
                source: 'os_ngd',
                summary: 'OS NGD roof material is Metal; confidence Expected Data Output.',
                confidence: 'high',
                source_url: 'https://www.google.com/maps/search/?api=1&query=53.4332091,-2.1653957',
                evidence_date: '2025-07-12'
              },
              {
                signal: 'survey_activity_possible',
                source: '',
                summary: 'Contractor survey activity.'
              }
            ]
          }
        }
      }
    });

    expect(evidence).toEqual(expect.objectContaining({
      title: 'OS Roof Candidate',
      nearestAddress: 'JOE DAVIES (MANCHESTER) LTD, 149, BROADSTONE ROAD, STOCKPORT, SK5 7GA',
      footprintArea: '4,263 sqm',
      roofSizeBand: expect.objectContaining({
        key: 'strong',
        label: 'Strong size signal'
      }),
      buildingAge: '1980-1989',
      roofConfidence: {
        level: 'high',
        label: 'High confidence',
        indicator: 'Expected Data Output'
      },
      roofEvidenceDate: '2025-07-12',
      roofEvidenceDateBand: expect.objectContaining({
        key: 'strong',
        label: 'Fresh evidence'
      }),
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=53.4332091,-2.1653957'
    }));
    expect(evidence.buildingAgeBand).toEqual(expect.objectContaining({
      key: 'strong',
      label: 'Strong candidate'
    }));
  });

  it('does not normalize embedded property signals without an OS NGD roof signal', () => {
    expect(getOsRoofCandidateEvidence({
      research_appendix: {
        property_signals: {
          property: {
            building_age: '1980-1989',
            building_size_sq_m: 4262.708,
            survey_signals: [
              {
                signal: 'survey_activity_possible',
                source: '',
                summary: 'Contractor survey activity.'
              }
            ]
          }
        }
      }
    })).toBeNull();
  });

  it('maps building ages at or above 25 years to strong candidate', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          buildingage_year: new Date().getFullYear() - 25
        }
      }
    }).buildingAgeBand).toEqual(expect.objectContaining({
      key: 'strong',
      label: 'Strong candidate'
    }));
  });

  it('maps roof sizes at or above 2000 sqm to strong size signal', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          geometry_area_m2: 2000
        }
      }
    }).roofSizeBand).toEqual(expect.objectContaining({
      key: 'strong',
      label: 'Strong size signal'
    }));
  });

  it('maps roof sizes from 1000 to 1999 sqm to good size signal', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          geometry_area_m2: 1000
        }
      }
    }).roofSizeBand).toEqual(expect.objectContaining({
      key: 'good',
      label: 'Good size signal'
    }));
  });

  it('maps roof sizes below 1000 sqm to lower size signal', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          geometry_area_m2: 999
        }
      }
    }).roofSizeBand).toEqual(expect.objectContaining({
      key: 'lower',
      label: 'Lower size signal'
    }));
  });

  it('maps roof evidence dates under 1 year old to fresh evidence', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          roofmaterial_evidencedate: yearsAgoDate(0)
        }
      }
    }).roofEvidenceDateBand).toEqual(expect.objectContaining({
      key: 'strong',
      label: 'Fresh evidence'
    }));
  });

  it('maps roof evidence dates from 1 to under 3 years old to recent evidence', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          roofmaterial_evidencedate: yearsAgoDate(2)
        }
      }
    }).roofEvidenceDateBand).toEqual(expect.objectContaining({
      key: 'good',
      label: 'Recent evidence'
    }));
  });

  it('maps roof evidence dates from 3 to 5 years old to aging evidence', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          roofmaterial_evidencedate: yearsAgoDate(4)
        }
      }
    }).roofEvidenceDateBand).toEqual(expect.objectContaining({
      key: 'aging',
      label: 'Aging evidence'
    }));
  });

  it('maps roof evidence dates over 5 years old to older evidence', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          roofmaterial_evidencedate: yearsAgoDate(6)
        }
      }
    }).roofEvidenceDateBand).toEqual(expect.objectContaining({
      key: 'lower',
      label: 'Older evidence'
    }));
  });

  it('maps unparseable roof evidence dates to date unclear', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          roofmaterial_evidencedate: 'not a date'
        }
      }
    }).roofEvidenceDateBand).toEqual({
      key: 'unknown',
      label: 'Date unclear',
      years: null
    });
  });

  it('maps building ages from 10 to 24 years to good candidate', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          buildingage_year: new Date().getFullYear() - 10
        }
      }
    }).buildingAgeBand).toEqual(expect.objectContaining({
      key: 'good',
      label: 'Good candidate'
    }));
  });

  it('maps building ages below 10 years to lower age signal', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          buildingage_year: new Date().getFullYear() - 9
        }
      }
    }).buildingAgeBand).toEqual(expect.objectContaining({
      key: 'lower',
      label: 'Lower age signal'
    }));
  });

  it('infers building age from the period end year when explicit year is missing', () => {
    expect(getOsRoofCandidateEvidence({
      research: {
        os_ngd_roof_candidate: {
          buildingage_period: '2000-2009'
        }
      }
    }).buildingAgeBand).toEqual(expect.objectContaining({
      key: 'good',
      label: 'Good candidate'
    }));
  });
});
