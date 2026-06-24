import React, { useEffect } from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import ScrollToTop from '@/components/ScrollToTop.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import AuthCallbackPage from '@/pages/AuthCallbackPage.jsx';
import MFASetupPage from '@/pages/MFASetupPage.jsx';
import MFAChallengePage from '@/pages/MFAChallengePage.jsx';
import OverviewDashboard from '@/pages/OverviewDashboard.jsx';
import BriefsPage from '@/pages/BriefsPage.jsx';
import BriefDetailPage from '@/pages/BriefDetailPage.jsx';
import ICPProfilePage from '@/pages/ICPProfilePage.jsx';
import AnalyticsPage from '@/pages/AnalyticsPage.jsx';
import ClientContextPage from '@/pages/ClientContextPage.jsx';
import FeedbackPage from '@/pages/FeedbackPage.jsx';
import CompanyQualifierPage from '@/pages/CompanyQualifierPage.jsx';
import { Loader2 } from 'lucide-react';

const RootRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/overview" replace /> : <Navigate to="/login" replace />;
};

function App() {
  // Ensure dark mode is applied globally
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="dark bg-background text-foreground min-h-screen">
      <Router>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/mfa-setup" element={<MFASetupPage />} />
            <Route path="/mfa-challenge" element={<MFAChallengePage />} />
            
            {/* Protected Routes */}
            <Route path="/overview" element={
              <ProtectedRoute>
                <OverviewDashboard />
              </ProtectedRoute>
            } />
            <Route path="/briefs" element={
              <ProtectedRoute>
                <BriefsPage />
              </ProtectedRoute>
            } />
            <Route path="/briefs/:companyId" element={
              <ProtectedRoute>
                <BriefDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/icp-profile" element={
              <ProtectedRoute>
                <ICPProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/client-context" element={
              <ProtectedRoute>
                <ClientContextPage />
              </ProtectedRoute>
            } />
            <Route path="/feedback" element={
              <ProtectedRoute>
                <FeedbackPage />
              </ProtectedRoute>
            } />
            <Route path="/qualify" element={
              <ProtectedRoute>
                <CompanyQualifierPage />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            } />

            {/* Root and Fallback explicitly check auth state */}
            <Route path="/" element={<RootRoute />} />
            <Route path="*" element={<RootRoute />} />
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;
