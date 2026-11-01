// =============================================================================
// VAAHAN TRANSIT SYSTEM - DRIVER SOS EMERGENCY ALERT SERVICE
// Instant driver distress beacon dispatch, administrative triage & real-time sync
// =============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SosAlert, SosAlertStatus } from '../types';

export interface CreateSosAlertParams {
  driverId: string;
  driverName: string;
  driverPhone?: string;
  busNumber?: string;
  busId?: string;
  tripId?: string;
  routeName?: string;
  direction?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationDescription?: string;
  emergencyType?: string;
  remarks?: string;
}

// In-memory fallback cache for development/offline testing
let LOCAL_SOS_ALERTS: SosAlert[] = [];

const isUuid = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

const mapRowToSosAlert = (row: any): SosAlert => ({
  id: row.id,
  driverId: row.driver_id,
  driverName: row.driver_name,
  driverPhone: row.driver_phone || undefined,
  busNumber: row.bus_number || undefined,
  busId: row.bus_id || undefined,
  tripId: row.trip_id || undefined,
  routeName: row.route_name || undefined,
  direction: row.direction || undefined,
  latitude: typeof row.latitude === 'number' ? row.latitude : null,
  longitude: typeof row.longitude === 'number' ? row.longitude : null,
  locationDescription: row.location_description || undefined,
  emergencyType: row.emergency_type || 'GENERAL_EMERGENCY',
  remarks: row.remarks || undefined,
  status: row.status as SosAlertStatus,
  createdAt: row.created_at,
  acknowledgedAt: row.acknowledged_at || undefined,
  acknowledgedBy: row.acknowledged_by || undefined,
  acknowledgedByName: row.acknowledged_by_name || undefined,
  resolvedAt: row.resolved_at || undefined,
  resolvedBy: row.resolved_by || undefined,
  resolvedByName: row.resolved_by_name || undefined,
  resolutionNotes: row.resolution_notes || undefined,
});

/**
 * Dispatches an instant SOS emergency beacon to Admin and Database
 */
export const createSosAlert = async (
  params: CreateSosAlertParams
): Promise<{ success: boolean; alert?: SosAlert; error?: string }> => {
  const alertId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sos-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const fallbackAlert: SosAlert = {
    id: alertId,
    driverId: params.driverId,
    driverName: params.driverName,
    driverPhone: params.driverPhone,
    busNumber: params.busNumber,
    busId: params.busId,
    tripId: params.tripId,
    routeName: params.routeName,
    direction: params.direction,
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    locationDescription: params.locationDescription,
    emergencyType: params.emergencyType || 'GENERAL_EMERGENCY',
    remarks: params.remarks,
    status: 'ACTIVE',
    createdAt: nowIso,
  };

  if (isSupabaseConfigured()) {
    try {
      // 1. Try secure RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_driver_sos_alert', {
        p_driver_id: isUuid(params.driverId) ? params.driverId : null,
        p_driver_name: params.driverName,
        p_driver_phone: params.driverPhone || null,
        p_bus_number: params.busNumber || null,
        p_bus_id: isUuid(params.busId) ? params.busId : null,
        p_trip_id: isUuid(params.tripId) ? params.tripId : null,
        p_route_name: params.routeName || null,
        p_direction: params.direction || null,
        p_latitude: typeof params.latitude === 'number' ? params.latitude : null,
        p_longitude: typeof params.longitude === 'number' ? params.longitude : null,
        p_location_description: params.locationDescription || null,
        p_emergency_type: params.emergencyType || 'GENERAL_EMERGENCY',
        p_remarks: params.remarks || null,
      });

      if (!rpcError && rpcData) {
        const alert = mapRowToSosAlert(rpcData);
        LOCAL_SOS_ALERTS.unshift(alert);
        dispatchSosEvent(alert);
        return { success: true, alert };
      }

      // 2. Direct table insert fallback
      const { data: insertData, error: insertError } = await supabase
        .from('sos_alerts')
        .insert({
          driver_id: isUuid(params.driverId) ? params.driverId : null,
          driver_name: params.driverName,
          driver_phone: params.driverPhone || null,
          bus_number: params.busNumber || null,
          bus_id: isUuid(params.busId) ? params.busId : null,
          trip_id: isUuid(params.tripId) ? params.tripId : null,
          route_name: params.routeName || null,
          direction: params.direction || null,
          latitude: typeof params.latitude === 'number' ? params.latitude : null,
          longitude: typeof params.longitude === 'number' ? params.longitude : null,
          location_description: params.locationDescription || null,
          emergency_type: params.emergencyType || 'GENERAL_EMERGENCY',
          remarks: params.remarks || null,
          status: 'ACTIVE',
          created_at: nowIso,
        })
        .select('*')
        .single();

      if (!insertError && insertData) {
        const alert = mapRowToSosAlert(insertData);
        LOCAL_SOS_ALERTS.unshift(alert);
        dispatchSosEvent(alert);
        return { success: true, alert };
      }

      console.warn('Supabase SOS insert fallback:', insertError || rpcError);
    } catch (e: any) {
      console.warn('Exception dispatching SOS to Supabase:', e);
    }
  }

  // Local fallback
  LOCAL_SOS_ALERTS.unshift(fallbackAlert);
  dispatchSosEvent(fallbackAlert);
  return { success: true, alert: fallbackAlert };
};

/**
 * Fetches all ACTIVE and ACKNOWLEDGED alerts for real-time monitoring
 */
export const fetchActiveSosAlerts = async (): Promise<SosAlert[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('*')
        .in('status', ['ACTIVE', 'ACKNOWLEDGED'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(mapRowToSosAlert);
      }
    } catch (e) {
      console.warn('Error fetching active SOS alerts from Supabase:', e);
    }
  }

  return LOCAL_SOS_ALERTS.filter((a) => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED');
};

/**
 * Fetches all SOS alerts including historical resolved records
 */
export const fetchAllSosAlerts = async (): Promise<SosAlert[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        return data.map(mapRowToSosAlert);
      }
    } catch (e) {
      console.warn('Error fetching all SOS alerts from Supabase:', e);
    }
  }

  return [...LOCAL_SOS_ALERTS];
};

/**
 * Fetches the currently active SOS alert for a specific driver (if any)
 */
export const fetchDriverActiveSosAlert = async (driverId: string): Promise<SosAlert | null> => {
  if (isSupabaseConfigured() && isUuid(driverId)) {
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', ['ACTIVE', 'ACKNOWLEDGED'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        return mapRowToSosAlert(data[0]);
      }
    } catch (e) {
      console.warn('Error fetching driver active SOS from Supabase:', e);
    }
  }

  const local = LOCAL_SOS_ALERTS.find(
    (a) => a.driverId === driverId && (a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED')
  );
  return local || null;
};

/**
 * Acknowledges an emergency alert by Admin
 */
export const acknowledgeSosAlert = async (
  alertId: string,
  adminId: string,
  adminName: string
): Promise<{ success: boolean; alert?: SosAlert; error?: string }> => {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured() && isUuid(alertId)) {
    try {
      // 1. Try RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('acknowledge_sos_alert', {
        p_alert_id: alertId,
        p_admin_id: isUuid(adminId) ? adminId : null,
        p_admin_name: adminName,
      });

      if (!rpcError && rpcData) {
        const alert = mapRowToSosAlert(rpcData);
        updateLocalAlert(alert);
        dispatchSosEvent(alert);
        return { success: true, alert };
      }

      // 2. Direct table update fallback
      const { data: updateData, error: updateError } = await supabase
        .from('sos_alerts')
        .update({
          status: 'ACKNOWLEDGED',
          acknowledged_at: nowIso,
          acknowledged_by: isUuid(adminId) ? adminId : null,
          acknowledged_by_name: adminName,
        })
        .eq('id', alertId)
        .select('*')
        .single();

      if (!updateError && updateData) {
        const alert = mapRowToSosAlert(updateData);
        updateLocalAlert(alert);
        dispatchSosEvent(alert);
        return { success: true, alert };
      }
    } catch (e: any) {
      console.warn('Error acknowledging SOS alert in Supabase:', e);
    }
  }

  // Local fallback
  const existing = LOCAL_SOS_ALERTS.find((a) => a.id === alertId);
  if (existing) {
    existing.status = 'ACKNOWLEDGED';
    existing.acknowledgedAt = nowIso;
    existing.acknowledgedBy = adminId;
    existing.acknowledgedByName = adminName;
    dispatchSosEvent({ ...existing });
    return { success: true, alert: { ...existing } };
  }

  return { success: false, error: 'Alert not found' };
};

/**
 * Resolves an emergency alert by Admin
 */
export const resolveSosAlert = async (
  alertId: string,
  adminId: string,
  adminName: string,
  resolutionNotes?: string
): Promise<{ success: boolean; alert?: SosAlert; error?: string }> => {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured() && isUuid(alertId)) {
    try {
      // 1. Try RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('resolve_sos_alert', {
        p_alert_id: alertId,
        p_admin_id: isUuid(adminId) ? adminId : null,
        p_admin_name: adminName,
        p_resolution_notes: resolutionNotes || null,
      });

      if (!rpcError && rpcData) {
        const alert = mapRowToSosAlert(rpcData);
        updateLocalAlert(alert);
        dispatchSosEvent(alert);
        return { success: true, alert };
      }

      // 2. Direct table update fallback
      const { data: updateData, error: updateError } = await supabase
        .from('sos_alerts')
        .update({
          status: 'RESOLVED',
          resolved_at: nowIso,
          resolved_by: isUuid(adminId) ? adminId : null,
          resolved_by_name: adminName,
          resolution_notes: resolutionNotes || null,
        })
        .eq('id', alertId)
        .select('*')
        .single();

      if (!updateError && updateData) {
        const alert = mapRowToSosAlert(updateData);
        updateLocalAlert(alert);
        dispatchSosEvent(alert);
        return { success: true, alert };
      }
    } catch (e: any) {
      console.warn('Error resolving SOS alert in Supabase:', e);
    }
  }

  // Local fallback
  const existing = LOCAL_SOS_ALERTS.find((a) => a.id === alertId);
  if (existing) {
    existing.status = 'RESOLVED';
    existing.resolvedAt = nowIso;
    existing.resolvedBy = adminId;
    existing.resolvedByName = adminName;
    existing.resolutionNotes = resolutionNotes;
    dispatchSosEvent({ ...existing });
    return { success: true, alert: { ...existing } };
  }

  return { success: false, error: 'Alert not found' };
};

const updateLocalAlert = (alert: SosAlert) => {
  const idx = LOCAL_SOS_ALERTS.findIndex((a) => a.id === alert.id);
  if (idx !== -1) {
    LOCAL_SOS_ALERTS[idx] = alert;
  } else {
    LOCAL_SOS_ALERTS.unshift(alert);
  }
};

const dispatchSosEvent = (alert: SosAlert) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('vaahan:sos_alert_changed', {
        detail: { alert },
      })
    );
  }
};

/**
 * Subscribes to real-time SOS alerts via Supabase Realtime channel + local custom events
 */
export const subscribeSosAlerts = (onChange: (alert: SosAlert) => void): (() => void) => {
  let isSubscribed = true;

  // Local window event listener
  const handleLocalEvent = (e: any) => {
    if (isSubscribed && e.detail?.alert) {
      onChange(e.detail.alert);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('vaahan:sos_alert_changed', handleLocalEvent);
  }

  // Supabase Realtime channel
  let channel: any = null;
  if (isSupabaseConfigured()) {
    try {
      channel = supabase
        .channel('sos_alerts_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sos_alerts',
          },
          (payload: any) => {
            if (!isSubscribed) return;
            const row = payload.new || payload.old;
            if (row) {
              const mapped = mapRowToSosAlert(row);
              updateLocalAlert(mapped);
              onChange(mapped);
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Could not subscribe to Supabase Realtime for SOS alerts:', e);
    }
  }

  return () => {
    isSubscribed = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('vaahan:sos_alert_changed', handleLocalEvent);
    }
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
};
