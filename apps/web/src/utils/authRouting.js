/*
 * EXPECTED LOG SEQUENCE:
 * (1) '[AUTH] handlePostAuthRouting called'
 * (2) '[AUTH] User: {...}'
 * (3) '[AUTH] app_metadata: {...}'
 * (4) '[AUTH] client_id already exists: growth-assist' OR '[AUTH] client_id missing - calling bootstrap-user'
 * (5) '[AUTH] mfa_required: false' (or true)
 * (6) '[BOOTSTRAP] Calling authenticated POST /api/portal/bootstrap-user' (if missing)
 * (7) '[BOOTSTRAP] Response: {...}' (if missing)
 * (8) '[AUTH] Redirecting to /overview'
 */

import { supabase } from '@/lib/supabaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { isStaleSessionError, clearAuthState } from '@/contexts/AuthContext.jsx';

export const handlePostAuthRouting = async (navigate) => {
  console.log('[AUTH] handlePostAuthRouting called');

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError && isStaleSessionError(sessionError)) {
      console.log('[AUTH] Stale session detected in routing guard. Clearing state.');
      await clearAuthState();
      navigate('/login?stale=true', { replace: true });
      return;
    }

    if (!session) {
      console.log('[AUTH] Post-auth routing - no session found, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      if (isStaleSessionError(error)) {
        console.log('[AUTH] Stale session detected while fetching user. Clearing state.');
        await clearAuthState();
        navigate('/login?stale=true', { replace: true });
        return;
      }
      console.log('[AUTH] Post-auth routing - error getting user, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    if (!user) {
      console.log('[AUTH] Post-auth routing - no user found, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    console.log('[AUTH] User: ' + JSON.stringify(user));
    console.log('[AUTH] app_metadata: ' + JSON.stringify(user.app_metadata));
    
    if (user.app_metadata?.client_id) {
      console.log('[AUTH] client_id already exists: ' + user.app_metadata.client_id);
      
      const mfa_required = user.app_metadata?.mfa_required;
      console.log('[AUTH] mfa_required: ' + mfa_required);
      console.log('[AUTH] Routing to: ' + (mfa_required ? 'MFA' : 'dashboard'));

      if (mfa_required === true) {
        console.log('[AUTH] MFA required - checking factors');
        
        const { data, error: mfaError } = await supabase.auth.mfa.listFactors();
        
        if (mfaError) {
          console.error('[AUTH] Error listing MFA factors:', mfaError);
          navigate('/login', { replace: true });
          return;
        }

        const verifiedFactors = data?.totp?.filter(factor => factor.status === 'verified') || [];
        console.log('[AUTH] Verified factors: ' + JSON.stringify(verifiedFactors));
        
        const hasVerifiedFactor = verifiedFactors.length > 0;
        console.log('[AUTH] Routing to: ' + (hasVerifiedFactor ? 'MFA challenge' : 'MFA setup'));

        console.log('[AUTH] Redirecting to /mfa-setup or /mfa-challenge');
        if (hasVerifiedFactor) {
          navigate('/mfa-challenge', { replace: true });
        } else {
          navigate('/mfa-setup', { replace: true });
        }
        return;
      }

      console.log('[AUTH] Redirecting to /overview');
      navigate('/overview', { replace: true });
      return;
    }

    console.log('[AUTH] client_id missing - calling bootstrap-user');
    
    console.log('[BOOTSTRAP] Calling authenticated POST /api/portal/bootstrap-user');

    try {
      const response = await apiServerClient.fetch('/api/portal/bootstrap-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: '{}'
      });
      
      const data = await response.json();
      console.log('[BOOTSTRAP] Response: ' + JSON.stringify(data));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to bootstrap user account.');
      }

      // Refresh session to pull down latest app_metadata if updated by bootstrap API
      await supabase.auth.refreshSession();
      
    } catch (err) {
      console.log('[BOOTSTRAP] Error: ' + err.message);
    }

    console.log('[AUTH] Redirecting to /overview');
    navigate('/overview', { replace: true });
    
  } catch (err) {
    console.error('[AUTH] Post-auth routing error:', err);
    navigate('/login', { replace: true });
  }
};
