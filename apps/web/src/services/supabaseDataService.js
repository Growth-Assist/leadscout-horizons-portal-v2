import { supabase } from '@/lib/supabaseClient.js';
import { fetchAllSupabasePages } from '@/utils/supabasePagination.js';
import { resolveAverageDealSizeGbp } from '@/utils/managementAnalytics.js';

// Re-export supabase for backward compatibility with any other direct importers
export { supabase };

class SupabaseDataService {
  async fetchAllTargetCompanyDetails(clientId) {
    return fetchAllSupabasePages((from, to) => supabase
      .from('portal_target_company_detail')
      .select('client_id, company_id, latest_run_id, final_brief_run_id, name, website, industry, fit_score, decision, latest_logged_at, campaign_id, signal_id, signal_type, has_finalized_brief, final_brief_generated_at')
      .eq('client_id', clientId)
      .eq('has_finalized_brief', true)
      .not('final_brief_run_id', 'is', null)
      .order('fit_score', { ascending: false, nullsFirst: false })
      .order('company_id', { ascending: true })
      .range(from, to));
  }

  async fetchFinalBriefJsonForBriefs(clientId, briefs) {
    if (!clientId || !Array.isArray(briefs) || briefs.length === 0) return [];

    const requestedKeys = new Set();
    const companyIds = [];
    briefs.forEach((brief) => {
      const companyId = String(brief?.company_id || '').trim();
      const runId = String(brief?.final_brief_run_id || brief?.finalBriefRunId || '').trim();
      if (!companyId || !runId) return;
      requestedKeys.add(`${companyId}_${runId}`);
      companyIds.push(companyId);
    });
    if (requestedKeys.size === 0) return [];

    const uniqueCompanyIds = [...new Set(companyIds)];
    const rows = [];
    const chunkSize = 200;
    for (let index = 0; index < uniqueCompanyIds.length; index += chunkSize) {
      const { data, error } = await supabase
        .from('portal_target_company_detail')
        .select('company_id,final_brief_run_id,final_brief_json')
        .eq('client_id', clientId)
        .eq('has_finalized_brief', true)
        .not('final_brief_run_id', 'is', null)
        .in('company_id', uniqueCompanyIds.slice(index, index + chunkSize));

      if (error) throw error;
      rows.push(...(data || []));
    }

    return rows.filter((row) => requestedKeys.has(`${row.company_id}_${row.final_brief_run_id}`));
  }

  async fetchAllCompanySignals(clientId) {
    return fetchAllSupabasePages((from, to) => supabase
      .from('portal_company_signals')
      .select('client_id, company_id, signal_id, run_id, type, summary, date')
      .eq('client_id', clientId)
      .order('company_id', { ascending: true })
      .order('signal_id', { ascending: true })
      .order('run_id', { ascending: true })
      .range(from, to));
  }

  async fetchAllBriefFeedback(clientId) {
    return fetchAllSupabasePages((from, to) => supabase
      .from('portal_brief_feedback')
      .select('client_id, company_id, run_id, brief_verdict, contacted, quick_reason, notes, created_at, updated_at, meeting_booked')
      .eq('client_id', clientId)
      .order('company_id', { ascending: true })
      .order('run_id', { ascending: true })
      .range(from, to));
  }

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

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Exception in fetchPortalTargetAnalyticsSnapshot:', {
        error: error.message,
        params: { clientId, campaign, signalType, verdict }
      });
      return null;
    }
  }

  async fetchManagementCommercialData(clientId, verdict = null, campaign = null, signalType = null) {
    if (!clientId) return { feedback: [], averageDealSize: null };

    const feedbackQuery = supabase
      .from('portal_brief_feedback')
      .select('company_id, run_id, brief_verdict, contacted, meeting_booked, commercial_outcome, actual_deal_value_gbp, outcome_updated_at')
      .eq('client_id', clientId);

    if (verdict) feedbackQuery.eq('brief_verdict', verdict);

    const targetQuery = supabase
      .from('portal_target_company_detail')
      .select('company_id, final_brief_run_id')
      .eq('client_id', clientId);
    if (campaign) targetQuery.eq('campaign_id', campaign);
    if (signalType) targetQuery.eq('signal_type', signalType);

    const contextPromise = this.fetchActiveClientContext(clientId).catch((error) => {
      console.warn('Active client context is unavailable for management analytics:', error.message);
      return null;
    });

    const [feedbackResult, contextDocument, targetResult] = await Promise.all([
      feedbackQuery,
      contextPromise,
      campaign || signalType ? targetQuery : Promise.resolve({ data: null, error: null })
    ]);

    // A pre-migration database should still render the original analytics data.
    if (feedbackResult.error && !['42703', '42P01'].includes(feedbackResult.error.code)) {
      throw feedbackResult.error;
    }
    if (targetResult.error) throw targetResult.error;

    let feedback = feedbackResult.data || [];
    if (targetResult.data) {
      const targetKeys = new Set(targetResult.data.map((row) => `${row.company_id}:${row.final_brief_run_id}`));
      feedback = feedback.filter((row) => targetKeys.has(`${row.company_id}:${row.run_id}`));
    }

    return {
      feedback,
      averageDealSize: resolveAverageDealSizeGbp(contextDocument)
    };
  }

  async fetchFeedbackNoteMomentum(clientId, dateFrom, dateTo, salespersonId = null) {
    if (!clientId || !dateFrom || !dateTo) throw new Error('Client and momentum date range are required.');
    const { data, error } = await supabase.rpc('portal_feedback_note_momentum', {
      p_client_id: clientId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_salesperson_id: salespersonId
    });

    if (error) {
      console.error('Supabase query error in fetchFeedbackNoteMomentum:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }
    return data;
  }

  async fetchFeedbackStaleAccounts(clientId, dateFrom, dateTo, limit = 50, offset = 0) {
    if (!clientId || !dateFrom || !dateTo) throw new Error('Client and stale-account date range are required.');
    const { data, error } = await supabase.rpc('portal_feedback_stale_accounts', {
      p_client_id: clientId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      console.error('Supabase query error in fetchFeedbackStaleAccounts:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }
    return data || [];
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

  async fetchBriefNotes(clientId, companyId, finalBriefRunId) {
    if (!clientId || !companyId || !finalBriefRunId) return [];
    try {
      const { data, error } = await supabase
        .from('portal_brief_notes_enriched')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .eq('run_id', finalBriefRunId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error in fetchBriefNotes:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching brief notes:', error);
      return [];
    }
  }

  async createBriefNote(payload) {
    try {
      const { client_id, company_id, run_id, note_text } = payload;
      const trimmedNote = note_text?.trim();

      if (!trimmedNote) {
        throw new Error('Note text is required.');
      }

      const { data, error } = await supabase
        .from('portal_brief_notes')
        .insert({
          client_id,
          company_id,
          run_id,
          note_text: trimmedNote
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase query error in createBriefNote:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating brief note:', error);
      throw error;
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

      let { data, error } = await supabase
        .from('portal_brief_feedback')
        .upsert(record, {
          onConflict: 'client_id,run_id,company_id'
        })
        .select()
        .single();

      // Keep feedback usable during a staged deployment where the UI reaches an
      // environment before the commercial columns migration.
      if (error?.code === '42703') {
        const legacyRecord = { ...record };
        delete legacyRecord.commercial_outcome;
        delete legacyRecord.actual_deal_value_gbp;
        delete legacyRecord.outcome_updated_at;
        delete legacyRecord.known_network_contact_existed;
        delete legacyRecord.known_network_contact_recommended;
        delete legacyRecord.selected_contact_role_fit;
        delete legacyRecord.selected_contact_details_enriched;
        delete legacyRecord.relationship_source;
        const legacyResult = await supabase
          .from('portal_brief_feedback')
          .upsert(legacyRecord, { onConflict: 'client_id,run_id,company_id' })
          .select()
          .single();
        data = legacyResult.data;
        error = legacyResult.error;
      }

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

  async fetchBriefAssignments(clientId, finalBriefRunIds, { throwOnError = false } = {}) {
    if (!clientId) return [];
    try {
      const [enrichedResult, closureResult] = await Promise.all([
        supabase
          .from('portal_brief_assignments_enriched')
          .select('*')
          .eq('client_id', clientId)
          .in('run_id', finalBriefRunIds),
        // The enriched assignment view predates the closure audit columns. Read
        // those browser-safe fields from the RLS-protected base table and merge
        // them by the immutable company/run identity.
        supabase
          .from('portal_brief_assignments')
          .select('company_id,run_id,closed_at,closed_by,close_reason')
          .eq('client_id', clientId)
          .in('run_id', finalBriefRunIds)
      ]);

      const { data, error } = enrichedResult;

      if (error) {
        console.error('Supabase query error in fetchBriefAssignments:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        if (throwOnError) throw error;
        return [];
      }

      if (closureResult.error) {
        console.error('Supabase query error loading assignment closure audit:', {
          message: closureResult.error.message,
          code: closureResult.error.code,
          details: closureResult.error.details
        });
        if (throwOnError) throw closureResult.error;
      }

      const closureByBrief = new Map((closureResult.data || []).map((assignment) => [
        `${assignment.company_id}_${assignment.run_id}`,
        assignment
      ]));

      return (data || []).map((assignment) => ({
        ...assignment,
        ...(closureByBrief.get(`${assignment.company_id}_${assignment.run_id}`) || {})
      }));
    } catch (error) {
      console.error('Error fetching brief assignments:', error);
      if (throwOnError) throw error;
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

  async syncBriefLifecycle({ clientId, companyId, finalBriefRunId, status = null, contacted = false, meetingBooked = false }) {
    try {
      const { data, error } = await supabase.rpc('portal_sync_brief_lifecycle', {
        p_client_id: clientId,
        p_company_id: companyId,
        p_run_id: finalBriefRunId,
        p_status: status,
        p_contacted: contacted === true,
        p_meeting_booked: meetingBooked === true
      });

      if (!error) return Array.isArray(data) ? data[0] : data;
      if (!['42883', 'PGRST202'].includes(error.code)) throw error;

      // Compatibility path for deployments where the transactional RPC has not
      // reached the database yet. Remove after every environment has migrated.
      const assignment = await this.fetchBriefAssignment(clientId, companyId, finalBriefRunId);
      let nextStatus = status;
      if (!nextStatus && meetingBooked && assignment?.status !== 'closed') nextStatus = 'meeting_booked';
      if (!nextStatus && contacted && (!assignment || ['assigned', 'reviewing'].includes(assignment.status))) nextStatus = 'contacted';
      if (!nextStatus) return assignment;

      if (assignment?.id) {
        return this.updateBriefAssignmentStatus({ assignmentId: assignment.id, status: nextStatus });
      }
      return this.upsertBriefAssignment({
        clientId,
        companyId,
        finalBriefRunId,
        assignedTo: null,
        status: nextStatus
      });
    } catch (error) {
      console.error('Error synchronizing brief lifecycle:', error);
      throw error;
    }
  }

  async bulkCloseBriefAssignments({ clientId, briefs, closeReason }) {
    try {
      const { data, error } = await supabase.rpc('portal_bulk_close_briefs', {
        p_client_id: clientId,
        p_briefs: briefs.map(({ company_id, run_id }) => ({ company_id, run_id })),
        p_close_reason: closeReason.trim()
      });

      if (error) {
        console.error('Supabase RPC error in bulkCloseBriefAssignments:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error bulk closing brief assignments:', error);
      throw error;
    }
  }

  async closeBriefAssignmentForFeedback({ clientId, companyId, finalBriefRunId }) {
    try {
      const { data: updatedRows, error: updateError } = await supabase
        .from('portal_brief_assignments')
        .update({ status: 'closed' })
        .eq('client_id', clientId)
        .eq('run_id', finalBriefRunId)
        .eq('company_id', companyId)
        .select();

      if (updateError) {
        console.error('Supabase query error in closeBriefAssignmentForFeedback update:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details
        });
        throw updateError;
      }

      if (updatedRows?.length > 0) {
        return updatedRows[0];
      }

      const { data: insertedRow, error: insertError } = await supabase
        .from('portal_brief_assignments')
        .insert({
          client_id: clientId,
          run_id: finalBriefRunId,
          company_id: companyId,
          status: 'closed'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase query error in closeBriefAssignmentForFeedback insert:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details
        });
        throw insertError;
      }

      return insertedRow;
    } catch (error) {
      console.error('Error closing brief assignment for feedback:', error);
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
