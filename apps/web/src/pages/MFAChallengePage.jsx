import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

const MFAChallengePage = () => {
  const navigate = useNavigate();
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initChallenge = async () => {
      try {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;

        const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
        
        if (verifiedFactors.length === 0) {
          navigate('/mfa-setup', { replace: true });
          return;
        }

        const selectedFactorId = verifiedFactors[0].id;
        setFactorId(selectedFactorId);

        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: selectedFactorId
        });

        if (challengeError) throw challengeError;

        setChallengeId(challengeData.id);
      } catch (err) {
        console.error('MFA Challenge Init Error:', err);
        setError('Failed to initialize authentication challenge.');
      } finally {
        setIsLoading(false);
      }
    };

    initChallenge();
  }, [navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    
    if (code.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }

    setIsVerifying(true);

    try {
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code
      });

      if (verifyError) throw verifyError;

      navigate('/overview', { replace: true });
    } catch (err) {
      console.error('MFA Verify Error:', err);
      setError(err.message || 'Invalid code. Please try again.');
      
      // Create a new challenge on failure
      try {
        const { data: newChallenge } = await supabase.auth.mfa.challenge({ factorId });
        if (newChallenge) setChallengeId(newChallenge.id);
      } catch (e) {
        console.error('Failed to create new challenge', e);
      }
    } finally {
      setIsVerifying(false);
      setCode('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter your authentication code</CardTitle>
          <CardDescription>
            Open your authenticator app and enter the 6-digit code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse flex space-x-4">
                <div className="h-3 w-3 bg-primary rounded-full"></div>
                <div className="h-3 w-3 bg-primary rounded-full animation-delay-200"></div>
                <div className="h-3 w-3 bg-primary rounded-full animation-delay-400"></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isVerifying || code.length !== 6}>
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MFAChallengePage;