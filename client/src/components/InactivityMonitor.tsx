import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [countdown, setCountdown] = useState(warningSeconds);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef<boolean>(false);

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningSeconds * 1000;

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Error during logout:', error);
    }
    warningShownRef.current = false;
    setShowWarning(false);
    setCountdown(warningSeconds);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    window.location.href = '/auth';
  }, [warningSeconds]);

  const startCountdown = useCallback(() => {
    setCountdown(warningSeconds);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [warningSeconds]);

  const resetTimer = useCallback((force = false) => {
    if (warningShownRef.current && !force) {
      return;
    }

    warningShownRef.current = false;
    setShowWarning(false);
    setCountdown(warningSeconds);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    if (!user) return;

    warningTimeoutRef.current = setTimeout(() => {
      warningShownRef.current = true;
      setShowWarning(true);
      startCountdown();
    }, timeoutMs - warningMs);

    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [user, timeoutMs, warningMs, warningSeconds, handleLogout, startCountdown]);

  useEffect(() => {
    if (!user) return;

    const events = [
      'mousedown',
      'mousemove', 
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
    ];

    const handleActivity = () => {
      if (!warningShownRef.current) {
        resetTimer();
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [user, resetTimer]);

  const handleStayLoggedIn = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    resetTimer(true);
  };

  if (!user) {
    return null;
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={(open) => {
      if (!open) {
        handleStayLoggedIn();
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <AlertDialogTitle>Session About to Expire</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            You will be logged out due to inactivity in{' '}
            <span className="font-bold text-amber-600">{countdown}</span>{' '}
            {countdown === 1 ? 'second' : 'seconds'}. 
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
