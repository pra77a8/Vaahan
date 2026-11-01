import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Clock,
  Phone,
  Gauge,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Compass,
  ArrowRight,
  Info,
  Calendar,
  Radio,
  ExternalLink,
  Layers,
  Map as MapIcon,
  Sparkles,
} from 'lucide-react';
import { MapView } from '../common/MapView';
import { StudentProfile, Trip, TripDirection, LiveLocation, DirectionalRouteStop } from '../../types';
import { getEligibleTripForStudent, getLatestLocation } from '../../services/tripService';
import { fetchDirectionalRouteStops, formatRouteDisplay } from '../../services/routeService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

const isUuid = (val?: string | null): boolean =>
  !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

interface TrackBusViewProps {
  student: StudentProfile;
  onNavigateTab: (tab: string) => void;
}

export const TrackBusView: React.FC<TrackBusViewProps> = ({ student, onNavigateTab }) => {
  const [selectedDirection, setSelectedDirection] = useState<TripDirection>('TO_COLLEGE');
  const [preTripStops, setPreTripStops] = useState<DirectionalRouteStop[]>([]);
  const [activeTripState, setActiveTripState] = useState<{
    trip: Trip | null;
    matchingTrips: Trip[];
    status: 'ELIGIBLE' | 'NO_ACTIVE_TRIP' | 'STOP_PASSED' | 'PENDING_APPROVAL' | 'NOT_ENROLLED';
    message: string;
  }>({
    trip: null,
    matchingTrips: [],
    status: 'NO_ACTIVE_TRIP',
    message: 'Checking active fleet status...',
  });

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [liveBusLocation, setLiveBusLocation] = useState<LiveLocation | null>(null);
  const checkEligibilityRef = useRef<(() => void) | undefined>(undefined);

  // 1. Fetch official directional stops for the student's route & direction (for pre-trip map preview)
  useEffect(() => {
    if (student.transport?.routeId) {
      fetchDirectionalRouteStops(student.transport.routeId, selectedDirection).then((stops) => {
        setPreTripStops(stops);
      });
    }
  }, [student.transport?.routeId, selectedDirection]);

  // 2. Poll for active eligible trip for this student
  useEffect(() => {
    let isMounted = true;

    const checkEligibility = async () => {
      let result = await getEligibleTripForStudent(
        student.transport?.shiftId,
        student.transport?.routeId,
        student.transport?.pickupStopId,
        student.status,
        selectedDirection
      );

      if (!isMounted) return;

      // Auto-sync direction if the user has selected a direction with no active trip,
      // but an active trip is currently running in the alternate direction
      if (result.status === 'NO_ACTIVE_TRIP') {
        const altDirection: TripDirection =
          selectedDirection === 'TO_COLLEGE' ? 'RETURNING_HOME' : 'TO_COLLEGE';
        const altResult = await getEligibleTripForStudent(
          student.transport?.shiftId,
          student.transport?.routeId,
          student.transport?.pickupStopId,
          student.status,
          altDirection
        );
        if (altResult.trip && altResult.status !== 'NO_ACTIVE_TRIP') {
          setSelectedDirection(altDirection);
          result = altResult;
        }
      }

      setActiveTripState(result);

      // Select active trip if available
      const active =
        result.matchingTrips.find((t) => t.id === selectedTripId) || result.trip;

      if (active) {
        const loc = getLatestLocation(active.id) || active.latestLocation;
        if (loc) {
          setCurrentSpeed(loc.speedKmh);
        }
      } else {
        setCurrentSpeed(0);
      }
      checkEligibilityRef.current = checkEligibility;
    };

    checkEligibilityRef.current = checkEligibility;
    checkEligibility();
    const interval = setInterval(checkEligibility, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [student, selectedDirection, selectedTripId]);

  const { trip, matchingTrips, status, message } = activeTripState;
  const currentTrip = matchingTrips.find((t) => t.id === selectedTripId) || trip;
  const isTripActive = Boolean(currentTrip && status !== 'NO_ACTIVE_TRIP');

  // 3. Real-time GPS location streaming & Realtime database subscriber
  useEffect(() => {
    if (!currentTrip?.id) {
      setLiveBusLocation(null);
      return;
    }

    let isMounted = true;

    // Immediately seed with latest known location
    const initialLoc = currentTrip.latestLocation || getLatestLocation(currentTrip.id);
    if (initialLoc) {
      setLiveBusLocation(initialLoc);
      setCurrentSpeed(initialLoc.speedKmh);
    }

    // High-frequency polling (1200ms) for guaranteed fluid movement across all conditions
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;

      const local = getLatestLocation(currentTrip.id);
      if (local) {
        setLiveBusLocation(local);
        setCurrentSpeed(local.speedKmh);
      }

      if (isSupabaseConfigured() && isUuid(currentTrip.id)) {
        try {
          const { data, error } = await supabase
            .from('live_locations')
            .select('*')
            .eq('trip_id', currentTrip.id)
            .order('recorded_at', { ascending: false })
            .limit(1);

          if (isMounted && !error && data && data.length > 0) {
            const row = data[0];
            const loc: LiveLocation = {
              id: row.id,
              tripId: row.trip_id,
              latitude: row.latitude,
              longitude: row.longitude,
              speedKmh: row.speed_kmh,
              heading: row.heading,
              recordedAt: row.recorded_at,
            };
            setLiveBusLocation(loc);
            setCurrentSpeed(loc.speedKmh);
          }
        } catch {
          // ignore transient poll error
        }
      }
    }, 1200);

    // Supabase Realtime channel for instant push updates
    let channel: any = null;
    if (isSupabaseConfigured() && isUuid(currentTrip.id)) {
      channel = supabase
        .channel(`student-live-tracking-${currentTrip.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_locations',
            filter: `trip_id=eq.${currentTrip.id}`,
          },
          (payload) => {
            if (!isMounted || !payload.new) return;
            const row = payload.new as any;
            const loc: LiveLocation = {
              id: row.id,
              tripId: row.trip_id,
              latitude: row.latitude,
              longitude: row.longitude,
              speedKmh: row.speed_kmh,
              heading: row.heading,
              recordedAt: row.recorded_at,
            };
            setLiveBusLocation(loc);
            setCurrentSpeed(loc.speedKmh);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trip_stops',
            filter: `trip_id=eq.${currentTrip.id}`,
          },
          () => {
            if (isMounted) {
              checkEligibilityRef.current?.();
            }
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentTrip?.id]);

  // ---------------------------------------------------------------------------
  // 1. PENDING APPROVAL STATE
  // ---------------------------------------------------------------------------
  if (student.status !== 'approved') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Account Status: Pending Approval
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Live GPS Tracking Locked
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Your college registration with PRN <strong className="text-slate-800">{student.prn}</strong> is currently awaiting administrative approval by the Transport Cell.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 max-w-lg mx-auto text-left space-y-2">
            <p className="font-bold text-slate-800">Assigned Transportation Details:</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Shift:</span>
                <span className="font-semibold">{student.transport?.shiftName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Route:</span>
                <span className="font-semibold">{student.transport?.routeName}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Pickup Stop:</span>
                <span className="font-semibold text-sky-800">{student.transport?.pickupStopName}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            For urgent approval, visit Room 104, Campus Transport Cell or call 0253-2512876.
          </p>
        </div>
      </div>
    );
  }

  // Helper variables for tracking view
  const studentPickupId = student.transport?.pickupStopId;

  // Compute live bus coordinate or starting depot terminal location
  const busLocation: LiveLocation | null = useMemo(() => {
    if (liveBusLocation) {
      return liveBusLocation;
    }
    if (currentTrip) {
      return getLatestLocation(currentTrip.id) || currentTrip.latestLocation || null;
    }
    if (preTripStops.length > 0) {
      const firstStop = preTripStops[0].stop;
      return {
        id: `pre-terminal-${firstStop.id}`,
        tripId: 'pre-trip-terminal',
        latitude: firstStop.latitude,
        longitude: firstStop.longitude,
        speedKmh: 0,
        heading: 0,
        recordedAt: new Date().toISOString(),
      };
    }
    return null;
  }, [liveBusLocation, currentTrip, preTripStops]);

  // Stops to plot on map
  const mapStops = useMemo(() => {
    if (currentTrip && currentTrip.tripStops.length > 0) {
      return currentTrip.tripStops.map((ts) => ({
        stop: ts.stop,
        sequenceNumber: ts.sequenceNumber,
        isStudentPickup: ts.stopId === studentPickupId,
        status: ts.status,
      }));
    }
    return preTripStops.map((ds, idx) => ({
      stop: ds.stop,
      sequenceNumber: idx + 1,
      isStudentPickup: ds.stopId === studentPickupId,
      status: 'PENDING' as const,
    }));
  }, [currentTrip, preTripStops, studentPickupId]);

  const currentStopObj = currentTrip?.tripStops[currentTrip.currentStopIndex]?.stop;
  const nextStopObj = currentTrip?.tripStops[currentTrip.currentStopIndex + 1]?.stop;
  const remainingStopsCount = currentTrip
    ? Math.max(0, currentTrip.tripStops.length - 1 - currentTrip.currentStopIndex)
    : preTripStops.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Direction Selection Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Journey Direction:</span>
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setSelectedDirection('TO_COLLEGE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDirection === 'TO_COLLEGE'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              To College
            </button>
            <button
              onClick={() => setSelectedDirection('RETURNING_HOME')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDirection === 'RETURNING_HOME'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Returning Home
            </button>
          </div>
        </div>

        {matchingTrips.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">Multiple Active Buses:</span>
            <select
              value={selectedTripId || currentTrip?.id || ''}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-900"
            >
              {matchingTrips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.bus?.busNumber} ({t.bus?.plateNumber}) · Driver {t.driver?.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TOP HEADER STATUS BANNER */}
      {isTripActive && currentTrip ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                {currentTrip.mode === 'SIMULATION' ? 'Simulated Demonstration Run' : 'Live Transit Broadcast'}
              </span>
              <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                {currentTrip.direction === 'TO_COLLEGE' ? 'To College' : 'Returning Home'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {currentTrip.route ? formatRouteDisplay(currentTrip.route) : student.transport?.routeName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your Boarding Point: <strong className="text-slate-800">{student.transport?.pickupStopName}</strong> · Scheduled: <strong>{student.transport?.pickupTime || '07:30 AM'}</strong>
            </p>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle</span>
              <span className="text-sm font-extrabold text-slate-900">{currentTrip.bus?.busNumber || 'Scheduled Bus'}</span>
              <span className="text-[10px] text-slate-500 font-mono block">{currentTrip.bus?.plateNumber}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Speed</span>
              <span className="text-sm font-extrabold text-sky-700 font-mono">{currentSpeed} km/h</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Driver</span>
              <span className="text-xs font-bold text-slate-800 truncate block max-w-[100px]">
                {currentTrip.driver?.name?.split(' ')[0] || 'Assigned Driver'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Pre-Trip Inactive / Not Started Yet State */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Bus Trip Not Started Yet
              </span>
              <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                {selectedDirection === 'TO_COLLEGE' ? 'To College' : 'Returning Home'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {student.transport?.routeName ? formatRouteDisplay({ name: student.transport.routeName }) : 'Campus Transit'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your Boarding Point: <strong className="text-slate-800">{student.transport?.pickupStopName}</strong> · Scheduled Pickup: <strong>{student.transport?.pickupTime || '07:30 AM'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle</span>
              <span className="text-sm font-extrabold text-slate-900">{(student as any).assignedBusNumber || 'Scheduled Bus'}</span>
              <span className="text-[10px] text-slate-500 font-mono block">Stationary</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Speed</span>
              <span className="text-sm font-extrabold text-slate-600 font-mono">0 km/h</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Shift</span>
              <span className="text-xs font-bold text-slate-800 truncate block max-w-[100px]">
                {student.transport?.shiftName || 'Morning'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stop Passed Banner if bus has passed student's stop */}
      {status === 'STOP_PASSED' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Bus Has Already Departed Your Pickup Stop</p>
            <p className="text-amber-800 mt-0.5">{message}</p>
          </div>
        </div>
      )}

      {/* MAP & STOP SEQUENCE LAYOUT (ALWAYS RENDERED WITH BUS LOCATION) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <MapView
            stops={mapStops}
            currentLocation={busLocation}
            busNumber={currentTrip?.bus?.busNumber || (student as any).assignedBusNumber || 'Scheduled Bus'}
            speedKmh={currentSpeed}
            height="480px"
          />

          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-200" />
              <span>
                <strong>Gold Star (★):</strong> Your Designated Pickup Stop ({student.transport?.pickupStopName})
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              {isTripActive ? (
                <>
                  <span>Current: <strong>{currentStopObj?.name || 'In Transit'}</strong></span>
                  <span>Next: <strong>{nextStopObj?.name || 'Destination Campus'}</strong></span>
                  <span>Remaining: <strong>{remainingStopsCount} stops</strong></span>
                </>
              ) : (
                <span className="text-amber-800 font-medium">
                  Bus stationary at starting terminal. Live motion will begin as soon as driver starts the trip run.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sliced Stop Checklist Timeline */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isTripActive ? 'Stop Progress Timeline' : 'Planned Route Stop Sequence'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {mapStops.length} ordered stops · {selectedDirection === 'TO_COLLEGE' ? 'Towards Campus' : 'Returning Home'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {mapStops.map((s, idx) => {
              const isStudentStop = s.isStudentPickup;
              const isReached = s.status === 'REACHED';
              const isCurrent = isTripActive && currentTrip?.currentStopIndex === idx;

              return (
                <div
                  key={`${s.stop.id}-${(s as any).sequenceNumber ?? idx}`}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    isStudentStop
                      ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-200'
                      : isCurrent
                      ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-200'
                      : isReached
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isStudentStop
                          ? 'bg-amber-500 text-white shadow-xs'
                          : isReached
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-sky-600 text-white animate-pulse'
                          : 'bg-white border border-slate-300 text-slate-600'
                      }`}
                    >
                      {isStudentStop ? '★' : isReached ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-bold text-slate-900 truncate">{s.stop.name}</p>
                      {isStudentStop && (
                        <span className="text-[10px] text-amber-800 font-extrabold block">
                          ★ Your Boarding Point
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isReached
                        ? 'bg-emerald-100 text-emerald-800'
                        : isCurrent
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isReached ? 'DEPARTED' : isCurrent ? 'APPROACHING' : 'UPCOMING'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* SECTION 6: GOOGLE MAPS API INTEGRATION POSTER (PLANNED ENHANCEMENT)    */}
      {/* Placed immediately below the tracking/simulation section               */}
      {/* Clean Google Maps-inspired aesthetic, strictly informational            */}
      {/* No fake status indicators, no API keys exposed                          */}
      {/* ======================================================================= */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-sky-50/40 rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <svg viewBox="0 0 200 200" className="w-full h-full text-sky-600 fill-current">
            <path d="M40 20 L80 10 L120 25 L160 15 L160 170 L120 180 L80 165 L40 180 Z" stroke="currentColor" strokeWidth="4" fill="none" />
            <line x1="80" y1="10" x2="80" y2="165" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="120" y1="25" x2="120" y2="180" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-sky-600" />
              <span>Planned Integration</span>
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-500">Upcoming Architecture Roadmap</span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <MapIcon className="w-6 h-6 text-sky-600" />
              <span>Google Maps API Integration</span>
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-sky-900/80 mt-0.5">
              Planned map enhancement for Vaahan
            </p>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Vaahan currently operates with Leaflet and OpenStreetMap. A future integration phase with the Google Maps Platform is designed to support:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Road-Level Visualization</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Detailed municipal Nashik road rendering and high-resolution topological context.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span>Snapping to Roads</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Accurate road-based bus path alignment avoiding straight-line approximations.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Traffic-Aware ETA Estimates</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Predictive arrival times accounting for peak college traffic on Dwarka and CBS corridors.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Enhanced Navigation Context</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Clear landmarks and visual cues around designated student pickup stops.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic pt-1">
            * Note: Existing Leaflet and OpenStreetMap tracking functions independently without third-party API keys or external billing.
          </p>
        </div>
      </div>
    </div>
  );
};
