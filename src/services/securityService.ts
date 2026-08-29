/**
 * Security and Authentication Service for The Puff Co. POS
 * Provides cryptographic password hashing, recovery key generation,
 * session lock state management, and permanent credential persistence.
 */

const STORAGE_KEYS = {
  PASSWORD_HASH: 'tpc_pos_security_password_hash_v1',
  PASSWORD_SALT: 'tpc_pos_security_password_salt_v1',
  RECOVERY_KEY: 'tpc_pos_security_recovery_key_v1',
  SESSION_AUTH: 'tpc_pos_session_authenticated_v1',
  LAST_CHANGED: 'tpc_pos_security_last_changed_v1',
  SECURITY_CONFIG: 'tpc_pos_security_config_v1',
};

// Default fallback master password for fresh installs: "1234"
const DEFAULT_INITIAL_PASSWORD = '1234';

export interface SecurityConfig {
  autoLockMinutes: number; // 0 = disabled, 5, 15, 30
  requirePasswordOnLaunch: boolean;
}

const DEFAULT_CONFIG: SecurityConfig = {
  autoLockMinutes: 0,
  requirePasswordOnLaunch: true,
};

type AuthListener = (isAuthenticated: boolean) => void;

class SecurityService {
  private authListeners: Set<AuthListener> = new Set();
  private isAuthenticatedState: boolean = false;
  private autoLockTimer: any = null;

  constructor() {
    this.initSecurity();
  }

  // --- INITIALIZATION ---
  private async initSecurity() {
    if (typeof window === 'undefined') return;

    // Check if password hash exists. If not, initialize with default "1234" and generate recovery key
    const existingHash = localStorage.getItem(STORAGE_KEYS.PASSWORD_HASH);
    if (!existingHash) {
      const salt = this.generateRandomHex(16);
      const hash = await this.hashPassword(DEFAULT_INITIAL_PASSWORD, salt);
      const recoveryKey = this.generateRecoveryKey();

      localStorage.setItem(STORAGE_KEYS.PASSWORD_HASH, hash);
      localStorage.setItem(STORAGE_KEYS.PASSWORD_SALT, salt);
      localStorage.setItem(STORAGE_KEYS.RECOVERY_KEY, recoveryKey);
      localStorage.setItem(STORAGE_KEYS.LAST_CHANGED, new Date().toISOString());
    }

    // Check session storage for existing active tab session
    const sessionAuth = sessionStorage.getItem(STORAGE_KEYS.SESSION_AUTH);
    this.isAuthenticatedState = sessionAuth === 'true';

    // Activity listener for optional auto-lock
    this.setupActivityListener();
  }

  // --- CRYPTOGRAPHIC UTILITIES ---
  private generateRandomHex(length: number): string {
    const array = new Uint8Array(length);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  public generateRecoveryKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Base32 without ambiguous characters (0, O, 1, I)
    const segments: string[] = [];
    for (let s = 0; s < 4; s++) {
      let seg = '';
      for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        seg += chars[randomIndex];
      }
      segments.push(seg);
    }
    return `TPC-${segments.join('-')}`;
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    const combined = `${salt}:${password}:TPC_SECURE_SALT_PEPPER`;
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(combined);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        console.warn('Crypto subtle failed, falling back to custom SHA-256 digest:', e);
      }
    }
    // Simple fast fallback digest
    return this.fallbackSha256(combined);
  }

  private fallbackSha256(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0') + Math.abs(hash * 31).toString(16).padStart(16, '0');
  }

  // --- AUTHENTICATION & LOGIN ---
  public isAuthenticated(): boolean {
    return this.isAuthenticatedState;
  }

  public subscribeAuth(listener: AuthListener): () => void {
    this.authListeners.add(listener);
    listener(this.isAuthenticatedState);
    return () => this.authListeners.delete(listener);
  }

  private notifyAuthChange(state: boolean) {
    this.isAuthenticatedState = state;
    if (typeof window !== 'undefined') {
      if (state) {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_AUTH, 'true');
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_AUTH);
      }
    }
    this.authListeners.forEach((fn) => fn(state));
  }

  public async login(password: string): Promise<{ success: boolean; message?: string }> {
    const cleanPass = password.trim();
    if (!cleanPass) {
      return { success: false, message: 'Please enter your password.' };
    }

    const salt = localStorage.getItem(STORAGE_KEYS.PASSWORD_SALT);
    const storedHash = localStorage.getItem(STORAGE_KEYS.PASSWORD_HASH);

    if (!salt || !storedHash) {
      // In case storage was cleared, re-init
      await this.initSecurity();
    }

    const activeSalt = localStorage.getItem(STORAGE_KEYS.PASSWORD_SALT) || 'default_salt';
    const activeHash = localStorage.getItem(STORAGE_KEYS.PASSWORD_HASH);

    const inputHash = await this.hashPassword(cleanPass, activeSalt);

    if (inputHash === activeHash) {
      this.notifyAuthChange(true);
      this.resetAutoLockTimer();
      return { success: true };
    }

    return { success: false, message: 'Incorrect password. Please try again.' };
  }

  public logout(): void {
    this.notifyAuthChange(false);
  }

  // --- PASSWORD MANAGEMENT ---
  public async changePassword(
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; newRecoveryKey?: string; message?: string }> {
    const cleanCurrent = currentPass.trim();
    const cleanNew = newPass.trim();

    if (!cleanCurrent) {
      return { success: false, message: 'Please enter your current password.' };
    }
    if (!cleanNew) {
      return { success: false, message: 'New password cannot be empty.' };
    }
    if (cleanNew.length < 3) {
      return { success: false, message: 'Password must be at least 3 characters long.' };
    }

    const salt = localStorage.getItem(STORAGE_KEYS.PASSWORD_SALT) || '';
    const storedHash = localStorage.getItem(STORAGE_KEYS.PASSWORD_HASH) || '';

    const currentHash = await this.hashPassword(cleanCurrent, salt);
    if (currentHash !== storedHash) {
      return { success: false, message: 'Current password does not match.' };
    }

    // Set new password with a new salt and generate a new recovery key
    const newSalt = this.generateRandomHex(16);
    const newHash = await this.hashPassword(cleanNew, newSalt);
    const newRecoveryKey = this.generateRecoveryKey();

    localStorage.setItem(STORAGE_KEYS.PASSWORD_HASH, newHash);
    localStorage.setItem(STORAGE_KEYS.PASSWORD_SALT, newSalt);
    localStorage.setItem(STORAGE_KEYS.RECOVERY_KEY, newRecoveryKey);
    localStorage.setItem(STORAGE_KEYS.LAST_CHANGED, new Date().toISOString());

    return { success: true, newRecoveryKey };
  }

  public async setPasswordDirect(newPass: string): Promise<{ success: boolean; newRecoveryKey: string }> {
    const cleanNew = newPass.trim();
    const newSalt = this.generateRandomHex(16);
    const newHash = await this.hashPassword(cleanNew, newSalt);
    const newRecoveryKey = this.generateRecoveryKey();

    localStorage.setItem(STORAGE_KEYS.PASSWORD_HASH, newHash);
    localStorage.setItem(STORAGE_KEYS.PASSWORD_SALT, newSalt);
    localStorage.setItem(STORAGE_KEYS.RECOVERY_KEY, newRecoveryKey);
    localStorage.setItem(STORAGE_KEYS.LAST_CHANGED, new Date().toISOString());

    return { success: true, newRecoveryKey };
  }

  // --- RECOVERY KEY SYSTEM ---
  public getRecoveryKey(): string {
    return localStorage.getItem(STORAGE_KEYS.RECOVERY_KEY) || 'TPC-NONE-RECOVERY-KEY';
  }

  public normalizeKey(key: string): string {
    return key.toUpperCase().trim().replace(/\s+/g, '');
  }

  public verifyRecoveryKey(inputKey: string): boolean {
    const storedKey = this.getRecoveryKey();
    const normalizedInput = this.normalizeKey(inputKey);
    const normalizedStored = this.normalizeKey(storedKey);

    // Support with or without "TPC-" prefix
    const strippedInput = normalizedInput.replace(/^TPC-?/, '');
    const strippedStored = normalizedStored.replace(/^TPC-?/, '');

    return strippedInput === strippedStored;
  }

  public async resetPasswordWithRecoveryKey(
    recoveryKey: string,
    newPass: string
  ): Promise<{ success: boolean; newRecoveryKey: string; message?: string }> {
    if (!this.verifyRecoveryKey(recoveryKey)) {
      return {
        success: false,
        newRecoveryKey: '',
        message: 'Invalid Recovery Key. Please verify the code you entered.',
      };
    }

    const cleanNew = newPass.trim();
    if (!cleanNew) {
      return {
        success: false,
        newRecoveryKey: '',
        message: 'New password cannot be empty.',
      };
    }
    if (cleanNew.length < 3) {
      return {
        success: false,
        newRecoveryKey: '',
        message: 'Password must be at least 3 characters long.',
      };
    }

    // Set new password and invalidate previous recovery key by creating a new one
    const result = await this.setPasswordDirect(cleanNew);

    // Log the user in
    this.notifyAuthChange(true);

    return {
      success: true,
      newRecoveryKey: result.newRecoveryKey,
      message: 'Password successfully reset! Your previous recovery key has been invalidated.',
    };
  }

  public getLastPasswordChangeDate(): string {
    const iso = localStorage.getItem(STORAGE_KEYS.LAST_CHANGED);
    if (!iso) return 'Initial setup';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  }

  // --- AUTO-LOCK SUPPORT ---
  public getSecurityConfig(): SecurityConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SECURITY_CONFIG);
      if (raw) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Failed to parse security config:', e);
    }
    return DEFAULT_CONFIG;
  }

  public updateSecurityConfig(config: Partial<SecurityConfig>): void {
    const current = this.getSecurityConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEYS.SECURITY_CONFIG, JSON.stringify(updated));
    this.resetAutoLockTimer();
  }

  private setupActivityListener() {
    if (typeof window === 'undefined') return;
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => this.resetAutoLockTimer();
    events.forEach((ev) => window.addEventListener(ev, handler, { passive: true }));
  }

  private resetAutoLockTimer() {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }

    const config = this.getSecurityConfig();
    if (config.autoLockMinutes > 0 && this.isAuthenticatedState) {
      this.autoLockTimer = setTimeout(() => {
        console.log('[Security] Auto-locking terminal due to inactivity');
        this.logout();
      }, config.autoLockMinutes * 60 * 1000);
    }
  }
}

export const securityService = new SecurityService();
