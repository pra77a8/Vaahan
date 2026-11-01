// =============================================================================
// VAAHAN TRANSIT SYSTEM - ADMIN SOS EMERGENCY ALERTS TRIAGE SECTION
// Real-time driver emergency monitoring, instant distress triage, contact & resolution
// =============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Phone,
  CheckCircle2,
  Clock,
  MapPin,
  Bus,
  User,
  Radio,
  RefreshCw,
  ExternalLink,
  X,
  FileText,
  Search,
  Filter,
  ShieldAlert,
} from 'lucide-react';
import { SosAlert, AdminProfile, Stop, LiveLocation } from '../../types';
import {
  fetchActiveSosAlerts,
  fetchAllSosAlerts,
  acknowledgeSosAlert,
  resolveSosAlert,
  subscribeSosAlerts,
} from '../../services/sosService';
import { MapView } from '../common/MapView';

interface SosAlertsSectionProps {
  admin: AdminProfile;
}

export const SosAlertsSection: React.FC<SosAlertsSectionProps> = ({ admin }) => {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE_ACK' | 'RESOLVED'>('ACTIVE_ACK');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map inspection modal
  const [inspectAlert, setInspectAlert] = useState<SosAlert | null>(null);

  // Resolve modal state
  const [resolveTargetAlert, setResolveTargetAlert] = useState<SosAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Acknowledge in-flight tracking
  const [acknowledgingIds, setAcknowledgingIds] = useState<Set<string>>(new Set());

  const isMountedRef = useRef(true);

  // Load alerts
  const loadAlerts = async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const data = await fetchAllSosAlerts();
      if (!isMountedRef.current) return;
      setAlerts(data);
    } catch (e) {
      console.warn('Error loading SOS alerts:', e);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadAlerts();

    // Subscribe to real-time events
    const unsubscribe = subscribeSosAlerts((alert) => {
      if (!isMountedRef.current) return;
      setAlerts((prev) => {
        const idx = prev.findIndex((a) => a.id === alert.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = alert;
          return updated;
        }
        return [alert, ...prev];
      });
    });

    // Periodic poll fallback every 4 seconds
    const interval = setInterval(() => {
      loadAlerts();
    }, 4000);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Filtered list
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Status filter
      if (statusFilter === 'ACTIVE_ACK') {
        if (alert.status === 'RESOLVED') return false;
      } else if (statusFilter === 'RESOLVED') {
        if (alert.status !== 'RESOLVED') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = alert.driverName.toLowerCase().includes(q);
        const matchBus = alert.busNumber?.toLowerCase().includes(q);
        const matchRoute = alert.routeName?.toLowerCase().includes(q);
        const matchType = alert.emergencyType.toLowerCase().includes(q);
        const matchRemarks = alert.remarks?.toLowerCase().includes(q);
        if (!matchName && !matchBus && !matchRoute && !matchType && !matchRemarks) {
          return false;
        }
      }

      return true;
    });
  }, [alerts, statusFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const active = alerts.filter((a) => a.status === 'ACTIVE').length;
    const ack = alerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
    const resolved = alerts.filter((a) => a.status === 'RESOLVED').length;
    return { active, ack, resolved, total: alerts.length };
  }, [alerts]);

  // Handle acknowledge
  const handleAcknowledge = async (alert: SosAlert) => {
    if (acknowledgingIds.has(alert.id)) return;
    setAcknowledgingIds((prev) => new Set(prev).add(alert.id));

    try {
      const res = await acknowledgeSosAlert(alert.id, admin.id, admin.fullName || 'Transport Admin');
      if (res.success && res.alert) {
        setAlerts((prev) => prev.map((a) => (a.id === alert.id ? res.alert! : a)));
      }
    } catch (e) {
      console.warn('Error acknowledging SOS alert:', e);
    } finally {
      setAcknowledgingIds((prev) => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }
  };

  // Open resolve modal
  const handleOpenResolveModal = (alert: SosAlert) => {
    setResolveTargetAlert(alert);
    setResolutionNotes('');
    setResolveError(null);
  };

  // Submit resolution
  const handleConfirmResolve = async () => {
    if (!resolveTargetAlert) return;
    setIsResolving(true);
    setResolveError(null);

    try {
      const res = await resolveSosAlert(
        resolveTargetAlert.id,
        admin.id,
        admin.fullName || 'Transport Admin',
        resolutionNotes.trim() || 'Resolved by Transport Administration.'
      );
      if (res.success && res.alert) {
        setAlerts((prev) => prev.map((a) => (a.id === resolveTargetAlert.id ? res.alert! : a)));
        setResolveTargetAlert(null);
      } else {
        setResolveError(res.error || 'Failed to resolve alert.');
      }
    } catch (e: any) {
      setResolveError(e.message || 'Error resolving alert.');
    } finally {
      setIsResolving(false);
    }
  };

  const formatEmergencyType = (type: string) => {
    switch (type) {
      case 'VEHICLE_BREAKDOWN':
        return 'Vehicle Breakdown / Mechanical';
      case 'MEDICAL_EMERGENCY':
        return 'Medical Emergency / Passenger Care';
      case 'ACCIDENT_COLLISION':
        return 'Accident / Collision Incident';
      case 'SECURITY_THREAT':
        return 'Security / Safety Concern';
      case 'ROAD_BLOCKADE':
        return 'Road Blockade / Heavy Traffic';
      case 'GENERAL_EMERGENCY':
      default:
        return 'General Emergency Distress';
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-red-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 block mb-1">
              Active Distress Beacons
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-red-700">{counts.active}</span>
              {counts.active > 0 && (
                <span className="text-xs font-bold text-red-600 animate-pulse">Urgent Action</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Pending admin triage</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <AlertOctagon className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-amber-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
              Acknowledged / Dispatched
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-700">{counts.ack}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Assistance in progress</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-emerald-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
              Resolved Emergencies
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-700">{counts.resolved}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Closed incident history</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Total Incident Logs
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{counts.total}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Institutional records</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tab Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl self-start">
          <button
            onClick={() => setStatusFilter('ACTIVE_ACK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ACTIVE_ACK'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active & In-Progress ({counts.active + counts.ack})
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Alerts ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'RESOLVED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resolved History ({counts.resolved})
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search driver, bus, route, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
            />
          </div>

          <button
            onClick={() => loadAlerts(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alert Feed Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-600 mb-2" />
          <p className="text-sm font-semibold">Connecting to emergency triage channel...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Emergency Alerts Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {statusFilter === 'ACTIVE_ACK'
              ? 'All fleet routes and buses are operating normally with zero active emergency distress signals.'
              : 'No alerts match the selected filters or search parameters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const isActive = alert.status === 'ACTIVE';
            const isAck = alert.status === 'ACKNOWLEDGED';
            const isResolved = alert.status === 'RESOLVED';
            const isAcknowledging = acknowledgingIds.has(alert.id);
            const hasCoords = typeof alert.latitude === 'number' && typeof alert.longitude === 'number';

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-xs transition-all ${
                  isActive
                    ? 'border-red-300 ring-2 ring-red-100 bg-red-50/20'
                    : isAck
                    ? 'border-amber-300 bg-amber-50/10'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Driver & Emergency Info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {isActive && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-red-600 text-white animate-pulse shadow-xs">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          ACTIVE DISTRESS BEACON
                        </span>
                      )}
                      {isAck && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          ACKNOWLEDGED · ASSISTANCE IN-PROGRESS
                        </span>
                      )}
                      {isResolved && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          RESOLVED
                        </span>
                      )}

                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {formatEmergencyType(alert.emergencyType)}
                      </span>

                      <span className="text-[11px] text-slate-400 font-medium">
                        Dispatched {formatTimeAgo(alert.createdAt)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {alert.driverName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">{alert.driverName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {alert.driverId.slice(0, 8)}</p>
                        </div>
                      </div>

                      {alert.driverPhone && (
                        <a
                          href={`tel:${alert.driverPhone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Call Driver: {alert.driverPhone}
                        </a>
                      )}
                    </div>

                    {/* Route and Bus info */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Bus className="w-4 h-4 text-slate-400" />
                        <span>Bus: <strong className="text-slate-800">{alert.busNumber || 'Assigned Bus'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-slate-400" />
                        <span>Route: <strong className="text-slate-800">{alert.routeName || 'Campus Transit'}</strong></span>
                        {alert.direction && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                            {alert.direction === 'TO_COLLEGE' ? 'To College' : 'Returning Home'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>
                          Location: <strong className="text-slate-800">{alert.locationDescription || (hasCoords ? `${alert.latitude?.toFixed(4)}, ${alert.longitude?.toFixed(4)}` : 'Location unavailable')}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Driver remarks */}
                    {alert.remarks && (
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 max-w-2xl mt-2">
                        <p className="font-bold text-slate-800 mb-0.5">Driver Distress Notes:</p>
                        <p className="italic">"{alert.remarks}"</p>
                      </div>
                    )}

                    {/* Acknowledged / Resolved status metadata */}
                    {(alert.acknowledgedAt || alert.resolvedAt) && (
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                        {alert.acknowledgedAt && (
                          <span>
                            Acknowledged by <strong>{alert.acknowledgedByName || 'Admin'}</strong> at{' '}
                            {new Date(alert.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {alert.resolvedAt && (
                          <span>
                            Resolved by <strong>{alert.resolvedByName || 'Admin'}</strong> at{' '}
                            {new Date(alert.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}

                    {alert.resolutionNotes && (
                      <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 max-w-2xl mt-1">
                        <p className="font-bold text-emerald-950 mb-0.5">Resolution Report:</p>
                        <p>{alert.resolutionNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2.5 shrink-0 pt-2 lg:pt-0">
                    {/* View on Map Button */}
                    {hasCoords && (
                      <button
                        onClick={() => setInspectAlert(alert)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <MapPin className="w-3.5 h-3.5 text-sky-600" />
                        View Live Map Pin
                      </button>
                    )}

                    {/* Acknowledge Button */}
                    {isActive && (
                      <button
                        onClick={() => handleAcknowledge(alert)}
                        disabled={isAcknowledging}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                      >
                        <Clock className={`w-3.5 h-3.5 ${isAcknowledging ? 'animate-spin' : ''}`} />
                        {isAcknowledging ? 'Acknowledging...' : 'Acknowledge Distress'}
                      </button>
                    )}

                    {/* Resolve Button */}
                    {!isResolved && (
                      <button
                        onClick={() => handleOpenResolveModal(alert)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolve Incident
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MAP INSPECTION MODAL */}
      {/* ===================================================================== */}
      {inspectAlert && inspectAlert.latitude && inspectAlert.longitude && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-600" />
                  Driver Distress GPS Pin: {inspectAlert.driverName}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectAlert.busNumber} · {inspectAlert.routeName} · Coordinates: {inspectAlert.latitude.toFixed(5)}, {inspectAlert.longitude.toFixed(5)}
                </p>
              </div>
              <button
                onClick={() => setInspectAlert(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <MapView
                stops={[
                  {
                    stop: {
                      id: `sos-${inspectAlert.id}`,
                      name: `SOS: ${inspectAlert.driverName} (${inspectAlert.busNumber || 'Bus'})`,
                      latitude: inspectAlert.latitude,
                      longitude: inspectAlert.longitude,
                      landmark: inspectAlert.emergencyType,
                    },
                    sequenceNumber: 1,
                    status: 'PENDING',
                  },
                ]}
                currentLocation={{
                  id: `sos-loc-${inspectAlert.id}`,
                  tripId: inspectAlert.tripId || 'sos',
                  latitude: inspectAlert.latitude,
                  longitude: inspectAlert.longitude,
                  speedKmh: 0,
                  heading: 0,
                  recordedAt: inspectAlert.createdAt,
                }}
                busNumber={inspectAlert.busNumber || 'Bus'}
                height="360px"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {inspectAlert.driverPhone ? (
                <a
                  href={`tel:${inspectAlert.driverPhone}`}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call Driver: {inspectAlert.driverPhone}
                </a>
              ) : <div />}

              <button
                onClick={() => setInspectAlert(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* RESOLUTION MODAL */}
      {/* ===================================================================== */}
      {resolveTargetAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Resolve Emergency Distress Incident
                </h3>
                <p className="text-xs text-slate-500">
                  Driver: {resolveTargetAlert.driverName} · Bus: {resolveTargetAlert.busNumber}
                </p>
              </div>
              <button
                onClick={() => setResolveTargetAlert(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Resolution Notes & Corrective Actions Taken:
              </label>
              <textarea
                rows={3}
                placeholder="E.g., Breakdown repaired on site, spare bus deployed for passengers, driver confirmed safe to resume..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400">
                This will mark the distress beacon as <strong>RESOLVED</strong>. The driver and fleet record will be permanently updated.
              </p>
            </div>

            {resolveError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                {resolveError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResolveTargetAlert(null)}
                disabled={isResolving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                disabled={isResolving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className={`w-4 h-4 ${isResolving ? 'animate-spin' : ''}`} />
                {isResolving ? 'Resolving Incident...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
