import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Car,
  Compass,
  Play,
  Square,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  History,
  User,
  HelpCircle,
  Bus,
  Gauge,
  Phone,
  ShieldCheck,
  ChevronRight,
  Navigation,
  ArrowRight,
  Search,
  Filter,
  Users,
  Calendar,
  AlertCircle,
  Radio,
  FastForward,
  Pause,
  RotateCcw,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';
import { LeafletMap } from '../common/LeafletMap';
import { MapView } from '../common/MapView';
import {
  DriverProfile,
  DriverActiveTab,
  Shift,
  OfficialRoute,
  Trip,
  BusVehicle,
  TripDirection,
  TripMode,
  DirectionalRouteStop,
  JourneyStudentManifest,
  LiveLocation,
  SosAlert,
} from '../../types';
import {
  fetchShifts,
  fetchRoutesByShift,
  fetchDirectionalRouteStops,
  formatRouteDisplay,
} from '../../services/routeService';
import {
  startTrip,
  getDriverActiveTrip,
  getDriverTripHistory,
  updateTripGps,
  markStopReached,
  endTrip,
  getLatestLocation,
  checkBusAvailability,
  getJourneyStudentManifest,
  broadcastDriverReadiness,
  dispatchTransitNotification,
} from '../../services/tripService';
import { generateLegWaypoints } from '../../services/simulationRoadService';
import { fetchFleetBuses } from '../../services/fleetService';
import { getAuthenticatedDriverProfile } from '../../services/driverService';
import {
  createSosAlert,
  fetchDriverActiveSosAlert,
  subscribeSosAlerts,
} from '../../services/sosService';

interface DriverPortalProps {
  driver: DriverProfile;
  onSignOut: () => void;
  activeTab?: DriverActiveTab;
  onTabChange?: (tab: DriverActiveTab) => void;
}

export const DriverPortal: React.FC<DriverPortalProps> = ({
  driver,
  onSignOut,
  activeTab: controlledTab,
  onTabChange,
}) => {
  const [currentDriver, setCurrentDriver] = useState<DriverProfile>(driver);
  const [activeTab, setActiveTabState] = useState<DriverActiveTab>(controlledTab || 'dashboard');

  useEffect(() => {
    setCurrentDriver(driver);
  }, [driver]);

  // Synchronize authentic driver profile from Supabase on mount
  useEffect(() => {
    getAuthenticatedDriverProfile().then((res) => {
      if (res.success && res.driver) {
        setCurrentDriver(res.driver);
      }
    });
  }, []);

  useEffect(() => {
    if (controlledTab) {
      setActiveTabState(controlledTab);
    }
  }, [controlledTab]);

  const setActiveTab = (tab: DriverActiveTab) => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };

  // Active Trip State
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [tripHistory, setTripHistory] = useState<Trip[]>([]);

  // Fleet buses from database
  const [fleetBuses, setFleetBuses] = useState<BusVehicle[]>([]);

  // Start Trip Form State
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [routes, setRoutes] = useState<OfficialRoute[]>([]);
  const [directionalStops, setDirectionalStops] = useState<DirectionalRouteStop[]>([]);

  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedDirection, setSelectedDirection] = useState<TripDirection>('TO_COLLEGE');
  const [tripDate, setTripDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [tripMode, setTripMode] = useState<TripMode>('SIMULATION');
  const [tripRemarks, setTripRemarks] = useState<string>('');

  // Bus Availability & Capacity State
  const [busAvailability, setBusAvailability] = useState<{ available: boolean; reason?: string }>({ available: true });
  const [studentManifest, setStudentManifest] = useState<JourneyStudentManifest[]>([]);
  const [manifestLoading, setManifestLoading] = useState<boolean>(false);
  const [manifestSearch, setManifestSearch] = useState<string>('');
  const [manifestStopFilter, setManifestStopFilter] = useState<string>('ALL');

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isStartingTrip, setIsStartingTrip] = useState<boolean>(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Driver Authentication Verification State
  const [driverAuthVerified, setDriverAuthVerified] = useState<boolean>(true);
  const [driverAuthError, setDriverAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getAuthenticatedDriverProfile().then((res) => {
      if (!isMounted) return;
      if (!res.success) {
        setDriverAuthVerified(false);
        setDriverAuthError(res.error || 'Driver account verification failed. Please sign in to the Driver Console.');
      } else {
        setDriverAuthVerified(true);
        setDriverAuthError(null);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Driver Ready Broadcast State
  const [isDriverReady, setIsDriverReady] = useState<boolean>(false);
  const [readyStatusMessage, setReadyStatusMessage] = useState<string | null>(null);
  const [isBroadcastingReady, setIsBroadcastingReady] = useState<boolean>(false);
  const approachedStopsRef = useRef<Set<string>>(new Set());

  // SOS Emergency Beacon State
  const [activeSosAlert, setActiveSosAlert] = useState<SosAlert | null>(null);
  const [showSosModal, setShowSosModal] = useState<boolean>(false);
  const [sosEmergencyType, setSosEmergencyType] = useState<string>('VEHICLE_BREAKDOWN');
  const [sosCustomRemarks, setSosCustomRemarks] = useState<string>('');
  const [isSubmittingSos, setIsSubmittingSos] = useState<boolean>(false);
  const [sosSubmitSuccess, setSosSubmitSuccess] = useState<string | null>(null);
  const [sosSubmitError, setSosSubmitError] = useState<string | null>(null);

  // Synchronize driver SOS alert state with Supabase & Realtime
  useEffect(() => {
    if (!currentDriver?.id) return;
    let isMounted = true;

    fetchDriverActiveSosAlert(currentDriver.id).then((alert) => {
      if (isMounted) {
        setActiveSosAlert(alert);
      }
    });

    const unsubscribe = subscribeSosAlerts((alert) => {
      if (!isMounted) return;
      if (alert.driverId === currentDriver.id) {
        if (alert.status === 'RESOLVED') {
          setActiveSosAlert(null);
          setSosSubmitSuccess('Your emergency distress signal was marked as RESOLVED by Transport Admin.');
          setTimeout(() => setSosSubmitSuccess(null), 8000);
        } else {
          setActiveSosAlert(alert);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentDriver?.id]);

  // Telemetry & GPS State
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [currentLocation, setCurrentLocation] = useState<LiveLocation | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isSimPaused, setIsSimPaused] = useState<boolean>(false);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState<number>(1.0);
  const [simPersistError, setSimPersistError] = useState<string | null>(null);

  const activeTripRef = useRef<Trip | null>(activeTrip);
  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  const watchIdRef = useRef<number | null>(null);
  const simTimerRef = useRef<any>(null);
  const simStepFractionRef = useRef<number>(0);

  // 1. Initial Load: Shifts, Fleet Buses, Active Trip, History
  useEffect(() => {
    fetchShifts().then((data) => {
      setShifts(data);
      if (data.length > 0) setSelectedShiftId(data[0].id);
    });

    fetchFleetBuses().then((buses) => {
      setFleetBuses(buses);
      if (buses.length > 0) setSelectedBusId(buses[0].id);
    });

    getDriverActiveTrip(currentDriver.id).then((active) => {
      if (active) {
        setActiveTrip(active);
        activeTripRef.current = active;
        if (active.latestLocation) {
          setCurrentLocation(active.latestLocation);
          setCurrentSpeed(active.latestLocation.speedKmh);
        } else if (active.tripStops[active.currentStopIndex]?.stop) {
          const st = active.tripStops[active.currentStopIndex].stop;
          setCurrentLocation({
            id: `init-${active.id}`,
            tripId: active.id,
            latitude: st.latitude,
            longitude: st.longitude,
            speedKmh: 0,
            heading: 0,
            recordedAt: new Date().toISOString(),
          });
        }
        if (!controlledTab || controlledTab === 'dashboard') {
          setActiveTabState('active-trip');
          onTabChange?.('active-trip');
        }
      }
    });

    getDriverTripHistory(currentDriver.id).then((history) => {
      setTripHistory(history);
    });
  }, [currentDriver.id]);

  // 2. Load Routes when Shift changes
  useEffect(() => {
    if (!selectedShiftId) return;
    fetchRoutesByShift(selectedShiftId).then((rList) => {
      setRoutes(rList);
      if (rList.length > 0) {
        setSelectedRouteId(rList[0].id);
      } else {
        setSelectedRouteId('');
        setDirectionalStops([]);
      }
    });
  }, [selectedShiftId]);

  // 3. Load Direction-Specific Ordered Stops when Route or Direction changes
  useEffect(() => {
    if (!selectedRouteId) return;
    fetchDirectionalRouteStops(selectedRouteId, selectedDirection).then((stops) => {
      setDirectionalStops(stops);
    });
  }, [selectedRouteId, selectedDirection]);

  // 4. Load Verified Student Manifest & Check Bus Availability
  useEffect(() => {
    if (!selectedRouteId || !selectedShiftId) {
      setStudentManifest([]);
      return;
    }

    setManifestLoading(true);
    getJourneyStudentManifest(selectedRouteId, selectedShiftId, selectedDirection)
      .then((students) => {
        setStudentManifest(students);
      })
      .finally(() => {
        setManifestLoading(false);
      });
  }, [selectedRouteId, selectedShiftId, selectedDirection]);

  // 5. Verify Bus Availability whenever selectedBusId changes
  useEffect(() => {
    if (!selectedBusId) return;
    checkBusAvailability(selectedBusId).then((res) => {
      setBusAvailability(res);
    });
  }, [selectedBusId]);

  // Reset Driver Ready status when parameters change
  useEffect(() => {
    setIsDriverReady(false);
    setReadyStatusMessage(null);
  }, [selectedShiftId, selectedRouteId, selectedBusId, selectedDirection]);

  // Broadcast Driver Readiness (Event A)
  const handleBroadcastDriverReady = async () => {
    if (!selectedRouteId || !selectedShiftId || !selectedBusId) return;
    setIsBroadcastingReady(true);
    setReadyStatusMessage(null);
    try {
      const res = await broadcastDriverReadiness({
        driverId: currentDriver.id,
        routeId: selectedRouteId,
        shiftId: selectedShiftId,
        busId: selectedBusId,
        direction: selectedDirection,
      });
      setIsDriverReady(true);
      setReadyStatusMessage(res.message || `Readiness alert broadcasted to ${res.count} student(s)!`);
    } catch (e: any) {
      setReadyStatusMessage(`Broadcast failed: ${e.message}`);
    } finally {
      setIsBroadcastingReady(false);
    }
  };

  // Filtered Student Manifest
  const filteredManifest = useMemo(() => {
    return studentManifest.filter((student) => {
      const matchesSearch =
        student.fullName.toLowerCase().includes(manifestSearch.toLowerCase()) ||
        student.prn.toLowerCase().includes(manifestSearch.toLowerCase()) ||
        student.department.toLowerCase().includes(manifestSearch.toLowerCase());

      const matchesStop =
        manifestStopFilter === 'ALL' || student.pickupStopId === manifestStopFilter;

      return matchesSearch && matchesStop;
    });
  }, [studentManifest, manifestSearch, manifestStopFilter]);

  // Grouped counts by pickup stop
  const manifestByStopCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of studentManifest) {
      counts.set(s.pickupStopId, (counts.get(s.pickupStopId) || 0) + 1);
    }
    return counts;
  }, [studentManifest]);

  const selectedBus = useMemo(() => {
    return fleetBuses.find((b) => b.id === selectedBusId);
  }, [fleetBuses, selectedBusId]);

  const selectedRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId);
  }, [routes, selectedRouteId]);

  const isCapacityExceeded = Boolean(
    selectedBus && studentManifest.length > selectedBus.capacity
  );

  const startTripMapStops = useMemo(() => {
    return directionalStops.map((ds, idx) => ({
      stop: ds.stop,
      sequenceNumber: idx + 1,
      isPickupEligible: ds.isStudentStop,
      isStudentPickup: false,
    }));
  }, [directionalStops]);

  const isAccountDisabled = currentDriver.status === 'disabled' || currentDriver.status === 'blocked';

  // ---------------------------------------------------------------------------
  // GPS & SIMULATION TRACKING ENGINE (PERSISTED TO SUPABASE)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeTrip || activeTrip.status !== 'IN_PROGRESS') {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
      setIsSimulating(false);
      return;
    }

    // ==========================================
    // SIMULATION MODE
    // ==========================================
    if (activeTrip.mode === 'SIMULATION') {
      setIsSimulating(true);

      // Disable browser hardware geolocation watcher to prevent stale GPS collisions
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (isSimPaused) {
        if (simTimerRef.current) {
          clearInterval(simTimerRef.current);
          simTimerRef.current = null;
        }
        return;
      }

      // Smooth, brisk simulation pacing: 5 progressive steps per leg at ~600ms per step (~3s per stop leg)
      const intervalMs = Math.max(250, Math.round(600 / simSpeedMultiplier));
      const SUB_STEPS = 5; // 5 progressive steps along realistic road curves between consecutive stops

      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }

      simTimerRef.current = setInterval(async () => {
        const trip = activeTripRef.current;
        if (!trip || trip.status !== 'IN_PROGRESS') {
          return;
        }

        // If reached final stop, stop moving further
        if (trip.currentStopIndex >= trip.tripStops.length - 1) {
          if (simTimerRef.current) {
            clearInterval(simTimerRef.current);
            simTimerRef.current = null;
          }
          return;
        }

        const currIdx = trip.currentStopIndex;
        const nextIdx = currIdx + 1;
        const currStop = trip.tripStops[currIdx]?.stop;
        const targetStop = trip.tripStops[nextIdx]?.stop;
        if (!currStop || !targetStop) return;

        // Increment sub-step progress fraction
        simStepFractionRef.current += 1 / SUB_STEPS;
        const fraction = Math.min(1, simStepFractionRef.current);

        // Realistic road geometry waypoints with natural curvature
        const waypoints = generateLegWaypoints(currStop, targetStop, SUB_STEPS);
        const stepIdx = Math.min(SUB_STEPS - 1, Math.max(0, Math.round(fraction * SUB_STEPS) - 1));
        const wp = waypoints[stepIdx];

        const interpolatedLat = wp.latitude;
        const interpolatedLng = wp.longitude;
        const speedKmh = Math.round(wp.speedKmh * Math.min(simSpeedMultiplier, 1.5));
        const heading = wp.heading;

        const newLoc: LiveLocation = {
          id: `sim-${Date.now()}`,
          tripId: trip.id,
          latitude: interpolatedLat,
          longitude: interpolatedLng,
          speedKmh,
          heading,
          recordedAt: new Date().toISOString(),
        };

        // 1. Reactive state updates so Driver Map moves immediately
        setCurrentLocation(newLoc);
        setCurrentSpeed(speedKmh);

        // 2. Asynchronously persist to Supabase live_locations
        updateTripGps(trip.id, interpolatedLat, interpolatedLng, speedKmh, heading).then((ok) => {
          if (!ok) {
            setSimPersistError('Database warning: telemetry coordinate could not be saved to Supabase.');
          } else {
            setSimPersistError(null);
          }
        });

        // 3. Midpoint check (fraction >= 0.5): Dispatch Event C (APPROACHING_STOP) to waiting students
        // Keyed by stop ID and sequence number so repeated stops in circular routes trigger correctly
        const targetSeqNumber = trip.tripStops[nextIdx].sequenceNumber;
        const stopSeqKey = `${targetStop.id}-${targetSeqNumber}`;
        if (fraction >= 0.5 && !approachedStopsRef.current.has(stopSeqKey)) {
          approachedStopsRef.current.add(stopSeqKey);
          dispatchTransitNotification({
            tripId: trip.id,
            eventType: 'APPROACHING_STOP',
            stopId: targetStop.id,
            routeId: trip.routeId,
            shiftId: trip.shiftId,
            busId: trip.busId,
            driverId: trip.driverId,
          }).catch((e) => console.warn('Error dispatching APPROACHING_STOP:', e));
        }

        // 4. Check if bus has arrived at targetStop (fraction >= 1)
        if (fraction >= 1) {
          simStepFractionRef.current = 0; // Reset fraction for next leg
          const isLastStop = nextIdx >= trip.tripStops.length - 1;

          // Event D (STOP_REACHED) is dispatched inside markStopReached with explicit targetSequenceNumber
          markStopReached(trip.id, targetStop.id, targetSeqNumber).catch((e) => {
            console.warn('Error marking stop reached in Supabase:', e);
          });

          if (isLastStop) {
            // Final stop reached! Automatically end trip and dispatch Event E (TRIP_COMPLETED)
            endTrip(trip.id).catch((e) => {
              console.warn('Error ending trip at destination:', e);
            });
            if (simTimerRef.current) {
              clearInterval(simTimerRef.current);
              simTimerRef.current = null;
            }
          }

          // Dispatch real-time arrival notification
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('vaahan:new_notification', {
                detail: {
                  title: isLastStop
                    ? `Destination Reached: ${targetStop.name}`
                    : `Bus Arrived at Stop: ${targetStop.name}`,
                  message: isLastStop
                    ? `${trip.bus?.busNumber || 'Bus'} (${trip.bus?.plateNumber || ''}) has arrived at final campus destination ${targetStop.name} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Journey complete.`
                    : `${trip.bus?.busNumber || 'Bus'} has arrived at ${targetStop.name}. Students at this stop may board now. Next stop: ${trip.tripStops[nextIdx + 1]?.stop?.name || 'Destination'}.`,
                  category: 'ROUTE_ALERT',
                  routeId: trip.routeId,
                },
              })
            );
          }

          // Advance stop sequence strictly in order: current and past stops REACHED, future stops PENDING
          const updatedStops = trip.tripStops.map((ts, idx) =>
            idx <= nextIdx
              ? { ...ts, status: 'REACHED' as const, reachedAt: ts.reachedAt || new Date().toISOString() }
              : ts
          );

          const updatedTrip: Trip = {
            ...trip,
            status: isLastStop ? ('COMPLETED' as const) : trip.status,
            currentStopIndex: nextIdx,
            tripStops: updatedStops,
            latestLocation: newLoc,
          };

          setActiveTrip(updatedTrip);
          activeTripRef.current = updatedTrip;
        }
      }, intervalMs);

      return () => {
        if (simTimerRef.current) {
          clearInterval(simTimerRef.current);
          simTimerRef.current = null;
        }
      };
    }

    // ==========================================
    // LIVE GPS MODE (Browser Geolocation API)
    // ==========================================
    setIsSimulating(false);
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }

    if (!navigator.geolocation) {
      setGpsError('Browser Geolocation is not supported on this device.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        const { latitude, longitude, speed, heading } = pos.coords;
        const speedKmh = speed ? Math.round(speed * 3.6) : 32;
        setCurrentSpeed(speedKmh);
        const newLoc: LiveLocation = {
          id: `gps-${Date.now()}`,
          tripId: activeTrip.id,
          latitude,
          longitude,
          speedKmh,
          heading: heading || 0,
          recordedAt: new Date().toISOString(),
        };
        setCurrentLocation(newLoc);
        updateTripGps(activeTrip.id, latitude, longitude, speedKmh, heading || 0);
      },
      (err) => {
        setGpsError(`Browser GPS Notice: ${err.message}. Please keep this page in foreground for real GPS tracking.`);
        const nextStop = activeTrip.tripStops[activeTrip.currentStopIndex]?.stop;
        if (nextStop) {
          updateTripGps(activeTrip.id, nextStop.latitude, nextStop.longitude, 28);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeTrip?.id, activeTrip?.status, activeTrip?.mode, isSimPaused, simSpeedMultiplier]);

  // Simulation step runner (Manual step to next stop)
  const handleSimulationStep = async () => {
    if (!activeTrip) return;
    const nextIdx = activeTrip.currentStopIndex + 1;
    if (nextIdx >= activeTrip.tripStops.length) return;
    const targetStop = activeTrip.tripStops[nextIdx]?.stop;
    if (targetStop) {
      simStepFractionRef.current = 0;
      const speed = Math.round(35 * simSpeedMultiplier);
      setCurrentSpeed(speed);
      const newLoc: LiveLocation = {
        id: `sim-step-${Date.now()}`,
        tripId: activeTrip.id,
        latitude: targetStop.latitude,
        longitude: targetStop.longitude,
        speedKmh: speed,
        heading: 0,
        recordedAt: new Date().toISOString(),
      };
      setCurrentLocation(newLoc);
      const ok = await updateTripGps(activeTrip.id, targetStop.latitude, targetStop.longitude, speed);
      if (!ok) {
        setSimPersistError('Failed to record simulation position to Supabase.');
      } else {
        setSimPersistError(null);
      }
      const updated = await markStopReached(
        activeTrip.id,
        targetStop.id,
        activeTrip.tripStops[nextIdx].sequenceNumber
      );
      if (updated) {
        setActiveTrip(updated);
        activeTripRef.current = updated;
      }
    }
  };

  // Start Trip Execution
  const handleConfirmStartTrip = async () => {
    if (isAccountDisabled) {
      setStartError('Your driver account has been deactivated. You cannot start trips.');
      return;
    }
    if (directionalStops.length === 0) {
      setStartError('The selected route and direction has no valid stop sequence.');
      return;
    }
    if (!busAvailability.available) {
      setStartError(busAvailability.reason || 'Selected bus is unavailable.');
      return;
    }

    setIsStartingTrip(true);
    setStartError(null);

    try {
      const res = await startTrip({
        routeId: selectedRouteId,
        driverId: currentDriver.id,
        busId: selectedBusId,
        shiftId: selectedShiftId,
        direction: selectedDirection,
        tripDate,
        mode: tripMode,
        remarks: tripRemarks,
        orderedStops: directionalStops,
      });

      if (res.success && res.trip) {
        simStepFractionRef.current = 0;
        approachedStopsRef.current.clear();
        const firstStop = res.trip.tripStops[0]?.stop;
        if (firstStop) {
          const initialLoc: LiveLocation = {
            id: `loc-start-${Date.now()}`,
            tripId: res.trip.id,
            latitude: firstStop.latitude,
            longitude: firstStop.longitude,
            speedKmh: 22,
            heading: 0,
            recordedAt: new Date().toISOString(),
          };
          setCurrentLocation(initialLoc);
          setCurrentSpeed(22);
          updateTripGps(res.trip.id, firstStop.latitude, firstStop.longitude, 22, 0);
        }
        setActiveTrip(res.trip);
        activeTripRef.current = res.trip;
        setShowConfirmModal(false);
        setActiveTab('active-trip');
      } else {
        setStartError(res.error || 'Failed to initialize active trip in database.');
      }
    } catch (e: any) {
      setStartError(e.message || 'Database error starting trip.');
    } finally {
      setIsStartingTrip(false);
    }
  };

  const handleStopCheckIn = async (stopId: string, sequenceNumber?: number) => {
    if (!activeTrip) return;
    const targetIdx =
      typeof sequenceNumber === 'number'
        ? activeTrip.tripStops.findIndex((s) => s.sequenceNumber === sequenceNumber)
        : activeTrip.tripStops.findIndex((s) => s.stopId === stopId && s.status !== 'REACHED');

    if (targetIdx !== -1) {
      const ts = activeTrip.tripStops[targetIdx];
      const stop = ts.stop;
      const newLoc: LiveLocation = {
        id: `checkin-${Date.now()}`,
        tripId: activeTrip.id,
        latitude: stop.latitude,
        longitude: stop.longitude,
        speedKmh: 0,
        heading: 0,
        recordedAt: new Date().toISOString(),
      };
      setCurrentLocation(newLoc);
      updateTripGps(activeTrip.id, stop.latitude, stop.longitude, 0);
      const updated = await markStopReached(activeTrip.id, stopId, ts.sequenceNumber);
      if (updated) {
        setActiveTrip(updated);
        activeTripRef.current = updated;
      }
    }
  };

  // SOS Emergency Beacon Dispatcher
  const handleTriggerSos = async () => {
    if (isSubmittingSos) return;
    setIsSubmittingSos(true);
    setSosSubmitError(null);

    try {
      let lat: number | null = currentLocation?.latitude ?? null;
      let lng: number | null = currentLocation?.longitude ?? null;
      let locDesc: string = currentLocation
        ? `Lat: ${lat?.toFixed(5)}, Lng: ${lng?.toFixed(5)}`
        : 'Location unavailable';

      // Fallback: If no currentLocation, check browser geolocation
      if (!lat && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          locDesc = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
        } catch {
          locDesc = 'GPS coordinates unavailable';
        }
      }

      const activeRouteName =
        activeTrip?.route?.name ||
        routes.find((r) => r.id === selectedRouteId)?.name ||
        'Campus Transit';
      const activeBusNumber =
        activeTrip?.bus?.busNumber ||
        fleetBuses.find((b) => b.id === selectedBusId)?.busNumber ||
        (currentDriver as any).assignedBusNumber ||
        'Vehicle';
      const activeDirection = activeTrip?.direction || selectedDirection;

      const res = await createSosAlert({
        driverId: currentDriver.id,
        driverName: currentDriver.fullName,
        driverPhone: currentDriver.phone,
        busNumber: activeBusNumber,
        busId: activeTrip?.busId || selectedBusId || undefined,
        tripId: activeTrip?.id || undefined,
        routeName: activeRouteName,
        direction: activeDirection,
        latitude: lat,
        longitude: lng,
        locationDescription: locDesc,
        emergencyType: sosEmergencyType,
        remarks: sosCustomRemarks.trim() || undefined,
      });

      if (res.success && res.alert) {
        setActiveSosAlert(res.alert);
        setShowSosModal(false);
        setSosSubmitSuccess('🚨 SOS Emergency Alert dispatched to Transport Control. Assistance is being coordinated.');
        setTimeout(() => setSosSubmitSuccess(null), 8000);
      } else {
        setSosSubmitError(res.error || 'Failed to dispatch SOS alert. Please retry or contact transport control directly.');
      }
    } catch (e: any) {
      setSosSubmitError(e.message || 'Error triggering SOS beacon');
    } finally {
      setIsSubmittingSos(false);
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    if (confirm('Are you sure you want to end this trip? Real start/end times and location records will be saved to fleet history.')) {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsSimulating(false);
      await endTrip(activeTrip.id);
      setActiveTrip(null);
      activeTripRef.current = null;
      setCurrentLocation(null);
      setCurrentSpeed(0);
      const history = await getDriverTripHistory(currentDriver.id);
      setTripHistory(history);
      setActiveTab('history');
    }
  };

  const navItems: { id: DriverActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Compass className="w-4 h-4" /> },
    { id: 'start-trip', label: 'Start Trip', icon: <Play className="w-4 h-4" /> },
    { id: 'active-trip', label: 'Active Trip', icon: <Navigation className="w-4 h-4" /> },
    { id: 'history', label: 'Trip History', icon: <History className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Driver Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 font-bold shrink-0">
            <Car className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                Driver Console
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                Badge: {currentDriver.badgeNumber || 'DRV-101'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {currentDriver.fullName}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              License: {currentDriver.licenseNumber || 'MH-15-2018-00921'} · {currentDriver.experienceYears || 5} Years Safe Driving Experience
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominent SOS Emergency Button */}
          <button
            type="button"
            onClick={() => setShowSosModal(true)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
              activeSosAlert && activeSosAlert.status === 'ACTIVE'
                ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-300'
                : activeSosAlert && activeSosAlert.status === 'ACKNOWLEDGED'
                ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-md'
            }`}
          >
            <AlertOctagon className={`w-4 h-4 ${activeSosAlert ? 'animate-bounce' : ''}`} />
            <span>
              {activeSosAlert && activeSosAlert.status === 'ACTIVE'
                ? 'SOS TRANSMITTING'
                : activeSosAlert && activeSosAlert.status === 'ACKNOWLEDGED'
                ? 'SOS ACKNOWLEDGED'
                : 'EMERGENCY SOS'}
            </span>
          </button>

          {activeTrip && (
            <button
              onClick={() => setActiveTab('active-trip')}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Trip Active</span>
            </button>
          )}
          <button
            onClick={onSignOut}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* SOS Active / Acknowledged Real-time Banner */}
      {activeSosAlert && (
        <div
          className={`p-4 sm:p-5 rounded-3xl border-2 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
            activeSosAlert.status === 'ACTIVE'
              ? 'bg-red-600 border-red-700 text-white animate-pulse'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                activeSosAlert.status === 'ACTIVE' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
              }`}
            >
              <AlertOctagon className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    activeSosAlert.status === 'ACTIVE'
                      ? 'bg-white text-red-700'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {activeSosAlert.status === 'ACTIVE' ? 'Distress Beacon Transmitting' : 'Assistance Dispatched'}
                </span>
                <span className="text-[11px] opacity-80">
                  Triggered at {new Date(activeSosAlert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="font-extrabold text-sm sm:text-base">
                {activeSosAlert.status === 'ACTIVE'
                  ? 'Emergency Alert Active: Waiting for Transport Admin Acknowledgment'
                  : `Admin Acknowledged: ${activeSosAlert.acknowledgedByName || 'Transport Admin'} is coordinating assistance.`}
              </p>
              <p className="text-xs opacity-90">
                Reason: {activeSosAlert.emergencyType.replace(/_/g, ' ')} · Bus: {activeSosAlert.busNumber || 'Vehicle'} · Location: {activeSosAlert.locationDescription || 'GPS Active'}
              </p>
              {activeSosAlert.remarks && (
                <p className="text-xs italic opacity-95">"{activeSosAlert.remarks}"</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-black/20 text-white backdrop-blur-xs">
              Keep Phone Line Active
            </span>
          </div>
        </div>
      )}

      {sosSubmitSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="font-bold">{sosSubmitSuccess}</p>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-2xs overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-1 sm:gap-2 min-w-max">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ===================================================================== */}
      {/* 1. DASHBOARD TAB */}
      {/* ===================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500">Trip Operations</span>
              <h3 className="text-2xl font-extrabold text-slate-900">
                {activeTrip ? '1 Trip Active' : 'Idle / Ready'}
              </h3>
              <p className="text-xs text-slate-500">
                {activeTrip
                  ? `Operating ${activeTrip.route?.name} (${activeTrip.direction === 'TO_COLLEGE' ? 'To College' : 'Returning Home'})`
                  : 'Ready to configure and start your daily route journey.'}
              </p>
              <div className="pt-2">
                {activeTrip ? (
                  <button
                    onClick={() => setActiveTab('active-trip')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5"
                  >
                    <span>Open Active Trip</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('start-trip')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1.5"
                  >
                    <span>Start New Trip</span>
                    <Play className="w-3.5 h-3.5 fill-white" />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500">Vehicle Assignment</span>
              <h3 className="text-2xl font-extrabold text-slate-900">
                {currentDriver.assignedBusNumber || 'Daily Assigned'}
              </h3>
              <p className="text-xs text-slate-500">
                Buses are assigned daily for individual trips based on schedule and seating demands.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500">Completed Trips</span>
              <h3 className="text-2xl font-extrabold text-slate-900">{tripHistory.length}</h3>
              <p className="text-xs text-slate-500">
                Historical records preserved for administrator fleet audits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. START TRIP TAB (SPLIT-SCREEN WITH LIVE MAP EMBEDDED) */}
      {/* ===================================================================== */}
      {activeTab === 'start-trip' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 uppercase">
              Trip Initiation & Route Verification
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
              Configure & Start Daily Bus Journey
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select your shift, route, direction, and vehicle. Live map preview and verified student passenger manifests update in real time.
            </p>
          </div>

          {isAccountDisabled && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Driver Account Deactivated</p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">
                  Your driver account is currently disabled. Disabled drivers cannot start trips.
                </p>
              </div>
            </div>
          )}

          {driverAuthError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{driverAuthError}</span>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shrink-0 transition-colors"
              >
                Sign In Again
              </button>
            </div>
          )}

          {activeTrip && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>You already have an active trip running. Complete it before starting a new one.</span>
              </div>
              <button
                onClick={() => setActiveTab('active-trip')}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-[11px] shrink-0"
              >
                Go to Active Trip
              </button>
            </div>
          )}

          {/* SPLIT-SCREEN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start min-w-0">
            {/* LEFT COLUMN: Controls, Inputs & Ordered Stop Sequence */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5 min-w-0">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Play className="w-4 h-4 text-amber-600" />
                  <span>Trip Parameters</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Fields marked * required</span>
              </div>

              {/* FORM INPUTS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Shift */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    1. Shift <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    disabled={Boolean(activeTrip)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Route */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    2. Route <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    disabled={Boolean(activeTrip) || routes.length === 0}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatRouteDisplay(r)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Direction */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    3. Journey Direction <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedDirection}
                    onChange={(e) => setSelectedDirection(e.target.value as TripDirection)}
                    disabled={Boolean(activeTrip)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900"
                  >
                    <option value="TO_COLLEGE">To College (Route Terminal → Campus)</option>
                    <option value="RETURNING_HOME">Returning Home (Campus → Route Terminal)</option>
                  </select>
                </div>

                {/* 4. Bus */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    4. Assigned Bus <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedBusId}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                    disabled={Boolean(activeTrip)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900"
                  >
                    {fleetBuses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.busNumber} ({b.plateNumber}) · {b.capacity} Seats {b.isAC ? '· AC' : ''}
                      </option>
                    ))}
                  </select>
                  {!busAvailability.available && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">
                      ⚠ {busAvailability.reason}
                    </p>
                  )}
                </div>

                {/* 5. Trip Date */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    5. Trip Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                    disabled={Boolean(activeTrip)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900"
                  />
                </div>

                {/* 6. Mode: Live GPS vs Simulation */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    6. Telemetry Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={tripMode}
                    onChange={(e) => setTripMode(e.target.value as TripMode)}
                    disabled={Boolean(activeTrip)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900"
                  >
                    <option value="LIVE_GPS">Live GPS Mode (Browser Geolocation API)</option>
                    <option value="SIMULATION">Simulation Mode (Testing & Demo Demonstration)</option>
                  </select>
                </div>

                {/* Remarks */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Optional Trip Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Regular morning pickup run; traffic clear on Dwarka bridge"
                    value={tripRemarks}
                    onChange={(e) => setTripRemarks(e.target.value)}
                    disabled={Boolean(activeTrip)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Capacity Warning */}
              {isCapacityExceeded && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Capacity Notice: Assigned Students Exceed Bus Capacity</p>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      Total approved students for this journey ({studentManifest.length} students) exceed the authorized seating capacity of {selectedBus?.busNumber} ({selectedBus?.capacity} seats). Please confirm adequate vehicle arrangements.
                    </p>
                  </div>
                </div>
              )}

              {/* Directional Stops Timeline Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Ordered Stop Sequence ({directionalStops.length} stops) · {selectedDirection === 'TO_COLLEGE' ? 'Towards College Campus' : 'Returning Home'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                    Direction Verified
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {directionalStops.map((ds, idx) => (
                    <div
                      key={`${ds.id || ds.stopId}-${ds.sequenceNumber || idx}`}
                      className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs ${
                        idx === 0
                          ? 'bg-slate-900 text-white border-slate-900'
                          : idx === directionalStops.length - 1
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            idx === 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold leading-tight">{ds.stop.name}</p>
                          <p className={`text-[10px] ${idx === 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                            {idx === 0
                              ? 'Origin Terminal'
                              : idx === directionalStops.length - 1
                              ? 'Destination Terminal'
                              : ds.stop.landmark || 'Intermediate Stop'}
                          </p>
                        </div>
                      </div>

                      {manifestByStopCounts.has(ds.stopId) && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          idx === 0 ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {manifestByStopCounts.get(ds.stopId)} students
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Readiness Broadcast Status Banner */}
              {readyStatusMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border transition-all ${
                    isDriverReady
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDriverReady ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span>{readyStatusMessage}</span>
                </div>
              )}

              {/* Start Trip & Readiness Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleBroadcastDriverReady}
                  disabled={
                    Boolean(activeTrip) ||
                    !driverAuthVerified ||
                    directionalStops.length === 0 ||
                    !busAvailability.available ||
                    isAccountDisabled ||
                    isBroadcastingReady
                  }
                  className={`px-5 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all ${
                    isDriverReady
                      ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-2xs ring-2 ring-sky-200'
                      : 'bg-white hover:bg-sky-50 text-sky-700 border-sky-300 hover:border-sky-400 shadow-2xs'
                  } disabled:opacity-50`}
                >
                  <Radio className={`w-4 h-4 text-sky-600 ${isBroadcastingReady ? 'animate-pulse' : ''}`} />
                  <span>{isDriverReady ? '✓ Driver Ready Broadcasted' : '1. Broadcast Driver Ready'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={
                    Boolean(activeTrip) ||
                    !driverAuthVerified ||
                    directionalStops.length === 0 ||
                    !busAvailability.available ||
                    isAccountDisabled
                  }
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>2. Review & Start Trip</span>
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Map & Student Manifest */}
            <div className="space-y-6 min-w-0">
              {/* Embedded Live Map */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-sky-600" />
                      <span>Live Route Corridor & Stop Sequence</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedDirection === 'TO_COLLEGE'
                        ? 'Inbound: Starts at Route Terminal → Ends at College Campus'
                        : 'Outbound: Starts at College Campus → Ends at Route Terminal'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                    {directionalStops.length} Ordered Stops
                  </span>
                </div>

                <MapView
                  stops={startTripMapStops}
                  height="340px"
                  busNumber={selectedBus?.busNumber || 'Bus'}
                />

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                    <span className="font-bold text-slate-700">Origin:</span>
                    <span className="text-slate-900 font-semibold">{directionalStops[0]?.stop.name || 'Start Terminal'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="font-bold text-slate-700">Destination:</span>
                    <span className="text-slate-900 font-semibold">{directionalStops[directionalStops.length - 1]?.stop.name || 'End Terminal'}</span>
                  </div>
                </div>
              </div>

              {/* Student Passenger Manifest */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4 min-w-0">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-100 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                      <Users className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="truncate">Assigned Students Manifest</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 shrink-0">
                        {studentManifest.length} Approved
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      Matched to {selectedRoute?.name || 'Selected Route'} ({selectedShiftId.includes('morn') ? 'Morning Shift' : 'General Shift'})
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0 w-full xl:w-auto shrink-0">
                    <div className="relative flex-1 sm:w-44 min-w-0">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search student..."
                        value={manifestSearch}
                        onChange={(e) => setManifestSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 min-w-0 focus:outline-sky-500"
                      />
                    </div>

                    <select
                      value={manifestStopFilter}
                      onChange={(e) => setManifestStopFilter(e.target.value)}
                      className="w-full sm:w-auto max-w-full sm:max-w-[200px] truncate px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 font-semibold min-w-0 focus:outline-sky-500"
                    >
                      <option value="ALL">All Stops</option>
                      {directionalStops.map((ds, idx) => (
                        <option key={`${ds.id || ds.stopId}-${ds.sequenceNumber || idx}`} value={ds.stopId}>
                          {ds.stop.name} ({manifestByStopCounts.get(ds.stopId) || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {manifestLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading student manifest from Supabase...</div>
                ) : filteredManifest.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2 min-w-0">
                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">No approved students assigned to this journey.</p>
                    <p className="text-[11px] text-slate-400">
                      Either no students are registered for this specific route/shift, or registrations are awaiting administrator approval.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-h-60 overflow-y-auto overflow-x-auto min-w-0">
                    <table className="w-full min-w-[500px] text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] sticky top-0">
                        <tr>
                          <th className="p-2.5 whitespace-nowrap">Student Name</th>
                          <th className="p-2.5 whitespace-nowrap">PRN</th>
                          <th className="p-2.5 whitespace-nowrap">Department</th>
                          <th className="p-2.5 whitespace-nowrap">Pickup Stop</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredManifest.map((stu) => (
                          <tr key={stu.studentId} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{stu.fullName}</td>
                            <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">{stu.prn}</td>
                            <td className="p-2.5 text-slate-700 whitespace-nowrap">{stu.department} ({stu.academicYear}-{stu.division})</td>
                            <td className="p-2.5 font-bold text-sky-800 whitespace-nowrap">{stu.pickupStopName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION SUMMARY MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Bus className="w-5 h-5 text-amber-600" />
                <span>Start Trip Confirmation</span>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Please verify your journey details before broadcasting live location telemetry:
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Bus:</span>
                <span className="font-extrabold text-slate-900">
                  {selectedBus?.busNumber} ({selectedBus?.plateNumber}) · {selectedBus?.capacity} Seats
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Driver:</span>
                <span className="font-bold text-slate-800">{currentDriver.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shift & Route:</span>
                <span className="font-bold text-slate-800">
                  {selectedRoute ? formatRouteDisplay(selectedRoute) : 'Route'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Direction:</span>
                <span className="font-bold text-sky-800">
                  {selectedDirection === 'TO_COLLEGE' ? 'To College (Inbound)' : 'Returning Home (Outbound)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Mode:</span>
                <span className="font-bold text-slate-800">{tripDate} · {tripMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Eligible Approved Students:</span>
                <span className="font-extrabold text-emerald-700">{studentManifest.length} Students</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stop Sequence Count:</span>
                <span className="font-bold text-slate-800">{directionalStops.length} Stops</span>
              </div>
            </div>

            {startError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {startError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStartTrip}
                disabled={isStartingTrip}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isStartingTrip ? 'Initializing Trip...' : 'Confirm & Start Journey'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. ACTIVE TRIP TAB */}
      {/* ===================================================================== */}
      {activeTab === 'active-trip' && (
        <div className="space-y-6">
          {!activeTrip ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center space-y-3">
              <p className="text-sm font-bold text-slate-700">No active trip in progress.</p>
              <button
                onClick={() => setActiveTab('start-trip')}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs"
              >
                Configure New Trip
              </button>
            </div>
          ) : (
            <>
              {/* Trip Control Header */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      {activeTrip.mode === 'SIMULATION' ? 'Simulation Active' : 'Broadcasting Live GPS'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {activeTrip.bus?.busNumber} · {activeTrip.bus?.plateNumber}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                      {activeTrip.direction === 'TO_COLLEGE' ? 'To College' : 'Returning Home'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {activeTrip.route ? formatRouteDisplay(activeTrip.route) : 'Transit Journey'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Journey Date: <strong>{activeTrip.tripDate}</strong> · Started: <strong>{new Date(activeTrip.startedAt || '').toLocaleTimeString()}</strong> · {activeTrip.assignedStudentCount || 0} Students Assigned
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center min-w-[90px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Speed</span>
                    <span className="text-base font-extrabold text-sky-700 font-mono">
                      {currentSpeed} km/h
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSosModal(true)}
                    className="px-4 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all animate-pulse cursor-pointer"
                  >
                    <AlertOctagon className="w-4 h-4" />
                    <span>Emergency SOS</span>
                  </button>

                  <button
                    onClick={handleEndTrip}
                    className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-colors"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>End Trip Run</span>
                  </button>
                </div>
              </div>

              {/* Simulation Mode Controls */}
              {activeTrip.mode === 'SIMULATION' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-amber-900 text-xs">
                      <Radio className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                      <span>
                        <strong>Simulation Active:</strong> Moving along official route coordinates & persisting to Supabase.
                      </span>
                    </div>
                    {simPersistError ? (
                      <p className="text-[11px] text-rose-600 font-bold pl-6">
                        ⚠ {simPersistError}
                      </p>
                    ) : (
                      <p className="text-[10px] text-emerald-700 font-semibold pl-6 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                        <span>Supabase Telemetry Sync: Connected & Recording</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setIsSimPaused(!isSimPaused)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors ${
                        isSimPaused
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {isSimPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5" />}
                      <span>{isSimPaused ? 'Resume Motion' : 'Pause'}</span>
                    </button>

                    <button
                      onClick={handleSimulationStep}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                      <FastForward className="w-3.5 h-3.5 text-amber-700" />
                      <span>Step to Next Stop</span>
                    </button>

                    <select
                      value={simSpeedMultiplier}
                      onChange={(e) => setSimSpeedMultiplier(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-amber-900 shadow-2xs"
                    >
                      <option value={0.75}>0.75x Speed</option>
                      <option value={1.0}>1.0x Speed (Standard)</option>
                      <option value={1.5}>1.5x Speed</option>
                      <option value={2.0}>2.0x Speed</option>
                    </select>
                  </div>
                </div>
              )}

              {gpsError && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{gpsError}</span>
                </div>
              )}

              {/* Map & Stop Progression Checklist */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <MapView
                    stops={activeTrip.tripStops.map((ts) => ({
                      stop: ts.stop,
                      sequenceNumber: ts.sequenceNumber,
                      status: ts.status,
                    }))}
                    currentLocation={currentLocation || (activeTrip ? getLatestLocation(activeTrip.id) : null) || activeTrip.latestLocation}
                    busNumber={activeTrip.bus?.busNumber || 'Bus'}
                    speedKmh={currentSpeed}
                    height="460px"
                  />
                </div>

                {/* Stop Checklist */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Stop Arrival Progression</h3>
                      <p className="text-[11px] text-slate-500">Tap to mark arrived stops</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      {activeTrip.tripStops.filter((s) => s.status === 'REACHED').length} / {activeTrip.tripStops.length} Passed
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {activeTrip.tripStops.map((ts, idx) => {
                      const isReached = ts.status === 'REACHED';

                      return (
                        <div
                          key={`${ts.id || ts.stopId}-${ts.sequenceNumber}`}
                          onClick={() => handleStopCheckIn(ts.stopId, ts.sequenceNumber)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isReached
                              ? 'bg-emerald-50/70 border-emerald-300'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isReached
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white border border-slate-300 text-slate-600'
                              }`}
                            >
                              {isReached ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 text-xs truncate">
                              {ts.stop.name}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isReached
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isReached ? 'DEPARTED' : 'PENDING'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. TRIP HISTORY TAB */}
      {/* ===================================================================== */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Completed Trip Logs</h2>
              <p className="text-xs text-slate-500">Official logbook of completed college bus journeys</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              {tripHistory.length} Trips
            </span>
          </div>

          {tripHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-600">No completed trips logged yet.</p>
              <p>Trips will show here once you start and complete a scheduled run.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tripHistory.map((t) => (
                <div key={t.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{t.route?.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {t.status}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        {t.direction === 'TO_COLLEGE' ? 'To College' : 'Returning Home'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Vehicle: <strong>{t.bus?.busNumber}</strong> ({t.bus?.plateNumber}) · Date: {t.tripDate} · Started: {new Date(t.startedAt || '').toLocaleTimeString()} · Ended: {t.endedAt ? new Date(t.endedAt).toLocaleTimeString() : 'N/A'} · Mode: {t.mode}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SOS EMERGENCY ALERT CONFIRMATION MODAL */}
      {/* ===================================================================== */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-red-500 p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-red-100">
              <div className="flex items-center gap-2.5 text-red-600">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
                <span className="text-lg font-black tracking-tight">Driver Emergency Beacon (SOS)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
              <p className="font-extrabold">⚠️ Confirming will immediately alert Transport Administration.</p>
              <p className="text-red-700">
                Your live GPS coordinates, vehicle details, driver badge, and route will be broadcasted to transport control.
              </p>
            </div>

            {/* Emergency details preview */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Driver:</span>
                <span className="font-bold text-slate-900">{currentDriver.fullName} ({currentDriver.badgeNumber || 'Driver'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Bus:</span>
                <span className="font-extrabold text-slate-900">
                  {activeTrip?.bus?.busNumber || fleetBuses.find(b => b.id === selectedBusId)?.busNumber || (currentDriver as any).assignedBusNumber || 'Scheduled Vehicle'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Route:</span>
                <span className="font-bold text-slate-800">
                  {activeTrip?.route?.name || routes.find(r => r.id === selectedRouteId)?.name || 'Campus Transit'} ({activeTrip?.direction || selectedDirection})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GPS Coordinates:</span>
                <span className="font-mono font-bold text-sky-800">
                  {currentLocation
                    ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`
                    : 'Transmitting active device coordinate'}
                </span>
              </div>
            </div>

            {/* Emergency Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Select Distress Nature / Incident Type:
              </label>
              <select
                value={sosEmergencyType}
                onChange={(e) => setSosEmergencyType(e.target.value)}
                className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="VEHICLE_BREAKDOWN">Vehicle Breakdown / Engine Trouble</option>
                <option value="MEDICAL_EMERGENCY">Medical Emergency / Student Injury</option>
                <option value="ACCIDENT_COLLISION">Road Accident / Vehicle Collision</option>
                <option value="SECURITY_THREAT">Security Threat / Physical Harassment</option>
                <option value="ROAD_BLOCKADE">Severe Road Blockade / Traffic Stagnation</option>
                <option value="GENERAL_EMERGENCY">General Distress / Urgent Assistance Needed</option>
              </select>
            </div>

            {/* Remarks / Custom Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Additional Emergency Notes (Optional):
              </label>
              <textarea
                rows={2}
                placeholder="E.g., Engine overheating near Trimurti Chowk, waiting on road shoulder..."
                value={sosCustomRemarks}
                onChange={(e) => setSosCustomRemarks(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {sosSubmitError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                {sosSubmitError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                disabled={isSubmittingSos}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerSos}
                disabled={isSubmittingSos}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <AlertOctagon className={`w-4 h-4 ${isSubmittingSos ? 'animate-spin' : ''}`} />
                {isSubmittingSos ? 'Broadcasting Beacon...' : 'CONFIRM & SEND SOS ALERT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
