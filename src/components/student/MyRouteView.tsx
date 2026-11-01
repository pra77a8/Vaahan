import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Clock,
  Bus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { MapView } from '../common/MapView';
import { StudentProfile, OfficialRoute, DirectionalRouteStop } from '../../types';
import {
  fetchRouteById,
  formatRouteDisplay,
  OFFICIAL_ROUTES,
  fetchDirectionalRouteStops,
} from '../../services/routeService';

interface MyRouteViewProps {
  student: StudentProfile;
}

export const MyRouteView: React.FC<MyRouteViewProps> = ({ student }) => {
  const [route, setRoute] = useState<OfficialRoute | null>(null);
  const [scheduleType, setScheduleType] = useState<'morning' | 'evening'>('morning');
  const [directionalStops, setDirectionalStops] = useState<DirectionalRouteStop[]>([]);

  useEffect(() => {
    const routeId = student.transport?.routeId;
    if (routeId) {
      fetchRouteById(routeId).then((r) => {
        if (r) {
          setRoute(r);
        } else {
          setRoute(OFFICIAL_ROUTES[0]);
        }
      });
    } else {
      setRoute(OFFICIAL_ROUTES[0]);
    }
  }, [student]);

  useEffect(() => {
    if (!route) return;
    const dir = scheduleType === 'morning' ? 'TO_COLLEGE' : 'TO_HOME';
    fetchDirectionalRouteStops(route.id, dir).then((stops) => {
      setDirectionalStops(stops);
    });
  }, [route, scheduleType]);

  if (!route) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading route details...</div>;
  }

  const studentPickupStopId = student.transport?.pickupStopId;

  // Prepare map stops from directional ordered sequence
  const effectiveStops = directionalStops.length > 0
    ? directionalStops.map((ds) => ({
        id: ds.id,
        stop: ds.stop,
        sequenceNumber: ds.sequenceNumber,
        isPickupEligible: ds.isStudentStop,
        isStudentPickup: ds.stopId === studentPickupStopId,
        pickupTime: ds.pickupTime,
        dropTime: ds.dropTime,
      }))
    : (route.routeStops || []).map((rs) => ({
        id: rs.id,
        stop: rs.stop,
        sequenceNumber: rs.sequenceNumber,
        isPickupEligible: rs.isPickupEligible,
        isStudentPickup: rs.stopId === studentPickupStopId,
        pickupTime: rs.morningPickupTime,
        dropTime: rs.dropTime,
      }));

  const mapStops = effectiveStops.map((es) => ({
    stop: es.stop,
    sequenceNumber: es.sequenceNumber,
    isPickupEligible: es.isPickupEligible,
    isStudentPickup: es.isStudentPickup,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
              <Compass className="w-3.5 h-3.5 text-sky-600" />
              Official Transit Route
            </span>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {student.transport?.shiftName || 'Morning Shift'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatRouteDisplay(route)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            {route.description || 'Official college bus corridor servicing Nashik sectors.'}
          </p>
        </div>

        {/* Schedule Direction Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setScheduleType('morning')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              scheduleType === 'morning'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Morning Pickup
          </button>
          <button
            onClick={() => setScheduleType('evening')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              scheduleType === 'evening'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Evening Return
          </button>
        </div>
      </div>

      {/* Map & Timeline Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Leaflet Map */}
        <div className="lg:col-span-2 space-y-4">
          <MapView stops={mapStops} height="480px" />

          {/* Student Boarding Point Callout */}
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-center justify-between text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 font-extrabold text-base">★</span>
              <div>
                <p className="font-bold">Your Designated Boarding Point</p>
                <p className="text-[11px] text-amber-800">
                  {student.transport?.pickupStopName || 'Assigned Stop'} · Scheduled Pickup:{' '}
                  <strong>{student.transport?.pickupTime || '07:30 AM'}</strong>
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-200 text-amber-900">
              Verified
            </span>
          </div>
        </div>

        {/* Right 1 Col: Full Stop Sequence Timeline */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {scheduleType === 'morning' ? 'To College Sequence' : 'Returning Home Sequence'}
              </h3>
              <p className="text-[10px] text-slate-500">
                {scheduleType === 'morning'
                  ? 'Starts at Route Terminal → Finishes at Campus'
                  : 'Starts at Campus → Finishes at Route Terminal'}
              </p>
            </div>
            <span className="text-xs text-slate-500 font-semibold">{effectiveStops.length} stops</span>
          </div>

          <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
            {effectiveStops.map((es) => {
              const isStudentStop = es.isStudentPickup;

              return (
                <div
                  key={`${es.id || es.stop.id}-${es.sequenceNumber}`}
                  className={`p-3.5 rounded-xl border transition-all text-xs ${
                    isStudentStop
                      ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-100'
                      : 'bg-slate-50/70 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          isStudentStop
                            ? 'bg-amber-500 text-white'
                            : 'bg-white border border-slate-300 text-slate-700'
                        }`}
                      >
                        {es.sequenceNumber}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{es.stop.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          {es.stop.landmark || 'Designated Stop'}
                        </p>
                        {isStudentStop && (
                          <span className="inline-block text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded mt-1.5">
                            ★ Your Registered Pickup Stop
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="font-mono text-[11px] font-bold text-slate-700 shrink-0">
                      {scheduleType === 'morning' ? es.pickupTime : es.dropTime}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
