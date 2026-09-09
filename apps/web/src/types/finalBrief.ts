export type ContactRoleFit =
  | 'primary_buyer'
  | 'influencer'
  | 'fallback'
  | 'outside_configured_icp_roles'
  // Legacy output retained for older finalized briefs.
  | 'outside_icp_roles';

export interface ContactRelationshipFields {
  relationship_source?: string | null;
  enrichment_source?: string | null;
  preferred_contact?: boolean | null;
  role_fit?: ContactRoleFit | null;
}

export interface FinalBriefContact extends ContactRelationshipFields {
  name?: string | null;
  title?: string | null;
  job_title?: string | null;
  profession?: string | null;
  role?: string | null;
  email?: string | null;
  telephone?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  linkedin_url?: string | null;
}

export interface FinalBriefWhoToContact {
  recommended_contact?: FinalBriefContact | string | null;
  primary_buyer?: FinalBriefContact | string | null;
  influencer?: FinalBriefContact | string | null;
  likely_influencer?: FinalBriefContact | string | null;
  fallback?: FinalBriefContact | string | null;
  fallback_route?: FinalBriefContact | string | null;
  outside_configured_icp_roles?: FinalBriefContact | string | null;
  outside_icp_roles?: FinalBriefContact | string | null;
}

export type ProductFitAssessmentStatus = 'recommended' | 'needs_discovery';

export type ProductFitGrowthMotion =
  | 'outbound'
  | 'outbound_led'
  | 'inbound'
  | 'inbound_led'
  | 'both'
  | 'bespoke_workflow'
  | 'needs_discovery';

export type ProductFitConfidence = 'low' | 'medium' | 'high';

export type ProductFitSelectionBasis =
  | 'explicit_objective'
  | 'industry_mapping'
  | 'target_evidence';

export interface ProductFitOffering {
  key: string;
  label: string;
}

export interface ProductFitIntelligence {
  applicable: boolean;
  primary_type: string;
  supporting_types: string[];
}

export interface ProductFitEvidence {
  title: string;
  url: string;
  supports: string;
}

export interface ProductFitAssessment {
  assessment_status: ProductFitAssessmentStatus;
  best_growth_motion: ProductFitGrowthMotion;
  primary_offering: ProductFitOffering | null;
  supporting_offerings: ProductFitOffering[];
  intelligence_fit: ProductFitIntelligence;
  industry_basis: string;
  confidence: ProductFitConfidence;
  selection_basis: ProductFitSelectionBasis[];
  rationale: string;
  why_now: string;
  growth_assist_contribution: string[];
  proposed_outputs: string[];
  information_required: string[];
  evidence: ProductFitEvidence[];
}
