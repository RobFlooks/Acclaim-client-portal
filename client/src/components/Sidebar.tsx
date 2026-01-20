import { Scale, Home, FolderOpen, MessageSquare, BarChart3, FileText, User, LogOut, Settings, Shield, UserCog } from "lucide-react";
import logoImage from "@assets/cl-bg_1752271318153.png";
import acclaimRoseLogo from "@assets/acclaim_rose_transparent_1768474381340.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function Sidebar({ activeSection, setActiveSection }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Fetch messages to get unread count
  const { data: messages } = useQuery({
    queryKey: ["/api/messages"],
    retry: false,
  });

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "cases", label: "Cases", icon: FolderOpen },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "reports", label: "Reports", icon: BarChart3 },
    // Only show admin link to admin users
    ...(user?.isAdmin ? [
      { id: "admin", label: "Admin Panel", icon: Shield, isRoute: true, route: "/admin" }
    ] : []),
  ];

  return (
    <div className="w-64 h-[100dvh] max-h-screen bg-acclaim-teal dark:bg-gray-900 shadow-lg flex flex-col overflow-hidden">
      {/* Brand Header */}
      <div className="flex-shrink-0 flex items-center justify-center h-16 bg-acclaim-teal dark:bg-gray-900 border-b border-teal-700 dark:border-gray-700">
        <button 
          onClick={() => setActiveSection('dashboard')}
          className="flex items-center hover:bg-teal-700 dark:hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors"
        >
          {/* Light mode: white inverted logo, Dark mode: teal rose logo */}
          <img src={logoImage} alt="Acclaim Logo" className="w-8 h-8 mr-3 filter brightness-0 invert opacity-80 dark:hidden" />
          <img src={acclaimRoseLogo} alt="Acclaim Logo" className="w-10 h-10 mr-3 hidden dark:block" />
          <div className="text-white">
            <div className="text-lg font-bold ml-[0px] mr-[0px] text-left">Acclaim</div>
            <div className="text-xs opacity-80 text-left">Credit Management & Recovery</div>
          </div>
        </button>
      </div>
      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.isRoute && item.route) {
                  setLocation(item.route);
                } else {
                  setActiveSection(item.id);
                }
              }}
              className={`flex items-center w-full px-4 py-3 text-white rounded-lg transition-colors ${
                isActive 
                  ? "bg-teal-700 dark:bg-gray-700" 
                  : "hover:bg-teal-700 dark:hover:bg-gray-800"
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
              {(item as any).badge && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {(item as any).badge}
                </span>
              )}
            </button>
          );
        })}
        
        {/* Other Legal Services - separate from main nav */}
        <div className="pt-4 mt-4 border-t border-teal-700/50 dark:border-gray-700">
          <button
            onClick={() => setActiveSection("chadwick-lawrence")}
            className={`flex items-center w-full px-4 py-3 text-white rounded-lg transition-colors ${
              activeSection === "chadwick-lawrence"
                ? "bg-teal-700 dark:bg-gray-700"
                : "hover:bg-teal-700 dark:hover:bg-gray-800"
            }`}
          >
            <Scale className="w-5 h-5 mr-3" />
            Chadwick Lawrence
          </button>
        </div>
      </nav>
      {/* User Profile */}
      <div className="flex-shrink-0 p-4 border-t border-teal-700 dark:border-gray-700">
        <div className="flex items-center mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${user?.isAdmin ? 'bg-white border-2 border-acclaim-teal' : 'bg-white border-2 border-acclaim-teal'}`}>
            {user?.isAdmin ? (
              <img src={acclaimRoseLogo} alt="Acclaim" className="w-8 h-8 object-contain" />
            ) : (
              <User className="text-acclaim-teal h-5 w-5" />
            )}
          </div>
          <div className="ml-3">
            <div className="text-white font-medium text-sm">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-teal-200 text-xs">
              {user?.email}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/profile")}
            className="flex-1 justify-start text-white hover:bg-teal-700 dark:hover:bg-gray-800"
          >
            <UserCog className="w-4 h-4 mr-2" />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex-1 justify-start text-white hover:bg-teal-700 dark:hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
