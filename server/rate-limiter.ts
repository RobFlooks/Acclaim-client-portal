interface LoginAttempt {
  attempts: number;
  lockedUntil: Date | null;
  lastAttempt: Date;
  username?: string;
}

class LoginRateLimiter {
  private attempts: Map<string, LoginAttempt> = new Map();
  private readonly maxAttempts = 5;
  private readonly lockoutDurationMs = 15 * 60 * 1000; // 15 minutes
  private readonly cleanupIntervalMs = 5 * 60 * 1000; // Clean up every 5 minutes

  constructor() {
    // Periodically clean up old entries to prevent memory leaks
    setInterval(() => this.cleanup(), this.cleanupIntervalMs);
  }

  private cleanup(): void {
    const now = new Date();
    for (const [key, data] of this.attempts.entries()) {
      // Remove entries that have been unlocked for more than 1 hour
      if (!data.lockedUntil || data.lockedUntil < new Date(now.getTime() - 60 * 60 * 1000)) {
        // Also check if last attempt was more than 1 hour ago
        if (data.lastAttempt < new Date(now.getTime() - 60 * 60 * 1000)) {
          this.attempts.delete(key);
        }
      }
    }
  }

  isLocked(identifier: string): { locked: boolean; remainingSeconds?: number } {
    const data = this.attempts.get(identifier);
    if (!data || !data.lockedUntil) {
      return { locked: false };
    }

    const now = new Date();
    if (data.lockedUntil > now) {
      const remainingSeconds = Math.ceil((data.lockedUntil.getTime() - now.getTime()) / 1000);
      return { locked: true, remainingSeconds };
    }

    // Lockout has expired, reset the counter
    this.attempts.delete(identifier);
    return { locked: false };
  }

  recordFailedAttempt(identifier: string, username?: string): { locked: boolean; attemptsRemaining: number } {
    const now = new Date();
    let data = this.attempts.get(identifier);

    if (!data) {
      data = { attempts: 0, lockedUntil: null, lastAttempt: now, username };
    }

    // If previously locked but lockout expired, reset
    if (data.lockedUntil && data.lockedUntil <= now) {
      data = { attempts: 0, lockedUntil: null, lastAttempt: now, username };
    }

    data.attempts += 1;
    data.lastAttempt = now;
    if (username) data.username = username;

    if (data.attempts >= this.maxAttempts) {
      data.lockedUntil = new Date(now.getTime() + this.lockoutDurationMs);
      this.attempts.set(identifier, data);
      return { locked: true, attemptsRemaining: 0 };
    }

    this.attempts.set(identifier, data);
    return { locked: false, attemptsRemaining: this.maxAttempts - data.attempts };
  }

  recordSuccessfulLogin(identifier: string): void {
    this.attempts.delete(identifier);
  }

  // Admin functions
  getLockedAccounts(): Array<{
    identifier: string;
    username?: string;
    attempts: number;
    lockedUntil: Date;
    remainingMinutes: number;
  }> {
    const now = new Date();
    const locked: Array<{
      identifier: string;
      username?: string;
      attempts: number;
      lockedUntil: Date;
      remainingMinutes: number;
    }> = [];

    for (const [identifier, data] of this.attempts.entries()) {
      if (data.lockedUntil && data.lockedUntil > now) {
        locked.push({
          identifier,
          username: data.username,
          attempts: data.attempts,
          lockedUntil: data.lockedUntil,
          remainingMinutes: Math.ceil((data.lockedUntil.getTime() - now.getTime()) / 60000),
        });
      }
    }

    return locked;
  }

  getAllAttempts(): Array<{
    identifier: string;
    username?: string;
    attempts: number;
    lockedUntil: Date | null;
    lastAttempt: Date;
  }> {
    const result: Array<{
      identifier: string;
      username?: string;
      attempts: number;
      lockedUntil: Date | null;
      lastAttempt: Date;
    }> = [];

    for (const [identifier, data] of this.attempts.entries()) {
      result.push({
        identifier,
        username: data.username,
        attempts: data.attempts,
        lockedUntil: data.lockedUntil,
        lastAttempt: data.lastAttempt,
      });
    }

    return result.sort((a, b) => b.lastAttempt.getTime() - a.lastAttempt.getTime());
  }

  unlockAccount(identifier: string): boolean {
    if (this.attempts.has(identifier)) {
      this.attempts.delete(identifier);
      return true;
    }
    return false;
  }

  getStats(): {
    totalTracked: number;
    currentlyLocked: number;
    maxAttempts: number;
    lockoutMinutes: number;
  } {
    const now = new Date();
    let lockedCount = 0;
    
    for (const data of this.attempts.values()) {
      if (data.lockedUntil && data.lockedUntil > now) {
        lockedCount++;
      }
    }

    return {
      totalTracked: this.attempts.size,
      currentlyLocked: lockedCount,
      maxAttempts: this.maxAttempts,
      lockoutMinutes: this.lockoutDurationMs / 60000,
    };
  }
}

export const loginRateLimiter = new LoginRateLimiter();
