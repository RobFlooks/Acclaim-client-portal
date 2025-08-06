import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ChangePasswordPage from "@/pages/change-password-page";
import Home from "@/pages/Home";
import SubmitCase from "@/pages/SubmitCase";
import AdminEnhanced from "@/pages/AdminEnhanced";
import UserProfile from "@/pages/UserProfile";
import SystemMonitoring from "@/pages/SystemMonitoring";
import CaseSummaryReport from "@/pages/CaseSummaryReport";
import RecoveryAnalysisReport from "@/pages/RecoveryAnalysisReport";
import MonthlyStatementReport from "@/pages/MonthlyStatementReport";
import PaymentPerformanceReport from "@/pages/PaymentPerformanceReport";
import AdminPaymentPerformanceReport from "@/pages/AdminPaymentPerformanceReport";
import SimpleReports from "@/pages/SimpleReports";
import AuditManagement from "@/pages/AuditManagement";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/submit-case" component={SubmitCase} />
      <ProtectedRoute path="/admin" component={AdminEnhanced} />
      <ProtectedRoute path="/admin-enhanced" component={AdminEnhanced} />
      <ProtectedRoute path="/profile" component={UserProfile} />
      <ProtectedRoute path="/system-monitoring" component={SystemMonitoring} />
      <ProtectedRoute path="/advanced-reports" component={SimpleReports} />
      <ProtectedRoute path="/reports" component={SimpleReports} />
      <ProtectedRoute path="/audit-management" component={AuditManagement} />
      <ProtectedRoute path="/case-summary-report" component={CaseSummaryReport} />
      <ProtectedRoute path="/recovery-analysis-report" component={RecoveryAnalysisReport} />
      <ProtectedRoute path="/monthly-statement-report" component={MonthlyStatementReport} />
      <ProtectedRoute path="/payment-performance-report" component={PaymentPerformanceReport} />
      <ProtectedRoute path="/admin-payment-performance-report" component={AdminPaymentPerformanceReport} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/change-password" component={ChangePasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
