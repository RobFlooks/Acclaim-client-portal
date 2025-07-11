import { Scale, Home, FolderOpen, MessageSquare, BarChart3, FileText, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function Sidebar({ activeSection, setActiveSection }: SidebarProps) {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "cases", label: "Cases", icon: FolderOpen },
    { id: "messages", label: "Messages", icon: MessageSquare, badge: 3 },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "documents", label: "Documents", icon: FileText },
  ];

  return (
    <div className="w-64 bg-acclaim-teal shadow-lg flex flex-col">
      {/* Brand Header */}
      <div className="flex items-center justify-center h-16 bg-acclaim-teal border-b border-teal-700">
        <div className="flex items-center">
          <Scale className="text-white text-2xl mr-3" />
          <div className="text-white">
            <div className="text-lg font-bold ml-[41px] mr-[41px]">Acclaim</div>
            <div className="text-xs opacity-80">Credit Management & Recovery</div>
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
              onClick={() => setActiveSection(item.id)}
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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-white hover:bg-teal-700"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
