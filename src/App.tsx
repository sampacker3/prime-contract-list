import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect } from "react";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
import Index from "./pages/Index.tsx";
import Contracts from "./pages/Contracts.tsx";
import Alerts from "./pages/Alerts.tsx";
import Account from "./pages/Account.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
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

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/search-preview" element={<SearchPreview />} />
            <Route path="/contract/:id" element={<ContractDetail />} />
            <Route path="/login" element={<Login />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </HelmetProvider>
);

export default App;
