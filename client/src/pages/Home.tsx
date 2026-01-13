import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import Cases from "@/components/Cases";
import Messages from "@/components/Messages";
import Reports from "@/components/Reports";
import Documents from "@/components/Documents";

import { Bell, Menu, X, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);



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
      default:
        return `Welcome, ${user?.firstName ? `${user.firstName}` : 'User'}`;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
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
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{getSectionTitle()}</h1>
                <p className="text-sm sm:text-base text-gray-600 hidden sm:block">{getSectionDescription()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setLocation("/profile?tab=legal-support")}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2e3192] transition-colors"
                title="Other Legal Services"
              >
                <Scale className="h-4 w-4" />
                <span className="hidden sm:inline">Other Legal Services by Chadwick Lawrence</span>
              </button>
              <Button variant="ghost" size="icon" className="relative" onClick={handleNotificationClick}>
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
          {/* Mobile description */}
          {isMobile && (
            <p className="text-sm text-gray-600 mt-2">{getSectionDescription()}</p>
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
