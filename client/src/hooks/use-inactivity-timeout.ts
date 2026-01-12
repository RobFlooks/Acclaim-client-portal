import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_LOGOUT_MS = 60 * 1000; // Show warning 1 minute before logout

interface UseInactivityTimeoutOptions {
  timeoutMs?: number;
  warningMs?: number;
  onWarning?: () => void;
  onLogout?: () => void;
  enabled?: boolean;
}

export function useInactivityTimeout({
  timeoutMs = INACTIVITY_TIMEOUT_MS,
  warningMs = WARNING_BEFORE_LOGOUT_MS,
  onWarning,
  onLogout,
  enabled = true,
}: UseInactivityTimeoutOptions = {}) {
  const [, navigate] = useLocation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Error during logout:', error);
    }
    if (onLogout) {
      onLogout();
    }
    navigate('/auth');
  }, [navigate, onLogout]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    if (!enabled) return;

    warningTimeoutRef.current = setTimeout(() => {
      if (onWarning) {
        onWarning();
      }
    }, timeoutMs - warningMs);

    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [enabled, timeoutMs, warningMs, onWarning, handleLogout]);

  useEffect(() => {
    if (!enabled) return;

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
      resetTimer();
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
    };
  }, [enabled, resetTimer]);

  return {
    resetTimer,
    getLastActivity: () => lastActivityRef.current,
  };
}
