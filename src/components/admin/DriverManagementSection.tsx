// =============================================================================
// VAAHAN TRANSIT SYSTEM - DRIVER MANAGEMENT COMPONENT
// Administrative driver registration, credential management & status control
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserX,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  X,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Phone,
  Mail,
  Calendar,
  Award,
  Clock,
  Car,
  AlertCircle,
  Copy,
  ExternalLink,
  Navigation,
  Compass,
  ArrowRight,
  History,
  MapPin,
  Radio,
  Key,
} from 'lucide-react';
import {
  DriverProfile,
  CreateDriverAccountData,
  UpdateDriverProfileData,
  Trip,
  LiveLocation,
} from '../../types';
import {
  getAllDrivers,
  createDriverAccount,
  updateDriverProfile,
  toggleDriverStatus,
  adminResetDriverPassword,
} from '../../services/driverService';
import { getDriverTripHistory, getTripLocationHistory } from '../../services/tripService';
import { formatRouteDisplay } from '../../services/routeService';
import { MapView } from '../common/MapView';

export const DriverManagementSection: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'disabled'>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingDriver, setViewingDriver] = useState<DriverProfile | null>(null);
  const [editingDriver, setEditingDriver] = useState<DriverProfile | null>(null);

  // Driver Trip History Modal State
  const [historyDriver, setHistoryDriver] = useState<DriverProfile | null>(null);
  const [driverTrips, setDriverTrips] = useState<Trip[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyShiftFilter, setHistoryShiftFilter] = useState<string>('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const [inspectingDriverTrip, setInspectingDriverTrip] = useState<Trip | null>(null);
  const [inspectingTripLocations, setInspectingTripLocations] = useState<LiveLocation[]>([]);

  // Form states
  const [createForm, setCreateForm] = useState<CreateDriverAccountData>({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    status: 'active',
  });
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPassword, setCreateConfirmPassword] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<{
    message: string;
    invitationLink?: string | null;
    warning?: string | null;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateDriverProfileData>({});
  const [editError, setEditError] = useState<string | null>(null);

  // Reset password modal state
  const [resetPasswordDriver, setResetPasswordDriver] = useState<DriverProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);

  // Action loading for toggle
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadDrivers = async () => {
    setIsLoading(true);
    try {
      const data = await getAllDrivers();
      setDrivers(data);
    } catch (e) {
      console.error('Failed to load drivers:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  // Fetch driver history when history modal opens
  useEffect(() => {
    if (!historyDriver) {
      setDriverTrips([]);
      return;
    }
    setHistoryLoading(true);
    getDriverTripHistory(historyDriver.id)
      .then((trips) => {
        setDriverTrips(trips);
      })
      .finally(() => {
        setHistoryLoading(false);
      });
  }, [historyDriver]);

  // Fetch breadcrumb locations when admin inspects a particular trip
  useEffect(() => {
    if (!inspectingDriverTrip) {
      setInspectingTripLocations([]);
      return;
    }
    getTripLocationHistory(inspectingDriverTrip.id).then((locs) => {
      setInspectingTripLocations(locs);
    });
  }, [inspectingDriverTrip]);

  // Filtered driver history trips
  const filteredDriverTrips = driverTrips.filter((t) => {
    if (historyShiftFilter !== 'ALL' && t.shift?.code !== historyShiftFilter && t.shiftId !== historyShiftFilter) {
      return false;
    }
    if (historyStatusFilter !== 'ALL' && t.status !== historyStatusFilter) {
      return false;
    }
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    const routeMatch = (t.route?.name || '').toLowerCase().includes(q) || (t.route?.routeNumber || '').toLowerCase().includes(q);
    const busMatch = (t.bus?.busNumber || '').toLowerCase().includes(q) || (t.bus?.plateNumber || '').toLowerCase().includes(q);
    const dateMatch = (t.tripDate || '').includes(q);
    return routeMatch || busMatch || dateMatch;
  });

  // Filtered drivers
  const filteredDrivers = drivers.filter((d) => {
    // Status Filter
    if (statusFilter === 'active' && !(d.status === 'active' || d.status === 'approved')) {
      return false;
    }
    if (statusFilter === 'disabled' && !(d.status === 'disabled' || d.status === 'blocked')) {
      return false;
    }

    // Search Query
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.fullName.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.licenseNumber && d.licenseNumber.toLowerCase().includes(q)) ||
      (d.badgeNumber && d.badgeNumber.toLowerCase().includes(q))
    );
  });

  const activeDriversCount = drivers.filter(
    (d) => d.status === 'active' || d.status === 'approved'
  ).length;
  const disabledDriversCount = drivers.filter(
    (d) => d.status === 'disabled' || d.status === 'blocked'
  ).length;

  // Handle Create Driver
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccessMsg(null);

    if (createPassword) {
      if (createPassword.length < 6) {
        setCreateError('Password must be at least 6 characters long.');
        return;
      }
      if (createPassword !== createConfirmPassword) {
        setCreateError('Assigned password and confirmation do not match.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await createDriverAccount({
        ...createForm,
        password: createPassword || undefined,
      });
      if (!res.success) {
        setCreateError(res.error || 'Failed to create driver account.');
      } else {
        setCreateSuccessMsg({
          message: res.invitationSent
            ? `Driver account created. An invitation email was dispatched to ${createForm.email}.`
            : `Driver account created successfully for ${createForm.fullName}.`,
          invitationLink: res.invitationLink,
          warning: res.warning,
        });
        // Reset form
        setCreateForm({
          fullName: '',
          email: '',
          phone: '',
          licenseNumber: '',
          status: 'active',
        });
        setCreatePassword('');
        setCreateConfirmPassword('');
        await loadDrivers();
      }
    } catch (err: any) {
      setCreateError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Admin Reset Driver Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordDriver) return;
    setResetPasswordError(null);
    setResetPasswordSuccess(null);

    if (newPassword.length < 6) {
      setResetPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminResetDriverPassword(resetPasswordDriver.id, newPassword);
      if (!res.success) {
        setResetPasswordError(res.error || 'Failed to reset driver password.');
      } else {
        setResetPasswordSuccess(`Password successfully reset for driver ${resetPasswordDriver.fullName}.`);
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      setResetPasswordError(err.message || 'Failed to reset driver password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Driver Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    setEditError(null);
    setIsSubmitting(true);

    try {
      const res = await updateDriverProfile(editingDriver.id, editForm);
      if (!res.success) {
        setEditError(res.error || 'Failed to update driver profile.');
      } else {
        await loadDrivers();
        setEditingDriver(null);
      }
    } catch (err: any) {
      setEditError(err.message || 'Failed to update driver.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Status (Disable / Reactivate)
  const handleToggleStatus = async (driver: DriverProfile) => {
    const isCurrentlyActive = driver.status === 'active' || driver.status === 'approved';
    const nextStatus = isCurrentlyActive ? 'disabled' : 'active';

    const confirmMsg = isCurrentlyActive
      ? `Are you sure you want to deactivate ${driver.fullName}'s account? Disabled drivers will be denied sign in and cannot start trips. Historical trip records are preserved.`
      : `Reactivate ${driver.fullName}'s driver account and restore transit access privileges?`;

    if (!confirm(confirmMsg)) return;

    setActionLoadingId(driver.id);
    try {
      await toggleDriverStatus(driver.id, nextStatus);
      await loadDrivers();
      if (viewingDriver && viewingDriver.id === driver.id) {
        setViewingDriver((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (e) {
      console.error('Error toggling status:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 uppercase">
              Driver Operations
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">KKWIEER Transit Fleet</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Driver Credential & Fleet Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Provision verified driver accounts, oversee licensing information, and govern access permissions. Disabled drivers cannot initiate trips; historical trip records remain fully intact.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateSuccessMsg(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Driver Account</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">Total Registered Drivers</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-slate-900">{drivers.length}</span>
            <Car className="w-5 h-5 text-slate-400" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-2xs bg-emerald-50/20">
          <span className="text-xs font-bold text-emerald-700">Active Operational Drivers</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-emerald-700">{activeDriversCount}</span>
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-rose-200/80 p-4 shadow-2xs bg-rose-50/20">
          <span className="text-xs font-bold text-rose-700">Disabled / Inactive Drivers</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-rose-700">{disabledDriversCount}</span>
            <UserX className="w-5 h-5 text-rose-600" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by driver name, email address, or mobile phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-emerald-500 w-full md:w-auto"
          >
            <option value="ALL">All Statuses ({drivers.length})</option>
            <option value="active">Active Only ({activeDriversCount})</option>
            <option value="disabled">Disabled Only ({disabledDriversCount})</option>
          </select>
        </div>
      </div>

      {/* Driver List / Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-semibold animate-pulse">
            Loading registered drivers repository...
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Car className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No driver accounts found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No registered drivers match your current search and filter criteria.'
                : 'No driver records have been created yet. Click "Create Driver Account" above to securely provision an official driver.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 sm:px-6">Driver Full Name</th>
                  <th className="py-3.5 px-4">Official Email</th>
                  <th className="py-3.5 px-4">Mobile Number</th>
                  <th className="py-3.5 px-4">Driving Licence</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDrivers.map((driver) => {
                  const isActive = driver.status === 'active' || driver.status === 'approved';
                  const formattedDate = driver.createdAt
                    ? new Date(driver.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Registered';

                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Badge */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {driver.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">{driver.fullName}</p>
                            {driver.badgeNumber && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {driver.badgeNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {driver.email}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {driver.phone || '—'}
                      </td>

                      {/* Licence */}
                      <td className="py-3.5 px-4">
                        {driver.licenseNumber ? (
                          <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {driver.licenseNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not collected</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View History */}
                          <button
                            type="button"
                            onClick={() => setHistoryDriver(driver)}
                            title="View Driver Trip History"
                            className="px-2.5 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 text-[11px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Clock className="w-3 h-3 text-sky-600" />
                            <span>View History</span>
                          </button>

                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => setViewingDriver(driver)}
                            title="View Driver Profile"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDriver(driver);
                              setEditForm({
                                fullName: driver.fullName,
                                phone: driver.phone,
                                licenseNumber: driver.licenseNumber,
                                experienceYears: driver.experienceYears,
                                assignedBusNumber: driver.assignedBusNumber,
                              });
                              setEditError(null);
                            }}
                            title="Edit Driver Information"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetPasswordDriver(driver);
                              setNewPassword('');
                              setConfirmNewPassword('');
                              setResetPasswordError(null);
                              setResetPasswordSuccess(null);
                            }}
                            title="Reset Driver Password"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Disable / Reactivate Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(driver)}
                            disabled={actionLoadingId === driver.id}
                            title={isActive ? 'Deactivate Driver Account' : 'Reactivate Driver Account'}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                              isActive
                                ? 'border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100'
                                : 'border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {actionLoadingId === driver.id
                              ? 'Saving...'
                              : isActive
                              ? 'Disable'
                              : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: CREATE DRIVER ACCOUNT */}
      {/* ===================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 uppercase">
                  Institutional Auth
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  Create Driver Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createSuccessMsg ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Account Created Successfully</span>
                  </div>
                  <p>{createSuccessMsg.message}</p>
                </div>

                {createSuccessMsg.invitationLink && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Driver Password Setup Link:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createSuccessMsg.invitationLink!)}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </button>
                    </div>
                    <p className="font-mono text-[10px] bg-white p-2.5 rounded-lg border border-slate-200 break-all text-slate-600">
                      {createSuccessMsg.invitationLink}
                    </p>
                  </div>
                )}

                {createSuccessMsg.warning && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                    <span className="font-bold">Configuration Notice:</span> {createSuccessMsg.warning}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreateSuccessMsg(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                {createError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800">Secure Credential Provisioning:</span> Driver accounts are authenticated through Supabase Auth. Permanent passwords are never stored or displayed. The driver establishes their password securely via an invitation link.
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Driver Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    placeholder="e.g. Ramesh Balu Patil"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Official Driver Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="e.g. ramesh.patil.driver@kkwagh.edu.in"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mobile Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="e.g. +91 98231 45872"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Driving Licence Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.licenseNumber || ''}
                    onChange={(e) => setCreateForm({ ...createForm, licenseNumber: e.target.value })}
                    placeholder="e.g. MH-15-2018-004819"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                  <span className="font-bold text-amber-900">Direct Password Provisioning:</span> Set the initial login password for this driver. Supabase Auth will hash it immediately via bcrypt. If left blank, an invitation link will be provided.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Assigned Password <span className="text-slate-400 font-normal">(Min 6 chars)</span>
                    </label>
                    <input
                      type="password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Confirm Assigned Password
                    </label>
                    <input
                      type="password"
                      value={createConfirmPassword}
                      onChange={(e) => setCreateConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Account Status</label>
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, status: 'active' })}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-colors ${
                        createForm.status === 'active'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      Active (Immediate Access)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, status: 'disabled' })}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-colors ${
                        createForm.status === 'disabled'
                          ? 'border-rose-500 bg-rose-50 text-rose-800'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      Disabled (Hold Access)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? 'Provisioning...' : 'Provision Driver Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: VIEW DRIVER DETAILS */}
      {/* ===================================================================== */}
      {viewingDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-sm">
                  {viewingDriver.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{viewingDriver.fullName}</h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {viewingDriver.badgeNumber || 'Driver Record'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDriver(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Account Status</span>
                <p className="font-extrabold mt-0.5 text-slate-900 capitalize">
                  {viewingDriver.status}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Role Authorization</span>
                <p className="font-extrabold mt-0.5 text-slate-900 uppercase">
                  {viewingDriver.role}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Official Email</span>
                <p className="font-mono text-xs font-semibold mt-0.5 text-slate-900">
                  {viewingDriver.email}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Mobile Phone</span>
                <p className="font-semibold mt-0.5 text-slate-900">
                  {viewingDriver.phone || '—'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Driving Licence</span>
                <p className="font-mono font-semibold mt-0.5 text-slate-900">
                  {viewingDriver.licenseNumber || 'Not collected'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Driving Experience</span>
                <p className="font-semibold mt-0.5 text-slate-900">
                  {viewingDriver.experienceYears || 5} Years
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Driver Rating</span>
                <p className="font-semibold mt-0.5 text-slate-900">
                  ★ {viewingDriver.rating || 4.9} / 5.0
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Historical trip logs, telemetry recordings, and route assignments for this driver are permanently preserved regardless of account status updates.
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleToggleStatus(viewingDriver)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  viewingDriver.status === 'active' || viewingDriver.status === 'approved'
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                {viewingDriver.status === 'active' || viewingDriver.status === 'approved'
                  ? 'Deactivate Account'
                  : 'Reactivate Account'}
              </button>

              <button
                type="button"
                onClick={() => setViewingDriver(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: EDIT DRIVER PROFILE */}
      {/* ===================================================================== */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Edit Record</span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  Update Driver Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {editError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Driver Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName || ''}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Phone Number</label>
                <input
                  type="tel"
                  required
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Driving Licence Number</label>
                <input
                  type="text"
                  value={editForm.licenseNumber || ''}
                  onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Driving Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="45"
                  value={editForm.experienceYears ?? 5}
                  onChange={(e) =>
                    setEditForm({ ...editForm, experienceYears: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3B: RESET DRIVER PASSWORD */}
      {/* ===================================================================== */}
      {resetPasswordDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-extrabold text-sm">
                  <Key className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Reset Driver Password</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {resetPasswordDriver.fullName} ({resetPasswordDriver.email})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordDriver(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetPasswordSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{resetPasswordSuccess}</p>
                    <p className="mt-1 text-emerald-800 text-[11px]">
                      The driver's Supabase Auth credentials have been updated. The driver can now log in to the Driver Portal using their email and this newly assigned password.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setResetPasswordDriver(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                {resetPasswordError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{resetPasswordError}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  Enter a new permanent password for this driver. Supabase Auth will update the driver's password hash via secure administrative RPC.
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setResetPasswordDriver(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DRIVER TRIP HISTORY MODAL (IMMUTABLE DATABASE LOGS)                  */}
      {/* ===================================================================== */}
      {historyDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-extrabold text-xl shrink-0">
                  <Car className="w-7 h-7 text-sky-600" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {historyDriver.badgeNumber || 'DRV-101'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        historyDriver.status === 'active' || historyDriver.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {historyDriver.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500 font-mono">
                      License: {historyDriver.licenseNumber || 'MH-15-Official'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    {historyDriver.fullName} – Operating Journey History
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Email: <strong>{historyDriver.email}</strong></span>
                    <span>·</span>
                    <span>Phone: <strong>{historyDriver.phone || '9876543210'}</strong></span>
                    <span>·</span>
                    <span>Experience: <strong>{historyDriver.experienceYears || 5} Years</strong></span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setHistoryDriver(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by route, bus plate, or trip date..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={historyShiftFilter}
                  onChange={(e) => setHistoryShiftFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                >
                  <option value="ALL">All Shifts</option>
                  <option value="MORNING">Morning Shift</option>
                  <option value="GENERAL">General Shift</option>
                </select>

                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <span className="text-xs font-bold text-slate-500 px-2 py-1 rounded-lg bg-white border border-slate-200 shrink-0">
                  {filteredDriverTrips.length} Trips Found
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {historyLoading ? (
                <div className="p-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
                  Querying immutable trip records from Supabase...
                </div>
              ) : filteredDriverTrips.length === 0 ? (
                <div className="p-12 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <History className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">No historical trips found for this driver.</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {historySearch || historyShiftFilter !== 'ALL' || historyStatusFilter !== 'ALL'
                      ? 'No journeys match your filter criteria.'
                      : 'When this driver operates a scheduled or simulated run, real journey records will appear here as permanent fleet records.'}
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Bus Vehicle</th>
                        <th className="p-3">Official Route</th>
                        <th className="p-3">Direction</th>
                        <th className="p-3">Times</th>
                        <th className="p-3 text-center">Manifest</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredDriverTrips.map((trip) => {
                        const isCompleted = trip.status === 'COMPLETED';
                        const isInProgress = trip.status === 'IN_PROGRESS';

                        return (
                          <tr key={trip.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Date */}
                            <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                              {trip.tripDate || (trip.startedAt ? trip.startedAt.slice(0, 10) : '—')}
                            </td>

                            {/* Bus */}
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">
                                {trip.bus?.busNumber || 'Bus'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {trip.bus?.plateNumber || 'MH-15-Bus'}
                              </span>
                            </td>

                            {/* Route */}
                            <td className="p-3 font-semibold text-slate-800">
                              {trip.route ? formatRouteDisplay(trip.route) : 'Transit Route'}
                            </td>

                            {/* Direction */}
                            <td className="p-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  trip.direction === 'TO_COLLEGE'
                                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                    : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                }`}
                              >
                                {trip.direction === 'TO_COLLEGE' ? 'To College' : 'Returning Home'}
                              </span>
                            </td>

                            {/* Times */}
                            <td className="p-3 text-[11px] font-mono text-slate-600 whitespace-nowrap">
                              <span>Start: {trip.startedAt ? new Date(trip.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                              <br />
                              <span>End: {trip.endedAt ? new Date(trip.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (isInProgress ? 'Running' : '—')}</span>
                            </td>

                            {/* Manifest */}
                            <td className="p-3 text-center">
                              <span className="font-bold text-slate-800">
                                {trip.assignedStudentCount || 0}
                              </span>
                              <span className="text-[10px] text-slate-400 block">students</span>
                            </td>

                            {/* Mode */}
                            <td className="p-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  trip.mode === 'SIMULATION'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-emerald-100 text-emerald-900'
                                }`}
                              >
                                {trip.mode === 'SIMULATION' ? 'Simulation' : 'Live GPS'}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="p-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isInProgress
                                    ? 'bg-sky-100 text-sky-800 animate-pulse'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {trip.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => setInspectingDriverTrip(trip)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>View Map & Stops</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setHistoryDriver(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                Close History View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* NESTED TRIP DETAIL & MAP INSPECTION MODAL                             */}
      {/* ===================================================================== */}
      {inspectingDriverTrip && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                    {inspectingDriverTrip.direction === 'TO_COLLEGE' ? 'To College' : 'Returning Home'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {inspectingDriverTrip.bus?.busNumber} ({inspectingDriverTrip.bus?.plateNumber})
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {inspectingDriverTrip.status}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {inspectingDriverTrip.route ? formatRouteDisplay(inspectingDriverTrip.route) : 'Journey Details'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operated on <strong>{inspectingDriverTrip.tripDate}</strong> · Mode: <strong>{inspectingDriverTrip.mode}</strong> · Manifest: <strong>{inspectingDriverTrip.assignedStudentCount || 0} students</strong>
                </p>
              </div>

              <button
                onClick={() => setInspectingDriverTrip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Map View */}
              <MapView
                stops={inspectingDriverTrip.tripStops.map((ts) => ({
                  stop: ts.stop,
                  sequenceNumber: ts.sequenceNumber,
                  status: ts.status,
                }))}
                currentLocation={
                  inspectingTripLocations.length > 0
                    ? inspectingTripLocations[inspectingTripLocations.length - 1]
                    : null
                }
                busNumber={inspectingDriverTrip.bus?.busNumber || 'Bus'}
                height="380px"
              />

              {/* Stop Progression Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Ordered Stop Progression ({inspectingDriverTrip.tripStops.length} Stops)
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Stop Name</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Reached Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inspectingDriverTrip.tripStops.map((ts) => (
                        <tr key={ts.id}>
                          <td className="p-2.5 font-mono text-slate-400">#{ts.sequenceNumber}</td>
                          <td className="p-2.5 font-bold text-slate-800">{ts.stop.name}</td>
                          <td className="p-2.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                ts.status === 'REACHED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {ts.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                            {ts.reachedAt ? new Date(ts.reachedAt).toLocaleTimeString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectingDriverTrip(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Back to Driver Trips
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
