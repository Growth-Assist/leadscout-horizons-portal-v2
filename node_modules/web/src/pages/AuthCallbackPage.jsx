import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { handlePostAuthRouting } from '@/utils/authRouting.js';
import { isStaleSessionError, clearAuthState } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      console.log('[AUTH] Callback received - exchanging code for session');
      
      try {
        // Handle both hash and query parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const errorDesc = hashParams.get('error_description') || queryParams.get('error_description');
        if (errorDesc) {
          throw new Error(errorDesc);
        }

        // Supabase automatically handles the exchange if the URL contains the right params
        // We just need to check if a session was established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (session) {
          console.log(`[AUTH] Session exchange success - user: ${session.user.email}`);
          await handlePostAuthRouting(navigate);
        } else {
          // If no session, try explicit exchange (though usually handled by client init)
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchangeError) throw exchangeError;
          
          if (data?.session) {
            console.log(`[AUTH] Session exchange success - user: ${data.session.user.email}`);
            await handlePostAuthRouting(navigate);
          } else {
            throw new Error('Failed to establish session from callback.');
          }
        }
      } catch (err) {
        console.error(`[AUTH] Session exchange failed - error: ${err.message}`);
        
        if (isStaleSessionError(err)) {
          console.log('[AUTH] Stale session detected during callback. Clearing state.');
          await clearAuthState();
          navigate('/login?stale=true', { replace: true });
          return;
        }

        setError(err.message || 'Authentication failed.');
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            {isProcessing ? 'Verifying your login...' : 'Authentication Error'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProcessing ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse flex space-x-4">
                <div className="h-3 w-3 bg-primary rounded-full"></div>
                <div className="h-3 w-3 bg-primary rounded-full animation-delay-200"></div>
                <div className="h-3 w-3 bg-primary rounded-full animation-delay-400"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <Button onClick={() => navigate('/login')} className="w-full">
                Return to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallbackPage;