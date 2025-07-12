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

  // Fetch messages to get unread count
  const { data: messages } = useQuery({
    queryKey: ["/api/messages"],
    retry: false,
  });

  // Calculate unread message count
  const unreadCount = messages?.filter((msg: any) => !msg.isRead).length || 0;

  // Handle URL parameters for navigation
  useEffect(() => {
    console.log('Home useEffect - location changed:', location);
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const section = urlParams.get('section');
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
        return <Dashboard />;
      case "cases":
        return <Cases />;
      case "messages":
        return <Messages />;
      case "reports":
        return <Reports />;
      case "documents":
        return <Documents />;
      default:
        return <Dashboard />;
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
        return "Welcome back, manage your debt recovery cases";
      case "cases":
        return "View and manage all your active cases";
      case "messages":
        return "Secure communication with our team";
      case "reports":
        return "Download and view detailed reports";
      case "documents":
        return "Manage case documents and files";
      default:
        return "Welcome back, manage your debt recovery cases";
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
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
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
