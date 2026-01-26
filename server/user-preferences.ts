import * as fs from 'fs';
import * as path from 'path';

const PREFERENCES_FILE = path.join(process.cwd(), 'data', 'user-preferences.json');

interface UserPreferences {
  autoMuteNewCases: Record<string, boolean>;
}

function ensureDataDir(): void {
  const dataDir = path.dirname(PREFERENCES_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadPreferences(): UserPreferences {
  ensureDataDir();
  try {
    if (fs.existsSync(PREFERENCES_FILE)) {
      const data = fs.readFileSync(PREFERENCES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading user preferences:', error);
  }
  return { autoMuteNewCases: {} };
}

function savePreferences(prefs: UserPreferences): void {
  ensureDataDir();
  try {
    fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(prefs, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

export function getAutoMuteNewCases(userId: string): boolean {
  const prefs = loadPreferences();
  return prefs.autoMuteNewCases[userId] === true;
}

export function setAutoMuteNewCases(userId: string, enabled: boolean): void {
  const prefs = loadPreferences();
  if (enabled) {
    prefs.autoMuteNewCases[userId] = true;
  } else {
    delete prefs.autoMuteNewCases[userId];
  }
  savePreferences(prefs);
}

export function getUsersWithAutoMuteEnabled(): string[] {
  const prefs = loadPreferences();
  return Object.keys(prefs.autoMuteNewCases).filter(userId => prefs.autoMuteNewCases[userId]);
}
