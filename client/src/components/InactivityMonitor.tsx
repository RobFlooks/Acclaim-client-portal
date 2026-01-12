import { useState, useCallback } from 'react';
import { useInactivityTimeout } from '@/hooks/use-inactivity-timeout';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock } from 'lucide-react';

interface InactivityMonitorProps {
  timeoutMinutes?: number;
  warningSeconds?: number;
}

export function InactivityMonitor({
  timeoutMinutes = 15,
  warningSeconds = 60,
}: InactivityMonitorProps) {
  const { user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);

  const handleWarning = useCallback(() => {
    setShowWarning(true);
  }, []);

  const handleLogout = useCallback(() => {
    setShowWarning(false);
  }, []);

  const { resetTimer } = useInactivityTimeout({
    timeoutMs: timeoutMinutes * 60 * 1000,
    warningMs: warningSeconds * 1000,
    onWarning: handleWarning,
    onLogout: handleLogout,
    enabled: !!user,
  });

  const handleStayLoggedIn = () => {
    setShowWarning(false);
    resetTimer();
  };

  if (!user) {
    return null;
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <AlertDialogTitle>Session About to Expire</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            You will be logged out due to inactivity in about {warningSeconds} seconds. 
            Click below to stay logged in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={handleStayLoggedIn}
            className="bg-acclaim-teal hover:bg-acclaim-teal/90"
          >
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
