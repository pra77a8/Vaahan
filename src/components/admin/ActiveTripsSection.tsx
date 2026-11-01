import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Compass,
  Bus,
  Clock,
  MapPin,
  Users,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Shield,
  Filter,
  Car,
  Phone,
  Radio,
  Eye,
  Award,
} from 'lucide-react';
import { Trip, LiveLocation, Stop } from '../../types';
import { getActiveTrips, fetchJourneyManifest } from '../../services/tripService';
import { formatRouteDisplay } from '../../services/routeService';
import { MapView, MapStopItem } from '../common/MapView';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface ActiveTripsSectionProps {
  onNavigateToFleet?: () => void;
  onNavigateToDrivers?: () => void;
}

export const ActiveTripsSection: React.FC<ActiveTripsSectionProps> = ({
  onNavigateToFleet,
  onNavigateToDrivers,
}) => {
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [shiftFilter, setShiftFilter] = useState<string>('ALL');
  const [routeFilter, setRouteFilter] = useState<string>('ALL');
  const [busFilter, setBusFilter] = useState<string>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');

  // Aggregated student pickup stop counts for the selected trip
  const [stopStudentCounts, setStopStudentCounts] = useState<{ [stopIdOrName: string]: number }>({});
  const [manifestLoading, setManifestLoading] = useState<boolean>(false);

  const isMountedRef = useRef(true);

  // Fetch active trips from Supabase/Local
  const loadActiveTrips = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const trips = await getActiveTrips();
      if (!isMountedRef.current) return;
      setActiveTrips(trips);
      setLastSync(new Date());

      // If selected trip is no longer active, select the first active trip or null
      if (trips.length > 0) {
        setSelectedTripId((prev) => {
          if (!prev || !trips.some((t) => t.id === prev)) {
            return trips[0].id;
          }
          return prev;
        });
      } else {
        setSelectedTripId(null);
      }
    } catch (e) {
      console.warn('Error loading active trips for admin live monitor:', e);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        if (showRefreshIndicator) setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadActiveTrips();

    // Poll every 2.5 seconds for fluid live tracking updates
    const pollInterval = setInterval(() => {
      loadActiveTrips(false);
    }, 2500);

    // Optional Supabase Realtime subscription for instantaneous location wakeups
    let channel: any = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel('admin-active-trips-monitor')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'live_locations' },
          (payload) => {
            if (payload?.new) {
              const row = payload.new as any;
              setActiveTrips((prevTrips) =>
                prevTrips.map((t) => {
                  if (t.id === row.trip_id) {
                    return {
                      ...t,
                      latestLocation: {
                        id: row.id,
                        tripId: row.trip_id,
                        latitude: row.latitude,
                        longitude: row.longitude,
                        speedKmh: row.speed_kmh,
                        heading: row.heading,
                        recordedAt: row.recorded_at,
                      },
                    };
                  }
                  return t;
                })
              );
            }
            loadActiveTrips(false);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'trips' },
          () => {
            loadActiveTrips(false);
          }
        )
        .subscribe();
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(pollInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // When selected trip changes, fetch aggregated student distribution for that trip's route & shift
  const selectedTrip = useMemo(() => {
    return activeTrips.find((t) => t.id === selectedTripId) || null;
  }, [activeTrips, selectedTripId]);

  useEffect(() => {
    if (!selectedTrip) {
      setStopStudentCounts({});
      return;
    }

    let active = true;
    setManifestLoading(true);

    fetchJourneyManifest(selectedTrip.routeId, selectedTrip.shiftId)
      .then((manifest: any) => {
        if (!active) return;
        const counts: { [stopIdOrName: string]: number } = {};
        for (const item of manifest) {
          const key = item.pickupStopName || item.pickupStopId || 'Unassigned';
          counts[key] = (counts[key] || 0) + 1;
        }
        setStopStudentCounts(counts);
      })
      .catch((err: any) => {
        console.warn('Error fetching aggregated stop counts:', err);
      })
      .finally(() => {
        if (active) setManifestLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedTrip?.id, selectedTrip?.shiftId, selectedTrip?.routeId]);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return activeTrips.filter((t) => {
      if (shiftFilter !== 'ALL') {
        const shiftCode = t.shift?.code || (t.shiftId?.includes('general') ? 'GENERAL' : 'MORNING');
        if (shiftCode !== shiftFilter && t.shiftId !== shiftFilter) return false;
      }

      if (routeFilter !== 'ALL' && t.routeId !== routeFilter) {
        return false;
      }

      if (busFilter !== 'ALL' && t.bus?.busNumber !== busFilter && t.busId !== busFilter) {
        return false;
      }

      if (modeFilter !== 'ALL' && t.mode !== modeFilter) {
        return false;
      }

      return true;
    });
  }, [activeTrips, shiftFilter, routeFilter, busFilter, modeFilter]);

  // Format MapStopItem array for MapView
  const mapStops: MapStopItem[] = useMemo(() => {
    if (!selectedTrip || !selectedTrip.tripStops) return [];
    return selectedTrip.tripStops.map((ts, idx) => ({
      stop: ts.stop,
      sequenceNumber: ts.sequenceNumber || idx + 1,
      status: ts.status,
      isPickupEligible: true,
    }));
  }, [selectedTrip]);

  // Current stop and next stop info
  const stopStats = useMemo(() => {
    if (!selectedTrip || !selectedTrip.tripStops || selectedTrip.tripStops.length === 0) {
      return {
        currentStopName: 'En Route',
        nextStopName: 'Destination',
        completedCount: 0,
        totalCount: 0,
        remainingCount: 0,
        percent: 0,
      };
    }

    const stops = selectedTrip.tripStops;
    const totalCount = stops.length;
    const completedCount = stops.filter((s) => s.status === 'REACHED').length;
    const remainingCount = Math.max(0, totalCount - completedCount);
    const percent = Math.min(100, Math.round((completedCount / Math.max(1, totalCount)) * 100));

    const currIdx = selectedTrip.currentStopIndex || 0;
    const currentStop = stops[currIdx]?.stop?.name || (completedCount > 0 ? stops[completedCount - 1]?.stop?.name : stops[0]?.stop?.name);
    const nextStop = stops[currIdx + 1]?.stop?.name || (completedCount < totalCount ? stops[completedCount]?.stop?.name : 'Terminal Destination');

    return {
      currentStopName: currentStop,
      nextStopName: nextStop,
      completedCount,
      totalCount,
      remainingCount,
      percent,
    };
  }, [selectedTrip]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations Monitoring
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">KKWIEER Real-Time Fleet Control</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Active Trips Command Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time live map tracking of institutional buses currently on route across Nashik. View stop progression, live GPS breadcrumbs, and aggregated student boarding.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>
              Active In-Progress:{' '}
              <strong className="text-emerald-700 font-extrabold text-sm">{activeTrips.length}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => loadActiveTrips(true)}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
            title="Force refresh active trips"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="font-bold text-slate-600 flex items-center gap-1 text-[11px] uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filters:
          </span>

          {/* Shift Filter */}
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <option value="ALL">All Shifts</option>
            <option value="MORNING">Morning Shift</option>
            <option value="GENERAL">General Shift</option>
          </select>

          {/* Route Filter */}
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 max-w-[200px]"
          >
            <option value="ALL">All Routes</option>
            {Array.from(new Set(activeTrips.map((t) => t.routeId))).map((rId) => {
              const tripMatch = activeTrips.find((t) => t.routeId === rId);
              return (
                <option key={rId} value={rId}>
                  {tripMatch?.route ? formatRouteDisplay(tripMatch.route) : rId}
                </option>
              );
            })}
          </select>

          {/* Bus Filter */}
          <select
            value={busFilter}
            onChange={(e) => setBusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <option value="ALL">All Buses</option>
            {Array.from(new Set(activeTrips.map((t) => t.bus?.busNumber || t.busId))).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Mode Filter */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <option value="ALL">All Modes</option>
            <option value="SIMULATION">Simulation Mode</option>
            <option value="LIVE_GPS">Live GPS</option>
          </select>
        </div>

        {lastSync && (
          <span className="text-[11px] text-slate-400 font-mono">
            Synced: {lastSync.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800">Checking Active Transit Trips...</p>
          <p className="text-xs text-slate-500 mt-1">Connecting to live Supabase trip feeds</p>
        </div>
      ) : activeTrips.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-10 sm:p-14 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto shadow-2xs">
            <Bus className="w-8 h-8 text-slate-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-extrabold text-slate-900">
              No Bus Trips Currently In Progress
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              There are no active buses on route right now. When an authorized driver begins a journey from the Driver Portal (in either <strong>Live GPS</strong> or <strong>Simulation Mode</strong>), the live journey, bus marker, and stop progress will immediately stream to this map.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {onNavigateToDrivers && (
              <button
                type="button"
                onClick={onNavigateToDrivers}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Car className="w-3.5 h-3.5" />
                <span>Driver Management & Roster</span>
              </button>
            )}
            {onNavigateToFleet && (
              <button
                type="button"
                onClick={onNavigateToFleet}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Bus className="w-3.5 h-3.5" />
                <span>View Fleet Logbook & Operating Calendars</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Active Trips Grid & Tracking Map Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Trip Selector Cards */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Active Trips ({filteredTrips.length})
              </span>
              <span className="text-[11px] text-slate-400">Select bus to track</span>
            </div>

            <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
              {filteredTrips.map((t) => {
                const isSelected = t.id === selectedTripId;
                const formattedRoute = t.route ? formatRouteDisplay(t.route) : `Route ${t.routeId}`;
                const shiftName = t.shift?.name || (t.shiftId?.includes('morning') ? 'Morning Shift' : 'General Shift');

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTripId(t.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-500 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900">
                            {t.bus?.busNumber || 'Bus 01'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {t.direction === 'TO_COLLEGE' ? 'To College' : 'Returning Home'}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              t.mode === 'SIMULATION'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {t.mode === 'SIMULATION' ? 'SIMULATION' : 'LIVE GPS'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 mt-1">
                          {formattedRoute}
                        </h4>
                        <p className="text-[11px] text-slate-500">{shiftName}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">Live</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">{t.driver?.name || 'Driver'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span><strong>{t.assignedStudentCount || 0}</strong> Students</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.startedAt ? new Date(t.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Started'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Map & Progression Telemetry */}
          <div className="lg:col-span-7 space-y-4">
            {selectedTrip ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Selected Trip Quick Banner */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                        {selectedTrip.mode === 'SIMULATION' ? 'Persistent Simulation' : 'Live Road GPS'}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-emerald-400 font-bold">
                        {selectedTrip.bus?.busNumber} ({selectedTrip.bus?.plateNumber || selectedTrip.bus?.registration || 'MH-15'})
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                      {selectedTrip.route ? formatRouteDisplay(selectedTrip.route) : `Route ${selectedTrip.routeId}`}
                    </h3>
                    <p className="text-xs text-slate-300">
                      Driver: <strong>{selectedTrip.driver?.name}</strong>
                      {selectedTrip.driver?.phone && ` (${selectedTrip.driver.phone})`}
                      {' · '}
                      Direction: <strong>{selectedTrip.direction === 'TO_COLLEGE' ? 'To College Campus' : 'Returning Home'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Speed / Heading</span>
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        {selectedTrip.latestLocation?.speedKmh ? `${Math.round(selectedTrip.latestLocation.speedKmh)} km/h` : '24 km/h'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Map View */}
                <div className="relative">
                  <MapView
                    stops={mapStops}
                    currentLocation={selectedTrip.latestLocation}
                    busNumber={selectedTrip.bus?.busNumber || 'Bus'}
                    speedKmh={selectedTrip.latestLocation?.speedKmh || 25}
                    height="420px"
                    zoom={13}
                    interactive={true}
                    provider="leaflet"
                  />

                  {/* Mode Watermark Overlay */}
                  <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-[11px] font-bold flex items-center gap-1.5 text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live GPS Telemetry</span>
                  </div>
                </div>

                {/* Live Progress Panel */}
                <div className="p-5 space-y-4 bg-slate-50/60 border-t border-slate-200">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Stop</span>
                      <span className="font-extrabold text-slate-900 text-xs block truncate mt-0.5" title={stopStats.currentStopName}>
                        {stopStats.currentStopName}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Next Stop</span>
                      <span className="font-extrabold text-emerald-700 text-xs block truncate mt-0.5" title={stopStats.nextStopName}>
                        {stopStats.nextStopName}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Stops Completed</span>
                      <span className="font-extrabold text-slate-900 text-xs block mt-0.5">
                        {stopStats.completedCount} / {stopStats.totalCount} ({stopStats.remainingCount} left)
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Last GPS Ping</span>
                      <span className="font-mono font-bold text-slate-800 text-xs block mt-0.5">
                        {selectedTrip.latestLocation?.recordedAt
                          ? new Date(selectedTrip.latestLocation.recordedAt).toLocaleTimeString()
                          : 'Live Synced'}
                      </span>
                    </div>
                  </div>

                  {/* Route Progress Bar */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Journey Progression</span>
                      <span className="font-extrabold text-emerald-700 font-mono">{stopStats.percent}% Complete</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${stopStats.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Aggregated Student Pickup Distribution (Privacy-Safe Aggregates) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <h5 className="font-bold text-slate-900 text-xs">
                          Student Pickup Stop Distribution (Aggregated Manifest)
                        </h5>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Total Enrolled: {selectedTrip.assignedStudentCount || 0}
                      </span>
                    </div>

                    {manifestLoading ? (
                      <p className="text-xs text-slate-400 italic">Loading student counts...</p>
                    ) : Object.keys(stopStudentCounts).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No approved student registrations currently allocated to this route and shift.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Object.entries(stopStudentCounts).map(([stopName, count]) => (
                          <div
                            key={stopName}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          >
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-slate-800">{stopName}:</span>
                            <span className="font-extrabold text-emerald-700 px-1.5 py-0.2 rounded bg-emerald-100 text-[11px]">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400">
                <p className="text-xs font-semibold">Select an active trip from the left panel to inspect live map telemetry.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
