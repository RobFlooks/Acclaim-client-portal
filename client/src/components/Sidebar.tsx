import { Scale, Home, FolderOpen, MessageSquare, BarChart3, FileText, User, LogOut, Settings, Shield, UserCog } from "lucide-react";
import logoImage from "@assets/cl-bg_1752271318153.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function Sidebar({ activeSection, setActiveSection }: SidebarProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Fetch messages to get unread count
  const { data: messages } = useQuery({
    queryKey: ["/api/messages"],
    retry: false,
  });

  // Calculate unread message count
  const unreadCount = messages?.filter((msg: any) => !msg.isRead).length || 0;

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "cases", label: "Cases", icon: FolderOpen },
    { id: "messages", label: "Messages", icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "documents", label: "Documents", icon: FileText },
    // Only show admin link to admin users
    ...(user?.isAdmin ? [
      { id: "admin", label: "Admin Panel", icon: Shield, isRoute: true, route: "/admin" }
    ] : []),
  ];

  return (
    <div className="w-64 bg-acclaim-teal shadow-lg flex flex-col">
      {/* Brand Header */}
      <div className="flex items-center justify-center h-16 bg-acclaim-teal border-b border-teal-700">
        <div className="flex items-center">
          <img src={logoImage} alt="Acclaim Logo" className="w-8 h-8 mr-3 filter brightness-0 invert" />
          <div className="text-white">
            <div className="text-lg font-bold ml-[0px] mr-[0px] text-center">Acclaim</div>
            <div className="text-xs opacity-80 text-center">Credit Management & Recovery</div>
          </div>
        </div>
      </div>
      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2">
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
                  ? "bg-teal-700" 
                  : "hover:bg-teal-700"
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
              {item.badge && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {/* User Profile */}
      <div className="p-4 border-t border-teal-700">
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <User className="text-acclaim-teal h-5 w-5" />
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
            className="flex-1 justify-start text-white hover:bg-teal-700"
          >
            <UserCog className="w-4 h-4 mr-2" />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex-1 justify-start text-white hover:bg-teal-700"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
