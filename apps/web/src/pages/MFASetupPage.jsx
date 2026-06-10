import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

const MFASetupPage = () => {
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const setupMfa = async () => {
      try {
        const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp'
        });

        if (enrollError) throw enrollError;

        setFactorId(enrollData.id);
        setQrCode(enrollData.totp.qr_code);
        setSecret(enrollData.totp.secret);

        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: enrollData.id
        });

        if (challengeError) throw challengeError;

        setChallengeId(challengeData.id);
        console.log('[AUTH] MFA setup - QR displayed, waiting for code');
      } catch (err) {
        console.error('MFA Setup Error:', err);
        setError(err.message || 'Failed to initialize MFA setup.');
      } finally {
        setIsLoading(false);
      }
    };

    setupMfa();
  }, []);

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

      console.log('[AUTH] MFA setup - code verified, factor enrolled');
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
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set up two-factor authentication</CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app to secure your account.
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
            <div className="space-y-6">
              {qrCode && (
                <div className="flex justify-center bg-white p-4 rounded-lg">
                  <div dangerouslySetInnerHTML={{ __html: qrCode }} className="w-48 h-48" />
                </div>
              )}
              
              {secret && (
                <div className="text-center text-sm text-muted-foreground">
                  <p>Can't scan? Enter this secret manually:</p>
                  <code className="block mt-2 p-2 bg-muted rounded font-mono text-foreground select-all">
                    {secret}
                  </code>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MFASetupPage;