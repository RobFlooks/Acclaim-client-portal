import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import SubmitCase from "@/pages/SubmitCase";
import AdminEnhanced from "@/pages/AdminEnhanced";
import UserProfile from "@/pages/UserProfile";
import SystemMonitoring from "@/pages/SystemMonitoring";
import CaseSummaryReport from "@/pages/CaseSummaryReport";
import RecoveryAnalysisReport from "@/pages/RecoveryAnalysisReport";
import AdvancedReports from "@/pages/AdvancedReports";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/submit-case" component={SubmitCase} />
          <Route path="/admin-enhanced" component={AdminEnhanced} />
          <Route path="/profile" component={UserProfile} />
          <Route path="/system-monitoring" component={SystemMonitoring} />
          <Route path="/advanced-reports" component={AdvancedReports} />
          <Route path="/case-summary-report" component={CaseSummaryReport} />
          <Route path="/recovery-analysis-report" component={RecoveryAnalysisReport} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
