import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Bus,
  Clock,
  Compass,
  AlertCircle,
  Phone,
  Search,
  Filter,
  FileText,
  Download,
  Eye,
  X,
  GraduationCap,
  MapPin,
  Calendar,
  ChevronRight,
  ExternalLink,
  Car,
  Radio,
  AlertOctagon,
  AlertTriangle,
} from 'lucide-react';
import {
  AdminProfile,
  StudentProfile,
  OfficialRoute,
  RouteAssignment,
  Shift,
  BusVehicle,
  DriverProfile,
} from '../../types';
import {
  getAllRegisteredStudents,
  fetchAllRegisteredStudents,
  approveStudentRegistration,
  rejectStudentRegistration,
} from '../../services/authService';
import {
  OFFICIAL_ROUTES,
  fetchAllOfficialRoutes,
  fetchShifts,
  fetchRouteAssignments,
  assignDriverAndBusToRoute,
} from '../../services/routeService';
import { fetchFleetBuses } from '../../services/fleetService';
import { getAllDrivers } from '../../services/driverService';
import { DriverManagementSection } from './DriverManagementSection';
import { FleetOperationsSection } from './FleetOperationsSection';
import { ActiveTripsSection } from './ActiveTripsSection';
import { PassExpiryManagementSection } from './PassExpiryManagementSection';
import { SosAlertsSection } from './SosAlertsSection';
import { getActiveTrips } from '../../services/tripService';
import { fetchActiveSosAlerts, subscribeSosAlerts } from '../../services/sosService';
import { supabase, getSupabaseConfigDiagnostics } from '../../lib/supabase';

export type AdminActiveTab =
  | 'verifications'
  | 'pass-expiry'
  | 'active-trips'
  | 'routes'
  | 'drivers'
  | 'fleet'
  | 'sos-alerts';

interface AdminPortalProps {
  admin: AdminProfile;
  onSignOut: () => void;
  activeSection?: AdminActiveTab;
  onNavigateSection?: (section: AdminActiveTab) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  admin,
  onSignOut,
  activeSection = 'verifications',
  onNavigateSection,
}) => {
  const [activeTab, setActiveTab] = useState<AdminActiveTab>(activeSection);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [routes, setRoutes] = useState<OfficialRoute[]>(OFFICIAL_ROUTES);
  const [activeTripsCount, setActiveTripsCount] = useState<number>(0);
  const [activeSosCount, setActiveSosCount] = useState<number>(0);
  const [unacknowledgedSosCount, setUnacknowledgedSosCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const refreshSosCount = async () => {
      try {
        const activeAlerts = await fetchActiveSosAlerts();
        if (!isMounted) return;
        setActiveSosCount(activeAlerts.length);
        const unack = activeAlerts.filter((a) => a.status === 'ACTIVE').length;
        setUnacknowledgedSosCount(unack);
      } catch (e) {
        console.warn('Error loading SOS counts:', e);
      }
    };

    refreshSosCount();
    const interval = setInterval(refreshSosCount, 4000);
    const unsubscribe = subscribeSosAlerts(() => {
      if (isMounted) refreshSosCount();
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending_approval' | 'approved' | 'rejected'>('ALL');
  const [shiftFilter, setShiftFilter] = useState<string>('ALL');
  const [routeFilter, setRouteFilter] = useState<string>('ALL');

  // Modals
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{
    studentName: string;
    receiptUrl: string;
    receiptName: string;
    receiptType: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Route Assignment & Student Notification State
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [fleetBuses, setFleetBuses] = useState<BusVehicle[]>([]);
  const [driversList, setDriversList] = useState<DriverProfile[]>([]);
  const [routeAssignments, setRouteAssignments] = useState<RouteAssignment[]>([]);

  const [assignShiftId, setAssignShiftId] = useState<string>('');
  const [assignRouteId, setAssignRouteId] = useState<string>('');
  const [assignBusId, setAssignBusId] = useState<string>('');
  const [assignDriverId, setAssignDriverId] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState<boolean>(false);
  const [assignResult, setAssignResult] = useState<{
    success: boolean;
    updated: boolean;
    message?: string;
    notifiedCount?: number;
    driverName?: string;
    busPlate?: string;
    routeName?: string;
  } | null>(null);

  useEffect(() => {
    setActiveTab(activeSection);
  }, [activeSection]);

  const loadData = async () => {
    // Immediate local cache
    setStudents(getAllRegisteredStudents());
    // Live Supabase fetch when online
    try {
      const liveList = await fetchAllRegisteredStudents();
      if (liveList && liveList.length >= 0) {
        setStudents(liveList);
      }
    } catch (e) {
      console.warn('Error loading live student registrations:', e);
    }

    // Live Supabase routes fetch
    try {
      const liveRoutes = await fetchAllOfficialRoutes();
      if (liveRoutes && liveRoutes.length > 0) {
        setRoutes(liveRoutes);
        if (!assignRouteId) setAssignRouteId(liveRoutes[0].id);
      }
    } catch (e) {
      console.warn('Error loading live official routes:', e);
    }

    // Load Shifts, Fleet Buses, Drivers & Current Assignments
    try {
      const [sList, bList, dList, aList] = await Promise.all([
        fetchShifts(),
        fetchFleetBuses(),
        getAllDrivers(),
        fetchRouteAssignments(),
      ]);
      setShifts(sList);
      if (sList.length > 0 && !assignShiftId) setAssignShiftId(sList[0].id);
      setFleetBuses(bList);
      if (bList.length > 0 && !assignBusId) setAssignBusId(bList[0].id);
      setDriversList(dList);
      if (dList.length > 0 && !assignDriverId) setAssignDriverId(dList[0].id);
      setRouteAssignments(aList);
    } catch (e) {
      console.warn('Error loading assignment resources:', e);
    }
  };

  const handleAssignDriverBus = async () => {
    if (!assignRouteId || !assignShiftId || !assignBusId || !assignDriverId) {
      alert('Please select Shift, Route, Bus, and Driver.');
      return;
    }
    setAssignLoading(true);
    setAssignResult(null);
    try {
      const res = await assignDriverAndBusToRoute(
        assignRouteId,
        assignShiftId,
        assignBusId,
        assignDriverId
      );
      setAssignResult({
        success: res.success,
        updated: res.updated || false,
        message: res.message,
        notifiedCount: res.notifiedCount || 0,
        driverName: res.driverName,
        busPlate: res.busPlate,
        routeName: res.routeName,
      });

      // Reload assignments
      const updatedList = await fetchRouteAssignments();
      setRouteAssignments(updatedList);
    } catch (e: any) {
      setAssignResult({
        success: false,
        updated: false,
        message: e.message || 'Error saving assignment.',
      });
    } finally {
      setAssignLoading(false);
    }
  };

  // Poll active trips count every 3 seconds for header badge
  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      try {
        const trips = await getActiveTrips();
        if (mounted) {
          setActiveTripsCount(trips.length);
        }
      } catch (e) {
        // quiet fallback
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Supabase connection diagnostic state
  const [connStatus, setConnStatus] = useState<{
    state: 'checking' | 'connected' | 'not_configured' | 'error';
    label: string;
    detail?: string;
  }>({ state: 'checking', label: 'Checking DB...' });

  const checkConnection = async () => {
    const diag = getSupabaseConfigDiagnostics();
    if (!diag.isConfigured) {
      setConnStatus({
        state: 'not_configured',
        label: 'Safe Offline Mode',
        detail: 'Credentials not configured in .env',
      });
      return;
    }

    try {
      const { status, error } = await supabase.from('shifts').select('id', { head: true });
      if (!error && (status === 200 || status === 204)) {
        const host = diag.sanitizedUrl ? new URL(diag.sanitizedUrl).hostname : 'Supabase';
        setConnStatus({
          state: 'connected',
          label: 'Supabase Cloud: Connected',
          detail: host,
        });
      } else {
        setConnStatus({
          state: 'error',
          label: 'Supabase: Connection Error',
          detail: error?.message || `HTTP ${status}`,
        });
      }
    } catch (e: any) {
      setConnStatus({
        state: 'error',
        label: 'Supabase: Network Error',
        detail: e.message || 'Network exception',
      });
    }
  };

  useEffect(() => {
    loadData();
    checkConnection();
  }, []);

  const handleTabSwitch = (tab: AdminActiveTab) => {
    setActiveTab(tab);
    if (onNavigateSection) {
      onNavigateSection(tab);
    }
  };

  const handleApprove = async (studentId: string) => {
    setActionLoading(studentId);
    await approveStudentRegistration(studentId);
    loadData();
    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent((prev) => (prev ? { ...prev, status: 'approved' } : null));
    }
    setActionLoading(null);
  };

  const handleReject = async (studentId: string) => {
    if (confirm('Are you sure you want to reject this registration application?')) {
      setActionLoading(studentId);
      await rejectStudentRegistration(studentId, 'Application rejected by administrator.');
      loadData();
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent((prev) => (prev ? { ...prev, status: 'rejected' } : null));
      }
      setActionLoading(null);
    }
  };

  const toggleStopPickupEligibility = (routeId: string, stopId: string) => {
    setRoutes((prevRoutes) =>
      prevRoutes.map((r) => {
        if (r.id !== routeId) return r;
        return {
          ...r,
          routeStops: r.routeStops.map((rs) =>
            rs.stopId === stopId ? { ...rs, isPickupEligible: !rs.isPickupEligible } : rs
          ),
        };
      })
    );
  };

  const pendingCount = students.filter((s) => s.status === 'pending_approval').length;

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    // Status Filter
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;

    // Shift Filter
    if (shiftFilter !== 'ALL' && s.transport?.shiftId !== shiftFilter) return false;

    // Route Filter
    if (routeFilter !== 'ALL' && s.transport?.routeId !== routeFilter) return false;

    // Search Query
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.prn.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      s.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold shrink-0">
            <Shield className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                Transport Administration
              </span>
              <span className="text-xs text-slate-500 font-medium">KKWIEER Autonomous</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {admin.fullName}
            </h1>
            <p className="text-xs text-slate-500">
              Student Registration, Fee Receipts & Transit Governance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Visual Connection Diagnostic Badge */}
          <div
            title={connStatus.detail}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${
              connStatus.state === 'connected'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : connStatus.state === 'not_configured'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : connStatus.state === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : 'bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connStatus.state === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : connStatus.state === 'not_configured'
                  ? 'bg-amber-500'
                  : connStatus.state === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}
            />
            <span>{connStatus.label}</span>
            {connStatus.detail && (
              <span className="text-[10px] opacity-75 font-mono hidden md:inline">
                ({connStatus.detail})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* URGENT DRIVER SOS EMERGENCY ACTIVE BANNER */}
      {unacknowledgedSosCount > 0 && (
        <div className="bg-red-600 text-white p-4 sm:p-5 rounded-3xl shadow-lg border-2 border-red-700 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <p className="font-extrabold text-sm sm:text-base tracking-tight">
                CRITICAL: {unacknowledgedSosCount} Unacknowledged Driver Distress Beacon{unacknowledgedSosCount > 1 ? 's' : ''}!
              </p>
              <p className="text-xs text-red-100 mt-0.5">
                Active driver emergency signals requiring immediate administrative triage and dispatch.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleTabSwitch('sos-alerts')}
            className="px-5 py-2.5 rounded-xl bg-white text-red-700 font-extrabold text-xs hover:bg-red-50 transition-all shadow-md shrink-0 cursor-pointer"
          >
            Triage SOS Alerts Now →
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabSwitch('sos-alerts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer ${
            activeTab === 'sos-alerts'
              ? 'bg-red-600 text-white shadow-xs'
              : activeSosCount > 0
              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertOctagon className={`w-4 h-4 ${activeSosCount > 0 ? 'text-red-500 animate-pulse' : ''}`} />
          <span>SOS Emergency Alerts</span>
          {activeSosCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-[10px] animate-pulse">
              {activeSosCount} Active
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-semibold text-[10px]">
              0
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => handleTabSwitch('verifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            activeTab === 'verifications'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Registrations & Approvals</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[10px]">
              {pendingCount} Pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('pass-expiry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer ${
            activeTab === 'pass-expiry'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Pass Expiry & Renewals</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('active-trips')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            activeTab === 'active-trips'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Radio className={`w-4 h-4 ${activeTripsCount > 0 ? 'text-emerald-300 animate-pulse' : ''}`} />
          <span>Active Trips Live Map</span>
          {activeTripsCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-300 text-emerald-950 font-extrabold text-[10px] animate-pulse">
              {activeTripsCount} Live
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-semibold text-[10px]">
              0 Live
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('routes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            activeTab === 'routes'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Official Routes & Pickup Stops</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('drivers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            activeTab === 'drivers'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Driver Management</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('fleet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            activeTab === 'fleet'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bus className="w-4 h-4" />
          <span>Bus Fleet Operations</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 1. COMPLETE STUDENT REGISTRATION & TRANSPORT APPROVAL TABLE */}
      {/* ===================================================================== */}
      {activeTab === 'verifications' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Table Header with Search & Multi-Filters */}
          <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Student Registration Table
                </h2>
                <p className="text-xs text-slate-500">
                  Review submitted registrations, verify PRNs, inspect fee receipts, and grant transportation access.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Total Submissions: <strong className="text-slate-800">{students.length}</strong>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search PRN, Name, Email, Phone..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:bg-white"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">All Statuses ({students.length})</option>
                  <option value="pending_approval">Pending Approval ({pendingCount})</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Shift Filter */}
              <div>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">All Shifts</option>
                  <option value="shift-morning-01">Morning Shift</option>
                  <option value="shift-general-02">General Shift</option>
                </select>
              </div>

              {/* Route Filter */}
              <div>
                <select
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">All Routes</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table Container (Horizontal Controlled Scrolling for Desktop/Tablet) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Student Name & PRN</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Academic Details</th>
                  <th className="py-3 px-4">Shift & Route</th>
                  <th className="py-3 px-4">Pickup Stop</th>
                  <th className="py-3 px-4">Fee Receipt</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold">No student registrations match the selected filters.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        New registrations submitted by students will appear in this table.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((std) => (
                    <tr key={std.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* 1. Name & PRN */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{std.fullName}</span>
                        </div>
                        <span className="font-mono text-[11px] font-extrabold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block mt-0.5">
                          {std.prn}
                        </span>
                      </td>

                      {/* 2. Contact */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div className="truncate max-w-[180px]">{std.email}</div>
                        <div className="text-[11px] text-slate-400">{std.phone || 'N/A'}</div>
                      </td>

                      {/* 3. Academic Details */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-semibold text-slate-800">{std.department}</div>
                        <div className="text-[11px] text-slate-500">
                          {std.academicYear} · Div {std.division}
                        </div>
                      </td>

                      {/* 4. Shift & Route */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 inline-block">
                          {std.transport?.shiftName || 'Morning'}
                        </span>
                        <div className="font-semibold text-slate-900 text-[11px] mt-0.5 truncate max-w-[150px]">
                          {std.transport?.routeName || 'Assigned Route'}
                        </div>
                      </td>

                      {/* 5. Pickup Stop */}
                      <td className="py-3.5 px-4 text-slate-800">
                        <div className="font-bold text-sky-900 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span>{std.transport?.pickupStopName}</span>
                        </div>
                        {std.transport?.pickupTime && (
                          <div className="text-[10px] text-slate-500">
                            Time: {std.transport.pickupTime}
                          </div>
                        )}
                      </td>

                      {/* 6. Fee Receipt */}
                      <td className="py-3.5 px-4">
                        {std.feeReceiptUrl || std.transport?.feeReceiptUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setViewingReceipt({
                                studentName: std.fullName,
                                receiptUrl: std.feeReceiptUrl || std.transport?.feeReceiptUrl || '',
                                receiptName: std.feeReceiptName || 'Fee_Receipt.pdf',
                                receiptType: std.feeReceiptType || 'application/pdf',
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-700" />
                            <span>View Receipt</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">None attached</span>
                        )}
                      </td>

                      {/* 7. Registration Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {std.registrationDate
                          ? new Date(std.registrationDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </td>

                      {/* 8. Approval Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wider inline-block ${
                            std.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : std.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {std.status === 'approved'
                            ? 'Approved'
                            : std.status === 'rejected'
                            ? 'Rejected'
                            : 'Pending'}
                        </span>
                      </td>

                      {/* 9. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(std)}
                            aria-label={`View details for ${std.fullName}`}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {std.status === 'pending_approval' && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading === std.id}
                                onClick={() => handleApprove(std.id)}
                                aria-label={`Approve ${std.fullName}`}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === std.id}
                                onClick={() => handleReject(std.id)}
                                aria-label={`Reject ${std.fullName}`}
                                className="px-2 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {std.status === 'approved' && (
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Active
                            </span>
                          )}

                          {std.status === 'rejected' && (
                            <span className="text-[11px] text-rose-700 font-bold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Denied
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PASS EXPIRY & RENEWALS MANAGEMENT SECTION */}
      {/* ===================================================================== */}
      {activeTab === 'pass-expiry' && (
        <PassExpiryManagementSection onRefresh={loadData} />
      )}

      {/* ===================================================================== */}
      {/* 2. ADMIN ACTIVE TRIPS LIVE MAP MONITORING SECTION */}
      {/* ===================================================================== */}
      {activeTab === 'active-trips' && (
        <ActiveTripsSection
          onNavigateToFleet={() => handleTabSwitch('fleet')}
          onNavigateToDrivers={() => handleTabSwitch('drivers')}
        />
      )}

      {/* ===================================================================== */}
      {/* 3. OFFICIAL ROUTES & PICKUP ELIGIBILITY CONFIGURATION */}
      {/* ===================================================================== */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          {/* DRIVER & BUS ROUTE ASSIGNMENT PANEL WITH STUDENT BROADCAST */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200 uppercase">
                  Vehicle & Driver Fleet Allocation
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                  Assign Driver & Bus to Corridor
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allocating a driver and bus automatically broadcasts live notification updates to all approved students registered for this route and shift.
                </p>
              </div>
            </div>

            {assignResult && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                  assignResult.success
                    ? assignResult.updated
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-sky-50 border-sky-300 text-sky-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                {assignResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold">
                    {assignResult.success
                      ? assignResult.updated
                        ? `Assignment Updated · ${assignResult.notifiedCount} Student(s) Notified`
                        : 'Assignment Unchanged'
                      : 'Assignment Failed'}
                  </p>
                  <p className="leading-relaxed">
                    {assignResult.message ||
                      (assignResult.updated
                        ? `Your transport assignment has been updated. Driver: ${assignResult.driverName}. Bus: ${assignResult.busPlate}. Route: ${assignResult.routeName}.`
                        : 'Identical bus and driver already assigned. Duplicate notifications skipped.')}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Shift */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  1. Shift <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignShiftId}
                  onChange={(e) => setAssignShiftId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Route */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  2. Route <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignRouteId}
                  onChange={(e) => setAssignRouteId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.routeNumber} – {r.name.split('–')[1] || r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  3. Assigned Bus <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignBusId}
                  onChange={(e) => setAssignBusId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900"
                >
                  {fleetBuses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busNumber} ({b.plateNumber}) · {b.capacity} Seats
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  4. Assigned Driver <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignDriverId}
                  onChange={(e) => setAssignDriverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900"
                >
                  {driversList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.badgeNumber || 'Driver'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Students on this route will receive immediate real-time app notifications upon saving.
              </span>
              <button
                type="button"
                onClick={handleAssignDriverBus}
                disabled={assignLoading || !assignRouteId || !assignShiftId || !assignBusId || !assignDriverId}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                <Bus className="w-4 h-4" />
                <span>{assignLoading ? 'Saving & Broadcasting...' : 'Save Assignment & Notify Students'}</span>
              </button>
            </div>

            {/* Current Route Assignments List */}
            {routeAssignments.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Active Corridor Assignments in Database
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-3">Route</th>
                        <th className="p-3">Shift</th>
                        <th className="p-3">Assigned Vehicle</th>
                        <th className="p-3">Assigned Driver</th>
                        <th className="p-3 text-right">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {routeAssignments.map((ra) => (
                        <tr key={ra.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-900">{ra.route?.name || ra.routeId}</td>
                          <td className="p-3 text-slate-700">{ra.shift?.name || ra.shiftId}</td>
                          <td className="p-3 font-mono font-semibold text-sky-800">
                            {ra.bus?.busNumber} ({ra.bus?.plateNumber})
                          </td>
                          <td className="p-3 font-bold text-slate-800">{ra.driver?.name || ra.driverId}</td>
                          <td className="p-3 text-right text-slate-400 text-[11px]">
                            {ra.updatedAt ? new Date(ra.updatedAt).toLocaleDateString() : 'Active'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Official Shift Routes & Boarding Stop Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure which stops along each route are active boarding pickup points for student registration.
            </p>
          </div>

          <div className="space-y-6">
            {routes.map((r) => (
              <div key={r.id} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 uppercase">
                      {r.shiftId.includes('morning') ? 'Morning Shift' : 'General Shift'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{r.name}</h3>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">{r.routeStops.length} stops</span>
                </div>

                <div className="p-5 divide-y divide-slate-100">
                  {r.routeStops.map((rs) => (
                    <div key={`${rs.id || rs.stopId}-${rs.sequenceNumber}`} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-600">
                          {rs.sequenceNumber}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{rs.stop.name}</p>
                          <p className="text-[11px] text-slate-400">{rs.stop.landmark}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-500 text-[11px]">
                          {rs.morningPickupTime}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleStopPickupEligibility(r.id, rs.stopId)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                            rs.isPickupEligible
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {rs.isPickupEligible ? 'Pickup Eligible' : 'Transit Only (No Pickup)'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. DEDICATED DRIVER MANAGEMENT SECTION */}
      {/* ===================================================================== */}
      {activeTab === 'drivers' && <DriverManagementSection />}

      {/* ===================================================================== */}
      {/* 4. BUS FLEET OPERATIONS SECTION */}
      {/* ===================================================================== */}
      {activeTab === 'fleet' && <FleetOperationsSection />}

      {/* ===================================================================== */}
      {/* 5. SOS EMERGENCY ALERTS TRIAGE SECTION */}
      {/* ===================================================================== */}
      {activeTab === 'sos-alerts' && <SosAlertsSection admin={admin} />}

      {/* ===================================================================== */}
      {/* STUDENT DETAILS MODAL */}
      {/* ===================================================================== */}
      {selectedStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 bg-gradient-to-r from-slate-900 to-sky-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                  Student Verification Record
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedStudent.fullName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                aria-label="Close details modal"
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Personal & Academic */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <GraduationCap className="w-4 h-4 text-sky-700" /> Academic & Personal Profile
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">PRN Number</span>
                    <span className="font-mono font-bold text-sky-800 text-sm">
                      {selectedStudent.prn}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Department</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Year & Division</span>
                    <span className="font-semibold text-slate-800">
                      {selectedStudent.academicYear} · Div {selectedStudent.division}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">College Email</span>
                    <span className="font-mono text-slate-800 truncate block">
                      {selectedStudent.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mobile Number</span>
                    <span className="font-semibold text-slate-800">
                      {selectedStudent.phone || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Current Status</span>
                    <span
                      className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                        selectedStudent.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedStudent.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedStudent.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transportation Assignment */}
              <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-100 space-y-2">
                <h4 className="font-bold text-sky-950 flex items-center gap-1.5 text-xs">
                  <Bus className="w-4 h-4 text-sky-700" /> Transportation Assignment
                </h4>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shift:</span>
                    <span className="font-bold">{selectedStudent.transport?.shiftName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Route:</span>
                    <span className="font-bold">{selectedStudent.transport?.routeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Designated Pickup Stop:</span>
                    <span className="font-bold text-sky-900">
                      {selectedStudent.transport?.pickupStopName}
                    </span>
                  </div>
                  {selectedStudent.transport?.pickupTime && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pickup Time:</span>
                      <span className="font-mono font-bold">
                        {selectedStudent.transport.pickupTime}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fee Receipt Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs mb-2">
                  <FileText className="w-4 h-4 text-emerald-700" /> Transport Fee Receipt
                </h4>
                {selectedStudent.feeReceiptUrl || selectedStudent.transport?.feeReceiptUrl ? (
                  <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                    <div className="truncate">
                      <p className="font-bold text-slate-800 truncate">
                        {selectedStudent.feeReceiptName || 'Uploaded_Receipt'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {((selectedStudent.feeReceiptSize || 0) / 1024).toFixed(1)} KB · Attached
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setViewingReceipt({
                          studentName: selectedStudent.fullName,
                          receiptUrl:
                            selectedStudent.feeReceiptUrl ||
                            selectedStudent.transport?.feeReceiptUrl ||
                            '',
                          receiptName: selectedStudent.feeReceiptName || 'Receipt.pdf',
                          receiptType: selectedStudent.feeReceiptType || 'application/pdf',
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    No fee receipt attached with this registration.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                Close
              </button>

              {selectedStudent.status === 'pending_approval' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading === selectedStudent.id}
                    onClick={() => handleReject(selectedStudent.id)}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading === selectedStudent.id}
                    onClick={() => handleApprove(selectedStudent.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Student</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FEE RECEIPT INSPECTION MODAL */}
      {/* ===================================================================== */}
      {viewingReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Transport Fee Receipt Document
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {viewingReceipt.studentName} – {viewingReceipt.receiptName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                aria-label="Close receipt modal"
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto flex items-center justify-center bg-slate-100 min-h-[300px]">
              {viewingReceipt.receiptUrl.startsWith('data:image') ||
              viewingReceipt.receiptName.match(/\.(jpg|jpeg|png)$/i) ? (
                <img
                  src={viewingReceipt.receiptUrl}
                  alt="Student Fee Receipt"
                  className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
                />
              ) : viewingReceipt.receiptUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingReceipt.receiptUrl}
                  title="Fee Receipt PDF"
                  className="w-full h-[60vh] rounded-xl border border-slate-300"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 max-w-sm space-y-3">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">{viewingReceipt.receiptName}</p>
                  <p className="text-[11px] text-slate-500">
                    Uploaded file format is ready for download or external viewing.
                  </p>
                  <a
                    href={viewingReceipt.receiptUrl}
                    download={viewingReceipt.receiptName}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Receipt File</span>
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <a
                href={viewingReceipt.receiptUrl}
                download={viewingReceipt.receiptName}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Local Copy</span>
              </a>
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
