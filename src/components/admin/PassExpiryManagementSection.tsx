// =============================================================================
// VAAHAN TRANSIT SYSTEM - ADMIN PASS EXPIRY & RENEWAL MANAGEMENT
// Real-time Expiry Tracking, 7-Day Alert Generation & Razorpay Audit Log
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Search,
  Filter,
  RefreshCw,
  Bell,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  ArrowUpRight,
  UserCheck,
  ChevronRight,
  Download,
} from 'lucide-react';
import { StudentProfile, PassRenewalRecord, PassExpiryStatus } from '../../types';
import { getAllRegisteredStudents } from '../../services/authService';
import {
  computePassStatus,
  calculateDaysRemaining,
  formatDateReadable,
  fetchAllRenewals,
  runExpiryCheckRpc,
} from '../../services/razorpayService';

interface PassExpiryManagementSectionProps {
  onRefresh?: () => void;
}

export const PassExpiryManagementSection: React.FC<PassExpiryManagementSectionProps> = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [renewals, setRenewals] = useState<PassRenewalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAlertCheck, setRunningAlertCheck] = useState(false);
  const [alertResult, setAlertResult] = useState<string | null>(null);

  // Active view: 'passes' or 'renewals'
  const [viewTab, setViewTab] = useState<'passes' | 'renewals'>('passes');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PassExpiryStatus>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allStudents, allRenewals] = await Promise.all([
        getAllRegisteredStudents(),
        fetchAllRenewals(),
      ]);
      setStudents(allStudents);
      setRenewals(allRenewals);
    } catch (e) {
      console.warn('Error loading pass expiry data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Department list for dropdown filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set).sort();
  }, [students]);

  // Metric counts
  const stats = useMemo(() => {
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let missing = 0;

    students.forEach((s) => {
      const status = computePassStatus(s.passExpiryDate || s.transport?.passExpiryDate);
      if (status === 'ACTIVE') active++;
      else if (status === 'EXPIRING_SOON') expiringSoon++;
      else if (status === 'EXPIRED') expired++;
      else missing++;
    });

    return {
      total: students.length,
      active,
      expiringSoon,
      expired,
      missing,
    };
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const expiry = s.passExpiryDate || s.transport?.passExpiryDate;
      const status = computePassStatus(expiry);

      // Status filter
      if (statusFilter !== 'ALL' && status !== statusFilter) {
        return false;
      }

      // Department filter
      if (departmentFilter !== 'ALL' && s.department !== departmentFilter) {
        return false;
      }

      // Shift filter
      if (shiftFilter !== 'ALL') {
        const shiftName = s.transport?.shiftName?.toUpperCase() || '';
        if (!shiftName.includes(shiftFilter.toUpperCase())) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(query);
        const matchPrn = s.prn.toLowerCase().includes(query);
        const matchEmail = s.email.toLowerCase().includes(query);
        const matchDept = s.department.toLowerCase().includes(query);
        if (!matchName && !matchPrn && !matchEmail && !matchDept) {
          return false;
        }
      }

      return true;
    });
  }, [students, statusFilter, departmentFilter, shiftFilter, searchQuery]);

  // Trigger automated 7-day alert check
  const handleRunAlertCheck = async () => {
    setRunningAlertCheck(true);
    setAlertResult(null);
    try {
      const res = await runExpiryCheckRpc();
      if (res.success) {
        setAlertResult(
          `Alert scan completed! Sent ${res.student_notifications_sent} student alerts and ${res.admin_notifications_sent} admin notifications.`
        );
      } else {
        setAlertResult(`Scan error: ${res.error}`);
      }
    } catch (e: any) {
      setAlertResult(`Failed to run scan: ${e.message}`);
    } finally {
      setRunningAlertCheck(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & QUICK METRICS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                <Calendar className="w-3.5 h-3.5 text-sky-700" />
                Transit Cell Administration
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Academic Year 2026-27
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Student Bus Pass Expiry & Renewal Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Monitor pass validity dates, dispatch 7-day automated expiration alerts, and audit Razorpay Test Mode renewal receipts.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRunAlertCheck}
              disabled={runningAlertCheck}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Bell className={`w-3.5 h-3.5 ${runningAlertCheck ? 'animate-bounce' : ''}`} />
              <span>{runningAlertCheck ? 'Scanning Passes...' : 'Run 7-Day Expiry Check'}</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {alertResult && (
          <div className="mt-4 p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs font-semibold text-sky-900 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{alertResult}</span>
            </div>
            <button
              type="button"
              onClick={() => setAlertResult(null)}
              className="text-xs text-sky-700 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* METRIC CHIPS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          {/* Total Passes */}
          <div
            onClick={() => setStatusFilter('ALL')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
            }`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
              All Passes
            </p>
            <p className="text-2xl font-black mt-1">{stats.total}</p>
            <p className={`text-[10px] mt-0.5 ${statusFilter === 'ALL' ? 'text-slate-400' : 'text-slate-500'}`}>
              Registered students
            </p>
          </div>

          {/* Active Passes (> 7 days) */}
          <div
            onClick={() => setStatusFilter('ACTIVE')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'ACTIVE' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                Active
              </p>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-2xl font-black mt-1">{stats.active}</p>
            <p className={`text-[10px] mt-0.5 ${statusFilter === 'ACTIVE' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              &gt; 7 days validity
            </p>
          </div>

          {/* Expiring Soon (0 - 7 days) */}
          <div
            onClick={() => setStatusFilter('EXPIRING_SOON')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'EXPIRING_SOON'
                ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                : 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'EXPIRING_SOON' ? 'text-amber-100' : 'text-amber-700'}`}>
                Expiring Soon
              </p>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <p className="text-2xl font-black mt-1">{stats.expiringSoon}</p>
            <p className={`text-[10px] mt-0.5 ${statusFilter === 'EXPIRING_SOON' ? 'text-amber-100' : 'text-amber-700'}`}>
              Within 7 days
            </p>
          </div>

          {/* Expired (< 0 days) */}
          <div
            onClick={() => setStatusFilter('EXPIRED')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'EXPIRED'
                ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                : 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'EXPIRED' ? 'text-rose-100' : 'text-rose-700'}`}>
                Expired
              </p>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <p className="text-2xl font-black mt-1">{stats.expired}</p>
            <p className={`text-[10px] mt-0.5 ${statusFilter === 'EXPIRED' ? 'text-rose-100' : 'text-rose-700'}`}>
              Needs immediate renewal
            </p>
          </div>

          {/* Missing Expiry Date */}
          <div
            onClick={() => setStatusFilter('MISSING_EXPIRY')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'MISSING_EXPIRY'
                ? 'bg-slate-600 text-white border-slate-600 shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'MISSING_EXPIRY' ? 'text-slate-200' : 'text-slate-600'}`}>
                Missing Expiry
              </p>
              <HelpCircle className="w-3 h-3 text-slate-400" />
            </div>
            <p className="text-2xl font-black mt-1">{stats.missing}</p>
            <p className={`text-[10px] mt-0.5 ${statusFilter === 'MISSING_EXPIRY' ? 'text-slate-200' : 'text-slate-500'}`}>
              Legacy registrations
            </p>
          </div>
        </div>
      </div>

      {/* VIEW TABS: STUDENT PASSES vs RAZORPAY RENEWALS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setViewTab('passes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewTab === 'passes'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Student Passes ({students.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab('renewals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewTab === 'renewals'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Razorpay Renewal Transactions ({renewals.length})</span>
        </button>
      </div>

      {/* VIEW 1: STUDENT PASSES TABLE */}
      {viewTab === 'passes' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* SEARCH & FILTERS BAR */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, PRN, or email..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Department */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {/* Shift */}
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <option value="ALL">All Shifts</option>
                <option value="MORNING">Morning Shift</option>
                <option value="GENERAL">General Shift</option>
              </select>

              {/* Reset filter */}
              {(statusFilter !== 'ALL' || departmentFilter !== 'ALL' || shiftFilter !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setDepartmentFilter('ALL');
                    setShiftFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-6">Student Information</th>
                  <th className="p-3.5">PRN Number</th>
                  <th className="p-3.5">Department & Shift</th>
                  <th className="p-3.5">Route & Stop</th>
                  <th className="p-3.5">Pass Expiry Date</th>
                  <th className="p-3.5">Status & Remaining</th>
                  <th className="p-3.5 pr-6 text-right">Validity Indicator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">
                      <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="font-bold text-slate-600">No students match current filter criteria.</p>
                      <p className="text-xs text-slate-400 mt-1">Try clearing filters to view all registered students.</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((std) => {
                    const expiry = std.passExpiryDate || std.transport?.passExpiryDate;
                    const issueDate = std.passIssueDate || std.transport?.passIssueDate || std.registrationDate;
                    const status = computePassStatus(expiry);
                    const daysRemaining = calculateDaysRemaining(expiry);

                    return (
                      <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Student Name */}
                        <td className="p-3.5 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center shrink-0 border border-sky-200">
                              {std.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{std.fullName}</p>
                              <p className="text-[11px] text-slate-500">{std.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* PRN */}
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {std.prn}
                          </span>
                        </td>

                        {/* Department & Shift */}
                        <td className="p-3.5">
                          <p className="text-slate-800 font-semibold">{std.department}</p>
                          <p className="text-[11px] text-slate-500">
                            Year {std.academicYear} · {std.transport?.shiftName || 'Morning Shift'}
                          </p>
                        </td>

                        {/* Route & Stop */}
                        <td className="p-3.5">
                          <p className="text-slate-800 font-semibold">{std.transport?.routeName || 'Assigned Route'}</p>
                          <p className="text-[11px] text-slate-500">{std.transport?.pickupStopName || 'Designated Stop'}</p>
                        </td>

                        {/* Pass Expiry Date */}
                        <td className="p-3.5">
                          {expiry ? (
                            <div>
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatDateReadable(expiry)}</span>
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Issued: {formatDateReadable(issueDate)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Missing Expiry Date</span>
                          )}
                        </td>

                        {/* Status & Days Remaining */}
                        <td className="p-3.5">
                          {status === 'ACTIVE' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Active ({daysRemaining}d left)
                            </span>
                          )}
                          {status === 'EXPIRING_SOON' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Expiring Soon ({daysRemaining}d left)
                            </span>
                          )}
                          {status === 'EXPIRED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              Expired ({Math.abs(daysRemaining || 0)}d ago)
                            </span>
                          )}
                          {status === 'MISSING_EXPIRY' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <HelpCircle className="w-3 h-3 text-slate-400" />
                              Missing Expiry
                            </span>
                          )}
                        </td>

                        {/* Validity Visual Bar */}
                        <td className="p-3.5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                status === 'ACTIVE'
                                  ? 'bg-emerald-500'
                                  : status === 'EXPIRING_SOON'
                                  ? 'bg-amber-500 animate-ping'
                                  : status === 'EXPIRED'
                                  ? 'bg-rose-500'
                                  : 'bg-slate-300'
                              }`}
                            />
                            <span className="text-[11px] font-bold text-slate-600">
                              {status === 'ACTIVE'
                                ? 'Valid'
                                : status === 'EXPIRING_SOON'
                                ? 'Urgent Alert'
                                : status === 'EXPIRED'
                                ? 'Needs Renewal'
                                : 'Legacy'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: RAZORPAY RENEWAL AUDIT HISTORY */}
      {viewTab === 'renewals' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Razorpay Test Mode Pass Renewal Audit Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cryptographically validated transactions executed through razorpay checkout and verified by server HMAC-SHA256 signature.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {renewals.length} Verified Transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-6">Student</th>
                  <th className="p-3.5">PRN Number</th>
                  <th className="p-3.5">Razorpay Payment ID</th>
                  <th className="p-3.5">Razorpay Order ID</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">New Expiry Date</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5 pr-6 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {renewals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="font-bold text-slate-600">No pass renewals recorded yet.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Transactions initiated by students in the student portal will appear here in real time.
                      </p>
                    </td>
                  </tr>
                ) : (
                  renewals.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-6 font-bold text-slate-900">
                        {r.studentName || 'Student'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-700">{r.prn}</td>
                      <td className="p-3.5 font-mono text-[11px] text-sky-700 font-semibold">
                        {r.razorpayPaymentId}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {r.razorpayOrderId}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-700">
                        ₹{r.amount.toFixed(2)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {formatDateReadable(r.newExpiryDate)}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {new Date(r.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3.5 pr-6 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Signature Verified
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

