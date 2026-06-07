import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect } from "react";
import { rdtTrack } from "@/lib/reddit";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

// Fire Reddit PageVisit on every SPA route change
// (the base pixel in index.html already fires once on initial hard load)
function RedditPageView() {
  const { pathname } = useLocation();
  useEffect(() => {
    rdtTrack('PageVisit');
  }, [pathname]);
  return null;
}

import Index from "./pages/Index.tsx";
import Contracts from "./pages/Contracts.tsx";
import Alerts from "./pages/Alerts.tsx";
import Account from "./pages/Account.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import SavedJobs from "./pages/SavedJobs.tsx";
import Tracker from "./pages/Tracker.tsx";
import SearchPreview from "./pages/SearchPreview.tsx";
import ContractDetail from "./pages/ContractDetail.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Upgrade from "./pages/Upgrade.tsx";
import AboutApplyWithAI from "./pages/AboutApplyWithAI.tsx";
import Terms from "./pages/Terms.tsx";
import ContractSources from "./pages/ContractSources.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";
import Privacy from "./pages/Privacy.tsx";
import DayRates from "./pages/DayRates.tsx";
import IR35Calculator from "./pages/IR35Calculator.tsx";
import NotFound from "./pages/NotFound.tsx";
import ChatWidget from "./components/ChatWidget.tsx";

// Recruiter portal pages
import RecruiterSignup from "./pages/recruiter/RecruiterSignup.tsx";
import RecruiterUpgrade from "./pages/recruiter/RecruiterUpgrade.tsx";
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard.tsx";
import RecruiterCandidates from "./pages/recruiter/RecruiterCandidates.tsx";
import RecruiterCandidateProfile from "./pages/recruiter/RecruiterCandidateProfile.tsx";
import RecruiterSavedCandidates from "./pages/recruiter/RecruiterSavedCandidates.tsx";
import RecruiterPostContract from "./pages/recruiter/RecruiterPostContract.tsx";
import RecruiterContracts from "./pages/recruiter/RecruiterContracts.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Requires auth AND account_type === 'recruiter'. Non-recruiters go to /contracts. */
function RecruiterRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isRecruiter, proLoading } = useAuth();
  if (loading || proLoading) return null;
  if (!user) return <Navigate to="/recruiter/signup" replace />;
  if (!isRecruiter) return <Navigate to="/contracts" replace />;
  return <>{children}</>;
}

const App = () => (
  <HelmetProvider>
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <RedditPageView />
          <Routes>
            {/* Contractor routes */}
            <Route path="/" element={<Index />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/search-preview" element={<SearchPreview />} />
            <Route path="/contract/:id" element={<ContractDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/saved" element={<ProtectedRoute><SavedJobs /></ProtectedRoute>} />
            <Route path="/tracker" element={<ProtectedRoute><Tracker /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/upgrade" element={<Upgrade />} />
            <Route path="/about-apply-with-ai" element={<AboutApplyWithAI />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contract-sources" element={<ContractSources />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/day-rates" element={<DayRates />} />
            <Route path="/ir35-calculator" element={<IR35Calculator />} />

            {/* Recruiter portal — public */}
            <Route path="/recruiter/signup" element={<RecruiterSignup />} />
            <Route path="/recruiter/upgrade" element={<RecruiterUpgrade />} />

            {/* Recruiter portal — protected */}
            <Route path="/recruiter/dashboard" element={<RecruiterRoute><RecruiterDashboard /></RecruiterRoute>} />
            <Route path="/recruiter/candidates" element={<RecruiterRoute><RecruiterCandidates /></RecruiterRoute>} />
            <Route path="/recruiter/candidates/:id" element={<RecruiterRoute><RecruiterCandidateProfile /></RecruiterRoute>} />
            <Route path="/recruiter/saved" element={<RecruiterRoute><RecruiterSavedCandidates /></RecruiterRoute>} />
            <Route path="/recruiter/post-contract" element={<RecruiterRoute><RecruiterPostContract /></RecruiterRoute>} />
            <Route path="/recruiter/contracts" element={<RecruiterRoute><RecruiterContracts /></RecruiterRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatWidget />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </HelmetProvider>
);

export default App;
