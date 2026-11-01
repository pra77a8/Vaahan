import { supabase, isSupabaseConfigured, getSupabaseClient, PortalRole } from '../lib/supabase';
import {
  StudentRegistrationData,
  StudentProfile,
  DriverProfile,
  AdminProfile,
  UserRole,
} from '../types';
import { OFFICIAL_SHIFTS, OFFICIAL_ROUTES, OFFICIAL_STOPS } from './routeService';
import { computePassStatus } from './razorpayService';

export const COLLEGE_EMAIL_DOMAIN = '@kkwagh.edu.in';
const isDev = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);

export const validateCollegeEmail = (email: string): { isValid: boolean; error?: string } => {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { isValid: false, error: 'Email address is required.' };
  }

  // Basic email pattern check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email format.' };
  }

  // Strict domain enforcement
  if (!trimmed.endsWith(COLLEGE_EMAIL_DOMAIN)) {
    return {
      isValid: false,
      error: `Access restricted. Please use your official institute email ending with ${COLLEGE_EMAIL_DOMAIN} (e.g. pradhangle370125@kkwagh.edu.in). Personal domains like Gmail, Yahoo, or Outlook are not permitted.`,
    };
  }

  return { isValid: true };
};

// =============================================================================
// PERSISTENT REPOSITORY
// Stores real user submissions in localStorage & synchronizes with Supabase.
// No mock/hardcoded students in the actual registration database.
// =============================================================================

const STORAGE_KEY_STUDENTS = 'vaahan_registered_students';
let inMemoryStudents: StudentProfile[] = [];

const loadStoredStudents = (): StudentProfile[] => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn('Failed to read stored students from localStorage:', e);
  }
  return inMemoryStudents;
};

const saveStoredStudents = (students: StudentProfile[]) => {
  inMemoryStudents = [...students];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
    }
  } catch (e) {
    console.warn('Failed to save students to localStorage:', e);
  }
};

export const removeStoredStudentByEmail = (email: string) => {
  const current = loadStoredStudents();
  const filtered = current.filter((s) => s.email.toLowerCase() !== email.trim().toLowerCase());
  saveStoredStudents(filtered);
  REGISTERED_STUDENTS = filtered;
};

let REGISTERED_STUDENTS: StudentProfile[] = loadStoredStudents();

import { getAllDrivers } from './driverService';

// Authorized Administration Directory (Transport Cell Officers)
const AUTHORIZED_ADMINS: AdminProfile[] = [
  {
    id: 'admin-gangurde-01',
    email: 'transport.admin@kkwagh.edu.in',
    fullName: 'Prof. S. R. Gangurde',
    phone: '+91 0253 2512876',
    role: 'admin',
    status: 'approved',
  },
];

// =============================================================================
// FEE RECEIPT STORAGE UTILITY
// =============================================================================

export const uploadFeeReceipt = async (
  studentId: string,
  file: File
): Promise<{ path: string; url?: string; error?: string }> => {
  const fileExt = file.name.split('.').pop() || 'pdf';
  const cleanExt = fileExt.toLowerCase();
  const filePath = `${studentId}/fee_receipt_${Date.now()}.${cleanExt}`;

  let mimeType = file.type || '';
  if (!mimeType || mimeType === 'image/jpg') {
    if (cleanExt === 'pdf') mimeType = 'application/pdf';
    else if (cleanExt === 'jpg' || cleanExt === 'jpeg') mimeType = 'image/jpeg';
    else if (cleanExt === 'png') mimeType = 'image/png';
  }

  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];

  // If Supabase Storage is configured and file has valid allowed MIME, upload to private bucket
  if (isSupabaseConfigured() && allowedMimeTypes.includes(mimeType)) {
    try {
      const { data, error } = await supabase.storage
        .from('fee-receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType,
        });

      if (!error && data) {
        // Generate signed URL valid for 24 hours
        const { data: signedData } = await supabase.storage
          .from('fee-receipts')
          .createSignedUrl(filePath, 86400);

        return { path: filePath, url: signedData?.signedUrl };
      }
    } catch (e: any) {
      console.warn('Supabase storage upload notice:', e?.message || e);
    }
  }

  // Client-side fallback (Base64 data URL) to ensure receipts can always be viewed
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({ path: filePath, url: reader.result as string });
    };
    reader.onerror = () => {
      resolve({ path: filePath, error: 'Could not read receipt file.' });
    };
    reader.readAsDataURL(file);
  });
};

export const getReceiptViewUrl = async (
  storagePath: string,
  fallbackUrl?: string
): Promise<string | undefined> => {
  if (isSupabaseConfigured() && storagePath) {
    try {
      const { data, error } = await supabase.storage
        .from('fee-receipts')
        .createSignedUrl(storagePath, 3600);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (e) {
      console.warn('Error fetching signed receipt url:', e);
    }
  }
  return fallbackUrl;
};

const isUuid = (val: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

async function resolveDbShiftId(shiftId: string): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      if (isUuid(shiftId)) {
        const { data } = await supabase.from('shifts').select('id').eq('id', shiftId).maybeSingle();
        if (data?.id) return data.id;
      }
      const code = shiftId.toLowerCase().includes('general') ? 'GENERAL' : 'MORNING';
      const { data } = await supabase.from('shifts').select('id').eq('code', code).maybeSingle();
      if (data?.id) return data.id;

      const { data: firstShift } = await supabase.from('shifts').select('id').order('start_time').limit(1).maybeSingle();
      if (firstShift?.id) return firstShift.id;
    } catch {}
  }
  return shiftId;
}

async function resolveDbRouteId(routeId: string, shiftDbId?: string): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      if (isUuid(routeId)) {
        const { data } = await supabase.from('routes').select('id').eq('id', routeId).maybeSingle();
        if (data?.id) return data.id;
      }
      const route = OFFICIAL_ROUTES.find((r) => r.id === routeId);
      if (route) {
        let query = supabase.from('routes').select('id').eq('route_number', route.routeNumber);
        if (shiftDbId && isUuid(shiftDbId)) {
          query = query.eq('shift_id', shiftDbId);
        }
        const { data } = await query.maybeSingle();
        if (data?.id) return data.id;
      }
      // Fallback to first active route in shift
      let fallbackQuery = supabase.from('routes').select('id').eq('is_active', true);
      if (shiftDbId && isUuid(shiftDbId)) {
        fallbackQuery = fallbackQuery.eq('shift_id', shiftDbId);
      }
      const { data: defaultRoute } = await fallbackQuery.order('route_number').limit(1).maybeSingle();
      if (defaultRoute?.id) return defaultRoute.id;
    } catch {}
  }
  return routeId;
}

async function resolveDbStopId(stopId: string, routeDbId?: string): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      if (isUuid(stopId)) {
        const { data } = await supabase.from('stops').select('id').eq('id', stopId).maybeSingle();
        if (data?.id) return data.id;
      }
      const stopObj = Object.values(OFFICIAL_STOPS).find((s) => s.id === stopId);
      if (stopObj) {
        const { data } = await supabase.from('stops').select('id').eq('name', stopObj.name).maybeSingle();
        if (data?.id) return data.id;
      }
      // Fallback to first stop on route
      if (routeDbId && isUuid(routeDbId)) {
        const { data: rs } = await supabase
          .from('route_stops')
          .select('stop_id')
          .eq('route_id', routeDbId)
          .order('sequence_number')
          .limit(1)
          .maybeSingle();
        if (rs?.stop_id) return rs.stop_id;
      }
    } catch {}
  }
  return stopId;
}

// =============================================================================
// AUTHENTICATION & REGISTRATION OPERATIONS
// =============================================================================

export const registerStudent = async (
  data: StudentRegistrationData
): Promise<{
  success: boolean;
  student?: StudentProfile;
  error?: string;
  requiresEmailConfirmation?: boolean;
  isRateLimited?: boolean;
}> => {
  // 1. Strict email validation
  const emailCheck = validateCollegeEmail(data.email);
  if (!emailCheck.isValid) {
    return { success: false, error: emailCheck.error };
  }

  // 2. Password check
  if (data.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }
  if (data.password !== data.confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }

  // 3. Required personal and academic fields check
  if (
    !data.fullName.trim() ||
    !data.phone.trim() ||
    !data.prn.trim() ||
    !data.department ||
    !data.academicYear ||
    !data.division
  ) {
    return { success: false, error: 'Please fill in all personal and academic fields.' };
  }

  // 4. Required transportation fields check (Step 3 must not be skipped!)
  if (!data.shiftId || !data.routeId || !data.pickupStopId) {
    return {
      success: false,
      error: 'Please complete Step 3: select your Shift, Route, and designated Pickup Stop.',
    };
  }

  // 5. Preemptive Duplicate Checks against live database
  REGISTERED_STUDENTS = loadStoredStudents();

  if (isSupabaseConfigured()) {
    try {
      // Check PRN collision in live database
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id, prn')
        .eq('prn', data.prn.trim().toUpperCase())
        .maybeSingle();

      if (existingStudent) {
        return {
          success: false,
          error: `A student account with PRN "${data.prn.trim().toUpperCase()}" already exists. Please verify your PRN or contact the Transport Cell.`,
        };
      }

      // Check email collision in live database
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', data.email.trim().toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        return {
          success: false,
          error: 'An account with this college email address already exists. Please log in instead or reset your password.',
        };
      }
    } catch (e) {
      console.warn('Pre-signup database validation notice:', e);
    }

    // When Supabase is configured, purge any stale unverified local storage record
    // for this email so the user can re-register freshly in Supabase.
    const staleIndex = REGISTERED_STUDENTS.findIndex(
      (s) => s.email.toLowerCase() === data.email.toLowerCase()
    );
    if (staleIndex !== -1) {
      REGISTERED_STUDENTS.splice(staleIndex, 1);
      saveStoredStudents(REGISTERED_STUDENTS);
    }
  } else {
    const existingEmail = REGISTERED_STUDENTS.find(
      (s) => s.email.toLowerCase() === data.email.toLowerCase()
    );
    if (existingEmail) {
      return { success: false, error: 'An account with this college email address already exists.' };
    }

    const existingPrn = REGISTERED_STUDENTS.find(
      (s) => s.prn.trim().toUpperCase() === data.prn.trim().toUpperCase()
    );
    if (existingPrn) {
      return {
        success: false,
        error: 'A student account with this PRN already exists. Contact the Transport Cell if this is an error.',
      };
    }
  }

  // 6. Handle Fee Receipt Upload if provided
  let receiptPath = data.feeReceiptPath || '';
  let receiptUrl = data.feeReceiptDataUrl || '';
  let receiptName = data.feeReceiptName || '';
  let receiptSize = data.feeReceiptSize || 0;
  let receiptType = data.feeReceiptType || '';

  const studentId = `std-${Date.now()}`;

  if (data.feeReceiptFile) {
    const uploadRes = await uploadFeeReceipt(studentId, data.feeReceiptFile);
    receiptPath = uploadRes.path;
    receiptUrl = uploadRes.url || receiptUrl;
    receiptName = data.feeReceiptFile.name;
    receiptSize = data.feeReceiptFile.size;
    receiptType = data.feeReceiptFile.type;
  }

  // 7. Look up route & shift details
  const shift = OFFICIAL_SHIFTS.find((s) => s.id === data.shiftId);
  const route = OFFICIAL_ROUTES.find((r) => r.id === data.routeId);
  const routeStop = route?.routeStops.find((rs) => rs.stopId === data.pickupStopId);

  const registrationDate = new Date().toISOString();
  const passExpiryDate = data.passExpiryDate || undefined;
  const passIssueDate = new Date().toISOString().split('T')[0];

  const newStudent: StudentProfile = {
    id: studentId,
    email: data.email.trim().toLowerCase(),
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    role: 'student',
    status: 'pending_approval', // Pending administrator verification
    avatarSeed: data.fullName.toLowerCase().replace(/\s+/g, '-'),
    avatarBg: 'bg-sky-100 text-sky-800 border-sky-300',
    prn: data.prn.trim().toUpperCase(),
    department: data.department,
    academicYear: data.academicYear,
    division: data.division.trim().toUpperCase(),
    gender: 'other',
    registrationDate,
    passExpiryDate,
    passIssueDate,
    passStatus: computePassStatus(passExpiryDate),
    feeReceiptUrl: receiptUrl,
    feeReceiptPath: receiptPath,
    feeReceiptName: receiptName,
    feeReceiptSize: receiptSize,
    feeReceiptType: receiptType,
    transport: {
      shiftId: data.shiftId,
      routeId: data.routeId,
      pickupStopId: data.pickupStopId,
      shiftName: shift?.name || 'Assigned Shift',
      routeName: route?.name || 'Assigned Route',
      routeNumber: route?.routeNumber || 'ROUTE',
      pickupStopName: routeStop?.stop.name || 'Selected Stop',
      pickupTime: routeStop?.morningPickupTime || '07:30 AM',
      status: 'pending_approval',
      passExpiryDate,
      passIssueDate,
      feeReceiptUrl: receiptUrl,
      feeReceiptPath: receiptPath,
      feeReceiptName: receiptName,
      feeReceiptSize: receiptSize,
      feeReceiptType: receiptType,
    },
  };

  // 8. If Supabase is configured, enforce live database execution via atomic trigger
  if (isSupabaseConfigured()) {
    try {
      // Resolve real UUIDs for relational foreign keys
      const shiftDbId = await resolveDbShiftId(data.shiftId);
      const routeDbId = await resolveDbRouteId(data.routeId, shiftDbId);
      const stopDbId = await resolveDbStopId(data.pickupStopId, routeDbId);

      // Ensure pass_expiry_date is strictly a valid YYYY-MM-DD or null
      let sanitizedExpiryDate: string | null = null;
      if (data.passExpiryDate && /^\d{4}-\d{2}-\d{2}$/.test(data.passExpiryDate.trim())) {
        sanitizedExpiryDate = data.passExpiryDate.trim();
      }

      const client = getSupabaseClient('student');
      const { data: authData, error: authErr } = await client.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          data: {
            full_name: data.fullName.trim(),
            phone: data.phone.trim(),
            role: 'student',
            prn: data.prn.trim().toUpperCase(),
            department: data.department,
            academic_year: data.academicYear,
            division: data.division.trim().toUpperCase(),
            gender: data.gender || 'other',
            shift_id: shiftDbId,
            route_id: routeDbId,
            pickup_stop_id: stopDbId,
            pass_expiry_date: sanitizedExpiryDate,
            fee_receipt_path: receiptPath,
            fee_receipt_name: receiptName,
            fee_receipt_size: receiptSize,
            fee_receipt_type: receiptType,
          },
        },
      });

      if (authErr) {
        let cleanMsg = authErr.message;
        const isRateLimit =
          authErr.status === 429 ||
          cleanMsg.toLowerCase().includes('rate limit') ||
          (authErr as any).code === 'over_email_send_rate_limit';

        if (isRateLimit) {
          return {
            success: false,
            error:
              'Institutional Rate Limit Reached: Supabase Auth restricts the hourly rate of verification emails sent. Please wait a few minutes before submitting again, or contact the Transport Cell for immediate account activation.',
            isRateLimited: true,
          };
        }

        if (cleanMsg.toLowerCase().includes('already registered')) {
          cleanMsg = 'An account with this college email address already exists. Please log in instead.';
        }
        return {
          success: false,
          error: `Supabase Authentication Error: ${cleanMsg}`,
        };
      }

      // If user already exists, Supabase returns identities: [] when email confirmation is active
      if (authData?.user?.identities && authData.user.identities.length === 0) {
        return {
          success: false,
          error: 'An account with this college email address already exists. Please sign in or use the password recovery option.',
        };
      }

      if (!authData?.user) {
        return {
          success: false,
          error: 'Supabase Auth did not return a user record. Please try again.',
        };
      }

      newStudent.id = authData.user.id;

      // Note: Database trigger handle_new_user_role_safety() creates public.profiles,
      // public.students, and public.student_transport atomically with SECURITY DEFINER
      // privileges. No unauthenticated client-side table inserts are attempted.

      const isConfirmed = Boolean(authData.session || authData.user.email_confirmed_at);

      // Cache locally after verified database commit
      REGISTERED_STUDENTS.push(newStudent);
      saveStoredStudents(REGISTERED_STUDENTS);

      return {
        success: true,
        student: newStudent,
        requiresEmailConfirmation: !isConfirmed,
      };
    } catch (e: any) {
      return {
        success: false,
        error: `Database Sync Exception: ${e.message}`,
      };
    }
  }

  // Safe offline fallback (only active when Supabase environment variables are missing)
  REGISTERED_STUDENTS.push(newStudent);
  saveStoredStudents(REGISTERED_STUDENTS);
  return { success: true, student: newStudent, requiresEmailConfirmation: false };
};

export const authenticateUser = async (
  email: string,
  _password: string,
  expectedRole: UserRole
): Promise<{
  success: boolean;
  profile?: StudentProfile | DriverProfile | AdminProfile;
  error?: string;
}> => {
  const trimmedEmail = email.trim().toLowerCase();
  const portal = expectedRole as PortalRole;
  const client = getSupabaseClient(portal);

  // If Supabase is connected, authenticate strictly through Supabase Auth using the portal client
  if (isSupabaseConfigured()) {
    try {
      // Clear any prior active session for THIS role before signing into a new account
      try {
        await client.auth.signOut();
      } catch {
        // Ignore signout cleanup errors
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: trimmedEmail,
        password: _password,
      });

      if (error) {
        let cleanMsg = error.message;
        if (cleanMsg.toLowerCase().includes('invalid login credentials')) {
          cleanMsg = 'Invalid email or password. Please verify your credentials.';
        } else if (cleanMsg.toLowerCase().includes('email not confirmed')) {
          cleanMsg = 'Your college email address has not been verified yet. Please check your inbox.';
        }
        if (isDev) {
          console.warn(`[AuthDiagnostic] Supabase signInWithPassword failed for ${trimmedEmail} (expected: ${expectedRole}):`, error.message);
        }
        return {
          success: false,
          error: `Authentication Error: ${cleanMsg}`,
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Authentication failed: No user session returned by the authentication server.',
        };
      }

      const { data: profile, error: profErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profErr || !profile) {
        await client.auth.signOut().catch(() => {});
        if (isDev) {
          console.error(`[AuthDiagnostic] Profile not found in institutional database for user ${data.user.id}:`, profErr?.message);
        }
        return {
          success: false,
          error: 'Account profile not found in institutional database. Please contact Transport Administration.',
        };
      }

      if (profile.role !== expectedRole) {
        await client.auth.signOut().catch(() => {});
        if (isDev) {
          console.warn(`[AuthDiagnostic] Portal role mismatch: account is registered as '${profile.role}', but login expected '${expectedRole}'.`);
        }
        return {
          success: false,
          error: `Access restricted. This account is registered as a ${profile.role}, not an ${expectedRole}. Please use the correct portal.`,
        };
      }

      if (profile.role === 'driver' && ['disabled', 'blocked'].includes(profile.status)) {
        await client.auth.signOut().catch(() => {});
        return {
          success: false,
          error:
            'Your driver account has been disabled by the Transport Administration. Please contact the Transport Cell for assistance.',
        };
      }

      if (expectedRole === 'admin') {
        const adminProf: AdminProfile = {
          id: data.user.id,
          email: data.user.email || trimmedEmail,
          fullName: profile?.full_name || 'Prof. S. R. Gangurde',
          phone: profile?.phone || '+91 0253 2512876',
          role: 'admin',
          status: profile?.status === 'approved' ? 'approved' : 'pending_approval',
        };
        return { success: true, profile: adminProf };
      }

      if (expectedRole === 'student') {
        const { data: studentDb, error: stuErr } = await client
          .from('students')
          .select(`
            id,
            prn,
            department,
            academic_year,
            division,
            gender,
            approval_status,
            registration_date,
            fee_receipt_path,
            fee_receipt_name,
            fee_receipt_size,
            fee_receipt_type,
            student_transport (
              shift_id,
              route_id,
              pickup_stop_id,
              status,
              pass_expiry_date,
              pass_issue_date,
              shifts ( id, name ),
              routes ( id, name, route_number ),
              stops ( id, name )
            )
          `)
          .eq('id', data.user.id)
          .maybeSingle();

        if (stuErr || !studentDb) {
          await client.auth.signOut().catch(() => {});
          return {
            success: false,
            error: 'Student academic record not found in institutional database. Please complete registration first.',
          };
        }

        const tr = Array.isArray(studentDb.student_transport)
          ? studentDb.student_transport[0]
          : studentDb.student_transport;
        const fullStudent: StudentProfile = {
          id: data.user.id,
          email: data.user.email || trimmedEmail,
          fullName: profile?.full_name || 'Student',
          phone: profile?.phone || '',
          role: 'student',
          status: profile?.status || studentDb.approval_status || 'pending_approval',
          avatarSeed: profile?.avatar_seed || 'student',
          avatarBg: profile?.avatar_bg || 'bg-sky-100 text-sky-800 border-sky-300',
          prn: studentDb.prn,
          department: studentDb.department,
          academicYear: studentDb.academic_year,
          division: studentDb.division,
          gender: studentDb.gender || 'other',
          registrationDate: studentDb.registration_date,
          passExpiryDate: tr?.pass_expiry_date || undefined,
          passIssueDate: tr?.pass_issue_date || undefined,
          passStatus: computePassStatus(tr?.pass_expiry_date),
          feeReceiptPath: studentDb.fee_receipt_path,
          feeReceiptName: studentDb.fee_receipt_name,
          feeReceiptSize: studentDb.fee_receipt_size,
          feeReceiptType: studentDb.fee_receipt_type,
          transport: tr
            ? {
                shiftId: tr.shift_id,
                routeId: tr.route_id,
                pickupStopId: tr.pickup_stop_id,
                shiftName: (tr.shifts as any)?.name || 'Morning Shift',
                routeName: (tr.routes as any)?.name || 'Assigned Route',
                routeNumber: (tr.routes as any)?.route_number || 'ROUTE',
                pickupStopName: (tr.stops as any)?.name || 'Designated Stop',
                pickupTime: '07:30 AM',
                status: tr.status || 'pending_approval',
                passExpiryDate: tr?.pass_expiry_date || undefined,
                passIssueDate: tr?.pass_issue_date || undefined,
              }
            : undefined,
        };
        return { success: true, profile: fullStudent };
      }

      if (expectedRole === 'driver') {
        const { data: driverDb, error: drvErr } = await client
          .from('drivers')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (drvErr || !driverDb) {
          await client.auth.signOut().catch(() => {});
          return {
            success: false,
            error:
              'Driver operational record not found in institutional database. Please contact Transport Administration to complete onboarding.',
          };
        }

        const driverProf: DriverProfile = {
          id: data.user.id,
          email: data.user.email || trimmedEmail,
          fullName: profile?.full_name || 'Driver',
          phone: profile?.phone || '',
          role: 'driver',
          status: profile?.status || 'active',
          licenseNumber: driverDb?.license_number,
          badgeNumber: driverDb?.badge_number,
          experienceYears: driverDb?.experience_years ?? 5,
          assignedBusNumber: driverDb?.assigned_bus_id,
          rating: driverDb?.rating ?? 4.9,
          createdAt: profile?.created_at,
          avatarSeed: profile?.avatar_seed || profile?.full_name?.toLowerCase().replace(/\s+/g, '-') || 'driver',
          avatarBg: profile?.avatar_bg || 'bg-amber-100 text-amber-800 border-amber-300',
        };
        return { success: true, profile: driverProf };
      }
    } catch (e: any) {
      if (isDev) {
        console.error('[AuthDiagnostic] Supabase authenticateUser exception:', e.message);
      }
      return {
        success: false,
        error: `Authentication Service Error: ${e.message}`,
      };
    }
  }

  // Safe offline fallback (ONLY active when Supabase environment variables are missing completely)
  if (expectedRole === 'student') {
    REGISTERED_STUDENTS = loadStoredStudents();
    const student = REGISTERED_STUDENTS.find((s) => s.email.toLowerCase() === trimmedEmail);
    if (!student) {
      return {
        success: false,
        error: 'No student account found with this college email. Please create an account first.',
      };
    }
    return { success: true, profile: student };
  }

  if (expectedRole === 'driver') {
    const drivers = await getAllDrivers();
    const driver = drivers.find((d) => d.email.toLowerCase() === trimmedEmail);
    if (!driver) {
      return {
        success: false,
        error:
          'Driver account not found. Driver accounts must be created or invited by the Transport Administration at /management-vaahan. Public registration is not permitted.',
      };
    }
    if (driver.status === 'disabled' || driver.status === 'blocked') {
      return {
        success: false,
        error:
          'Your driver account has been disabled by the Transport Administration. Please contact the Transport Cell for assistance.',
      };
    }
    return { success: true, profile: driver };
  }

  if (expectedRole === 'admin') {
    const admin = AUTHORIZED_ADMINS.find((a) => a.email.toLowerCase() === trimmedEmail);
    if (!admin) {
      return {
        success: false,
        error:
          'Administrator account not found. Only authorized KKWIEER Transport Cell officers can access this portal.',
      };
    }
    return { success: true, profile: admin };
  }

  return { success: false, error: 'Invalid portal role.' };
};

export const getPendingStudents = (): StudentProfile[] => {
  REGISTERED_STUDENTS = loadStoredStudents();
  return REGISTERED_STUDENTS.filter((s) => s.status === 'pending_approval');
};

export const getAllRegisteredStudents = (): StudentProfile[] => {
  REGISTERED_STUDENTS = loadStoredStudents();
  return [...REGISTERED_STUDENTS];
};

export const fetchAllRegisteredStudents = async (): Promise<StudentProfile[]> => {
  const localList = loadStoredStudents();
  if (!isSupabaseConfigured()) {
    return localList;
  }

  try {
    const { data: dbStudents, error } = await supabase
      .from('students')
      .select(`
        id,
        prn,
        department,
        academic_year,
        division,
        gender,
        fee_receipt_path,
        fee_receipt_name,
        fee_receipt_size,
        fee_receipt_type,
        registration_date,
        approval_status,
        profiles!inner ( id, email, full_name, phone, role, status, avatar_seed, avatar_bg ),
        student_transport (
          shift_id,
          route_id,
          pickup_stop_id,
          status,
          pass_expiry_date,
          pass_issue_date,
          fee_receipt_path,
          fee_receipt_name,
          fee_receipt_size,
          fee_receipt_type,
          shifts ( id, name ),
          routes ( id, name, route_number ),
          stops ( id, name )
        )
      `);

    if (!error && dbStudents && dbStudents.length > 0) {
      const mapped: StudentProfile[] = dbStudents.map((row: any) => {
        const prof = row.profiles || {};
        const tr = Array.isArray(row.student_transport) ? row.student_transport[0] : row.student_transport;
        return {
          id: row.id,
          email: prof.email || '',
          fullName: prof.full_name || 'Student',
          phone: prof.phone || '',
          role: 'student',
          status: prof.status || row.approval_status || 'pending_approval',
          avatarSeed: prof.avatar_seed || 'student',
          avatarBg: prof.avatar_bg || 'bg-sky-100 text-sky-800 border-sky-300',
          prn: row.prn,
          department: row.department,
          academicYear: row.academic_year,
          division: row.division,
          gender: row.gender || 'other',
          registrationDate: row.registration_date,
          passExpiryDate: tr?.pass_expiry_date || undefined,
          passIssueDate: tr?.pass_issue_date || undefined,
          passStatus: computePassStatus(tr?.pass_expiry_date),
          feeReceiptPath: row.fee_receipt_path,
          feeReceiptName: row.fee_receipt_name,
          feeReceiptSize: row.fee_receipt_size,
          feeReceiptType: row.fee_receipt_type,
          transport: tr
            ? {
                shiftId: tr.shift_id,
                routeId: tr.route_id,
                pickupStopId: tr.pickup_stop_id,
                shiftName: tr.shifts?.name || 'Morning Shift',
                routeName: tr.routes?.name || 'Assigned Route',
                routeNumber: tr.routes?.route_number || 'ROUTE',
                pickupStopName: tr.stops?.name || 'Designated Stop',
                pickupTime: '07:30 AM',
                status: tr.status || 'pending_approval',
                passExpiryDate: tr?.pass_expiry_date || undefined,
                passIssueDate: tr?.pass_issue_date || undefined,
                feeReceiptPath: tr.fee_receipt_path,
                feeReceiptName: tr.fee_receipt_name,
                feeReceiptSize: tr.fee_receipt_size,
                feeReceiptType: tr.fee_receipt_type,
              }
            : undefined,
        };
      });

      // Merge with local list (avoiding duplicates)
      const mergedMap = new Map<string, StudentProfile>();
      localList.forEach((s) => mergedMap.set(s.id, s));
      mapped.forEach((s) => mergedMap.set(s.id, s));
      return Array.from(mergedMap.values());
    }
  } catch (e: any) {
    console.warn('Error fetching live students from Supabase:', e.message);
  }

  return localList;
};

export const approveStudentRegistration = async (studentId: string): Promise<boolean> => {
  let isDbSuccess = false;

  // 1. Sync with Supabase first using RPC admin_approve_student or direct tables update
  if (isSupabaseConfigured()) {
    try {
      // First try the secure RPC which also auto-confirms email in auth.users
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_approve_student', {
        p_student_id: studentId,
      });

      if (!rpcErr && rpcRes?.success) {
        isDbSuccess = true;
      } else {
        // Fallback direct updates if RPC is not available or encounters error
        await supabase
          .from('profiles')
          .update({ status: 'approved' })
          .eq('id', studentId);

        await supabase
          .from('students')
          .update({ approval_status: 'approved' })
          .eq('id', studentId);

        await supabase
          .from('student_transport')
          .update({ status: 'approved' })
          .eq('student_id', studentId);

        isDbSuccess = true;
      }
    } catch (e: any) {
      console.warn('Supabase approval sync error:', e.message);
    }
  }

  // 2. Also update local storage if present in cache
  REGISTERED_STUDENTS = loadStoredStudents();
  const student = REGISTERED_STUDENTS.find((s) => s.id === studentId);
  if (student) {
    student.status = 'approved';
    if (student.transport) {
      student.transport.status = 'approved';
    }
    saveStoredStudents(REGISTERED_STUDENTS);
    return true;
  }

  return isDbSuccess;
};




export const rejectStudentRegistration = async (
  studentId: string,
  reason?: string
): Promise<boolean> => {
  let isDbSuccess = false;

  // 1. Sync with Supabase first using RPC admin_reject_student or direct tables update
  if (isSupabaseConfigured()) {
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_reject_student', {
        p_student_id: studentId,
        p_reason: reason || 'Application rejected by administrator',
      });

      if (!rpcErr && rpcRes?.success) {
        isDbSuccess = true;
      } else {
        await supabase
          .from('profiles')
          .update({ status: 'rejected' })
          .eq('id', studentId);

        await supabase
          .from('students')
          .update({ approval_status: 'rejected' })
          .eq('id', studentId);

        await supabase
          .from('student_transport')
          .update({
            status: 'rejected',
            rejection_reason: reason || 'Application rejected by administrator',
          })
          .eq('student_id', studentId);

        isDbSuccess = true;
      }
    } catch (e: any) {
      console.warn('Supabase rejection sync error:', e.message);
    }
  }

  // 2. Also update local storage if present in cache
  REGISTERED_STUDENTS = loadStoredStudents();
  const student = REGISTERED_STUDENTS.find((s) => s.id === studentId);
  if (student) {
    student.status = 'rejected';
    if (student.transport) {
      student.transport.status = 'rejected';
    }
    saveStoredStudents(REGISTERED_STUDENTS);
    return true;
  }

  return isDbSuccess;
};

/**
 * Dispatches an official password recovery link to the user's registered institutional email.
 * Powered by Supabase Auth with automatic portal routing.
 */
export const requestPasswordReset = async (
  email: string,
  role?: UserRole
): Promise<{ success: boolean; message?: string; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid institute email address.' };
  }

  if (isSupabaseConfigured()) {
    try {
      const portal = (role || 'student') as PortalRole;
      const client = getSupabaseClient(portal);
      const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectPath = portal === 'admin' ? '/management-vaahan' : portal === 'driver' ? '/management-driver' : '/';
      
      const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${redirectOrigin}${redirectPath}`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: `Password reset instructions have been dispatched to ${cleanEmail}. Please check your inbox and spam folder.`,
      };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to dispatch reset request.' };
    }
  }

  return {
    success: true,
    message: `Password recovery request received for ${cleanEmail}. Please contact KKWIEER Transport Administration at 0253-2512876 for manual credential assistance.`,
  };
};




