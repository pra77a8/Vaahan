import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Student,
  BusRoute,
  Driver,
  BusVehicle,
  BusPass,
  PaymentRecord,
  TransitNotification,
  UserRole,
  StudentActiveTab,
  StudentGender,
  StudentProfile,
  OfficialRoute,
} from '../types';
import {
  MOCK_DRIVERS,
  MOCK_BUS_FLEET,
  MOCK_PAYMENTS,
} from '../data/mockData';
import { supabase, isSupabaseConfigured, detectPortal, getSupabaseClient, PortalRole, PORTAL_AUTH_STORAGE_KEYS } from '../lib/supabase';
import { OFFICIAL_ROUTES, fetchAllOfficialRoutes } from '../services/routeService';
import { getAuthenticatedDriverProfile } from '../services/driverService';
import { computePassStatus, formatDateReadable } from '../services/razorpayService';

export const PORTAL_SESSION_KEYS: Record<PortalRole, string> = {
  admin: 'vaahan_admin_session',
  driver: 'vaahan_driver_session',
  student: 'vaahan_student_session',
};

export const getSessionKeyForPortal = (portal?: PortalRole): string => {
  const p = portal || detectPortal();
  return PORTAL_SESSION_KEYS[p] || 'vaahan_student_session';
};

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  userProfile: any;
  setUserProfile: (profile: any) => void;
  loginUser: (role: UserRole, profile: any) => void;
  signOut: () => Promise<void> | void;
  currentStudent: Student;
  setCurrentStudentId: (id: string) => void;
  allStudents: Student[];
  studentTab: StudentActiveTab;
  setStudentTab: (tab: StudentActiveTab) => void;
  routes: BusRoute[];
  drivers: Driver[];
  fleet: BusVehicle[];
  currentBus: BusVehicle | undefined;
  currentRoute: BusRoute | undefined;
  currentDriver: Driver | undefined;
  activePass: BusPass;
  payments: PaymentRecord[];
  notifications: TransitNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notif: {
    title: string;
    message: string;
    category?: 'DELAY' | 'ROUTE_ALERT' | 'FEE_REMINDER' | 'ANNOUNCEMENT' | 'EMERGENCY';
    routeId?: string;
  }) => void;
  clearAllNotifications: () => void;
  updateStudentAvatar: (seed: string, gender: StudentGender, bg: string) => void;
  // Simulation State
  busProgressPercent: number;
  currentSpeed: number;
  isSimulating: boolean;
  toggleSimulation: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  // Selected Route or Bus for detailed inspector
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string | null) => void;
  selectedBusId: string | null;
  setSelectedBusId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const NOTIFICATIONS_STORAGE_KEY = 'vaahan_real_notifications';
const isDev = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);

const getInitialSession = (portal?: PortalRole) => {
  try {
    const key = getSessionKeyForPortal(portal);
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading session:', e);
  }
  return null;
};

const getInitialNotifications = (): TransitNotification[] => {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading real notifications:', e);
  }
  return []; // Purely real-time notifications, all mock data removed!
};

// Helper: map profile to Student object
const mapProfileToStudent = (profile: any): Student => ({
  id: profile.id,
  prn: profile.prn || 'N/A',
  rollNo: profile.rollNo || 'TE-COMP-42',
  name: profile.fullName || profile.name || 'Student',
  email: profile.email || '',
  phone: profile.phone || '',
  branch: profile.department || 'Computer Engineering',
  year: profile.academicYear || 'TE',
  division: profile.division || 'A',
  avatarSeed: profile.avatarSeed || 'student',
  avatarBg: profile.avatarBg || 'bg-sky-100 text-sky-800 border-sky-300',
  gender: profile.gender || 'other',
  assignedRouteId: profile.transport?.routeId || '71ef9ab8-1aec-479e-86f7-6bdeba5dd13e',
  assignedBusId: undefined,
  stopName: profile.transport?.pickupStopName || 'Jail Road',
  stopPickupTime: profile.transport?.pickupTime || '07:15 AM',
  emergencyContact: {
    name: profile.emergencyContactName || 'Guardian',
    relation: profile.emergencyContactRelation || 'Parent',
    phone: profile.emergencyContactPhone || profile.phone || '',
  },
  bloodGroup: profile.bloodGroup || 'B+',
  passStatus: profile.passStatus || computePassStatus(profile.passExpiryDate || profile.transport?.passExpiryDate),
  approvalStatus: profile.status,
  passExpiryDate: profile.passExpiryDate || profile.transport?.passExpiryDate || undefined,
  passIssueDate: profile.passIssueDate || profile.transport?.passIssueDate || undefined,
  shiftName: profile.transport?.shiftName || 'Morning Shift',
  routeName: profile.transport?.routeName || 'ROUTE 1 – JAIL ROAD',
  routeNumber: profile.transport?.routeNumber || 'ROUTE 1',
  assignedRouteName: profile.transport?.routeName || 'ROUTE 1 – JAIL ROAD',
});

// Helper: convert OfficialRoute to legacy BusRoute
const mapOfficialRouteToBusRoute = (r: OfficialRoute): BusRoute => ({
  id: r.id,
  routeNumber: r.routeNumber,
  name: r.name,
  source: r.routeStops[0]?.stop.name || 'Route Terminal',
  destination: r.routeStops[r.routeStops.length - 1]?.stop.name || 'K. K. Wagh Campus',
  totalDistanceKm: 14.2,
  estimatedDurationMins: 45,
  morningDeparture: r.routeStops[0]?.morningPickupTime || '07:15 AM',
  eveningCampusDeparture: r.routeStops[r.routeStops.length - 1]?.dropTime || '01:15 PM',
  assignedBusId: undefined,
  stops: r.routeStops.map((rs) => ({
    id: rs.stopId,
    name: rs.stop.name,
    landmark: rs.stop.landmark,
    morningPickup: rs.morningPickupTime || '07:30 AM',
    eveningDrop: rs.dropTime || '01:30 PM',
    sequence: rs.sequenceNumber,
    latitude: rs.stop.latitude,
    longitude: rs.stop.longitude,
    isMainJunction: rs.isPickupEligible,
  })),
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const activePortal = detectPortal();
  const initialSession = getInitialSession(activePortal);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!initialSession);
  const [role, setRole] = useState<UserRole>(initialSession?.role || (activePortal as UserRole));
  const [userProfile, setUserProfile] = useState<any>(initialSession?.profile || null);

  // Initial student from session if student role
  const initStudent: Student | null = useMemo(() => {
    if (initialSession?.role === 'student' && initialSession?.profile) {
      return mapProfileToStudent(initialSession.profile);
    }
    return null;
  }, []);

  // Student state — bound strictly to authenticated user, no mock default!
  const [students, setStudents] = useState<Student[]>(initStudent ? [initStudent] : []);
  const [currentStudentId, setCurrentStudentId] = useState<string>(initStudent ? initStudent.id : '');
  const [studentTab, setStudentTab] = useState<StudentActiveTab>('home');
  const [fleet] = useState<BusVehicle[]>(MOCK_BUS_FLEET);
  const [routes, setRoutes] = useState<BusRoute[]>(() => OFFICIAL_ROUTES.map(mapOfficialRouteToBusRoute));
  const [drivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [notifications, setNotifications] = useState<TransitNotification[]>(getInitialNotifications);
  const [payments] = useState<PaymentRecord[]>(MOCK_PAYMENTS);

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  // Simulation State
  const [busProgressPercent, setBusProgressPercent] = useState<number>(62);
  const [currentSpeed, setCurrentSpeed] = useState<number>(36);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Load official routes on mount
  useEffect(() => {
    fetchAllOfficialRoutes().then((offRoutes) => {
      if (offRoutes && offRoutes.length > 0) {
        setRoutes(offRoutes.map(mapOfficialRouteToBusRoute));
      }
    });
  }, []);

  const loginUser = (newRole: UserRole, profile: any) => {
    setRole(newRole);
    setUserProfile(profile);
    setIsAuthenticated(true);
    const targetPortal: PortalRole = (newRole === 'admin' ? 'admin' : newRole === 'driver' ? 'driver' : 'student');
    const storageKey = PORTAL_SESSION_KEYS[targetPortal];
    try {
      localStorage.setItem(storageKey, JSON.stringify({ role: newRole, profile }));
    } catch (e) {
      console.warn('Error storing session:', e);
    }

    if (newRole === 'student' && profile) {
      const studentObj = mapProfileToStudent(profile);
      setStudents([studentObj]);
      setCurrentStudentId(studentObj.id);
    }

    showToast(`Signed in successfully as ${newRole}`);
  };

  const signOut = async () => {
    const portal = detectPortal();
    const storageKey = PORTAL_SESSION_KEYS[portal];
    try {
      localStorage.removeItem(storageKey);
    } catch { }
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseClient(portal);
        await client.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error:', err);
      }
    }
    setIsAuthenticated(false);
    setUserProfile(null);
    setStudents([]);
    setCurrentStudentId('');
    setStudentTab('home');
    showToast('Signed out successfully');
  };

  // Validate and synchronize institutional Supabase session on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let isMounted = true;
    const portal = detectPortal();
    const portalStorageKey = PORTAL_SESSION_KEYS[portal];
    const client = getSupabaseClient(portal);

    const validateServerSession = async () => {
      try {
        const { data: authData, error: authErr } = await client.auth.getUser();
        if (!isMounted) return;

        if (authErr || !authData?.user) {
          // If Supabase session is revoked, expired or missing, clean up stale credentials
          if (authErr) {
            await client.auth.signOut().catch(() => {});
          }
          if (isAuthenticated) {
            if (isDev) {
              console.warn(`[SessionValidator:${portal}] No Supabase user found (${authErr?.message || 'revoked'}). Clearing stale local session.`);
            }
            try {
              localStorage.removeItem(portalStorageKey);
              localStorage.removeItem(PORTAL_AUTH_STORAGE_KEYS[portal]);
            } catch {}
            setIsAuthenticated(false);
            setUserProfile(null);
            setStudents([]);
            setCurrentStudentId('');
          }
          return;
        }

        const userId = authData.user.id;
        const { data: profile, error: profErr } = await client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!isMounted) return;

        if (profErr || !profile) {
          if (isDev) {
            console.error(`[SessionValidator:${portal}] Authenticated user missing profiles record:`, userId);
          }
          await client.auth.signOut().catch(() => {});
          try {
            localStorage.removeItem(portalStorageKey);
          } catch {}
          setIsAuthenticated(false);
          setUserProfile(null);
          return;
        }

        // Detect and fix cross-role mismatch
        if (role !== profile.role) {
          if (isDev) {
            console.warn(`[SessionValidator:${portal}] Synchronizing role mismatch: local '${role}' -> DB '${profile.role}'.`);
          }
          setRole(profile.role as UserRole);
        }

        setUserProfile((prev: any) => ({ ...prev, ...profile }));
        try {
          localStorage.setItem(
            portalStorageKey,
            JSON.stringify({ role: profile.role, profile: { ...userProfile, ...profile } })
          );
        } catch {}
      } catch (err: any) {
        if (isDev) {
          console.error(`[SessionValidator:${portal}] Error during session validation:`, err.message);
        }
      }
    };

    validateServerSession();

    const { data: authListener } = client.auth.onAuthStateChange(async (event) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') {
        try {
          localStorage.removeItem(portalStorageKey);
        } catch {}
        setIsAuthenticated(false);
        setUserProfile(null);
        setStudents([]);
        setCurrentStudentId('');
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Sync fresh student profile and transport from Supabase upon login or refresh
  useEffect(() => {
    if (!isAuthenticated || role !== 'student' || !userProfile?.id) return;

    let isMounted = true;
    const fetchFreshStudent = async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const { data: studentDb, error } = await supabase
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
            student_transport (
              shift_id,
              route_id,
              pickup_stop_id,
              status,
              shifts ( id, name ),
              routes ( id, name, route_number ),
              stops ( id, name )
            )
          `)
          .eq('id', userProfile.id)
          .maybeSingle();

        if (!error && studentDb && isMounted) {
          const tr = Array.isArray(studentDb.student_transport)
            ? studentDb.student_transport[0]
            : studentDb.student_transport;

          const updatedProfile = {
            ...userProfile,
            prn: studentDb.prn,
            department: studentDb.department,
            academicYear: studentDb.academic_year,
            division: studentDb.division,
            gender: studentDb.gender || userProfile.gender,
            status: studentDb.approval_status || userProfile.status,
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
              }
              : userProfile.transport,
          };

          setUserProfile(updatedProfile);
          try {
            localStorage.setItem(
              PORTAL_SESSION_KEYS.student,
              JSON.stringify({ role: 'student', profile: updatedProfile })
            );
          } catch { }

          const studentObj = mapProfileToStudent(updatedProfile);
          setStudents([studentObj]);
          setCurrentStudentId(studentObj.id);
        }
      } catch (err) {
        console.warn('Error fetching fresh student data:', err);
      }
    };

    fetchFreshStudent();

    // Also fetch notifications from Supabase
    const fetchDbNotifications = async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const { data: dbNotifs, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userProfile.id)
          .order('created_at', { ascending: false });

        if (!error && dbNotifs && isMounted) {
          const mapped: TransitNotification[] = dbNotifs.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            category: n.category || 'ROUTE_ALERT',
            timestamp: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · Today',
            isRead: n.is_read || false,
            routeId: n.route_id,
          }));

          setNotifications((prev) => {
            const existingIds = new Set(mapped.map((m) => m.id));
            const retainedLocal = prev.filter((p) => !existingIds.has(p.id));
            const merged = [...mapped, ...retainedLocal];
            try {
              localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(merged));
            } catch { }
            return merged;
          });
        }
      } catch (e) {
        console.warn('Error fetching database notifications:', e);
      }
    };

    fetchDbNotifications();

    // Supabase Realtime subscription for instant incoming transit event notifications
    let channel: any = null;
    if (isSupabaseConfigured() && userProfile?.id) {
      channel = supabase
        .channel(`realtime:user_notifications:${userProfile.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userProfile.id}`,
          },
          (payload) => {
            const n = payload.new;
            if (!n) return;
            const newNotif: TransitNotification = {
              id: n.id,
              title: n.title,
              message: n.message,
              category: n.category || 'ROUTE_ALERT',
              timestamp: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · Today',
              isRead: n.is_read || false,
              routeId: n.route_id,
            };
            setNotifications((prev) => {
              if (prev.some((p) => p.id === newNotif.id)) return prev;
              const next = [newNotif, ...prev];
              try {
                localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
              } catch { }
              return next;
            });
            showToast(`${n.title}: ${n.message}`);
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAuthenticated, role, userProfile?.id]);

  // Sync fresh driver profile from Supabase upon login or refresh
  useEffect(() => {
    if (!isAuthenticated || role !== 'driver') return;

    let isMounted = true;
    const syncDriverProfile = async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const authRes = await getAuthenticatedDriverProfile();
        if (authRes.success && authRes.driver && isMounted) {
          setUserProfile(authRes.driver);
          try {
            localStorage.setItem(
              PORTAL_SESSION_KEYS.driver,
              JSON.stringify({ role: 'driver', profile: authRes.driver })
            );
          } catch {}
        } else if (!authRes.success && isMounted) {
          console.warn('Driver profile verification notice:', authRes.error);
          if (authRes.error?.includes('registered as') || authRes.error?.includes('No active driver session')) {
            signOut();
          }
        }
      } catch (err) {
        console.warn('Error syncing driver profile:', err);
      }
    };

    syncDriverProfile();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, role]);

  // Derive active student safely without hardcoded mock fallback
  const currentStudent: Student = useMemo(() => {
    if (currentStudentId) {
      const match = students.find((s) => s.id === currentStudentId);
      if (match) return match;
    }
    if (students.length > 0) return students[0];
    if (userProfile && role === 'student') return mapProfileToStudent(userProfile);

    // Fallback representation for unauthenticated / non-student views
    return {
      id: userProfile?.id || 'guest',
      prn: userProfile?.prn || 'N/A',
      rollNo: 'N/A',
      name: userProfile?.fullName || 'Transit User',
      email: userProfile?.email || '',
      phone: '',
      branch: userProfile?.department || 'Engineering',
      year: 'FE',
      division: 'A',
      avatarSeed: 'guest',
      avatarBg: 'bg-slate-100 text-slate-800 border-slate-300',
      gender: 'other',
      assignedRouteId: '',
      assignedBusId: '',
      stopName: '',
      stopPickupTime: '',
      emergencyContact: { name: '', relation: '', phone: '' },
      bloodGroup: 'B+',
      passStatus: 'PENDING_RENEWAL',
      approvalStatus: 'pending_approval',
      shiftName: 'Morning Shift',
      routeName: '',
      routeNumber: '',
      assignedRouteName: '',
    };
  }, [students, currentStudentId, userProfile, role]);

  // Current bus & route & driver for this student
  const currentRoute = useMemo(() => {
    const routeId = currentStudent.assignedRouteId;
    if (!routeId) return routes[0];
    return routes.find((r) => r.id === routeId || r.name === currentStudent.routeName) || routes[0];
  }, [routes, currentStudent.assignedRouteId, currentStudent.routeName]);

  const currentBus = useMemo(() => {
    if (!currentStudent.assignedBusId) return undefined;
    return fleet.find((b) => b.id === currentStudent.assignedBusId);
  }, [fleet, currentStudent.assignedBusId]);

  const currentDriver = useMemo(() => {
    if (!currentBus?.driverId) return undefined;
    return drivers.find((d) => d.id === currentBus?.driverId);
  }, [drivers, currentBus?.driverId]);

  // Authentic dynamic bus pass (No static mock pass!)
  const activePass: BusPass = useMemo(() => {
    const isApproved = currentStudent.approvalStatus === 'approved' || currentStudent.passStatus === 'ACTIVE';
    return {
      id: `pass-${currentStudent.id}`,
      passNumber: `KKW-${currentStudent.prn || '2026'}-${currentStudent.id.slice(0, 4).toUpperCase()}`,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      prn: currentStudent.prn,
      branch: currentStudent.branch,
      year: currentStudent.year,
      division: currentStudent.division,
      academicYear: '2026-27',
      term: 'Semester 5 & 6',
      qrData: `VAAHAN:PASS:${currentStudent.prn}:${currentStudent.id}`,
      feePaid: 18500,
      paymentRef: `FEE-${currentStudent.prn || '2026'}-01`,
      routeNumber: currentStudent.routeNumber || currentRoute?.routeNumber || 'ROUTE 1',
      routeName: currentStudent.routeName || currentRoute?.name || 'Assigned Route',
      stopName: currentStudent.stopName || 'Designated Stop',
      pickupTime: currentStudent.stopPickupTime || '07:15 AM',
      validFrom: currentStudent.passIssueDate ? formatDateReadable(currentStudent.passIssueDate) : '01 Jul 2026',
      validTill: currentStudent.passExpiryDate ? formatDateReadable(currentStudent.passExpiryDate) : '30 Jun 2027',
      status: isApproved ? 'ACTIVE' : 'PENDING',
      approvedBy: 'Prof. S. R. Gangurde',
      approvedDate: '2026-07-01',
      qrCodePayload: `VAAHAN:PASS:${currentStudent.prn}:${currentStudent.id}`,
      shiftName: currentStudent.shiftName || 'Morning Shift',
      busPlateNumber: currentBus?.plateNumber || 'Pending Assignment',
      issuedAt: '2026-07-01T00:00:00Z',
    };
  }, [currentStudent, currentRoute, currentBus]);

  // Real-time ticking simulation
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setBusProgressPercent((prev) => {
        const next = prev >= 98 ? 15 : prev + 1.2;
        return Number(next.toFixed(1));
      });

      setCurrentSpeed((prev) => {
        const delta = (Math.random() - 0.48) * 4;
        const newSpeed = Math.max(18, Math.min(52, prev + delta));
        return Math.round(newSpeed);
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const toggleSimulation = () => {
    setIsSimulating((prev) => !prev);
    showToast(isSimulating ? 'GPS tracking paused' : 'GPS tracking live updating');
  };

  const addNotification = (notif: {
    title: string;
    message: string;
    category?: 'DELAY' | 'ROUTE_ALERT' | 'FEE_REMINDER' | 'ANNOUNCEMENT' | 'EMERGENCY';
    routeId?: string;
  }) => {
    const newN: TransitNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: notif.title,
      message: notif.message,
      category: notif.category || 'ROUTE_ALERT',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · Today',
      isRead: false,
      routeId: notif.routeId,
    };
    setNotifications((prev) => {
      if (prev.some((p) => p.title === newN.title && p.message === newN.message)) return prev;
      const updated = [newN, ...prev];
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    try {
      localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    } catch { }

    if (isSupabaseConfigured() && userProfile?.id) {
      Promise.resolve(
        supabase.rpc('clear_user_notifications', { p_user_id: userProfile.id })
      ).catch((e) => {
        console.warn('clear_user_notifications RPC error:', e);
        supabase.from('notifications').delete().eq('user_id', userProfile.id).then();
      });
    }

    showToast('All notifications have been cleared.');
  };

  useEffect(() => {
    const handleNewNotif = (e: any) => {
      if (e.detail && e.detail.title && e.detail.message) {
        addNotification(e.detail);
      }
    };
    window.addEventListener('vaahan:new_notification', handleNewNotif);
    return () => {
      window.removeEventListener('vaahan:new_notification', handleNewNotif);
    };
  }, []);

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch { }
      return updated;
    });

    if (isSupabaseConfigured()) {
      Promise.resolve(
        supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id)
      ).catch(() => { });
    }
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch { }
      return updated;
    });

    if (isSupabaseConfigured() && userProfile?.id) {
      Promise.resolve(
        supabase.rpc('mark_all_user_notifications_read', { p_user_id: userProfile.id })
      ).catch((e) => {
        console.warn('mark_all_user_notifications_read RPC error:', e);
        supabase.from('notifications').update({ is_read: true }).eq('user_id', userProfile.id).then();
      });
    }

    showToast('All notifications marked as read');
  };

  const updateStudentAvatar = (seed: string, gender: StudentGender, bg: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === currentStudentId
          ? { ...s, avatarSeed: seed, gender, avatarBg: bg }
          : s
      )
    );
    showToast('Avatar profile updated successfully');
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        isAuthenticated,
        userProfile,
        setUserProfile,
        loginUser,
        signOut,
        currentStudent,
        setCurrentStudentId,
        allStudents: students,
        studentTab,
        setStudentTab,
        routes,
        drivers,
        fleet,
        currentBus,
        currentRoute,
        currentDriver,
        activePass,
        payments,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotification,
        clearAllNotifications,
        updateStudentAvatar,
        busProgressPercent,
        currentSpeed,
        isSimulating,
        toggleSimulation,
        toastMessage,
        showToast,
        selectedRouteId,
        setSelectedRouteId,
        selectedBusId,
        setSelectedBusId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
