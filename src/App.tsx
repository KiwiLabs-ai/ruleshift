import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CookieConsent from "@/components/CookieConsent";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ArchivePage from "./pages/Archive";
import SourcesPage from "./pages/Sources";
import SettingsPage from "./pages/Settings";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import CompanyStep from "./pages/onboarding/CompanyStep";
import SourcesStep from "./pages/onboarding/SourcesStep";
import NotificationsStep from "./pages/onboarding/NotificationsStep";
import PlanStep from "./pages/onboarding/PlanStep";
import Alerts from "./pages/Alerts";
import BriefDetail from "./pages/BriefDetail";
import NotFound from "./pages/NotFound";
import VerifyEmail from "./pages/VerifyEmail";
import AcceptInvite from "./pages/AcceptInvite";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/onboarding" element={<OnboardingLayout />}>
                <Route path="company" element={<CompanyStep />} />
                <Route path="sources" element={<SourcesStep />} />
                <Route path="notifications" element={<NotificationsStep />} />
                <Route path="plan" element={<PlanStep />} />
              </Route>
              <Route
                path="/dashboard"
                element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
              />
              <Route
                path="/alerts"
                element={<ProtectedRoute><Alerts /></ProtectedRoute>}
              />
              <Route
                path="/briefs/:briefId"
                element={<ProtectedRoute><BriefDetail /></ProtectedRoute>}
              />
              <Route
                path="/archive"
                element={<ProtectedRoute><ArchivePage /></ProtectedRoute>}
              />
              <Route
                path="/sources"
                element={<ProtectedRoute><SourcesPage /></ProtectedRoute>}
              />
              <Route
                path="/settings"
                element={<ProtectedRoute><SettingsPage /></ProtectedRoute>}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
