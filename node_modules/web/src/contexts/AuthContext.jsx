import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import pb from '@/lib/pocketbaseClient.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const isStaleSessionError = (error) => {
  if (!error) return false;
  const msg = (typeof error === 'string' ? error : error.message || '').toLowerCase();
  return msg.includes('refresh_token_not_found') ||
         msg.includes('invalid refresh token') ||
         msg.includes('invalid_grant') ||
         msg.includes('session_not_found') ||
         error.status === 401;
};

export const clearLocalAuthState = () => {
  try {
    pb.authStore.clear();
  } catch (e) {
    // Ignore pocketbase clear errors
  }
  localStorage.clear();
  sessionStorage.clear();
};

export const clearAuthState = async () => {
  try {
    await supabase.auth.signOut().catch(() => {});
  } catch (e) {
    // Ignore signout errors
  }
  clearLocalAuthState();
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (mounted) {
          setSession(currentSession);
          setCurrentUser(currentSession?.user || null);
        }
      } catch (error) {
        console.error('[AUTH] Error getting session:', error);
        if (isStaleSessionError(error)) {
          console.log('[AUTH] Stale session detected. Clearing state.');
          await clearAuthState();
          if (mounted) {
            setSession(null);
            setCurrentUser(null);
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AUTH] Auth state changed: ${event}`);
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(currentSession);
        setCurrentUser(currentSession?.user || null);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Break the recursive logout loop by only clearing local state here
        setSession(null);
        setCurrentUser(null);
        clearLocalAuthState();
        setIsLoading(false);
        
        // Only redirect to login if we aren't already there to prevent loops
        if (!window.location.pathname.includes('/login')) {
          navigate('/login', { replace: true });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const logout = async () => {
    // Show loading state immediately to prevent interactions while logging out
    setIsLoading(true);
    
    // Clear all auth states (triggers Supabase signOut, which fires onAuthStateChange)
    await clearAuthState();
    
    // Reset local react state
    setSession(null);
    setCurrentUser(null);
    setIsLoading(false);
    
    // Safely navigate
    if (!window.location.pathname.includes('/login')) {
      navigate('/login', { replace: true });
    }
  };

  const isAuthenticated = !!currentUser;
  const client_id = currentUser?.app_metadata?.client_id;

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      session, 
      isLoading,
      isAuthenticated,
      logout,
      client_id
    }}>
      {children}
    </AuthContext.Provider>
  );
};