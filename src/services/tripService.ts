import { supabase, isSupabaseConfigured, getRawSupabaseUrl, getRawSupabaseAnonKey } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import {
  Trip,
  TripStop,
  LiveLocation,
  OfficialRouteStop,
  TripDirection,
  TripMode,
  DirectionalRouteStop,
  JourneyStudentManifest,
  BusVehicle,
  DriverProfile,
} from '../types';
import { OFFICIAL_ROUTES } from './routeService';
import { getAllDrivers, getAuthenticatedDriverProfile } from './driverService';
import { fetchFleetBuses, resolveBusId, isUuid, OFFICIAL_FLEET } from './fleetService';

// =============================================================================
// LOCAL CACHE FOR IMMEDIATE TELEMETRY & OFFLINE RESILIENCE
// =============================================================================
let LOCAL_TRIPS: Trip[] = [];
let LOCAL_LOCATIONS: Record<string, LiveLocation> = {};

/**
 * Maps raw database bus records (snake_case) to standard BusVehicle (camelCase)
 */
export const mapDbBusToBusVehicle = (b: any): BusVehicle | undefined => {
  if (!b) return undefined;
  return {
    id: b.id,
    busNumber: b.bus_number || b.busNumber || 'Bus',
    plateNumber: b.plate_number || b.plateNumber || '',
    model: b.model || 'Tata Starbus',
    capacity: b.capacity || 40,
    currentOccupancy: b.current_occupancy || 0,
    status: b.status || 'ACTIVE',
    fuelPercent: b.fuel_percent ?? 85,
    isAC: b.is_ac ?? b.isAC ?? false,
    routeId: b.route_id || b.routeId,
    driverId: b.driver_id || b.driverId,
    currentSpeedKmH: b.current_speed_kmh || 0,
    lastUpdated: b.updated_at || new Date().toISOString(),
    currentLocationName: b.current_location_name || 'En Route',
    gpsActive: true,
  };
};

/**
 * Dispatches persistent transit events to assigned students via Supabase RPC
 * Supports Events A (DRIVER_READY), B (TRIP_STARTED), C (APPROACHING_STOP),
 * D (STOP_REACHED), and E (TRIP_COMPLETED)
 */
export const dispatchTransitNotification = async (params: {
  tripId?: string;
  eventType: 'DRIVER_READY' | 'TRIP_STARTED' | 'APPROACHING_STOP' | 'STOP_REACHED' | 'TRIP_COMPLETED' | 'GENERAL';
  routeId?: string;
  shiftId?: string;
  busId?: string;
  driverId?: string;
  stopId?: string;
  customTitle?: string;
  customMessage?: string;
}): Promise<{ success: boolean; insertedCount: number }> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('dispatch_transit_event_notification', {
        p_trip_id: params.tripId && isUuid(params.tripId) ? params.tripId : null,
        p_event_type: params.eventType,
        p_route_id: params.routeId && isUuid(params.routeId) ? params.routeId : null,
        p_shift_id: params.shiftId && isUuid(params.shiftId) ? params.shiftId : null,
        p_bus_id: params.busId && isUuid(params.busId) ? params.busId : null,
        p_driver_id: params.driverId && isUuid(params.driverId) ? params.driverId : null,
        p_stop_id: params.stopId && isUuid(params.stopId) ? params.stopId : null,
        p_custom_title: params.customTitle || null,
        p_custom_message: params.customMessage || null,
      });

      if (!error && data) {
        if (typeof window !== 'undefined' && data.title) {
          window.dispatchEvent(
            new CustomEvent('vaahan:new_notification', {
              detail: {
                title: data.title,
                message: data.message,
                category: params.eventType,
                routeId: params.routeId,
              },
            })
          );
        }
        return { success: true, insertedCount: data.inserted_count || 0 };
      }
      if (error) {
        console.warn('dispatch_transit_event_notification error:', error.message);
      }
    } catch (e: any) {
      console.warn('Exception dispatching transit notification:', e.message);
    }
  }

  // Fallback local event dispatch
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('vaahan:new_notification', {
        detail: {
          title: params.customTitle || `Transit Alert: ${params.eventType}`,
          message: params.customMessage || 'Transit update',
          category: params.eventType,
          routeId: params.routeId,
        },
      })
    );
  }
  return { success: true, insertedCount: 0 };
};

/**
 * Broadcasts driver readiness (Event A) before trip departure
 */
export const broadcastDriverReadiness = async (params: {
  driverId: string;
  routeId: string;
  shiftId: string;
  busId: string;
  direction?: TripDirection;
}): Promise<{ success: boolean; message: string; count: number }> => {
  const res = await dispatchTransitNotification({
    eventType: 'DRIVER_READY',
    routeId: params.routeId,
    shiftId: params.shiftId,
    busId: params.busId,
    driverId: params.driverId,
  });
  return {
    success: res.success,
    count: res.insertedCount,
    message: `Readiness broadcast sent to ${res.insertedCount} student(s).`,
  };
};

/**
 * Validates forward journey sequence within directional stops
 */
export const validateAndGenerateTripStops = (
  routeOrStops: OfficialRouteStop[] | DirectionalRouteStop[] | string,
  sourceStopId: string,
  destinationStopId: string
): { isValid: boolean; error?: string; slicedStops: (OfficialRouteStop | DirectionalRouteStop)[] } => {
  let routeStops: any[] = [];
  if (typeof routeOrStops === 'string') {
    const route = OFFICIAL_ROUTES.find((r) => r.id === routeOrStops);
    routeStops = route?.routeStops || [];
  } else if (Array.isArray(routeOrStops)) {
    routeStops = routeOrStops;
  }

  if (!sourceStopId || !destinationStopId) {
    return { isValid: false, error: 'Please select both source and destination stops.', slicedStops: [] };
  }

  if (sourceStopId === destinationStopId) {
    return { isValid: false, error: 'Source and destination stops cannot be the same.', slicedStops: [] };
  }

  const sourceIndex = routeStops.findIndex((rs) => rs.stopId === sourceStopId);
  const destIndex = routeStops.findIndex(
    (rs) => rs.stopId === destinationStopId && rs.sequenceNumber > (sourceIndex >= 0 ? routeStops[sourceIndex].sequenceNumber : 0)
  );

  const finalDestIndex = destIndex !== -1 ? destIndex : routeStops.findIndex((rs) => rs.stopId === destinationStopId);

  if (sourceIndex === -1 || finalDestIndex === -1) {
    return { isValid: false, error: 'Selected stops do not belong to this route sequence.', slicedStops: [] };
  }

  if (sourceIndex >= finalDestIndex) {
    return {
      isValid: false,
      error: `Invalid journey sequence: "${routeStops[sourceIndex]?.stop?.name}" appears after "${routeStops[finalDestIndex]?.stop?.name}" on this directional journey.`,
      slicedStops: [],
    };
  }

  const sliced = routeStops.slice(sourceIndex, finalDestIndex + 1);
  return { isValid: true, slicedStops: sliced };
};

/**
 * Checks server/database bus availability to prevent duplicate active trips
 */
export const checkBusAvailability = async (
  busId: string
): Promise<{ available: boolean; reason?: string; activeTripId?: string }> => {
  const resolvedBusId = await resolveBusId(busId);

  if (isSupabaseConfigured() && isUuid(resolvedBusId)) {
    try {
      // 1. Check if bus is under maintenance
      const { data: busData, error: busError } = await supabase
        .from('buses')
        .select('id, bus_number, status')
        .eq('id', resolvedBusId)
        .maybeSingle();

      if (!busError && busData && busData.status === 'MAINTENANCE') {
        return {
          available: false,
          reason: `${busData.bus_number} is currently marked as Under Maintenance and cannot be operated.`,
        };
      }

      // 2. Check if bus currently has an active in-progress trip
      const { data: activeTrips, error: tripError } = await supabase
        .from('trips')
        .select('id, status, driver_id, started_at')
        .eq('bus_id', resolvedBusId)
        .eq('status', 'IN_PROGRESS');

      if (!tripError && activeTrips && activeTrips.length > 0) {
        return {
          available: false,
          reason: `This bus is already operating an active trip (Trip ID: ${activeTrips[0].id.slice(0, 8)}). Two simultaneous active trips cannot run on the same vehicle.`,
          activeTripId: activeTrips[0].id,
        };
      }

      return { available: true };
    } catch (e: any) {
      console.warn('Bus availability check error, falling back to local memory check:', e);
    }
  }

  // Memory fallback
  const memoryActive = LOCAL_TRIPS.find((t) => t.busId === busId && t.status === 'IN_PROGRESS');
  if (memoryActive) {
    return {
      available: false,
      reason: 'This bus already has an active trip in progress.',
      activeTripId: memoryActive.id,
    };
  }

  return { available: true };
};

/**
 * Retrieves the verified student manifest for a specific journey.
 * Only returns approved students matching the journey's shift and route.
 */
export const getJourneyStudentManifest = async (
  routeId: string,
  shiftId: string,
  direction?: TripDirection
): Promise<JourneyStudentManifest[]> => {
  // Resolve routeDbId to genuine UUID
  let routeDbId = routeId;
  if (!isUuid(routeDbId) && isSupabaseConfigured()) {
    try {
      const routeObj = OFFICIAL_ROUTES.find((r) => r.id === routeId);
      if (routeObj) {
        const { data: rRow } = await supabase
          .from('routes')
          .select('id')
          .eq('route_number', routeObj.routeNumber)
          .maybeSingle();
        if (rRow?.id) routeDbId = rRow.id;
      }
    } catch {}
  }

  // Resolve shiftDbId to genuine UUID
  let shiftDbId = shiftId;
  if (!isUuid(shiftDbId) && isSupabaseConfigured()) {
    try {
      const code = shiftDbId.toLowerCase().includes('general') ? 'GENERAL' : 'MORNING';
      const { data: sRow } = await supabase.from('shifts').select('id').eq('code', code).maybeSingle();
      if (sRow?.id) shiftDbId = sRow.id;
    } catch {}
  }

  const manifestMap = new Map<string, JourneyStudentManifest>();

  if (isSupabaseConfigured()) {
    try {
      // 1. First attempt: Use official secure RPC get_journey_student_manifest
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_journey_student_manifest', {
        p_route_id: routeDbId,
        p_shift_id: shiftDbId,
      });

      if (!rpcErr && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        rpcData.forEach((item: any) => {
          manifestMap.set(item.student_id, {
            studentId: item.student_id,
            fullName: item.full_name || 'Student Rider',
            prn: item.prn || 'N/A',
            department: 'Engineering',
            academicYear: 'TE',
            division: 'A',
            pickupStopId: item.pickup_stop_id,
            pickupStopName: item.pickup_stop_name || 'Designated Stop',
            status: item.status || 'approved',
            phone: item.phone,
          });
        });
      } else {
        // 2. Direct authenticated query on student_transport (supported via RLS policy)
        const res = await supabase
          .from('student_transport')
          .select(`
            student_id,
            status,
            pickup_stop_id,
            student:students (
              id,
              prn,
              roll_no,
              department,
              academic_year,
              division,
              gender
            ),
            pickup_stop:stops (
              id,
              name
            )
          `)
          .eq('route_id', routeDbId)
          .eq('shift_id', shiftDbId)
          .eq('status', 'approved');

        if (!res.error && res.data && res.data.length > 0) {
          const studentIds = res.data.map((d: any) => d.student_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', studentIds);

          const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

          res.data.forEach((item: any) => {
            manifestMap.set(item.student_id, {
              studentId: item.student_id,
              fullName: profileMap.get(item.student_id) || 'Student Rider',
              prn: item.student?.prn || 'N/A',
              department: item.student?.department || 'Engineering',
              academicYear: item.student?.academic_year || 'FE',
              division: item.student?.division || 'A',
              pickupStopId: item.pickup_stop_id,
              pickupStopName: item.pickup_stop?.name || 'Assigned Stop',
              status: item.status,
              gender: item.student?.gender,
              rollNo: item.student?.roll_no,
            });
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching Supabase journey manifest:', e);
    }
  }

  // Also cross-reference registered students from local storage
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('vaahan_registered_students');
      if (raw) {
        const list = JSON.parse(raw);
        list.forEach((s: any) => {
          if (
            s.status === 'approved' &&
            s.transport &&
            (s.transport.routeId === routeId || s.transport.routeId === routeDbId) &&
            (!shiftId || s.transport.shiftId === shiftId || s.transport.shiftId === shiftDbId)
          ) {
            if (!manifestMap.has(s.id)) {
              manifestMap.set(s.id, {
                studentId: s.id,
                fullName: s.fullName || s.name || 'Student',
                prn: s.prn || 'N/A',
                department: s.department || s.branch || 'Engineering',
                academicYear: s.academicYear || s.year || 'FE',
                division: s.division || 'A',
                pickupStopId: s.transport.pickupStopId,
                pickupStopName: s.transport.pickupStopName || 'Assigned Stop',
                status: 'approved',
                gender: s.gender,
                rollNo: s.rollNo,
              });
            }
          }
        });
      }
    }
  } catch {}

  return Array.from(manifestMap.values());
};

export const fetchJourneyManifest = getJourneyStudentManifest;

/**
 * Starts a real trip in Supabase and local cache.
 * Performs rigorous validations: driver status, bus availability, and capacity calculation.
 */
export const startTrip = async (params: {
  routeId: string;
  driverId: string;
  busId: string;
  shiftId: string;
  direction: TripDirection;
  tripDate?: string;
  mode?: TripMode;
  remarks?: string;
  sourceStopId?: string;
  destinationStopId?: string;
  orderedStops: (OfficialRouteStop | DirectionalRouteStop)[];
}): Promise<{ success: boolean; trip?: Trip; error?: string; capacityWarning?: string }> => {
  // 1. Resolve authentic driver UUID from the verified active database session
  let driverDbId: string;
  let verifiedDriverProfile: DriverProfile | undefined = undefined;

  if (isSupabaseConfigured()) {
    const authDriverRes = await getAuthenticatedDriverProfile();
    if (!authDriverRes.success || !authDriverRes.driver || !authDriverRes.driverId) {
      return {
        success: false,
        error: authDriverRes.error || 'Driver account not found or inactive in the database.',
      };
    }
    driverDbId = authDriverRes.driverId;
    verifiedDriverProfile = authDriverRes.driver;
  } else {
    const drivers = await getAllDrivers();
    const driver = drivers.find((d) => d.id === params.driverId);
    if (driver && ['disabled', 'blocked'].includes(driver.status)) {
      return {
        success: false,
        error: 'Driver account is disabled. Disabled drivers are not authorized to start or operate transit trips.',
      };
    }
    if (!params.driverId) {
      return {
        success: false,
        error: 'Driver ID is required to start a transit trip.',
      };
    }
    driverDbId = params.driverId;
    verifiedDriverProfile = driver;
  }

  // Resolve real UUID for bus
  let busDbId = await resolveBusId(params.busId);
  if (!isUuid(busDbId)) {
    busDbId = OFFICIAL_FLEET[0].id;
  }

  // Resolve real UUID for shift
  let shiftDbId = params.shiftId;
  if (!isUuid(shiftDbId) && isSupabaseConfigured()) {
    try {
      const code = shiftDbId.toLowerCase().includes('general') ? 'GENERAL' : 'MORNING';
      const { data: sRow } = await supabase.from('shifts').select('id').eq('code', code).maybeSingle();
      if (sRow?.id) shiftDbId = sRow.id;
    } catch {}
  }

  // Resolve real UUID for route
  let routeDbId = params.routeId;
  if (!isUuid(routeDbId) && isSupabaseConfigured()) {
    try {
      const routeObj = OFFICIAL_ROUTES.find((r) => r.id === params.routeId);
      if (routeObj) {
        let q = supabase.from('routes').select('id').eq('route_number', routeObj.routeNumber);
        if (isUuid(shiftDbId)) q = q.eq('shift_id', shiftDbId);
        const { data: rRow } = await q.maybeSingle();
        if (rRow?.id) routeDbId = rRow.id;
      }
    } catch {}
  }

  // 2. Check if driver already has an in-progress trip
  if (isSupabaseConfigured() && isUuid(driverDbId)) {
    const { data: driverActive } = await supabase
      .from('trips')
      .select('id')
      .eq('driver_id', driverDbId)
      .eq('status', 'IN_PROGRESS');

    if (driverActive && driverActive.length > 0) {
      return {
        success: false,
        error: 'You already have an active trip in progress. Please end your current trip before starting another.',
      };
    }
  } else {
    const existing = LOCAL_TRIPS.find(
      (t) => (t.driverId === params.driverId || t.driverId === driverDbId) && t.status === 'IN_PROGRESS'
    );
    if (existing) {
      return {
        success: false,
        error: 'You already have an active trip in progress. Please complete it before starting a new one.',
      };
    }
  }

  // 3. Check bus availability (no duplicate active trips on same vehicle)
  const busAvail = await checkBusAvailability(busDbId);
  if (!busAvail.available) {
    return {
      success: false,
      error: busAvail.reason || 'Selected bus is unavailable for trip assignment.',
    };
  }

  // 4. Retrieve student manifest to record assigned count and check capacity
  const manifest = await getJourneyStudentManifest(routeDbId, shiftDbId, params.direction);
  const assignedStudentCount = manifest.length;

  // 5. Check vehicle capacity
  const fleet = await fetchFleetBuses();
  const bus = fleet.find((b) => b.id === busDbId || b.id === params.busId);
  let capacityWarning: string | undefined = undefined;
  if (bus && assignedStudentCount > bus.capacity) {
    capacityWarning = `Assigned students (${assignedStudentCount}) exceed the authorized seating capacity (${bus.capacity} seats) for ${bus.busNumber}. Ensure adequate bus allocations.`;
  }

  // Always generate genuine UUID v4 for database primary key
  const tripId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

  const route = OFFICIAL_ROUTES.find((r) => r.id === params.routeId);
  const sourceStop = params.orderedStops[0]?.stop;
  const destinationStop = params.orderedStops[params.orderedStops.length - 1]?.stop;
  const startedAt = new Date().toISOString();
  const tripDate = params.tripDate || new Date().toISOString().slice(0, 10);
  const mode = params.mode || 'LIVE_GPS';

  const tripStops: TripStop[] = params.orderedStops.map((rs, idx) => ({
    id: `ts-${tripId}-${idx + 1}`,
    tripId,
    stopId: rs.stopId,
    sequenceNumber: idx + 1,
    status: 'PENDING',
    reachedAt: undefined,
    stop: rs.stop,
  }));

  const newTrip: Trip = {
    id: tripId,
    routeId: routeDbId,
    driverId: driverDbId,
    busId: busDbId,
    shiftId: shiftDbId,
    direction: params.direction,
    tripDate,
    mode,
    remarks: params.remarks,
    sourceStopId: params.sourceStopId || sourceStop?.id,
    destinationStopId: params.destinationStopId || destinationStop?.id,
    status: 'IN_PROGRESS',
    startedAt,
    currentStopIndex: 0,
    assignedStudentCount,
    boardedStudentCount: 0,
    route,
    bus,
    driver: verifiedDriverProfile
      ? {
          id: verifiedDriverProfile.id,
          name: verifiedDriverProfile.fullName,
          phone: verifiedDriverProfile.phone || '9876543210',
          licenseNumber: verifiedDriverProfile.licenseNumber || 'MH-15-2018-00921',
          experienceYears: verifiedDriverProfile.experienceYears || 5,
          rating: verifiedDriverProfile.rating || 4.9,
          avatarBg: verifiedDriverProfile.avatarBg || 'bg-amber-100 text-amber-800',
          badgeNumber: verifiedDriverProfile.badgeNumber || 'DRV-101',
          assignedBusNumber: bus?.busNumber || 'Bus',
        }
      : undefined,
    sourceStop,
    destinationStop,
    tripStops,
    manifest,
  };

  // Add to local cache immediately
  LOCAL_TRIPS.unshift(newTrip);

  // Initialize live location at source stop
  if (sourceStop) {
    LOCAL_LOCATIONS[tripId] = {
      tripId,
      latitude: sourceStop.latitude,
      longitude: sourceStop.longitude,
      speedKmh: 0,
      heading: 0,
      recordedAt: startedAt,
    };
  }

  // Persist trip atomically to Supabase
  if (isSupabaseConfigured() && isUuid(driverDbId)) {
    try {
      const sourceStopId = sourceStop && isUuid(sourceStop.id) ? sourceStop.id : null;
      const destinationStopId = destinationStop && isUuid(destinationStop.id) ? destinationStop.id : null;

      const stopsPayload = tripStops
        .map((ts) => ({
          stop_id: isUuid(ts.stopId) ? ts.stopId : null,
          sequence_number: ts.sequenceNumber,
          status: ts.status,
          reached_at: ts.reachedAt || null,
        }))
        .filter((s) => s.stop_id !== null);

      // Attempt atomic RPC execution first
      const { error: rpcError } = await supabase.rpc('start_driver_trip', {
        p_trip_id: tripId,
        p_route_id: routeDbId,
        p_driver_id: driverDbId,
        p_bus_id: busDbId,
        p_shift_id: shiftDbId,
        p_direction: params.direction,
        p_trip_date: tripDate,
        p_mode: mode,
        p_remarks: params.remarks || null,
        p_source_stop_id: sourceStopId,
        p_destination_stop_id: destinationStopId,
        p_assigned_student_count: assignedStudentCount,
        p_trip_stops: stopsPayload,
        p_initial_lat: sourceStop?.latitude ?? null,
        p_initial_lng: sourceStop?.longitude ?? null,
      });

      if (rpcError) {
        console.warn('RPC start_driver_trip failed:', rpcError.message);

        // If RPC error indicates a validation, active trip, conflict or authorization issue, return it directly
        if (
          rpcError.message.toLowerCase().includes('already has an active trip') ||
          rpcError.message.toLowerCase().includes('driver already has') ||
          rpcError.message.toLowerCase().includes('duplicate') ||
          rpcError.message.toLowerCase().includes('unauthorized') ||
          rpcError.message.toLowerCase().includes('maintenance') ||
          rpcError.message.toLowerCase().includes('invalid bus') ||
          rpcError.message.toLowerCase().includes('driver account')
        ) {
          return {
            success: false,
            error: rpcError.message,
          };
        }

        const { error: insertTripError } = await supabase.from('trips').insert({
          id: tripId,
          route_id: routeDbId,
          driver_id: driverDbId,
          bus_id: busDbId,
          shift_id: shiftDbId,
          direction: params.direction,
          trip_date: tripDate,
          mode,
          remarks: params.remarks || null,
          assigned_student_count: assignedStudentCount,
          source_stop_id: sourceStopId,
          destination_stop_id: destinationStopId,
          status: 'IN_PROGRESS',
          started_at: startedAt,
          current_stop_index: 0,
        });

        if (insertTripError) {
          console.error('Supabase trip insert error:', insertTripError);
          return {
            success: false,
            error: `Database Trip Error: ${insertTripError.message}. ${insertTripError.details || insertTripError.hint || ''}`,
          };
        }

        // Insert trip stops
        if (stopsPayload.length > 0) {
          const rowsToInsert = stopsPayload.map((ts) => ({
            trip_id: tripId,
            stop_id: ts.stop_id,
            sequence_number: ts.sequence_number,
            status: ts.status,
            reached_at: ts.reached_at,
          }));
          const { error: stopInsertErr } = await supabase.from('trip_stops').insert(rowsToInsert);
          if (stopInsertErr) {
            console.warn('Trip stops insert warning:', stopInsertErr.message);
          }
        }

        // Update bus status to ON_ROUTE
        await supabase.from('buses').update({ status: 'ON_ROUTE' }).eq('id', busDbId);

        // Insert initial live location
        if (sourceStop) {
          await supabase.from('live_locations').insert({
            trip_id: tripId,
            latitude: sourceStop.latitude,
            longitude: sourceStop.longitude,
            speed_kmh: 0,
            heading: 0,
            recorded_at: startedAt,
          });
        }
      }
    } catch (e: any) {
      console.error('Exception saving trip to Supabase:', e);
      return {
        success: false,
        error: `Database connection failure: ${e.message}`,
      };
    }
  }

  // Dispatch persistent real-time trip started notification to all assigned students
  await dispatchTransitNotification({
    tripId,
    eventType: 'TRIP_STARTED',
    routeId: routeDbId,
    shiftId: shiftDbId,
    busId: busDbId,
    driverId: driverDbId,
  });

  return { success: true, trip: newTrip, capacityWarning };
};

/**
 * Updates trip GPS location in memory and Supabase.
 * Awaits Supabase live_locations insert to ensure persistence.
 */
export const updateTripGps = async (
  tripId: string,
  latitude: number,
  longitude: number,
  speedKmh: number = 28,
  heading: number = 0
): Promise<boolean> => {
  const recordedAt = new Date().toISOString();
  LOCAL_LOCATIONS[tripId] = {
    tripId,
    latitude,
    longitude,
    speedKmh,
    heading,
    recordedAt,
  };

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('live_locations')
        .insert({
          trip_id: tripId,
          latitude,
          longitude,
          speed_kmh: speedKmh,
          heading,
          recorded_at: recordedAt,
        });

      if (error) {
        console.warn('Supabase live location insert error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Exception updating GPS in Supabase:', e);
      return false;
    }
  }

  return true;
};

export const getLatestLocation = (tripId: string): LiveLocation | null => {
  return LOCAL_LOCATIONS[tripId] || null;
};

/**
 * Fetches recent GPS location history for route trace visualization
 */
export const getTripLocationHistory = async (tripId: string): Promise<LiveLocation[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('live_locations')
        .select('*')
        .eq('trip_id', tripId)
        .order('recorded_at', { ascending: true })
        .limit(200);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          tripId: d.trip_id,
          latitude: d.latitude,
          longitude: d.longitude,
          speedKmh: d.speed_kmh,
          heading: d.heading,
          recordedAt: d.recorded_at,
        }));
      }
    } catch (e) {
      console.warn('Error loading trip location history:', e);
    }
  }

  const latest = LOCAL_LOCATIONS[tripId];
  return latest ? [latest] : [];
};

/**
 * Advances trip stop progress sequentially and dispatches real-time event notification.
 * Explicitly accepts targetSequenceNumber to support circular routes where a stop
 * naturally appears more than once (e.g. Dwarka Stop on CIDCO route at sequences 2 and 10),
 * completely preventing stops from jumping out of sequence.
 */
export const markStopReached = async (
  tripId: string,
  stopId: string,
  targetSequenceNumber?: number
): Promise<Trip | null> => {
  let trip = LOCAL_TRIPS.find((t) => t.id === tripId);
  const reachedAt = new Date().toISOString();

  // Supabase update first to guarantee persistent state across page refreshes
  let stopIndex = -1;
  let resolvedSeq = targetSequenceNumber;

  if (isSupabaseConfigured() && isUuid(tripId)) {
    try {
      if (typeof resolvedSeq === 'number') {
        stopIndex = resolvedSeq - 1;
        // 1. Update only the targeted stop sequence row
        await supabase
          .from('trip_stops')
          .update({
            status: 'REACHED',
            reached_at: reachedAt,
          })
          .eq('trip_id', tripId)
          .eq('sequence_number', resolvedSeq);

        // 2. Mark any prior sequence stops as REACHED so there are no skipped past stops
        await supabase
          .from('trip_stops')
          .update({
            status: 'REACHED',
            reached_at: reachedAt,
          })
          .eq('trip_id', tripId)
          .lt('sequence_number', resolvedSeq)
          .eq('status', 'PENDING');
      } else {
        // Fallback: Query the earliest PENDING stop for this stop_id
        const { data: stopRows } = await supabase
          .from('trip_stops')
          .select('sequence_number')
          .eq('trip_id', tripId)
          .eq('stop_id', stopId)
          .eq('status', 'PENDING')
          .order('sequence_number', { ascending: true })
          .limit(1);

        if (stopRows && stopRows.length > 0) {
          resolvedSeq = stopRows[0].sequence_number;
          stopIndex = (resolvedSeq || 1) - 1;

          await supabase
            .from('trip_stops')
            .update({
              status: 'REACHED',
              reached_at: reachedAt,
            })
            .eq('trip_id', tripId)
            .eq('sequence_number', resolvedSeq);
        } else {
          // If all are already reached, find earliest row
          const { data: anyRow } = await supabase
            .from('trip_stops')
            .select('sequence_number')
            .eq('trip_id', tripId)
            .eq('stop_id', stopId)
            .order('sequence_number', { ascending: true })
            .limit(1);

          if (anyRow && anyRow.length > 0) {
            resolvedSeq = anyRow[0].sequence_number;
            stopIndex = (resolvedSeq || 1) - 1;
          }
        }
      }

      if (stopIndex !== -1) {
        await supabase
          .from('trips')
          .update({ current_stop_index: stopIndex })
          .eq('id', tripId);
      }

      // Dispatch persistent Event D (STOP_REACHED) to students waiting at this pickup stop
      await dispatchTransitNotification({
        tripId,
        eventType: 'STOP_REACHED',
        stopId,
        routeId: trip?.routeId,
        shiftId: trip?.shiftId,
        busId: trip?.busId,
        driverId: trip?.driverId,
      });
    } catch (e) {
      console.warn('Error updating stop progression in Supabase:', e);
    }
  }

  if (trip) {
    const idx =
      typeof resolvedSeq === 'number'
        ? trip.tripStops.findIndex((ts) => ts.sequenceNumber === resolvedSeq)
        : trip.tripStops.findIndex((ts) => ts.stopId === stopId && ts.status !== 'REACHED');

    if (idx !== -1) {
      // Mark current and all prior stops as REACHED; keep all future stops as PENDING
      trip.tripStops.forEach((ts, i) => {
        if (i <= idx) {
          ts.status = 'REACHED';
          ts.reachedAt = ts.reachedAt || reachedAt;
        }
      });
      trip.currentStopIndex = idx;
    }
    return { ...trip };
  }

  // Fallback: fetch active trip from Supabase if not found in local cache
  if (isSupabaseConfigured() && isUuid(tripId)) {
    return getDriverActiveTrip();
  }

  return null;
};

/**
 * Ends trip safely, marking it COMPLETED while preserving all history and GPS breadcrumbs
 */
export const endTrip = async (tripId: string): Promise<boolean> => {
  const trip = LOCAL_TRIPS.find((t) => t.id === tripId);
  const endedAt = new Date().toISOString();

  if (trip) {
    trip.status = 'COMPLETED';
    trip.endedAt = endedAt;
  }

  if (isSupabaseConfigured() && isUuid(tripId)) {
    try {
      const { error: rpcErr } = await supabase.rpc('end_driver_trip', { p_trip_id: tripId });
      if (rpcErr) {
        console.warn('RPC end_driver_trip fallback:', rpcErr.message);

        let busIdToReset = trip?.busId;
        if (!busIdToReset || !isUuid(busIdToReset)) {
          const { data: tripRow } = await supabase
            .from('trips')
            .select('bus_id')
            .eq('id', tripId)
            .maybeSingle();
          if (tripRow?.bus_id) {
            busIdToReset = tripRow.bus_id;
          }
        }

        await supabase
          .from('trips')
          .update({
            status: 'COMPLETED',
            ended_at: endedAt,
          })
          .eq('id', tripId);

        // Reset bus status to IDLE
        if (busIdToReset && isUuid(busIdToReset)) {
          await supabase.from('buses').update({ status: 'IDLE' }).eq('id', busIdToReset);
        }
      }

      // Dispatch persistent Event E (TRIP_COMPLETED) to assigned students
      await dispatchTransitNotification({
        tripId,
        eventType: 'TRIP_COMPLETED',
        routeId: trip?.routeId,
        shiftId: trip?.shiftId,
        busId: trip?.busId,
        driverId: trip?.driverId,
      });
    } catch (e) {
      console.warn('Error completing trip in Supabase:', e);
    }
  }

  return true;
};

/**
 * Fetches the active in-progress trip for a given driver
 */
export const getDriverActiveTrip = async (driverId?: string): Promise<Trip | null> => {
  let validDriverId = driverId && isUuid(driverId) ? driverId : null;

  if (isSupabaseConfigured()) {
    try {
      const authRes = await getAuthenticatedDriverProfile();
      if (authRes.success && authRes.driverId) {
        validDriverId = authRes.driverId;
      } else if (!validDriverId) {
        const { data: sess } = await supabase.auth.getSession();
        if (sess?.session?.user?.id && isUuid(sess.session.user.id)) {
          validDriverId = sess.session.user.id;
        }
      }

      if (validDriverId) {
        const { data, error } = await supabase
          .from('trips')
          .select(`
            *,
            route:routes(*),
            bus:buses(*),
            driver:drivers(*, profile:profiles(*)),
            trip_stops(*, stop:stops(*))
          `)
          .eq('driver_id', validDriverId)
          .eq('status', 'IN_PROGRESS')
          .order('started_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const t = data[0];
          const stopsSorted = (t.trip_stops || []).sort(
            (a: any, b: any) => a.sequence_number - b.sequence_number
          );

          // Retrieve latest location from live_locations to preserve progress across refresh
          const { data: locRows } = await supabase
            .from('live_locations')
            .select('*')
            .eq('trip_id', t.id)
            .order('recorded_at', { ascending: false })
            .limit(1);

          let latestLocation: LiveLocation | undefined = undefined;
          if (locRows && locRows.length > 0) {
            const loc = locRows[0];
            latestLocation = {
              id: loc.id,
              tripId: loc.trip_id,
              latitude: loc.latitude,
              longitude: loc.longitude,
              speedKmh: loc.speed_kmh,
              heading: loc.heading,
              recordedAt: loc.recorded_at,
            };
            LOCAL_LOCATIONS[t.id] = latestLocation;
          }

          const mappedBus = mapDbBusToBusVehicle(t.bus);
          const mappedRoute = t.route
            ? {
                ...t.route,
                routeNumber: t.route.route_number || t.route.routeNumber,
                name: t.route.name,
              }
            : undefined;

          const tripObj: Trip = {
            id: t.id,
            routeId: t.route_id,
            driverId: t.driver_id,
            busId: t.bus_id,
            shiftId: t.shift_id,
            direction: t.direction as TripDirection,
            tripDate: t.trip_date,
            mode: t.mode as TripMode,
            remarks: t.remarks,
            sourceStopId: t.source_stop_id,
            destinationStopId: t.destination_stop_id,
            status: t.status,
            startedAt: t.started_at,
            endedAt: t.ended_at,
            currentStopIndex: t.current_stop_index || 0,
            assignedStudentCount: t.assigned_student_count || 0,
            boardedStudentCount: t.boarded_student_count || 0,
            route: mappedRoute,
            bus: mappedBus,
            latestLocation,
            driver: t.driver
              ? {
                  id: t.driver.id,
                  name: t.driver.profile?.full_name || 'Driver',
                  phone: t.driver.profile?.phone || '9876543210',
                  licenseNumber: t.driver.license_number,
                  experienceYears: t.driver.experience_years,
                  rating: t.driver.rating || 4.9,
                  badgeNumber: t.driver.badge_number,
                  avatarBg: 'bg-emerald-100 text-emerald-800',
                  assignedBusNumber: mappedBus?.busNumber || 'Bus',
                }
              : undefined,
            tripStops: stopsSorted.map((ts: any) => ({
              id: ts.id,
              tripId: ts.trip_id,
              stopId: ts.stop_id,
              sequenceNumber: ts.sequence_number,
              status: ts.status,
              reachedAt: ts.reached_at,
              stop: ts.stop,
            })),
          };

          // Cache in LOCAL_TRIPS to survive page refresh
          const existingIdx = LOCAL_TRIPS.findIndex((tr) => tr.id === t.id);
          if (existingIdx !== -1) {
            LOCAL_TRIPS[existingIdx] = tripObj;
          } else {
            LOCAL_TRIPS.unshift(tripObj);
          }

          return tripObj;
        }
      }
    } catch (e) {
      console.warn('Error fetching driver active trip from Supabase:', e);
    }
  }

  return (
    LOCAL_TRIPS.find(
      (t) => (t.driverId === driverId || (validDriverId && t.driverId === validDriverId)) && t.status === 'IN_PROGRESS'
    ) || null
  );
};

export const getActiveTrips = async (): Promise<Trip[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          route:routes(*),
          shift:shifts(*),
          bus:buses(*),
          driver:drivers(*, profile:profiles(*)),
          trip_stops(*, stop:stops(*))
        `)
        .eq('status', 'IN_PROGRESS')
        .order('started_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const tripIds = data.map((t: any) => t.id);
        const { data: latestLocs } = await supabase
          .from('live_locations')
          .select('*')
          .in('trip_id', tripIds)
          .order('recorded_at', { ascending: false });

        const locMap = new Map<string, LiveLocation>();
        for (const loc of latestLocs || []) {
          if (!locMap.has(loc.trip_id)) {
            locMap.set(loc.trip_id, {
              id: loc.id,
              tripId: loc.trip_id,
              latitude: loc.latitude,
              longitude: loc.longitude,
              speedKmh: loc.speed_kmh,
              heading: loc.heading,
              recordedAt: loc.recorded_at,
            });
          }
        }

        return data.map((t: any) => {
          const stopsSorted = (t.trip_stops || []).sort(
            (a: any, b: any) => a.sequence_number - b.sequence_number
          );

          const latestLoc = locMap.get(t.id);
          if (latestLoc) {
            LOCAL_LOCATIONS[t.id] = latestLoc;
          }

          const mappedBus = mapDbBusToBusVehicle(t.bus);
          const mappedRoute = t.route
            ? {
                ...t.route,
                routeNumber: t.route.route_number || t.route.routeNumber,
                name: t.route.name,
              }
            : undefined;

          return {
            id: t.id,
            routeId: t.route_id,
            driverId: t.driver_id,
            busId: t.bus_id,
            shiftId: t.shift_id,
            direction: t.direction as TripDirection,
            tripDate: t.trip_date,
            mode: t.mode as TripMode,
            remarks: t.remarks,
            status: t.status,
            startedAt: t.started_at,
            endedAt: t.ended_at,
            currentStopIndex: t.current_stop_index || 0,
            assignedStudentCount: t.assigned_student_count || 0,
            boardedStudentCount: t.boarded_student_count || 0,
            route: mappedRoute,
            bus: mappedBus,
            latestLocation: latestLoc,
            driver: t.driver
              ? {
                  id: t.driver.id,
                  name: t.driver.profile?.full_name || 'Driver',
                  phone: t.driver.profile?.phone || '9876543210',
                  licenseNumber: t.driver.license_number,
                  experienceYears: t.driver.experience_years,
                  rating: t.driver.rating || 4.9,
                  badgeNumber: t.driver.badge_number,
                  avatarBg: 'bg-emerald-100 text-emerald-800',
                  assignedBusNumber: mappedBus?.busNumber || 'Bus',
                }
              : undefined,
            tripStops: stopsSorted.map((ts: any) => ({
              id: ts.id,
              tripId: ts.trip_id,
              stopId: ts.stop_id,
              sequenceNumber: ts.sequence_number,
              status: ts.status,
              reachedAt: ts.reached_at,
              stop: ts.stop,
            })),
          };
        });
      }
    } catch (e) {
      console.warn('Error fetching active trips from Supabase:', e);
    }
  }

  return LOCAL_TRIPS.filter((t) => t.status === 'IN_PROGRESS');
};

export const getDriverTripHistory = async (driverId?: string): Promise<Trip[]> => {
  let validDriverId = driverId && isUuid(driverId) ? driverId : null;

  if (isSupabaseConfigured()) {
    try {
      const authRes = await getAuthenticatedDriverProfile();
      if (authRes.success && authRes.driverId) {
        validDriverId = authRes.driverId;
      } else if (!validDriverId) {
        const { data: sess } = await supabase.auth.getSession();
        if (sess?.session?.user?.id && isUuid(sess.session.user.id)) {
          validDriverId = sess.session.user.id;
        }
      }

      if (validDriverId) {
        const { data, error } = await supabase
          .from('trips')
          .select(`
            *,
            route:routes(*),
            shift:shifts(*),
            bus:buses(*),
            driver:drivers(*, profile:profiles(*)),
            trip_stops(*, stop:stops(*))
          `)
          .eq('driver_id', validDriverId)
          .order('started_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((t: any) => {
          const mappedBus = mapDbBusToBusVehicle(t.bus);
          const mappedRoute = t.route
            ? {
                ...t.route,
                routeNumber: t.route.route_number || t.route.routeNumber,
                name: t.route.name,
              }
            : undefined;

          return {
            id: t.id,
            routeId: t.route_id,
            driverId: t.driver_id,
            busId: t.bus_id,
            shiftId: t.shift_id,
            direction: t.direction as TripDirection,
            tripDate: t.trip_date,
            mode: t.mode as TripMode,
            remarks: t.remarks,
            status: t.status,
            startedAt: t.started_at,
            endedAt: t.ended_at,
            currentStopIndex: t.current_stop_index || 0,
            assignedStudentCount: t.assigned_student_count || 0,
            boardedStudentCount: t.boarded_student_count || 0,
            route: mappedRoute,
            bus: mappedBus,
            driver: t.driver
              ? {
                  id: t.driver.id,
                  name: t.driver.profile?.full_name || 'Driver',
                  phone: t.driver.profile?.phone || '9876543210',
                  licenseNumber: t.driver.license_number,
                  experienceYears: t.driver.experience_years,
                  rating: t.driver.rating || 4.9,
                  badgeNumber: t.driver.badge_number,
                  avatarBg: 'bg-emerald-100 text-emerald-800',
                  assignedBusNumber: mappedBus?.busNumber || 'Bus',
                }
              : undefined,
            tripStops: (t.trip_stops || [])
              .sort((a: any, b: any) => a.sequence_number - b.sequence_number)
              .map((ts: any) => ({
                id: ts.id,
                tripId: ts.trip_id,
                stopId: ts.stop_id,
                sequenceNumber: ts.sequence_number,
                status: ts.status,
                reachedAt: ts.reached_at,
                stop: ts.stop,
              })),
          };
        });
      }
    }
  } catch (e) {
    console.warn('Error fetching driver trip history:', e);
  }
}

  return LOCAL_TRIPS.filter((t) => t.driverId === driverId);
};

/**
 * Access Control for Student:
 * Matches approved shift, route, and pickup stop against live active trips.
 * Direction-aware: verifies the student's pickup stop is in the sequence and not yet passed.
 */
export const getEligibleTripForStudent = async (
  shiftId?: string,
  routeId?: string,
  pickupStopId?: string,
  studentStatus?: string,
  direction?: TripDirection
): Promise<{
  trip: Trip | null;
  matchingTrips: Trip[];
  status: 'ELIGIBLE' | 'NO_ACTIVE_TRIP' | 'STOP_PASSED' | 'PENDING_APPROVAL' | 'NOT_ENROLLED';
  message: string;
}> => {
  if (studentStatus !== 'approved') {
    return {
      trip: null,
      matchingTrips: [],
      status: 'PENDING_APPROVAL',
      message: 'Your transportation registration is pending administrator verification. Live tracking unlocks once approved.',
    };
  }

  if (!shiftId || !routeId || !pickupStopId) {
    return {
      trip: null,
      matchingTrips: [],
      status: 'NOT_ENROLLED',
      message: 'No active route and pickup stop assigned to your student profile.',
    };
  }

  let activeTrips: Trip[] = [];

  // Query live Supabase trips safely guarding UUIDs
  if (isSupabaseConfigured() && isUuid(shiftId) && isUuid(routeId)) {
    try {
      let query = supabase
        .from('trips')
        .select(`
          *,
          route:routes(*),
          bus:buses(*),
          driver:drivers(*, profile:profiles(*)),
          trip_stops(*, stop:stops(*))
        `)
        .eq('shift_id', shiftId)
        .eq('route_id', routeId)
        .eq('status', 'IN_PROGRESS');

      if (direction) {
        query = query.eq('direction', direction);
      }

      let { data, error } = await query;

      // Fallback: If no active trip found in this specific direction, check if active trip is running on this route & shift
      if ((!data || data.length === 0) && direction) {
        const { data: anyDirData } = await supabase
          .from('trips')
          .select(`
            *,
            route:routes(*),
            bus:buses(*),
            driver:drivers(*, profile:profiles(*)),
            trip_stops(*, stop:stops(*))
          `)
          .eq('shift_id', shiftId)
          .eq('route_id', routeId)
          .eq('status', 'IN_PROGRESS')
          .order('started_at', { ascending: false })
          .limit(1);

        if (anyDirData && anyDirData.length > 0) {
          data = anyDirData;
        }
      }

      if (!error && data && data.length > 0) {
        const tripIds = data.map((t: any) => t.id);
        const { data: latestLocs } = await supabase
          .from('live_locations')
          .select('*')
          .in('trip_id', tripIds)
          .order('recorded_at', { ascending: false });

        const locMap = new Map<string, LiveLocation>();
        if (latestLocs) {
          for (const loc of latestLocs) {
            if (!locMap.has(loc.trip_id)) {
              const liveLoc: LiveLocation = {
                id: loc.id,
                tripId: loc.trip_id,
                latitude: loc.latitude,
                longitude: loc.longitude,
                speedKmh: loc.speed_kmh,
                heading: loc.heading,
                recordedAt: loc.recorded_at,
              };
              locMap.set(loc.trip_id, liveLoc);
              LOCAL_LOCATIONS[loc.trip_id] = liveLoc;
            }
          }
        }

        activeTrips = data.map((t: any) => {
          const mappedBus = mapDbBusToBusVehicle(t.bus);
          const mappedRoute = t.route
            ? {
                ...t.route,
                routeNumber: t.route.route_number || t.route.routeNumber,
                name: t.route.name,
              }
            : undefined;

          return {
            id: t.id,
            routeId: t.route_id,
            driverId: t.driver_id,
            busId: t.bus_id,
            shiftId: t.shift_id,
            direction: t.direction as TripDirection,
            tripDate: t.trip_date,
            mode: t.mode as TripMode,
            status: t.status,
            startedAt: t.started_at,
            currentStopIndex: t.current_stop_index || 0,
            assignedStudentCount: t.assigned_student_count || 0,
            route: mappedRoute,
            bus: mappedBus,
            latestLocation: locMap.get(t.id),
            driver: t.driver
              ? {
                  id: t.driver.id,
                  name: t.driver.profile?.full_name || 'Driver',
                  phone: t.driver.profile?.phone || '9876543210',
                  licenseNumber: t.driver.license_number,
                  experienceYears: t.driver.experience_years,
                  rating: t.driver.rating || 4.9,
                  avatarBg: 'bg-amber-100 text-amber-800',
                  badgeNumber: t.driver.badge_number,
                  assignedBusNumber: mappedBus?.busNumber || 'Bus',
                }
              : undefined,
            tripStops: (t.trip_stops || [])
              .sort((a: any, b: any) => a.sequence_number - b.sequence_number)
              .map((ts: any) => ({
                id: ts.id,
                tripId: ts.trip_id,
                stopId: ts.stop_id,
                sequenceNumber: ts.sequence_number,
                status: ts.status,
                reachedAt: ts.reached_at,
                stop: ts.stop,
              })),
          };
        });
      }
    } catch (e) {
      console.warn('Error checking live trips in Supabase:', e);
    }
  }

  // Memory fallback merge
  if (activeTrips.length === 0) {
    activeTrips = LOCAL_TRIPS.filter(
      (t) =>
        t.shiftId === shiftId &&
        t.routeId === routeId &&
        t.status === 'IN_PROGRESS' &&
        (!direction || t.direction === direction)
    );
  }

  if (activeTrips.length === 0) {
    return {
      trip: null,
      matchingTrips: [],
      status: 'NO_ACTIVE_TRIP',
      message: 'No active bus trip for your route right now.',
    };
  }

  // Find trip containing the student's pickup stop
  const matchingTrip = activeTrips.find((t) =>
    t.tripStops.some((ts) => ts.stopId === pickupStopId)
  ) || activeTrips[0];

  const studentTripStop = matchingTrip.tripStops.find((ts) => ts.stopId === pickupStopId);

  // Check if bus has already reached/passed student's stop
  if (
    studentTripStop &&
    studentTripStop.status === 'REACHED' &&
    matchingTrip.currentStopIndex > studentTripStop.sequenceNumber - 1
  ) {
    return {
      trip: matchingTrip,
      matchingTrips: activeTrips,
      status: 'STOP_PASSED',
      message: `The bus has already departed from your stop (${studentTripStop.stop.name}). It is now en route towards destination.`,
    };
  }

  return {
    trip: matchingTrip,
    matchingTrips: activeTrips,
    status: 'ELIGIBLE',
    message: 'Bus is en route. Live tracking is active.',
  };

  return {
    trip: matchingTrip,
    matchingTrips: activeTrips,
    status: 'ELIGIBLE',
    message: 'Bus is currently en route to your stop.',
  };
};

/**
 * Fetches all operating history for a specific bus (calendar & trip log)
 */
export const getBusTripHistory = async (busId: string): Promise<Trip[]> => {
  const resolvedBusId = await resolveBusId(busId);

  if (isSupabaseConfigured() && isUuid(resolvedBusId)) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          route:routes(*),
          shift:shifts(*),
          bus:buses(*),
          driver:drivers(*, profile:profiles(*)),
          trip_stops(*, stop:stops(*))
        `)
        .eq('bus_id', resolvedBusId)
        .order('started_at', { ascending: false });

      if (!error && data) {
        return data.map((t: any) => ({
          id: t.id,
          routeId: t.route_id,
          driverId: t.driver_id,
          busId: t.bus_id,
          shiftId: t.shift_id,
          direction: t.direction as TripDirection,
          tripDate: t.trip_date,
          mode: t.mode as TripMode,
          remarks: t.remarks,
          status: t.status,
          startedAt: t.started_at,
          endedAt: t.ended_at,
          currentStopIndex: t.current_stop_index || 0,
          assignedStudentCount: t.assigned_student_count || 0,
          boardedStudentCount: t.boarded_student_count || 0,
          route: t.route,
          bus: t.bus,
          driver: t.driver
            ? {
                id: t.driver.id,
                name: t.driver.profile?.full_name || 'Driver',
                phone: t.driver.profile?.phone || '9876543210',
                licenseNumber: t.driver.license_number,
                experienceYears: t.driver.experience_years,
                rating: t.driver.rating || 4.9,
                avatarBg: 'bg-amber-100 text-amber-800',
                badgeNumber: t.driver.badge_number,
                assignedBusNumber: t.bus?.bus_number || 'Scheduled Bus',
              }
            : undefined,
          tripStops: (t.trip_stops || [])
            .sort((a: any, b: any) => a.sequence_number - b.sequence_number)
            .map((ts: any) => ({
              id: ts.id,
              tripId: ts.trip_id,
              stopId: ts.stop_id,
              sequenceNumber: ts.sequence_number,
              status: ts.status,
              reachedAt: ts.reached_at,
              stop: ts.stop,
            })),
        }));
      }
    } catch (e) {
      console.warn('Error loading bus history from Supabase:', e);
    }
  }

  return LOCAL_TRIPS.filter((t) => t.busId === busId);
};

/**
 * Fetches all operating history for a route (Route Calendar & History)
 */
export const getRouteTripHistory = async (routeId: string): Promise<Trip[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          route:routes(*),
          shift:shifts(*),
          bus:buses(*),
          driver:drivers(*, profile:profiles(*)),
          trip_stops(*, stop:stops(*))
        `)
        .eq('route_id', routeId)
        .order('started_at', { ascending: false });

      if (!error && data) {
        return data.map((t: any) => ({
          id: t.id,
          routeId: t.route_id,
          driverId: t.driver_id,
          busId: t.bus_id,
          shiftId: t.shift_id,
          direction: t.direction as TripDirection,
          tripDate: t.trip_date,
          mode: t.mode as TripMode,
          remarks: t.remarks,
          status: t.status,
          startedAt: t.started_at,
          endedAt: t.ended_at,
          currentStopIndex: t.current_stop_index || 0,
          assignedStudentCount: t.assigned_student_count || 0,
          boardedStudentCount: t.boarded_student_count || 0,
          route: t.route,
          bus: t.bus,
          driver: t.driver
            ? {
                id: t.driver.id,
                name: t.driver.profile?.full_name || 'Driver',
                phone: t.driver.profile?.phone || '9876543210',
                licenseNumber: t.driver.license_number,
                experienceYears: t.driver.experience_years,
                rating: t.driver.rating || 4.9,
                avatarBg: 'bg-amber-100 text-amber-800',
                badgeNumber: t.driver.badge_number,
                assignedBusNumber: t.bus?.bus_number || 'Scheduled Bus',
              }
            : undefined,
          tripStops: (t.trip_stops || [])
            .sort((a: any, b: any) => a.sequence_number - b.sequence_number)
            .map((ts: any) => ({
              id: ts.id,
              tripId: ts.trip_id,
              stopId: ts.stop_id,
              sequenceNumber: ts.sequence_number,
              status: ts.status,
              reachedAt: ts.reached_at,
              stop: ts.stop,
            })),
        }));
      }
    } catch (e) {
      console.warn('Error loading route trip history:', e);
    }
  }

  return LOCAL_TRIPS.filter((t) => t.routeId === routeId);
};
