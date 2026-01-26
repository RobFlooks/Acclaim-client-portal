import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import Cases from "@/components/Cases";
import Messages from "@/components/Messages";
import Reports from "@/components/Reports";
import Documents from "@/components/Documents";
import ChadwickLawrence from "@/components/ChadwickLawrence";

import { Bell, Menu, X, ShieldCheck, BellOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const { user } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when screen size or orientation changes
  useEffect(() => {
    const handleResize = () => {
      setMobileMenuOpen(false);
    };

    // Listen for resize events (includes orientation changes)
    window.addEventListener('resize', handleResize);
    
    // Also listen for orientation change events (for older browsers)
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Handle URL parameters for navigation
  useEffect(() => {
    console.log('Home useEffect - location changed:', location);
    console.log('Window location search:', window.location.search);
    
    // Try both the wouter location and window.location for query parameters
    const queryString = window.location.search || (location.includes('?') ? location.split('?')[1] : '');
    const urlParams = new URLSearchParams(queryString);
    const section = urlParams.get('section');
    
    console.log('Query string:', queryString);
    console.log('Parsed section from URL:', section);
    
    if (section && ['dashboard', 'cases', 'messages', 'reports', 'documents'].includes(section)) {
      console.log('Setting activeSection to:', section);
      setActiveSection(section);
    }
  }, [location]);

  // Fetch auto-mute preference
  const { data: autoMuteData } = useQuery<{ autoMuteNewCases: boolean }>({
    queryKey: ["/api/user/auto-mute-preference"],
  });

  // Handle notification bell click
  const handleNotificationClick = () => {
    setActiveSection("messages");
  };

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Handle section change and close mobile menu
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard setActiveSection={setActiveSection} />;
      case "cases":
        return <Cases />;
      case "messages":
        return <Messages />;
      case "reports":
        return <Reports />;
      case "documents":
        return <Documents />;
      case "chadwick-lawrence":
        return <ChadwickLawrence />;
      default:
        return <Dashboard setActiveSection={setActiveSection} />;
    }
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case "dashboard":
        return "Dashboard";
      case "cases":
        return "Cases";
      case "messages":
        return "Messages";
      case "reports":
        return "Reports";
      case "documents":
        return "Documents";
      case "chadwick-lawrence":
        return "Chadwick Lawrence";
      default:
        return "Dashboard";
    }
  };

  const getSectionDescription = () => {
    switch (activeSection) {
      case "dashboard":
        return `Welcome, ${user?.firstName ? `${user.firstName}` : 'User'}`;
      case "cases":
        return "View and manage all your cases";
      case "messages":
        return "Secure communication with our team";
      case "reports":
        return "Download and view detailed reports";
      case "documents":
        return "Manage case documents and files";
      case "chadwick-lawrence":
        return "Other legal services from Chadwick Lawrence";
      default:
        return `Welcome, ${user?.firstName ? `${user.firstName}` : 'User'}`;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      {/* Desktop Sidebar */}
      <div className={`${isMobile ? 'hidden' : 'block'}`}>
        <Sidebar activeSection={activeSection} setActiveSection={handleSectionChange} />
      </div>
      {/* Mobile Sidebar Overlay */}
      {isMobile && mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleMobileMenu} />
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            <Sidebar activeSection={activeSection} setActiveSection={handleSectionChange} />
          </div>
        </>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-card shadow-sm border-b border-gray-200 dark:border-border px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Mobile Menu Button */}
              {isMobile && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="mr-3"
                  onClick={toggleMobileMenu}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">{getSectionTitle()}</h1>
                <p className="text-sm sm:text-base hidden sm:block font-semibold text-gray-600 dark:text-muted-foreground">{getSectionDescription()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user?.isAdmin && (
                <div 
                  className={`flex items-center gap-1.5 ${
                    (user as any).isSuperAdmin 
                      ? 'text-fuchsia-600 dark:text-fuchsia-400' 
                      : 'text-amber-600 dark:text-amber-400'
                  }`} 
                  title={(user as any).isSuperAdmin ? "Super admin privileges enabled" : "Admin privileges enabled"}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-medium hidden sm:inline">
                    {(user as any).isSuperAdmin ? 'Admin+' : 'Admin'}
                  </span>
                </div>
              )}
              {autoMuteData?.autoMuteNewCases && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md text-xs cursor-help">
                      <BellOff className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Auto-mute on</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>New cases will be automatically muted. You won't receive email notifications for new cases unless you turn this off in your profile settings.</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Button variant="ghost" size="icon" className="relative" onClick={handleNotificationClick}>
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
          {/* Mobile description */}
          {isMobile && (
            <p className="text-sm text-gray-600 dark:text-muted-foreground mt-2">{getSectionDescription()}</p>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
