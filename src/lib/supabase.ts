import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const getRawSupabaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) {
    return (import.meta as any).env.VITE_SUPABASE_URL;
  }
  if (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) {
    return process.env.VITE_SUPABASE_URL;
  }
  return '';
};

export const getRawSupabaseAnonKey = (): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) {
    return (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
  }
  if (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) {
    return process.env.VITE_SUPABASE_ANON_KEY;
  }
  return '';
};

/**
 * Sanitizes and normalizes the Supabase Project URL:
 * - Trims whitespace
 * - Strips trailing slashes
 * - Strips accidental /rest/v1 suffixes
 */
export const sanitizeSupabaseUrl = (url: string): string => {
  if (!url) return '';
  let cleaned = url.trim();
  cleaned = cleaned.replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  return cleaned;
};

/**
 * Checks whether a given key is accidentally a Supabase service-role secret.
 * Frontends must NEVER receive or use service-role keys!
 */
export const isServiceRoleKey = (key: string): boolean => {
  if (!key) return false;
  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload && payload.role === 'service_role') {
        return true;
      }
    }
  } catch {
    // Non-JWT string
  }
  return false;
};

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  missingUrl: boolean;
  missingAnonKey: boolean;
  isPlaceholderUrl: boolean;
  isPlaceholderKey: boolean;
  isMalformedUrl: boolean;
  isServiceRoleExposed: boolean;
  sanitizedUrl: string;
  message: string;
}

/**
 * Detailed diagnostics for Supabase environment configuration.
 * Does not expose the anon key secret or any credentials.
 */
export const getSupabaseConfigDiagnostics = (): SupabaseConfigStatus => {
  const rawUrl = getRawSupabaseUrl();
  const rawAnonKey = getRawSupabaseAnonKey();
  const sanitized = sanitizeSupabaseUrl(rawUrl);
  const missingUrl = !sanitized;
  const missingAnonKey = !rawAnonKey.trim();
  const isPlaceholderUrl = sanitized.includes('your-project') || sanitized.includes('placeholder');
  const isPlaceholderKey =
    rawAnonKey.includes('your-anon') ||
    rawAnonKey.includes('placeholder') ||
    rawAnonKey.length < 20;

  let isMalformedUrl = false;
  if (sanitized) {
    if (!sanitized.startsWith('https://')) {
      isMalformedUrl = true;
    } else {
      try {
        const parsed = new URL(sanitized);
        if (!parsed.hostname.endsWith('.supabase.co') && !parsed.hostname.includes('supabase')) {
          isMalformedUrl = true;
        }
      } catch {
        isMalformedUrl = true;
      }
    }
  }

  const isServiceRoleExposed = isServiceRoleKey(rawAnonKey);

  let message = 'Supabase environment is active and connected.';
  let isConfigured = true;

  if (isServiceRoleExposed) {
    isConfigured = false;
    message =
      'CRITICAL SECURITY RISK: A service-role secret was placed in VITE_SUPABASE_ANON_KEY. The frontend client blocked this key to prevent credential leakage.';
    console.error(message);
  } else if (missingUrl || missingAnonKey) {
    isConfigured = false;
    message =
      'Supabase environment variables not configured. Operating in safe local repository fallback mode.';
  } else if (isPlaceholderUrl || isPlaceholderKey) {
    isConfigured = false;
    message =
      'Supabase environment variables contain placeholder values. Please configure real project credentials in .env.';
  } else if (isMalformedUrl) {
    isConfigured = false;
    message = 'VITE_SUPABASE_URL is malformed. Expected format: https://<project-ref>.supabase.co';
  }

  return {
    isConfigured,
    missingUrl,
    missingAnonKey,
    isPlaceholderUrl,
    isPlaceholderKey,
    isMalformedUrl,
    isServiceRoleExposed,
    sanitizedUrl: sanitized,
    message,
  };
};

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfigDiagnostics().isConfigured;
};

export type PortalRole = 'admin' | 'driver' | 'student';

/**
 * Detects the active portal based on current window.location.pathname.
 * - /admin/*, /management-vaahan => 'admin'
 * - /driver/*, /management-driver => 'driver'
 * - /student/*, / => 'student'
 */
export const detectPortal = (): PortalRole => {
  if (typeof window === 'undefined') return 'student';
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith('/admin') || path.startsWith('/management-vaahan') || path.includes('admin')) {
    return 'admin';
  }
  if (path.startsWith('/driver') || path.startsWith('/management-driver') || path.includes('driver')) {
    return 'driver';
  }
  return 'student';
};

export const PORTAL_AUTH_STORAGE_KEYS: Record<PortalRole, string> = {
  admin: 'vaahan_admin_auth',
  driver: 'vaahan_driver_auth',
  student: 'vaahan_student_auth',
};

const portalClients: Record<PortalRole, SupabaseClient | null> = {
  admin: null,
  driver: null,
  student: null,
};

let currentConfiguredUrl = '';

/**
 * Returns a dedicated, isolated SupabaseClient instance for the specified portal.
 * If no portal is specified, automatically resolves the active portal from the browser URL.
 * Each portal client persists its auth token in a separate localStorage key:
 * - Admin:   vaahan_admin_auth
 * - Driver:  vaahan_driver_auth
 * - Student: vaahan_student_auth
 */
export const getSupabaseClient = (portal?: PortalRole): SupabaseClient => {
  const targetPortal: PortalRole = portal || detectPortal();
  const diagnostics = getSupabaseConfigDiagnostics();

  if (diagnostics.isConfigured) {
    if (!portalClients[targetPortal] || currentConfiguredUrl !== diagnostics.sanitizedUrl) {
      currentConfiguredUrl = diagnostics.sanitizedUrl;
      portalClients[targetPortal] = createClient(
        diagnostics.sanitizedUrl,
        getRawSupabaseAnonKey().trim(),
        {
          auth: {
            storageKey: PORTAL_AUTH_STORAGE_KEYS[targetPortal],
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        }
      );
    }
    return portalClients[targetPortal]!;
  }

  // Safe offline client that does not crash imports or log unnecessary warnings
  if (!portalClients[targetPortal]) {
    portalClients[targetPortal] = createClient(
      'https://offline-safe.supabase.co',
      'placeholder-anon-token-1234567890',
      {
        auth: {
          storageKey: PORTAL_AUTH_STORAGE_KEYS[targetPortal],
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return portalClients[targetPortal]!;
};

export const getSupabase = (): SupabaseClient => getSupabaseClient();

export const supabaseAdminClient = (): SupabaseClient => getSupabaseClient('admin');
export const supabaseDriverClient = (): SupabaseClient => getSupabaseClient('driver');
export const supabaseStudentClient = (): SupabaseClient => getSupabaseClient('student');

/**
 * Dynamic proxy that delegates to the portal-isolated SupabaseClient for the active URL context.
 * Enables transparent multi-portal concurrency without cross-contamination.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});
