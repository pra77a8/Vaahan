import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MapPin,
  Clock,
  Compass,
  Bus,
  ArrowRight,
  Info,
  CheckCircle2,
  Calendar,
  Share2,
} from 'lucide-react';

export const RouteDetailsView: React.FC = () => {
  const { currentStudent, currentRoute, currentBus, routes, setStudentTab, showToast } = useApp();
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    currentStudent.assignedRouteId || 'route-01'
  );
  const [direction, setDirection] = useState<'morning' | 'evening'>('morning');

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || currentRoute || routes[0];

  return (
    <div className="space-y-8">
      {/* Header - Spacious */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
              <Compass className="w-3.5 h-3.5 text-sky-600" />
              Route Stops & Timetable
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Daily Operational Timings
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            {activeRoute?.routeNumber}: {activeRoute?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Round-trip route spanning {activeRoute?.totalDistanceKm} km with {activeRoute?.stops.length} major stops across Nashik.
          </p>
        </div>

        {/* Route Selector and Direction Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-sky-500"
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.routeNumber}: {r.name.split('⇄')[0]}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setDirection('morning')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                direction === 'morning'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Morning Pickup
            </button>
            <button
              onClick={() => setDirection('evening')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                direction === 'evening'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Evening Drop
            </button>
          </div>
        </div>
      </div>

      {/* Route Stops Full Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2">
            <Bus className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">
              {direction === 'morning' ? 'Morning Campus Inward Schedule' : 'Evening Return Departure Schedule'}
            </h2>
          </div>
          <button
            onClick={() => setStudentTab('buses-routes')}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            <span>View All Fleet Buses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative pl-6 sm:pl-8 space-y-6">
          {/* Vertical Connecting Line */}
          <div className="absolute left-3 sm:left-4 top-3 bottom-3 w-0.5 bg-slate-200" />

          {activeRoute?.stops.map((stop, index) => {
            const isFirst = index === 0;
            const isLast = index === (activeRoute?.stops.length || 0) - 1;
            const isStudentStop =
              selectedRouteId === currentStudent.assignedRouteId &&
              currentStudent.stopName.toLowerCase().includes(stop.name.toLowerCase().slice(0, 10));

            return (
              <div key={`${stop.id}-${(stop as any).sequenceNumber || index}`} className="relative flex items-start gap-4">
                {/* Number Circle Node */}
                <div
                  className={`absolute -left-6 sm:-left-8 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isLast
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : isStudentStop
                      ? 'bg-sky-600 text-white ring-4 ring-sky-100'
                      : isFirst
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border-2 border-slate-300 text-slate-700'
                  }`}
                >
                  {isLast ? '★' : stop.sequence}
                </div>

                {/* Stop Card */}
                <div
                  className={`flex-1 p-4 rounded-xl border transition-all ${
                    isStudentStop
                      ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-200'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">{stop.name}</h3>
                        {stop.isMainJunction && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            Major Junction
                          </span>
                        )}
                        {isStudentStop && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-600 text-white">
                            Your Assigned Stop
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Landmark: <span className="text-slate-700 font-medium">{stop.landmark}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs text-left sm:text-right shrink-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">
                          {direction === 'morning' ? 'Scheduled Pickup' : 'Scheduled Drop'}
                        </p>
                        <p className="text-xs font-extrabold text-slate-900 font-mono">
                          {direction === 'morning' ? stop.morningPickup : stop.eveningDrop}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
