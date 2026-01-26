import * as fs from 'fs';
import * as path from 'path';

const PREFERENCES_FILE = path.join(process.cwd(), 'data', 'user-preferences.json');

interface UserPreferences {
  autoMuteNewCases: Record<string, boolean>;
}

let inMemoryPreferences: UserPreferences = { autoMuteNewCases: {} };
let fileSystemAvailable = true;

function ensureDataDir(): boolean {
  try {
    const dataDir = path.dirname(PREFERENCES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return true;
  } catch (error) {
    console.warn('Unable to create data directory, using in-memory storage:', error);
    fileSystemAvailable = false;
    return false;
  }
}

function loadPreferences(): UserPreferences {
  if (!fileSystemAvailable) {
    return inMemoryPreferences;
  }
  
  if (!ensureDataDir()) {
    return inMemoryPreferences;
  }
  
  try {
    if (fs.existsSync(PREFERENCES_FILE)) {
      const data = fs.readFileSync(PREFERENCES_FILE, 'utf-8');
      const prefs = JSON.parse(data);
      inMemoryPreferences = prefs;
      return prefs;
    }
  } catch (error) {
    console.warn('Error loading user preferences, using in-memory storage:', error);
    fileSystemAvailable = false;
  }
  return inMemoryPreferences;
}

function savePreferences(prefs: UserPreferences): void {
  inMemoryPreferences = prefs;
  
  if (!fileSystemAvailable) {
    return;
  }
  
  if (!ensureDataDir()) {
    return;
  }
  
  try {
    fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(prefs, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Error saving user preferences to file, using in-memory only:', error);
    fileSystemAvailable = false;
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
