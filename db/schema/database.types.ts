export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      briefs: {
        Row: {
          brief_html: string | null
          brief_markdown: string | null
          client_id: string
          company_id: string | null
          created_at: string | null
          embedding: string | null
          id: string
          source_generated_at: string | null
        }
        Insert: {
          brief_html?: string | null
          brief_markdown?: string | null
          client_id: string
          company_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          source_generated_at?: string | null
        }
        Update: {
          brief_html?: string | null
          brief_markdown?: string | null
          client_id?: string
          company_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          source_generated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "briefs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_config_current: {
        Row: {
          client_id: string
          document_id: string
          document_type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          document_id: string
          document_type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          document_id?: string
          document_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_config_current_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "client_config_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      client_config_documents: {
        Row: {
          checksum: string
          client_id: string
          content: Json
          created_at: string
          created_by: string | null
          document_type: string
          id: string
          notes: string | null
          source_path: string | null
          template_name: string | null
          template_version: string | null
          version_id: string
        }
        Insert: {
          checksum: string
          client_id: string
          content: Json
          created_at?: string
          created_by?: string | null
          document_type: string
          id?: string
          notes?: string | null
          source_path?: string | null
          template_name?: string | null
          template_version?: string | null
          version_id: string
        }
        Update: {
          checksum?: string
          client_id?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          document_type?: string
          id?: string
          notes?: string | null
          source_path?: string | null
          template_name?: string | null
          template_version?: string | null
          version_id?: string
        }
        Relationships: []
      }
      client_context_reviews: {
        Row: {
          client_context_version_id: string | null
          client_id: string
          created_at: string
          generated_at: string
          html_bucket: string | null
          html_content_type: string | null
          html_object_path: string | null
          id: string
          pdf_bucket: string | null
          pdf_content_type: string | null
          pdf_object_path: string | null
          review_json: Json
          seq: number
          source_path: string | null
        }
        Insert: {
          client_context_version_id?: string | null
          client_id: string
          created_at?: string
          generated_at: string
          html_bucket?: string | null
          html_content_type?: string | null
          html_object_path?: string | null
          id?: string
          pdf_bucket?: string | null
          pdf_content_type?: string | null
          pdf_object_path?: string | null
          review_json?: Json
          seq?: never
          source_path?: string | null
        }
        Update: {
          client_context_version_id?: string | null
          client_id?: string
          created_at?: string
          generated_at?: string
          html_bucket?: string | null
          html_content_type?: string | null
          html_object_path?: string | null
          id?: string
          pdf_bucket?: string | null
          pdf_content_type?: string | null
          pdf_object_path?: string | null
          review_json?: Json
          seq?: never
          source_path?: string | null
        }
        Relationships: []
      }
      client_ingest_queue: {
        Row: {
          attempts: number
          client_id: string
          company_name: string | null
          company_number: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          payload: Json
          priority: number
          scheduled_at: string
          source_name: string
          source_record_id: string
          source_record_type: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          client_id: string
          company_name?: string | null
          company_number?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          payload?: Json
          priority?: number
          scheduled_at?: string
          source_name: string
          source_record_id: string
          source_record_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          client_id?: string
          company_name?: string | null
          company_number?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          payload?: Json
          priority?: number
          scheduled_at?: string
          source_name?: string
          source_record_id?: string
          source_record_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_source_rules: {
        Row: {
          client_id: string
          created_at: string
          enabled: boolean
          exclude_company_numbers: string[] | null
          id: string
          include_company_numbers: string[] | null
          notes: string | null
          regions: string[] | null
          sic_exclude: string[] | null
          sic_include: string[] | null
          source_name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          enabled?: boolean
          exclude_company_numbers?: string[] | null
          id?: string
          include_company_numbers?: string[] | null
          notes?: string | null
          regions?: string[] | null
          sic_exclude?: string[] | null
          sic_include?: string[] | null
          source_name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          enabled?: boolean
          exclude_company_numbers?: string[] | null
          id?: string
          include_company_numbers?: string[] | null
          notes?: string | null
          regions?: string[] | null
          sic_exclude?: string[] | null
          sic_include?: string[] | null
          source_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          client_id: string
          company_name: string | null
          company_number: string | null
          created_at: string | null
          description: string | null
          employees: string | null
          extended_brief_generated: boolean | null
          id: string
          industry: string | null
          location: string | null
          postcode: string | null
          sic_code_descriptions: string | null
          sic_codes: string | null
          source_company_id: string | null
          turnover_gbp_guess: string | null
          website: string | null
          website_confidence: string | null
        }
        Insert: {
          client_id: string
          company_name?: string | null
          company_number?: string | null
          created_at?: string | null
          description?: string | null
          employees?: string | null
          extended_brief_generated?: boolean | null
          id?: string
          industry?: string | null
          location?: string | null
          postcode?: string | null
          sic_code_descriptions?: string | null
          sic_codes?: string | null
          source_company_id?: string | null
          turnover_gbp_guess?: string | null
          website?: string | null
          website_confidence?: string | null
        }
        Update: {
          client_id?: string
          company_name?: string | null
          company_number?: string | null
          created_at?: string | null
          description?: string | null
          employees?: string | null
          extended_brief_generated?: boolean | null
          id?: string
          industry?: string | null
          location?: string | null
          postcode?: string | null
          sic_code_descriptions?: string | null
          sic_codes?: string | null
          source_company_id?: string | null
          turnover_gbp_guess?: string | null
          website?: string | null
          website_confidence?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          apollo_id: string | null
          client_id: string
          company_id: string | null
          confidence: string | null
          created_at: string | null
          email: string | null
          id: string
          linkedin: string | null
          name: string | null
          phone: string | null
          role: string | null
          source_contact_id: string | null
        }
        Insert: {
          apollo_id?: string | null
          client_id: string
          company_id?: string | null
          confidence?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          linkedin?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          source_contact_id?: string | null
        }
        Update: {
          apollo_id?: string | null
          client_id?: string
          company_id?: string | null
          confidence?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          linkedin?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          source_contact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      failures: {
        Row: {
          client_id: string
          company_name: string | null
          company_ref: string | null
          created_at: string
          error_message: string
          id: string
          source_company_id: string | null
          source_created_at: string | null
          stage: string
        }
        Insert: {
          client_id: string
          company_name?: string | null
          company_ref?: string | null
          created_at?: string
          error_message: string
          id?: string
          source_company_id?: string | null
          source_created_at?: string | null
          stage: string
        }
        Update: {
          client_id?: string
          company_name?: string | null
          company_ref?: string | null
          created_at?: string
          error_message?: string
          id?: string
          source_company_id?: string | null
          source_created_at?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "failures_company_ref_fkey"
            columns: ["company_ref"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      final_brief_feedback_analysis_reports: {
        Row: {
          analysis_json: Json
          campaign_id: string | null
          client_id: string
          created_at: string
          feedback_from: string | null
          feedback_to: string | null
          generated_at: string
          html_bucket: string | null
          html_content_type: string | null
          html_object_path: string | null
          id: string
          model: string
          pdf_bucket: string | null
          pdf_content_type: string | null
          pdf_object_path: string | null
          seq: number
          signal_id: string | null
          source_path: string | null
        }
        Insert: {
          analysis_json?: Json
          campaign_id?: string | null
          client_id: string
          created_at?: string
          feedback_from?: string | null
          feedback_to?: string | null
          generated_at: string
          html_bucket?: string | null
          html_content_type?: string | null
          html_object_path?: string | null
          id?: string
          model: string
          pdf_bucket?: string | null
          pdf_content_type?: string | null
          pdf_object_path?: string | null
          seq?: never
          signal_id?: string | null
          source_path?: string | null
        }
        Update: {
          analysis_json?: Json
          campaign_id?: string | null
          client_id?: string
          created_at?: string
          feedback_from?: string | null
          feedback_to?: string | null
          generated_at?: string
          html_bucket?: string | null
          html_content_type?: string | null
          html_object_path?: string | null
          id?: string
          model?: string
          pdf_bucket?: string | null
          pdf_content_type?: string | null
          pdf_object_path?: string | null
          seq?: never
          signal_id?: string | null
          source_path?: string | null
        }
        Relationships: []
      }
      land_registry_ccod_master: {
        Row: {
          company_number: string | null
          county: string | null
          district: string | null
          id: string
          ingested_at: string
          postcode: string | null
          property_address: string | null
          proprietor_name: string | null
          raw_payload: Json
          region: string | null
          source_updated_at: string | null
          tenure: string | null
          title_number: string | null
          updated_at: string
        }
        Insert: {
          company_number?: string | null
          county?: string | null
          district?: string | null
          id?: string
          ingested_at?: string
          postcode?: string | null
          property_address?: string | null
          proprietor_name?: string | null
          raw_payload?: Json
          region?: string | null
          source_updated_at?: string | null
          tenure?: string | null
          title_number?: string | null
          updated_at?: string
        }
        Update: {
          company_number?: string | null
          county?: string | null
          district?: string | null
          id?: string
          ingested_at?: string
          postcode?: string | null
          property_address?: string | null
          proprietor_name?: string | null
          raw_payload?: Json
          region?: string | null
          source_updated_at?: string | null
          tenure?: string | null
          title_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      output_briefs: {
        Row: {
          brief_markdown: string | null
          client_id: string
          company_id: string
          generated_at: string | null
          id: string
          logged_at: string
          row_key: string
          run_id: string
          seq: number
        }
        Insert: {
          brief_markdown?: string | null
          client_id: string
          company_id: string
          generated_at?: string | null
          id?: string
          logged_at?: string
          row_key: string
          run_id: string
          seq?: never
        }
        Update: {
          brief_markdown?: string | null
          client_id?: string
          company_id?: string
          generated_at?: string | null
          id?: string
          logged_at?: string
          row_key?: string
          run_id?: string
          seq?: never
        }
        Relationships: []
      }
      output_companies: {
        Row: {
          building_ownership: string | null
          buildings_count: string | null
          campaign_id: string | null
          client_context_version_id: string | null
          client_id: string
          company_id: string
          company_number: string | null
          company_structure: string | null
          created_at: string | null
          description: string | null
          employees: string | null
          extended_brief_generated: string | null
          has_solar: string | null
          hq_country: string | null
          icp_rules_version_id: string | null
          id: string
          industry: string | null
          locations: string | null
          logged_at: string
          manufacturing_locations: string | null
          name: string | null
          notes: string | null
          postcode: string | null
          roof_sq_m_estimate: string | null
          row_key: string
          run_id: string
          seq: number
          sic_code_descriptions: string | null
          sic_codes: string | null
          signal_id: string | null
          sources: string | null
          turnover_gbp_guess: string | null
          website: string | null
          website_confidence: string | null
        }
        Insert: {
          building_ownership?: string | null
          buildings_count?: string | null
          campaign_id?: string | null
          client_context_version_id?: string | null
          client_id: string
          company_id: string
          company_number?: string | null
          company_structure?: string | null
          created_at?: string | null
          description?: string | null
          employees?: string | null
          extended_brief_generated?: string | null
          has_solar?: string | null
          hq_country?: string | null
          icp_rules_version_id?: string | null
          id?: string
          industry?: string | null
          locations?: string | null
          logged_at?: string
          manufacturing_locations?: string | null
          name?: string | null
          notes?: string | null
          postcode?: string | null
          roof_sq_m_estimate?: string | null
          row_key: string
          run_id: string
          seq?: never
          sic_code_descriptions?: string | null
          sic_codes?: string | null
          signal_id?: string | null
          sources?: string | null
          turnover_gbp_guess?: string | null
          website?: string | null
          website_confidence?: string | null
        }
        Update: {
          building_ownership?: string | null
          buildings_count?: string | null
          campaign_id?: string | null
          client_context_version_id?: string | null
          client_id?: string
          company_id?: string
          company_number?: string | null
          company_structure?: string | null
          created_at?: string | null
          description?: string | null
          employees?: string | null
          extended_brief_generated?: string | null
          has_solar?: string | null
          hq_country?: string | null
          icp_rules_version_id?: string | null
          id?: string
          industry?: string | null
          locations?: string | null
          logged_at?: string
          manufacturing_locations?: string | null
          name?: string | null
          notes?: string | null
          postcode?: string | null
          roof_sq_m_estimate?: string | null
          row_key?: string
          run_id?: string
          seq?: never
          sic_code_descriptions?: string | null
          sic_codes?: string | null
          signal_id?: string | null
          sources?: string | null
          turnover_gbp_guess?: string | null
          website?: string | null
          website_confidence?: string | null
        }
        Relationships: []
      }
      output_contacts: {
        Row: {
          apollo_id: string | null
          client_id: string
          company_id: string
          confidence: string | null
          contact_id: string
          email: string | null
          id: string
          linkedin: string | null
          logged_at: string
          name: string | null
          phone: string | null
          role: string | null
          row_key: string
          run_id: string
          seq: number
        }
        Insert: {
          apollo_id?: string | null
          client_id: string
          company_id: string
          confidence?: string | null
          contact_id: string
          email?: string | null
          id?: string
          linkedin?: string | null
          logged_at?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          row_key: string
          run_id: string
          seq?: never
        }
        Update: {
          apollo_id?: string | null
          client_id?: string
          company_id?: string
          confidence?: string | null
          contact_id?: string
          email?: string | null
          id?: string
          linkedin?: string | null
          logged_at?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          row_key?: string
          run_id?: string
          seq?: never
        }
        Relationships: []
      }
      output_cost_events: {
        Row: {
          cached_input_tokens: number
          client_id: string
          company_id: string
          company_name: string | null
          duration_ms: number | null
          estimate_reason: string | null
          estimated_cost_usd: number | null
          id: string
          input_tokens: number
          is_estimated: boolean
          logged_at: string
          metadata: Json
          model: string | null
          ok: boolean
          operation: string
          output_tokens: number
          provider: string
          request_count: number
          run_id: string
          seq: number
          stage: string
          status_code: number | null
          total_tokens: number
          transaction_id: string | null
        }
        Insert: {
          cached_input_tokens?: number
          client_id: string
          company_id: string
          company_name?: string | null
          duration_ms?: number | null
          estimate_reason?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number
          is_estimated?: boolean
          logged_at?: string
          metadata?: Json
          model?: string | null
          ok?: boolean
          operation: string
          output_tokens?: number
          provider: string
          request_count?: number
          run_id: string
          seq?: never
          stage: string
          status_code?: number | null
          total_tokens?: number
          transaction_id?: string | null
        }
        Update: {
          cached_input_tokens?: number
          client_id?: string
          company_id?: string
          company_name?: string | null
          duration_ms?: number | null
          estimate_reason?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number
          is_estimated?: boolean
          logged_at?: string
          metadata?: Json
          model?: string | null
          ok?: boolean
          operation?: string
          output_tokens?: number
          provider?: string
          request_count?: number
          run_id?: string
          seq?: never
          stage?: string
          status_code?: number | null
          total_tokens?: number
          transaction_id?: string | null
        }
        Relationships: []
      }
      output_cost_summaries: {
        Row: {
          apollo_cost_usd: number
          apollo_requests: number
          brave_cost_usd: number
          brave_requests: number
          client_id: string
          company_id: string
          company_name: string | null
          estimate_reason: string | null
          generated_at: string
          id: string
          is_estimated: boolean
          openai_cached_input_tokens: number
          openai_cost_usd: number
          openai_input_tokens: number
          openai_output_tokens: number
          openai_requests: number
          openai_total_tokens: number
          provider_breakdown: Json
          run_id: string
          scope: string
          seq: number
          total_cost_usd: number
          updated_at: string
        }
        Insert: {
          apollo_cost_usd?: number
          apollo_requests?: number
          brave_cost_usd?: number
          brave_requests?: number
          client_id: string
          company_id: string
          company_name?: string | null
          estimate_reason?: string | null
          generated_at?: string
          id?: string
          is_estimated?: boolean
          openai_cached_input_tokens?: number
          openai_cost_usd?: number
          openai_input_tokens?: number
          openai_output_tokens?: number
          openai_requests?: number
          openai_total_tokens?: number
          provider_breakdown?: Json
          run_id: string
          scope: string
          seq?: never
          total_cost_usd?: number
          updated_at?: string
        }
        Update: {
          apollo_cost_usd?: number
          apollo_requests?: number
          brave_cost_usd?: number
          brave_requests?: number
          client_id?: string
          company_id?: string
          company_name?: string | null
          estimate_reason?: string | null
          generated_at?: string
          id?: string
          is_estimated?: boolean
          openai_cached_input_tokens?: number
          openai_cost_usd?: number
          openai_input_tokens?: number
          openai_output_tokens?: number
          openai_requests?: number
          openai_total_tokens?: number
          provider_breakdown?: Json
          run_id?: string
          scope?: string
          seq?: never
          total_cost_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      output_failures: {
        Row: {
          client_id: string
          company_id: string | null
          company_name: string | null
          created_at: string | null
          error_message: string | null
          id: string
          logged_at: string
          row_key: string
          run_id: string
          seq: number
          stage: string | null
          transaction_id: string | null
        }
        Insert: {
          client_id: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          logged_at?: string
          row_key: string
          run_id: string
          seq?: never
          stage?: string | null
          transaction_id?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          logged_at?: string
          row_key?: string
          run_id?: string
          seq?: never
          stage?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      output_final_briefs: {
        Row: {
          brief_markdown: string | null
          client_context_version_id: string | null
          client_id: string
          company_id: string
          decision: string
          final_brief_json: Json
          fit_score: number | null
          generated_at: string
          html_bucket: string
          html_object_path: string
          icp_rules_version_id: string | null
          id: string
          logged_at: string
          pdf_bucket: string
          pdf_object_path: string
          row_key: string
          run_id: string
          seq: number
        }
        Insert: {
          brief_markdown?: string | null
          client_context_version_id?: string | null
          client_id: string
          company_id: string
          decision: string
          final_brief_json?: Json
          fit_score?: number | null
          generated_at: string
          html_bucket: string
          html_object_path: string
          icp_rules_version_id?: string | null
          id?: string
          logged_at?: string
          pdf_bucket: string
          pdf_object_path: string
          row_key: string
          run_id: string
          seq?: never
        }
        Update: {
          brief_markdown?: string | null
          client_context_version_id?: string | null
          client_id?: string
          company_id?: string
          decision?: string
          final_brief_json?: Json
          fit_score?: number | null
          generated_at?: string
          html_bucket?: string
          html_object_path?: string
          icp_rules_version_id?: string | null
          id?: string
          logged_at?: string
          pdf_bucket?: string
          pdf_object_path?: string
          row_key?: string
          run_id?: string
          seq?: never
        }
        Relationships: []
      }
      output_properties: {
        Row: {
          address: string | null
          client_id: string
          company_id: string
          created_at: string | null
          data_source: string | null
          epc_asset_rating_band: string | null
          epc_building_emissions: string | null
          epc_floor_area: string | null
          epc_has_r3: string | null
          epc_has_r4: string | null
          epc_has_solar_recommendation: string | null
          epc_lmk_key: string | null
          epc_lodgement_date: string | null
          epc_match_confidence: string | null
          epc_property_type: string | null
          epc_recommendation_codes: string | null
          epc_renewable_sources: string | null
          epc_typical_emissions: string | null
          has_solar: string | null
          id: string
          last_change_date: string | null
          logged_at: string
          ownership_type: string | null
          property_id: string | null
          property_research_overall_confidence: string | null
          property_research_sources: string | null
          property_research_summary: string | null
          property_research_type: string | null
          property_research_use_class: string | null
          property_row_id: string
          registry_name: string | null
          roof_estimation_confidence: string | null
          roof_estimation_method: string | null
          roof_estimation_notes: string | null
          roof_estimation_source: string | null
          roof_estimation_status: string | null
          roof_sq_m_estimate: string | null
          row_key: string
          run_id: string
          seq: number
        }
        Insert: {
          address?: string | null
          client_id: string
          company_id: string
          created_at?: string | null
          data_source?: string | null
          epc_asset_rating_band?: string | null
          epc_building_emissions?: string | null
          epc_floor_area?: string | null
          epc_has_r3?: string | null
          epc_has_r4?: string | null
          epc_has_solar_recommendation?: string | null
          epc_lmk_key?: string | null
          epc_lodgement_date?: string | null
          epc_match_confidence?: string | null
          epc_property_type?: string | null
          epc_recommendation_codes?: string | null
          epc_renewable_sources?: string | null
          epc_typical_emissions?: string | null
          has_solar?: string | null
          id?: string
          last_change_date?: string | null
          logged_at?: string
          ownership_type?: string | null
          property_id?: string | null
          property_research_overall_confidence?: string | null
          property_research_sources?: string | null
          property_research_summary?: string | null
          property_research_type?: string | null
          property_research_use_class?: string | null
          property_row_id: string
          registry_name?: string | null
          roof_estimation_confidence?: string | null
          roof_estimation_method?: string | null
          roof_estimation_notes?: string | null
          roof_estimation_source?: string | null
          roof_estimation_status?: string | null
          roof_sq_m_estimate?: string | null
          row_key: string
          run_id: string
          seq?: never
        }
        Update: {
          address?: string | null
          client_id?: string
          company_id?: string
          created_at?: string | null
          data_source?: string | null
          epc_asset_rating_band?: string | null
          epc_building_emissions?: string | null
          epc_floor_area?: string | null
          epc_has_r3?: string | null
          epc_has_r4?: string | null
          epc_has_solar_recommendation?: string | null
          epc_lmk_key?: string | null
          epc_lodgement_date?: string | null
          epc_match_confidence?: string | null
          epc_property_type?: string | null
          epc_recommendation_codes?: string | null
          epc_renewable_sources?: string | null
          epc_typical_emissions?: string | null
          has_solar?: string | null
          id?: string
          last_change_date?: string | null
          logged_at?: string
          ownership_type?: string | null
          property_id?: string | null
          property_research_overall_confidence?: string | null
          property_research_sources?: string | null
          property_research_summary?: string | null
          property_research_type?: string | null
          property_research_use_class?: string | null
          property_row_id?: string
          registry_name?: string | null
          roof_estimation_confidence?: string | null
          roof_estimation_method?: string | null
          roof_estimation_notes?: string | null
          roof_estimation_source?: string | null
          roof_estimation_status?: string | null
          roof_sq_m_estimate?: string | null
          row_key?: string
          run_id?: string
          seq?: never
        }
        Relationships: []
      }
      output_scores: {
        Row: {
          client_context_version_id: string | null
          client_id: string
          company_id: string
          data_quality_score: string | null
          decision: string | null
          disqualifiers: string | null
          employees_score: string | null
          fit_score: string | null
          icp_rules_version_id: string | null
          id: string
          industry_score: string | null
          logged_at: string
          manufacturing_score: string | null
          matched_keywords: string | null
          ownership_score: string | null
          rationale: string | null
          roof_score: string | null
          row_key: string
          run_id: string
          seq: number
          signal_context_score: string | null
          solar_score: string | null
          structure_score: string | null
          top_assets: string | null
          turnover_score: string | null
          updated_at: string | null
        }
        Insert: {
          client_context_version_id?: string | null
          client_id: string
          company_id: string
          data_quality_score?: string | null
          decision?: string | null
          disqualifiers?: string | null
          employees_score?: string | null
          fit_score?: string | null
          icp_rules_version_id?: string | null
          id?: string
          industry_score?: string | null
          logged_at?: string
          manufacturing_score?: string | null
          matched_keywords?: string | null
          ownership_score?: string | null
          rationale?: string | null
          roof_score?: string | null
          row_key: string
          run_id: string
          seq?: never
          signal_context_score?: string | null
          solar_score?: string | null
          structure_score?: string | null
          top_assets?: string | null
          turnover_score?: string | null
          updated_at?: string | null
        }
        Update: {
          client_context_version_id?: string | null
          client_id?: string
          company_id?: string
          data_quality_score?: string | null
          decision?: string | null
          disqualifiers?: string | null
          employees_score?: string | null
          fit_score?: string | null
          icp_rules_version_id?: string | null
          id?: string
          industry_score?: string | null
          logged_at?: string
          manufacturing_score?: string | null
          matched_keywords?: string | null
          ownership_score?: string | null
          rationale?: string | null
          roof_score?: string | null
          row_key?: string
          run_id?: string
          seq?: never
          signal_context_score?: string | null
          solar_score?: string | null
          structure_score?: string | null
          top_assets?: string | null
          turnover_score?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      output_signals: {
        Row: {
          client_id: string
          company_id: string
          date: string | null
          id: string
          logged_at: string
          row_key: string
          run_id: string
          sentiment: string | null
          seq: number
          signal_id: string | null
          source_url: string | null
          summary: string | null
          type: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          date?: string | null
          id?: string
          logged_at?: string
          row_key: string
          run_id: string
          sentiment?: string | null
          seq?: never
          signal_id?: string | null
          source_url?: string | null
          summary?: string | null
          type?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          date?: string | null
          id?: string
          logged_at?: string
          row_key?: string
          run_id?: string
          sentiment?: string | null
          seq?: never
          signal_id?: string | null
          source_url?: string | null
          summary?: string | null
          type?: string | null
        }
        Relationships: []
      }
      portal_auth_invites: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          is_active: boolean
          portal_role: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          is_active?: boolean
          portal_role?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          portal_role?: string
        }
        Relationships: []
      }
      portal_brief_assignments: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          client_id: string
          company_id: string
          created_at: string
          id: string
          run_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          run_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          run_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_brief_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "portal_team_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      portal_brief_feedback: {
        Row: {
          brief_verdict: string
          client_id: string
          company_id: string
          contacted: boolean
          created_at: string
          created_by: string | null
          id: string
          meeting_booked: boolean
          notes: string | null
          quick_reason: string | null
          run_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brief_verdict: string
          client_id: string
          company_id: string
          contacted?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_booked?: boolean
          notes?: string | null
          quick_reason?: string | null
          run_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brief_verdict?: string
          client_id?: string
          company_id?: string
          contacted?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_booked?: boolean
          notes?: string | null
          quick_reason?: string | null
          run_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      portal_brief_notes: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          legacy_feedback_id: string | null
          note_text: string
          run_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          legacy_feedback_id?: string | null
          note_text: string
          run_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          legacy_feedback_id?: string | null
          note_text?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_brief_notes_legacy_feedback_id_fkey"
            columns: ["legacy_feedback_id"]
            isOneToOne: false
            referencedRelation: "portal_brief_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_brief_notes_legacy_feedback_id_fkey"
            columns: ["legacy_feedback_id"]
            isOneToOne: false
            referencedRelation: "portal_brief_feedback_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_email_domain_assignments: {
        Row: {
          client_id: string
          created_at: string
          default_role: string
          email_domain: string
          id: string
          is_active: boolean
          is_verified: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          default_role?: string
          email_domain: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          default_role?: string
          email_domain?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      portal_team_members: {
        Row: {
          client_id: string
          created_at: string
          display_name: string | null
          email: string
          is_active: boolean
          team_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          display_name?: string | null
          email: string
          is_active?: boolean
          team_role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          display_name?: string | null
          email?: string
          is_active?: boolean
          team_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          client_id: string
          company_id: string | null
          created_at: string | null
          data_quality_score: string | null
          decision: string | null
          disqualifiers: string | null
          employees_score: string | null
          fit_score: number | null
          id: string
          industry_score: string | null
          manufacturing_score: string | null
          matched_keywords: string | null
          ownership_score: string | null
          rationale: Json | null
          roof_score: string | null
          scoring_breakdown: Json | null
          solar_score: string | null
          source_updated_at: string | null
          structure_score: string | null
          top_assets: string | null
          turnover_score: string | null
        }
        Insert: {
          client_id: string
          company_id?: string | null
          created_at?: string | null
          data_quality_score?: string | null
          decision?: string | null
          disqualifiers?: string | null
          employees_score?: string | null
          fit_score?: number | null
          id?: string
          industry_score?: string | null
          manufacturing_score?: string | null
          matched_keywords?: string | null
          ownership_score?: string | null
          rationale?: Json | null
          roof_score?: string | null
          scoring_breakdown?: Json | null
          solar_score?: string | null
          source_updated_at?: string | null
          structure_score?: string | null
          top_assets?: string | null
          turnover_score?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string | null
          created_at?: string | null
          data_quality_score?: string | null
          decision?: string | null
          disqualifiers?: string | null
          employees_score?: string | null
          fit_score?: number | null
          id?: string
          industry_score?: string | null
          manufacturing_score?: string | null
          matched_keywords?: string | null
          ownership_score?: string | null
          rationale?: Json | null
          roof_score?: string | null
          scoring_breakdown?: Json | null
          solar_score?: string | null
          source_updated_at?: string | null
          structure_score?: string | null
          top_assets?: string | null
          turnover_score?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      source_ingest_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          metadata: Json
          rows_inserted: number
          rows_seen: number
          rows_updated: number
          source_name: string
          started_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          rows_inserted?: number
          rows_seen?: number
          rows_updated?: number
          source_name: string
          started_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          rows_inserted?: number
          rows_seen?: number
          rows_updated?: number
          source_name?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      portal_brief_assignments_enriched: {
        Row: {
          assigned_by: string | null
          assigned_by_display_name: string | null
          assigned_by_email: string | null
          assigned_to: string | null
          assigned_to_display_name: string | null
          assigned_to_email: string | null
          assigned_to_is_active: boolean | null
          assigned_to_team_role: string | null
          client_id: string | null
          company_id: string | null
          created_at: string | null
          id: string | null
          run_id: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_brief_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "portal_team_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      portal_brief_feedback_enriched: {
        Row: {
          brief_verdict: string | null
          client_id: string | null
          company_id: string | null
          contacted: boolean | null
          created_at: string | null
          created_by: string | null
          created_by_display_name: string | null
          created_by_email: string | null
          id: string | null
          meeting_booked: boolean | null
          notes: string | null
          quick_reason: string | null
          run_id: string | null
          updated_at: string | null
          updated_by: string | null
          updated_by_display_name: string | null
          updated_by_email: string | null
        }
        Relationships: []
      }
      portal_brief_notes_enriched: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_display_name: string | null
          created_by_email: string | null
          id: string | null
          legacy_feedback_id: string | null
          note_text: string | null
          run_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_brief_notes_legacy_feedback_id_fkey"
            columns: ["legacy_feedback_id"]
            isOneToOne: false
            referencedRelation: "portal_brief_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_brief_notes_legacy_feedback_id_fkey"
            columns: ["legacy_feedback_id"]
            isOneToOne: false
            referencedRelation: "portal_brief_feedback_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_campaign_company_costs: {
        Row: {
          all_in_cost_usd: number | null
          apollo_cost_usd: number | null
          apollo_requests: number | null
          brave_cost_usd: number | null
          brave_requests: number | null
          brief_cost_usd: number | null
          brief_openai_requests: number | null
          campaign_id: string | null
          client_id: string | null
          company_id: string | null
          company_name: string | null
          decision: string | null
          estimate_reason: string | null
          final_brief_generated_at: string | null
          fit_score: number | null
          has_finalized_brief: boolean | null
          is_estimated: boolean | null
          is_target: boolean | null
          openai_cached_input_tokens: number | null
          openai_cost_usd: number | null
          openai_input_tokens: number | null
          openai_output_tokens: number | null
          openai_requests: number | null
          openai_total_tokens: number | null
          research_cost_usd: number | null
          research_openai_requests: number | null
          run_id: string | null
          website: string | null
        }
        Relationships: []
      }
      portal_campaign_cost_summary: {
        Row: {
          all_in_total_cost_usd: number | null
          avg_all_in_cost_per_company_usd: number | null
          avg_all_in_cost_per_finalized_brief_usd: number | null
          avg_all_in_cost_per_target_usd: number | null
          avg_brief_cost_usd: number | null
          avg_research_cost_per_company_usd: number | null
          avg_research_cost_per_finalized_brief_usd: number | null
          avg_research_cost_per_target_usd: number | null
          brief_total_cost_usd: number | null
          campaign_id: string | null
          client_id: string | null
          companies_with_cost: number | null
          company_count: number | null
          finalized_brief_count: number | null
          finalized_briefs_with_cost: number | null
          has_estimated_costs: boolean | null
          latest_final_brief_at: string | null
          max_company_cost_usd: number | null
          research_total_cost_usd: number | null
          target_company_count: number | null
        }
        Relationships: []
      }
      portal_client_context_review_latest: {
        Row: {
          client_context_version_id: string | null
          client_id: string | null
          created_at: string | null
          generated_at: string | null
          html_bucket: string | null
          html_content_type: string | null
          html_object_path: string | null
          pdf_bucket: string | null
          pdf_content_type: string | null
          pdf_object_path: string | null
          review_json: Json | null
          source_path: string | null
        }
        Relationships: []
      }
      portal_company_contacts: {
        Row: {
          apollo_id: string | null
          client_id: string | null
          company_id: string | null
          confidence: string | null
          contact_id: string | null
          email: string | null
          linkedin: string | null
          logged_at: string | null
          name: string | null
          phone: string | null
          role: string | null
          run_id: string | null
        }
        Relationships: []
      }
      portal_company_detail: {
        Row: {
          brief_markdown: string | null
          building_ownership: string | null
          buildings_count: string | null
          campaign_id: string | null
          client_id: string | null
          company_id: string | null
          company_number: string | null
          company_structure: string | null
          created_at: string | null
          data_quality_score: string | null
          decision: string | null
          description: string | null
          disqualifiers: string | null
          employees: string | null
          employees_score: string | null
          extended_brief_generated: boolean | null
          final_brief_decision: string | null
          final_brief_fit_score: number | null
          final_brief_generated_at: string | null
          final_brief_json: Json | null
          final_brief_run_id: string | null
          fit_score: number | null
          has_finalized_brief: boolean | null
          has_solar: string | null
          hq_country: string | null
          html_bucket: string | null
          html_object_path: string | null
          industry: string | null
          industry_score: string | null
          latest_logged_at: string | null
          latest_run_id: string | null
          locations: string | null
          manufacturing_locations: string | null
          manufacturing_score: string | null
          matched_keywords: string | null
          name: string | null
          notes: string | null
          ownership_score: string | null
          pdf_bucket: string | null
          pdf_object_path: string | null
          postcode: string | null
          rationale: string | null
          roof_score: string | null
          roof_sq_m_estimate: string | null
          score_logged_at: string | null
          score_run_id: string | null
          score_updated_at: string | null
          sic_code_descriptions: string | null
          sic_codes: string | null
          signal_context_score: string | null
          signal_date: string | null
          signal_id: string | null
          signal_sentiment: string | null
          signal_source_url: string | null
          signal_summary: string | null
          signal_type: string | null
          solar_score: string | null
          sources: string | null
          structure_score: string | null
          top_assets: string | null
          turnover_gbp_guess: string | null
          turnover_score: string | null
          website: string | null
          website_confidence: string | null
        }
        Relationships: []
      }
      portal_company_latest: {
        Row: {
          building_ownership: string | null
          buildings_count: string | null
          campaign_id: string | null
          client_id: string | null
          company_id: string | null
          company_number: string | null
          company_structure: string | null
          created_at: string | null
          data_quality_score: string | null
          decision: string | null
          description: string | null
          disqualifiers: string | null
          employees: string | null
          employees_score: string | null
          extended_brief_generated: boolean | null
          fit_score: number | null
          has_solar: string | null
          hq_country: string | null
          industry: string | null
          industry_score: string | null
          latest_logged_at: string | null
          latest_run_id: string | null
          locations: string | null
          manufacturing_locations: string | null
          manufacturing_score: string | null
          matched_keywords: string | null
          name: string | null
          notes: string | null
          ownership_score: string | null
          postcode: string | null
          rationale: string | null
          roof_score: string | null
          roof_sq_m_estimate: string | null
          score_logged_at: string | null
          score_run_id: string | null
          score_updated_at: string | null
          sic_code_descriptions: string | null
          sic_codes: string | null
          signal_context_score: string | null
          signal_date: string | null
          signal_id: string | null
          signal_sentiment: string | null
          signal_source_url: string | null
          signal_summary: string | null
          signal_type: string | null
          solar_score: string | null
          sources: string | null
          structure_score: string | null
          top_assets: string | null
          turnover_gbp_guess: string | null
          turnover_score: string | null
          website: string | null
          website_confidence: string | null
        }
        Relationships: []
      }
      portal_company_properties: {
        Row: {
          address: string | null
          client_id: string | null
          company_id: string | null
          created_at: string | null
          data_source: string | null
          epc_asset_rating_band: string | null
          epc_building_emissions: string | null
          epc_floor_area: string | null
          epc_has_r3: string | null
          epc_has_r4: string | null
          epc_has_solar_recommendation: string | null
          epc_lmk_key: string | null
          epc_lodgement_date: string | null
          epc_match_confidence: string | null
          epc_property_type: string | null
          epc_recommendation_codes: string | null
          epc_renewable_sources: string | null
          epc_typical_emissions: string | null
          has_solar: string | null
          last_change_date: string | null
          logged_at: string | null
          ownership_type: string | null
          property_id: string | null
          property_research_overall_confidence: string | null
          property_research_sources: string | null
          property_research_summary: string | null
          property_research_type: string | null
          property_research_use_class: string | null
          property_row_id: string | null
          registry_name: string | null
          roof_sq_m_estimate: string | null
          run_id: string | null
        }
        Relationships: []
      }
      portal_company_signals: {
        Row: {
          client_id: string | null
          company_id: string | null
          date: string | null
          logged_at: string | null
          run_id: string | null
          sentiment: string | null
          signal_id: string | null
          source_url: string | null
          summary: string | null
          type: string | null
        }
        Relationships: []
      }
      portal_dashboard_summary: {
        Row: {
          bad_briefs: number | null
          client_id: string | null
          companies_with_contacts: number | null
          companies_with_finalized_brief: number | null
          disqualified_companies: number | null
          good_briefs: number | null
          latest_feedback_at: string | null
          latest_final_brief_at: string | null
          mixed_briefs: number | null
          non_target_companies: number | null
          reviewed_briefs: number | null
          scored_companies: number | null
          target_companies: number | null
          to_review_briefs: number | null
          total_companies: number | null
          watch_companies: number | null
        }
        Relationships: []
      }
      portal_final_brief_feedback_analysis_latest: {
        Row: {
          analysis_json: Json | null
          campaign_id: string | null
          client_id: string | null
          created_at: string | null
          feedback_from: string | null
          feedback_to: string | null
          generated_at: string | null
          html_bucket: string | null
          html_content_type: string | null
          html_object_path: string | null
          model: string | null
          pdf_bucket: string | null
          pdf_content_type: string | null
          pdf_object_path: string | null
          signal_id: string | null
          source_path: string | null
        }
        Relationships: []
      }
      portal_recent_finalized_briefs: {
        Row: {
          client_id: string | null
          company_id: string | null
          company_name: string | null
          decision: string | null
          final_brief_decision: string | null
          final_brief_fit_score: number | null
          final_brief_generated_at: string | null
          final_brief_run_id: string | null
          fit_score: number | null
          html_bucket: string | null
          html_object_path: string | null
          industry: string | null
          latest_logged_at: string | null
          latest_run_id: string | null
          name: string | null
          pdf_bucket: string | null
          pdf_object_path: string | null
          website: string | null
        }
        Relationships: []
      }
      portal_target_company_detail: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          company_id: string | null
          decision: string | null
          final_brief_generated_at: string | null
          final_brief_json: Json | null
          final_brief_run_id: string | null
          fit_score: number | null
          has_finalized_brief: boolean | null
          industry: string | null
          latest_logged_at: string | null
          latest_run_id: string | null
          name: string | null
          signal_date: string | null
          signal_id: string | null
          signal_sentiment: string | null
          signal_source_url: string | null
          signal_summary: string | null
          signal_type: string | null
          website: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_client: {
        Args: { target_client_id: string }
        Returns: boolean
      }
      current_portal_client_id: { Args: never; Returns: string }
      current_portal_role: { Args: never; Returns: string }
      enqueue_ccod_for_client: {
        Args: { p_client_id: string; p_limit?: number }
        Returns: number
      }
      enqueue_companies_house_for_client: {
        Args: { p_client_id: string; p_limit?: number }
        Returns: number
      }
      hook_restrict_portal_signup_by_email_domain: {
        Args: { event: Json }
        Returns: Json
      }
      is_portal_admin: { Args: never; Returns: boolean }
      is_portal_manager_for_client: {
        Args: { target_client_id: string }
        Returns: boolean
      }
      portal_assignment_assignee_is_active: {
        Args: { target_client_id: string; target_user_id: string }
        Returns: boolean
      }
      portal_dashboard_summary_for_client: {
        Args: { p_client_id: string }
        Returns: {
          bad_briefs: number
          client_id: string
          companies_with_contacts: number
          companies_with_finalized_brief: number
          disqualified_companies: number
          good_briefs: number
          latest_feedback_at: string
          latest_final_brief_at: string
          mixed_briefs: number
          non_target_companies: number
          reviewed_briefs: number
          scored_companies: number
          target_companies: number
          to_review_briefs: number
          total_companies: number
          watch_companies: number
        }[]
      }
      portal_feedback_rows_for_client: {
        Args: {
          p_client_id: string
          p_sort_field?: string
          p_sort_order?: string
        }
        Returns: {
          brief_verdict: string
          client_id: string
          company_id: string
          company_name: string
          contacted: boolean
          created_at: string
          id: string
          meeting_booked: boolean
          notes: string
          quick_reason: string
          run_id: string
          updated_at: string
        }[]
      }
      portal_recent_finalized_briefs_for_client: {
        Args: { p_client_id: string; p_limit?: number }
        Returns: {
          client_id: string
          company_id: string
          company_name: string
          decision: string
          final_brief_generated_at: string
          final_brief_run_id: string
          fit_score: number
          industry: string
          website: string
        }[]
      }
      portal_target_analytics_snapshot: {
        Args: {
          p_campaign?: string
          p_client_id: string
          p_signal_type?: string
          p_verdict?: string
        }
        Returns: {
          avg_contacts_per_company: number
          campaign_breakdown: Json
          companies_with_contacts: number
          contact_companies: number
          contacts_with_email: number
          contacts_with_linkedin: number
          contacts_with_phone: number
          feedback_received: number
          funnel_summary: Json
          generated_briefs: number
          named_contacts: number
          score_distribution: Json
          signal_type_options: Json
          top_companies: Json
          total_contacts: number
          total_target_companies: number
          verdict_breakdown: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
