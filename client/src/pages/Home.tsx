import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import Cases from "@/components/Cases";
import Messages from "@/components/Messages";
import Reports from "@/components/Reports";
import Documents from "@/components/Documents";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function Home() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const { user } = useAuth();
  const [location] = useLocation();



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
        return `Welcome back, ${user?.firstName ? `${user.firstName}` : 'User'}`;
      case "cases":
        return "View and manage all your active cases";
      case "messages":
        return "Secure communication with our team";
      case "reports":
        return "Download and view detailed reports";
      case "documents":
        return "Manage case documents and files";
      default:
        return `Welcome back, ${user?.firstName ? `${user.firstName}` : 'User'}`;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{getSectionTitle()}</h1>
              <p className="text-gray-600">{getSectionDescription()}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative" onClick={handleNotificationClick}>
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
