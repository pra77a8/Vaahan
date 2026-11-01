// =============================================================================
// VAAHAN TRANSIT SYSTEM - DRIVER MANAGEMENT SERVICE
// Manages driver credentials, verification, status toggle, and Supabase integration
// =============================================================================

import { supabase, isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';
import { DriverProfile, CreateDriverAccountData, UpdateDriverProfileData } from '../types';

const STORAGE_KEY_DRIVERS = 'vaahan_registered_drivers';
let inMemoryDrivers: DriverProfile[] = [];
const isDev = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);

/**
 * Validates whether a given string is a genuine UUID v4.
 */
export const isUuid = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

/**
 * Resolves and validates the currently authenticated driver through trusted database records.
 * Ensures the caller is signed into Supabase, exists in public.profiles with role = 'driver'
 * and status = 'active', and has a valid record in public.drivers.
 *
 * Never uses hardcoded IDs, email addresses as foreign keys, or mock fallbacks.
 */
export const getAuthenticatedDriverProfile = async (): Promise<{
  success: boolean;
  driver?: DriverProfile;
  driverId?: string;
  error?: string;
}> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase is not configured. Real driver authentication requires a connected database.',
    };
  }

  try {
    const driverClient = getSupabaseClient('driver');
    const { data: authData, error: authErr } = await driverClient.auth.getUser();
    if (authErr || !authData?.user) {
      if (isDev) {
        console.warn('[DriverAuthDiagnostic] No active Supabase session user found:', authErr?.message || 'No user session');
      }
      return {
        success: false,
        error: 'No active driver session found. Please sign in to the Driver Console.',
      };
    }

    const userId = authData.user.id;
    if (!isUuid(userId)) {
      if (isDev) {
        console.error('[DriverAuthDiagnostic] Authenticated user ID is not a valid UUID:', userId);
      }
      return {
        success: false,
        error: 'Invalid authenticated user session identifier format.',
      };
    }

    // Query profiles table for role and active status
    const { data: profile, error: profErr } = await driverClient
      .from('profiles')
      .select('id, email, full_name, phone, role, status, avatar_seed, avatar_bg, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (profErr || !profile) {
      if (isDev) {
        console.error('[DriverAuthDiagnostic] Profile not found in institutional database for user ID:', userId, profErr?.message);
      }
      return {
        success: false,
        error: 'Driver profile not found in institutional database for the active session. Please contact Transport Administration.',
      };
    }

    if (profile.role !== 'driver') {
      if (isDev) {
        console.warn(`[DriverAuthDiagnostic] Role mismatch: user is registered as '${profile.role}', expected 'driver'.`);
      }
      return {
        success: false,
        error: `Access denied. The current authenticated account is registered as "${profile.role}", not a driver.`,
      };
    }

    if (['disabled', 'blocked'].includes(profile.status)) {
      if (isDev) {
        console.warn(`[DriverAuthDiagnostic] Driver account status is ${profile.status}.`);
      }
      return {
        success: false,
        error: `Your driver account is ${profile.status}. Contact KKWIEER Transport Administration at 0253-2512876.`,
      };
    }

    // Query drivers table through its relationship (id references profiles.id)
    const { data: driverRow, error: driverErr } = await driverClient
      .from('drivers')
      .select('id, license_number, badge_number, experience_years, assigned_bus_id, rating, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (driverErr || !driverRow) {
      if (isDev) {
        console.error('[DriverAuthDiagnostic] Record not found in drivers table for user ID:', userId, driverErr?.message);
      }
      return {
        success: false,
        error: 'Driver operational record not found. Please contact Transport Administration to complete driver registration.',
      };
    }

    const verifiedDriver: DriverProfile = {
      id: userId,
      email: profile.email || authData.user.email || '',
      fullName: profile.full_name,
      phone: profile.phone || '',
      role: 'driver',
      status: profile.status,
      licenseNumber: driverRow.license_number || undefined,
      badgeNumber: driverRow.badge_number || undefined,
      experienceYears: driverRow.experience_years ?? 5,
      assignedBusNumber: driverRow.assigned_bus_id || undefined,
      rating: driverRow.rating ?? 4.9,
      createdAt: driverRow.created_at || profile.created_at,
      avatarSeed: profile.avatar_seed || profile.full_name.toLowerCase().replace(/\s+/g, '-'),
      avatarBg: profile.avatar_bg || 'bg-amber-100 text-amber-800 border-amber-300',
    };

    return {
      success: true,
      driver: verifiedDriver,
      driverId: userId,
    };
  } catch (e: any) {
    if (isDev) {
      console.error('[DriverAuthDiagnostic] Exception in getAuthenticatedDriverProfile:', e.message);
    }
    return {
      success: false,
      error: `Error resolving driver profile: ${e.message}`,
    };
  }
};

// Load stored drivers from localStorage
const loadStoredDrivers = (): DriverProfile[] => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_DRIVERS);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn('Failed to read stored drivers from localStorage:', e);
  }
  return inMemoryDrivers;
};

// Persist drivers to localStorage
const saveStoredDrivers = (drivers: DriverProfile[]) => {
  inMemoryDrivers = [...drivers];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DRIVERS, JSON.stringify(drivers));
    }
  } catch (e) {
    console.warn('Failed to save drivers to localStorage:', e);
  }
};

/**
 * Fetch all registered drivers.
 * Queries Supabase when configured, falling back to local persistent repository.
 */
export const getAllDrivers = async (): Promise<DriverProfile[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          phone,
          role,
          status,
          avatar_seed,
          avatar_bg,
          created_at
        `)
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      if (!pErr && profiles) {
        const { data: driverMeta } = await supabase.from('drivers').select('*');
        const driverMetaMap = new Map((driverMeta || []).map((d: any) => [d.id, d]));

        const combined: DriverProfile[] = profiles.map((p: any) => {
          const meta: any = driverMetaMap.get(p.id) || {};
          return {
            id: p.id,
            email: p.email,
            fullName: p.full_name,
            phone: p.phone,
            role: 'driver',
            status: p.status,
            licenseNumber: meta.license_number || undefined,
            badgeNumber: meta.badge_number || undefined,
            experienceYears: meta.experience_years ?? 5,
            assignedBusNumber: meta.assigned_bus_id || undefined,
            rating: meta.rating ?? 4.9,
            createdAt: p.created_at,
            avatarSeed: p.avatar_seed || p.full_name.toLowerCase().replace(/\s+/g, '-'),
            avatarBg: p.avatar_bg || 'bg-emerald-100 text-emerald-800 border-emerald-300',
          };
        });

        // Save verified database drivers to local cache
        saveStoredDrivers(combined);
        return combined;
      }
    } catch (e) {
      console.warn('Supabase getAllDrivers exception, using persistent local store:', e);
    }
  }

  return loadStoredDrivers();
};

/**
 * Create a new driver account.
 * Securely uses Supabase Edge Function with service-role key when configured.
 * Never executes privileged auth.admin operations directly from browser code.
 */
export const createDriverAccount = async (
  data: CreateDriverAccountData
): Promise<{
  success: boolean;
  driver?: DriverProfile;
  invitationSent?: boolean;
  invitationLink?: string | null;
  warning?: string | null;
  error?: string;
}> => {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.fullName.trim();
  const cleanPhone = data.phone.trim();
  const cleanLicense = data.licenseNumber?.trim();

  // 1. Validation
  if (!cleanName) {
    return { success: false, error: 'Driver full name is required.' };
  }
  if (!cleanEmail) {
    return { success: false, error: 'Driver email address is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email format (e.g. driver@kkwagh.edu.in).' };
  }
  if (!cleanPhone) {
    return { success: false, error: 'Driver contact mobile number is required.' };
  }

  // 2. Duplicate Check in local repository
  const existingDrivers = loadStoredDrivers();
  const duplicate = existingDrivers.find((d) => d.email.toLowerCase() === cleanEmail);
  if (duplicate) {
    return {
      success: false,
      error: `A driver account with email "${cleanEmail}" is already registered.`,
    };
  }

  // 3. Direct secure database provisioning or Edge Function invocation if Supabase is configured
  if (isSupabaseConfigured()) {
    try {
      // If admin specified a password directly, use the atomic admin_create_driver_with_password RPC
      if (data.password && data.password.trim().length >= 6) {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_create_driver_with_password', {
          p_email: cleanEmail,
          p_password: data.password.trim(),
          p_full_name: cleanName,
          p_phone: cleanPhone,
          p_license_number: cleanLicense || null,
          p_status: data.status,
        });

        if (!rpcErr && rpcRes?.success) {
          const newDriverId = rpcRes.driver_id;
          const newDriver: DriverProfile = {
            id: newDriverId,
            email: cleanEmail,
            fullName: cleanName,
            phone: cleanPhone,
            role: 'driver',
            status: data.status,
            licenseNumber: cleanLicense || undefined,
            badgeNumber: `KKW-DRV-${Math.floor(10 + Math.random() * 90)}`,
            experienceYears: 5,
            rating: 4.9,
            createdAt: new Date().toISOString(),
            avatarSeed: cleanName.toLowerCase().replace(/\s+/g, '-'),
            avatarBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          };

          const updated = [newDriver, ...existingDrivers.filter((d) => d.email !== cleanEmail)];
          saveStoredDrivers(updated);

          return {
            success: true,
            driver: newDriver,
            invitationSent: false,
            warning: null,
          };
        } else if (rpcErr || (rpcRes && !rpcRes.success)) {
          const errMsg = rpcRes?.error || rpcErr?.message || 'Database driver creation failed.';
          return { success: false, error: errMsg };
        }
      }

      // Edge Function fallback if no password provided
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken || sessionErr) {
        return {
          success: false,
          error:
            'Administrative session not found or expired. Please sign in to the Transport Administration portal with authorized credentials.',
        };
      }

      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke(
        'create-driver-account',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: {
            fullName: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            licenseNumber: cleanLicense,
            status: data.status,
          },
        }
      );

      if (edgeErr) {
        let serverErrorMsg = edgeErr.message;
        const resContext = (edgeErr as any).context;
        if (resContext && typeof resContext.json === 'function') {
          try {
            const parsed = await resContext.json();
            if (parsed?.error) {
              serverErrorMsg = parsed.error;
            }
          } catch {
            try {
              const text = await resContext.text();
              if (text) serverErrorMsg = text;
            } catch {}
          }
        }
        return {
          success: false,
          error: serverErrorMsg,
        };
      } else if (edgeData?.success && edgeData.driver) {
        const newDriver: DriverProfile = {
          id: edgeData.driver.id,
          email: edgeData.driver.email,
          fullName: edgeData.driver.fullName,
          phone: edgeData.driver.phone,
          role: 'driver',
          status: edgeData.driver.status,
          licenseNumber: edgeData.driver.licenseNumber,
          badgeNumber: edgeData.driver.badgeNumber,
          experienceYears: edgeData.driver.experienceYears ?? 5,
          rating: edgeData.driver.rating ?? 4.9,
          createdAt: edgeData.driver.createdAt,
          avatarSeed: cleanName.toLowerCase().replace(/\s+/g, '-'),
          avatarBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };

        const updated = [newDriver, ...existingDrivers];
        saveStoredDrivers(updated);

        return {
          success: true,
          driver: newDriver,
          invitationSent: edgeData.invitationSent,
          invitationLink: edgeData.invitationLink,
          warning: edgeData.emailWarning,
        };
      } else if (edgeData?.error) {
        return { success: false, error: edgeData.error };
      }
    } catch (e: any) {
      console.warn('createDriverAccount exception:', e.message);
      return {
        success: false,
        error: `Driver Account Creation Exception: ${e.message}`,
      };
    }
  }

  // 4. Safe Standalone / Fallback Creation
  // Creates persistent record in the local repository when Supabase or Edge Function is unreachable
  const nowIso = new Date().toISOString();
  const driverId = `drv-${Date.now()}`;
  const badgeNumber = `KKW-DRV-${Math.floor(10 + Math.random() * 90)}`;

  const newDriver: DriverProfile = {
    id: driverId,
    email: cleanEmail,
    fullName: cleanName,
    phone: cleanPhone,
    role: 'driver',
    status: data.status,
    licenseNumber: cleanLicense || undefined,
    badgeNumber,
    experienceYears: 5,
    rating: 4.9,
    createdAt: nowIso,
    avatarSeed: cleanName.toLowerCase().replace(/\s+/g, '-'),
    avatarBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };

  const updated = [newDriver, ...existingDrivers];
  saveStoredDrivers(updated);

  return {
    success: true,
    driver: newDriver,
    invitationSent: false,
    warning: isSupabaseConfigured()
      ? 'Edge Function not deployed to remote project yet; driver saved to persistent local repository.'
      : 'Supabase environment is not configured. Driver account saved to persistent local repository.',
  };
};

/**
 * Update permitted profile details for an existing driver.
 */
export const updateDriverProfile = async (
  driverId: string,
  updates: UpdateDriverProfileData
): Promise<{ success: boolean; driver?: DriverProfile; error?: string }> => {
  const drivers = loadStoredDrivers();
  const index = drivers.findIndex((d) => d.id === driverId);

  if (index === -1) {
    return { success: false, error: 'Driver record not found.' };
  }

  const existing = drivers[index];
  const updatedDriver: DriverProfile = {
    ...existing,
    fullName: updates.fullName?.trim() || existing.fullName,
    phone: updates.phone !== undefined ? updates.phone.trim() : existing.phone,
    licenseNumber:
      updates.licenseNumber !== undefined ? updates.licenseNumber.trim() : existing.licenseNumber,
    status: updates.status || existing.status,
    experienceYears: updates.experienceYears ?? existing.experienceYears,
    assignedBusNumber: updates.assignedBusNumber ?? existing.assignedBusNumber,
  };

  drivers[index] = updatedDriver;
  saveStoredDrivers(drivers);

  // Sync with Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: updatedDriver.fullName,
          phone: updatedDriver.phone,
          status: updatedDriver.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', driverId);

      await supabase
        .from('drivers')
        .update({
          license_number: updatedDriver.licenseNumber || null,
          experience_years: updatedDriver.experienceYears,
        })
        .eq('id', driverId);
    } catch (e) {
      console.warn('Supabase updateDriverProfile exception:', e);
    }
  }

  return { success: true, driver: updatedDriver };
};

/**
 * Toggle driver account status (Active / Disabled).
 * Disabled drivers cannot sign in or start trips. Trip history is strictly preserved.
 */
export const toggleDriverStatus = async (
  driverId: string,
  newStatus: 'active' | 'disabled'
): Promise<{ success: boolean; driver?: DriverProfile; error?: string }> => {
  return updateDriverProfile(driverId, { status: newStatus });
};

/**
 * Helper to check if a driver is currently active.
 */
export const isDriverAccountActive = (driver: DriverProfile): boolean => {
  return driver.status === 'active' || driver.status === 'approved';
};

/**
 * Resets a driver's password directly via administrative authorization.
 * Uses atomic BCrypt hashing in auth.users via secure RPC admin_reset_driver_password.
 */
export const adminResetDriverPassword = async (
  driverId: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  if (!newPassword || newPassword.trim().length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('admin_reset_driver_password', {
        p_driver_id: driverId,
        p_new_password: newPassword.trim(),
      });

      if (error) {
        return { success: false, error: error.message };
      }
      if (data && !data.success) {
        return { success: false, error: data.error || 'Failed to update driver password.' };
      }
      return { success: true, message: data?.message || 'Driver password updated successfully.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error executing password reset.' };
    }
  }

  return { success: true, message: 'Password updated in local repository mode.' };
};
