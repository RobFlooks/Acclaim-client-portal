import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

interface RefreshIndicatorProps {
  isRefreshing: boolean;
  lastRefresh?: Date;
  showLastRefresh?: boolean;
}

export default function RefreshIndicator({ 
  isRefreshing, 
  lastRefresh, 
  showLastRefresh = true 
}: RefreshIndicatorProps) {
  const [showRefreshNotification, setShowRefreshNotification] = useState(false);

  useEffect(() => {
    if (isRefreshing) {
      setShowRefreshNotification(true);
      const timer = setTimeout(() => {
        setShowRefreshNotification(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isRefreshing]);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {showRefreshNotification && (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Updating...
        </Badge>
      )}
      
      {showLastRefresh && lastRefresh && !isRefreshing && (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
          <RefreshCw className="h-3 w-3 mr-1" />
          {formatTimeAgo(lastRefresh)}
        </Badge>
      )}
    </div>
  );
}