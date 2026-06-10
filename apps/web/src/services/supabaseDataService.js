import { supabase } from '@/lib/supabaseClient.js';

// Re-export supabase for backward compatibility with any other direct importers
export { supabase };

class SupabaseDataService {
  async fetchDashboardSummary(clientId) {
    if (!clientId) return { data: null, error: new Error('No client ID provided') };
    try {
      // 1. Try RPC first for performance and to avoid statement timeouts
      const { data: rpcData, error: rpcError } = await supabase.rpc('portal_dashboard_summary_for_client', { 
        p_client_id: clientId 
      });

      let data = null;
      let error = null;

      if (!rpcError && rpcData && rpcData.length > 0) {
        data = rpcData[0];
      } else {
        // 2. Fallback to view if RPC is missing or fails (backward compatibility)
        if (rpcError) {
          console.warn('RPC portal_dashboard_summary_for_client failed or missing, falling back to view:', rpcError.message);
        }
        const viewResult = await supabase
          .from('portal_dashboard_summary')
          .select('client_id, total_companies, target_companies, non_target_companies, companies_with_finalized_brief, companies_with_contacts, latest_final_brief_at, scored_companies, watch_companies, disqualified_companies, reviewed_briefs, to_review_briefs, good_briefs, mixed_briefs, bad_briefs, latest_feedback_at')
          .eq('client_id', clientId)
          .maybeSingle();
          
        data = viewResult.data;
        error = viewResult.error;
      }

      if (error) {
        console.error('Supabase query error in fetchDashboardSummary:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          originalError: error
        });
        return { data: null, error };
      }

      if (!data) {
        return {
          data: {
            client_id: clientId,
            total_companies: 0,
            target_companies: 0,
            non_target_companies: 0,
            companies_with_finalized_brief: 0,
            companies_with_contacts: 0,
            latest_final_brief_at: null,
            scored_companies: 0,
            watch_companies: 0,
            disqualified_companies: 0,
            reviewed_briefs: 0,
            to_review_briefs: 0,
            good_briefs: 0,
            mixed_briefs: 0,
            bad_briefs: 0,
            latest_feedback_at: null
          },
          error: null
        };
      }

      return {
        data: {
          client_id: data.client_id || clientId,
          total_companies: data.total_companies || 0,
          target_companies: data.target_companies || 0,
          non_target_companies: data.non_target_companies || 0,
          companies_with_finalized_brief: data.companies_with_finalized_brief || 0,
          companies_with_contacts: data.companies_with_contacts || 0,
          latest_final_brief_at: data.latest_final_brief_at || null,
          scored_companies: data.scored_companies || 0,
          watch_companies: data.watch_companies || 0,
          disqualified_companies: data.disqualified_companies || 0,
          reviewed_briefs: data.reviewed_briefs || 0,
          to_review_briefs: data.to_review_briefs || 0,
          good_briefs: data.good_briefs || 0,
          mixed_briefs: data.mixed_briefs || 0,
          bad_briefs: data.bad_briefs || 0,
          latest_feedback_at: data.latest_feedback_at || null
        },
        error: null
      };
    } catch (error) {
      console.error('Error in fetchDashboardSummary:', {
        message: error.message,
        stack: error.stack
      });
      return { data: null, error };
    }
  }

  async fetchCompaniesList(clientId, filters = {}, sort = { field: 'latest_logged_at', direction: 'desc' }) {
    if (!clientId) return [];
    try {
      let query = supabase.from('portal_company_latest').select('*').eq('client_id', clientId);

      if (filters.searchQuery) {
        query = query.ilike('company_name', `%${filters.searchQuery}%`);
      }
      if (filters.decision && filters.decision !== 'all') {
        query = query.eq('decision', filters.decision);
      }
      if (filters.industry && filters.industry !== 'all') {
        query = query.ilike('industry', `%${filters.industry}%`);
      }
      if (filters.hasFinalizedBrief) {
        query = query.eq('has_finalized_brief', true);
      }
      if (filters.scoreBand && filters.scoreBand !== 'all') {
        if (filters.scoreBand === 'target') query = query.gte('fit_score', 70);
        if (filters.scoreBand === 'watch') query = query.gte('fit_score', 50).lt('fit_score', 70);
        if (filters.scoreBand === 'reject') query = query.lt('fit_score', 50);
      }

      if (sort.field) {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      }

      const { data, error } = await query;
      if (error) {
        console.error('Supabase query error in fetchCompaniesList:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching companies list:', error);
      throw error;
    }
  }

  async fetchRecentFinalizedBriefs(clientId, limit = 5) {
    if (!clientId) return { data: [], error: new Error('No client ID provided') };
    try {
      // 1. Try RPC first for performance
      const { data: rpcData, error: rpcError } = await supabase.rpc('portal_recent_finalized_briefs_for_client', { 
        p_client_id: clientId,
        p_limit: limit
      });

      if (!rpcError && rpcData) {
        return { data: rpcData, error: null };
      }

      // 2. Fallback to view if RPC is missing or fails
      if (rpcError) {
        console.warn('RPC portal_recent_finalized_briefs_for_client failed or missing, falling back to view:', rpcError.message);
      }

      const { data, error } = await supabase
        .from('portal_recent_finalized_briefs')
        .select('client_id, company_id, company_name, website, industry, fit_score, decision, final_brief_run_id, final_brief_generated_at')
        .eq('client_id', clientId)
        .order('final_brief_generated_at', { ascending: false })
        .limit(limit);
        
      if (error) {
        console.error('Supabase query error in fetchRecentFinalizedBriefs:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          originalError: error
        });
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching recent finalized briefs:', {
        message: error.message,
        stack: error.stack
      });
      return { data: [], error };
    }
  }

  async fetchCompanyDetail(clientId, companyId) {
    if (!clientId) return null;
    try {
      console.log('Executing fetchCompanyDetail query for:', { clientId, companyId });
      
      const { data, error } = await supabase
        .from('portal_company_detail')
        .select(`
          client_id,
          company_id,
          latest_run_id,
          score_run_id,
          final_brief_run_id,
          name,
          website,
          fit_score,
          decision,
          final_brief_generated_at,
          final_brief_fit_score,
          final_brief_decision,
          html_object_path,
          pdf_object_path,
          final_brief_json,
          has_finalized_brief
        `)
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .single();
        
      if (error) {
        console.error('fetchCompanyDetail Supabase error:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Exception in fetchCompanyDetail:', error.message);
      throw error;
    }
  }

  async fetchCompanyContacts(clientId, companyId) {
    if (!clientId) return [];
    try {
      const { data, error } = await supabase
        .from('portal_company_contacts')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId);
        
      if (error) {
        console.error('Supabase query error in fetchCompanyContacts:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching company contacts:', error);
      throw error;
    }
  }

  async fetchCompanyProperties(clientId, companyId) {
    if (!clientId) return [];
    try {
      const { data, error } = await supabase
        .from('portal_company_properties')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId);
        
      if (error) {
        console.error('Supabase query error in fetchCompanyProperties:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching company properties:', error);
      throw error;
    }
  }

  async fetchCompanySignals(clientId, companyId) {
    if (!clientId) return [];
    try {
      const { data, error } = await supabase
        .from('portal_company_signals')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId);
        
      if (error) {
        console.error('Supabase query error in fetchCompanySignals:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching company signals:', error);
      throw error;
    }
  }

  async fetchActiveICPRules(clientId) {
    if (!clientId) return null;
    try {
      const { data: current, error: currentError } = await supabase
        .from('client_config_current')
        .select('document_id')
        .eq('client_id', clientId)
        .eq('document_type', 'icp_rules')
        .maybeSingle();
        
      if (currentError) throw currentError;
      if (!current?.document_id) return null;

      const { data: document, error: documentError } = await supabase
        .from('client_config_documents')
        .select('id, client_id, document_type, version_id, created_at, content')
        .eq('id', current.document_id)
        .single();

      if (documentError) throw documentError;
      return document;
    } catch (error) {
      console.error('Error fetching active ICP rules:', error);
      return null;
    }
  }

  async fetchActiveClientContext(clientId) {
    if (!clientId) return null;
    try {
      const { data: current, error: currentError } = await supabase
        .from('client_config_current')
        .select('document_id')
        .eq('client_id', clientId)
        .eq('document_type', 'client_context')
        .single();
        
      if (currentError) throw currentError;
      if (!current?.document_id) throw new Error('No active client context document found.');

      const { data: document, error: documentError } = await supabase
        .from('client_config_documents')
        .select('content, version_id, created_at')
        .eq('id', current.document_id)
        .single();

      if (documentError) throw documentError;
      return document;
    } catch (error) {
      console.error('Error fetching active client context:', error);
      throw error;
    }
  }

  async fetchPortalTargetAnalyticsSnapshot(clientId, campaign = null, signalType = null, verdict = null) {
    if (!clientId) return null;
    try {
      const { data, error } = await supabase.rpc('portal_target_analytics_snapshot', {
        p_client_id: clientId,
        p_campaign: campaign,
        p_signal_type: signalType,
        p_verdict: verdict
      });

      if (error) {
        console.error('Supabase query error in fetchPortalTargetAnalyticsSnapshot:', {
          message: error.message,
          params: { clientId, campaign, signalType, verdict }
        });
        return null;
      }

      let snapshot = data && data.length > 0 ? data[0] : null;

      // --- FRONTEND WORKAROUND FOR RPC FUNNEL LOGIC ---
      // The backend RPC incorrectly combines verdict and contacted filters, 
      // causing contacted counts to drop if verdict is 'bad' or null.
      // We recalculate the funnel summary here using independent counts.
      if (snapshot) {
        try {
          const { data: fbData } = await supabase
            .from('portal_brief_feedback')
            .select('company_id, brief_verdict, contacted, meeting_booked')
            .eq('client_id', clientId);

          const { data: compData } = await supabase
            .from('portal_target_company_detail')
            .select('company_id, campaign_id')
            .eq('client_id', clientId);

          if (fbData && compData) {
            const compMap = new Map(compData.map(c => [c.company_id, c]));
            
            let reviewed = 0;
            let contacted = 0;
            let meetingBooked = 0;

            fbData.forEach(fb => {
              const comp = compMap.get(fb.company_id);
              
              // Apply campaign filter if selected
              if (campaign && comp && comp.campaign_id !== campaign) return;
              
              // Independent counting logic (REGARDLESS of verdict for contacted/meeting)
              if (fb.brief_verdict) reviewed++;
              if (fb.contacted) contacted++;
              if (fb.meeting_booked) meetingBooked++;
            });

            // Override the RPC's funnel_summary with the corrected independent counts
            snapshot.funnel_summary = [
              { id: 'generated', stage: 'generated', count: snapshot.generated_briefs || 0 },
              { id: 'reviewed', stage: 'reviewed', count: reviewed },
              { id: 'contacted', stage: 'contacted', count: contacted },
              { id: 'meeting_booked', stage: 'meeting_booked', count: meetingBooked }
            ];
          }
        } catch (err) {
          console.error('Error in funnel workaround:', err);
        }
      }

      return snapshot;
    } catch (error) {
      console.error('Exception in fetchPortalTargetAnalyticsSnapshot:', {
        error: error.message,
        params: { clientId, campaign, signalType, verdict }
      });
      return null;
    }
  }

  async fetchBriefFeedback(clientId, companyId, finalBriefRunId) {
    if (!clientId) return null;
    try {
      const { data, error } = await supabase
        .from('portal_brief_feedback_enriched')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .eq('run_id', finalBriefRunId)
        .maybeSingle();

      if (error) {
        console.error('Supabase query error in fetchBriefFeedback:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching brief feedback:', error);
      return null;
    }
  }

  async saveBriefFeedback(payload) {
    try {
      const { client_id, finalBriefRunId, company_id, ...feedbackData } = payload;

      const record = {
        client_id,
        run_id: finalBriefRunId,
        company_id,
        ...feedbackData
      };

      const { data, error } = await supabase
        .from('portal_brief_feedback')
        .upsert(record, {
          onConflict: 'client_id,run_id,company_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase query error in saveBriefFeedback:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error saving brief feedback:', error);
      throw error;
    }
  }

  async fetchBriefAssignments(clientId, finalBriefRunIds) {
    if (!clientId) return [];
    try {
      const { data, error } = await supabase
        .from('portal_brief_assignments_enriched')
        .select('*')
        .eq('client_id', clientId)
        .in('run_id', finalBriefRunIds);

      if (error) {
        console.error('Supabase query error in fetchBriefAssignments:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching brief assignments:', error);
      return [];
    }
  }

  async fetchBriefAssignment(clientId, companyId, finalBriefRunId) {
    if (!clientId) return null;
    try {
      const { data, error } = await supabase
        .from('portal_brief_assignments_enriched')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .eq('run_id', finalBriefRunId)
        .maybeSingle();

      if (error) {
        console.error('Supabase query error in fetchBriefAssignment:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching brief assignment:', error);
      return null;
    }
  }

  async claimBriefAssignment({ clientId, companyId, finalBriefRunId, userId }) {
    try {
      const record = {
        client_id: clientId,
        run_id: finalBriefRunId,
        company_id: companyId,
        assigned_to: userId,
        status: 'assigned'
      };

      const { data, error } = await supabase
        .from('portal_brief_assignments')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error('Supabase query error in claimBriefAssignment:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error claiming brief assignment:', error);
      throw error;
    }
  }

  async upsertBriefAssignment({ clientId, companyId, finalBriefRunId, assignedTo, status }) {
    try {
      const record = {
        client_id: clientId,
        run_id: finalBriefRunId,
        company_id: companyId,
        assigned_to: assignedTo,
        status
      };

      const { data, error } = await supabase
        .from('portal_brief_assignments')
        .upsert(record, {
          onConflict: 'client_id,run_id,company_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase query error in upsertBriefAssignment:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error upserting brief assignment:', error);
      throw error;
    }
  }

  async updateBriefAssignmentStatus({ assignmentId, status }) {
    try {
      const { data, error } = await supabase
        .from('portal_brief_assignments')
        .update({ status })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) {
        console.error('Supabase query error in updateBriefAssignmentStatus:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating brief assignment status:', error);
      throw error;
    }
  }

  async fetchPortalTeamMembers(clientId) {
    if (!clientId) return [];
    try {
      const { data, error } = await supabase
        .from('portal_team_members')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('display_name', { ascending: true })
        .order('email', { ascending: true });

      if (error) {
        console.error('Supabase query error in fetchPortalTeamMembers:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching portal team members:', error);
      return [];
    }
  }
}

const supabaseDataService = new SupabaseDataService();
export default supabaseDataService;