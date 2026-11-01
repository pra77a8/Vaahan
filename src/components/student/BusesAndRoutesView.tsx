import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bus,
  Search,
  Phone,
  Clock,
  MapPin,
  Users,
  Compass,
  ArrowRight,
  ShieldCheck,
  Fuel,
  Info,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { StudentAvatar } from '../common/StudentAvatar';

export const BusesAndRoutesView: React.FC = () => {
  const {
    fleet,
    routes,
    drivers,
    currentStudent,
    setStudentTab,
    setSelectedRouteId,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('all');
  const [timeView, setTimeView] = useState<'morning' | 'evening'>('morning');
  const [expandedBusId, setExpandedBusId] = useState<string | null>(
    currentStudent.assignedBusId || null
  );

  // Filter buses based on search and route filter
  const filteredFleet = fleet.filter((bus) => {
    const route = routes.find((r) => r.id === bus.routeId);
    const driver = drivers.find((d) => d.id === bus.driverId);

    // Route filter
    if (selectedRouteFilter !== 'all' && bus.routeId !== selectedRouteFilter) {
      return false;
    }

    if (!searchTerm.trim()) return true;

    const query = searchTerm.toLowerCase();
    const matchBus = bus.busNumber.toLowerCase().includes(query) || bus.plateNumber.toLowerCase().includes(query);
    const matchDriver = driver?.name.toLowerCase().includes(query) || driver?.phone.includes(query);
    const matchRoute = route?.name.toLowerCase().includes(query) || route?.routeNumber.toLowerCase().includes(query);
    const matchStops = route?.stops.some(
      (s) => s.name.toLowerCase().includes(query) || s.landmark.toLowerCase().includes(query)
    );

    return matchBus || matchDriver || matchRoute || matchStops;
  });

  return (
    <div className="space-y-8">
      {/* Header section with light theme cards - Spacious & Clean */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-linear-to-l from-sky-50/60 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                <Bus className="w-3.5 h-3.5 text-sky-600" />
                Fleet & Route Directory
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Academic Year 2025-2026
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              All Buses, Drivers & Route Stops
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
              Complete official directory of K.K. Wagh institute transit services. View assigned drivers, emergency contacts, vehicle plate numbers, and full stop-by-stop schedules across Nashik.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3.5 shrink-0">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-center">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Buses</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{fleet.length}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-center">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Drivers</p>
              <p className="text-2xl font-extrabold text-sky-700 mt-1">{drivers.length}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-center">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Stops</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">38+</p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by stop name, area, driver, or bus..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Route selector dropdown */}
            <select
              value={selectedRouteFilter}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-sky-500 cursor-pointer"
            >
              <option value="all">All Routes (6 Routes)</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.routeNumber}: {r.name.split('⇄')[0]}
                </option>
              ))}
            </select>

            {/* Time toggle (Morning vs Evening) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setTimeView('morning')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  timeView === 'morning'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Morning Pickup</span>
              </button>
              <button
                onClick={() => setTimeView('evening')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  timeView === 'evening'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Evening Return</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notice box for students */}
      <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-sky-950 leading-relaxed">
          <span className="font-bold">Student Guidance:</span> Your officially assigned bus is{' '}
          <strong className="text-sky-800 font-extrabold">
            {fleet.find((b) => b.id === currentStudent.assignedBusId)?.busNumber || 'Bus 04'}
          </strong>{' '}
          for stop <strong className="text-sky-800 font-extrabold">{currentStudent.stopName}</strong>. If you need to request a route change due to address relocation, contact the Transport Department in Admin Block with verified fee receipt.
        </div>
      </div>

      {/* List of Bus Cards */}
      <div className="space-y-6">
        {filteredFleet.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Bus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No buses or stops matched your search</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try searching for &apos;Nashik Road&apos;, &apos;Dwarka&apos;, &apos;Trimurti&apos;, &apos;Patil&apos;, or reset filters.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRouteFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredFleet.map((bus) => {
            const route = routes.find((r) => r.id === bus.routeId);
            const driver = drivers.find((d) => d.id === bus.driverId);
            const isAssigned = bus.id === currentStudent.assignedBusId;
            const isExpanded = expandedBusId === bus.id;

            return (
              <div
                key={bus.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                  isAssigned
                    ? 'border-sky-300 ring-2 ring-sky-100'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Bus Card Top Bar */}
                <div className="p-5 sm:p-6 border-b border-slate-100">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Bus Identity & Route Details */}
                    <div className="flex items-start gap-4">
                      {/* Bus Badge */}
                      <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col items-center justify-center shrink-0">
                        <Bus className="w-6 h-6 text-sky-700" />
                        <span className="text-[11px] font-extrabold text-sky-900 mt-0.5">
                          {bus.busNumber.replace('Bus ', '#')}
                        </span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900">{bus.busNumber}</h2>
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {bus.plateNumber}
                          </span>
                          {bus.isAC ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
                              AC Express
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                              Standard
                            </span>
                          )}
                          {isAssigned && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-600 text-white">
                              <Sparkles className="w-3 h-3" />
                              Your Assigned Bus
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-slate-700 mt-1 flex items-center gap-1.5">
                          <span className="text-sky-700">{route?.routeNumber}:</span>
                          <span>{route?.name}</span>
                        </p>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 text-slate-400" />
                            {route?.totalDistanceKm} km round trip
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Est. {route?.estimatedDurationMins} mins
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Occupancy: {bus.currentOccupancy}/{bus.capacity} seats
                          </span>
                          <span className="flex items-center gap-1 text-emerald-700 font-medium">
                            <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                            Fuel: {bus.fuelPercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Driver Summary Pill & Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {/* Driver Quick Badge */}
                      {driver && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-3">
                          <StudentAvatar
                            name={driver.name}
                            seed={driver.id}
                            gender="male"
                            bgColor="bg-sky-100 text-sky-800"
                            size="md"
                          />
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                              {driver.name}
                            </p>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                              Driver · {driver.experienceYears} yrs exp.
                            </p>
                            <a
                              href={`tel:${driver.phone}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                showToast(`Calling driver ${driver.name} at ${driver.phone}`);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-800 mt-0.5"
                            >
                              <Phone className="w-3 h-3 text-sky-600" />
                              {driver.phone}
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (route) {
                              setSelectedRouteId(route.id);
                              setStudentTab('tracking');
                            }
                          }}
                          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors flex items-center gap-1.5"
                          title="Track bus on live map"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Track GPS</span>
                        </button>
                        <button
                          onClick={() => setExpandedBusId(isExpanded ? null : bus.id)}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
                            isExpanded
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isExpanded ? 'Hide Route Stops' : `View All Stops (${route?.stops.length || 0})`}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Full Route Stop List & Driver Credentials */}
                {isExpanded && (
                  <div className="bg-slate-50/60 p-5 sm:p-6 border-t border-slate-100 space-y-6 animate-in fade-in duration-200">
                    {/* Driver Detailed Credentials Card */}
                    {driver && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <StudentAvatar
                              name={driver.name}
                              seed={driver.id}
                              gender="male"
                              bgColor="bg-sky-100 text-sky-800"
                              size="lg"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900">{driver.name}</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Police Verified
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Transport Badge: <strong className="text-slate-700">{driver.badgeNumber}</strong> · Heavy Vehicle Commercial License
                              </p>
                              <p className="text-xs text-slate-500 font-mono">
                                DL No: {driver.licenseNumber}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${driver.phone}`}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                            >
                              <Phone className="w-3.5 h-3.5" /> Call Driver
                            </a>
                            {driver.altPhone && (
                              <a
                                href={`tel:${driver.altPhone}`}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                              >
                                Alt: {driver.altPhone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Route Stop List */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-sky-600" />
                          Complete Stop-by-Stop Schedule ({route?.stops.length} Stops)
                        </h4>
                        <span className="text-xs text-slate-500">
                          Showing: <strong className="text-slate-800 capitalize">{timeView} Schedule</strong>
                        </span>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="divide-y divide-slate-100">
                          {route?.stops.map((stop, idx) => {
                            const isStudentStop =
                              isAssigned &&
                              currentStudent.stopName.toLowerCase().includes(stop.name.toLowerCase().slice(0, 10));
                            const isCampus = idx === route.stops.length - 1;

                            return (
                              <div
                                key={`${stop.id}-${(stop as any).sequenceNumber || idx}`}
                                className={`p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                                  isStudentStop
                                    ? 'bg-sky-50/80 border-l-4 border-sky-600'
                                    : 'hover:bg-slate-50/80'
                                }`}
                              >
                                <div className="flex items-start sm:items-center gap-3">
                                  {/* Stop sequence marker */}
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                      isCampus
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : isStudentStop
                                        ? 'bg-sky-600 text-white'
                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    {isCampus ? '★' : stop.sequence}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                                        {stop.name}
                                      </p>
                                      {stop.isMainJunction && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-sm bg-amber-50 text-amber-800 border border-amber-200">
                                          Main Junction
                                        </span>
                                      )}
                                      {isStudentStop && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-sky-100 text-sky-800 border border-sky-300">
                                          Your Boarding Stop
                                        </span>
                                      )}
                                      {isCampus && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          Destination Campus
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      Landmark: {stop.landmark}
                                    </p>
                                  </div>
                                </div>

                                {/* Timings Pill */}
                                <div className="flex items-center gap-3 sm:text-right shrink-0 ml-10 sm:ml-0">
                                  <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 text-left sm:text-right">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase">
                                      {timeView === 'morning' ? 'Morning Pickup' : 'Evening Drop'}
                                    </p>
                                    <p className="text-xs font-extrabold text-slate-900 font-mono">
                                      {timeView === 'morning' ? stop.morningPickup : stop.eveningDrop}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      showToast(`Viewing stop ${stop.name} on map`);
                                      setSelectedRouteId(route.id);
                                      setStudentTab('tracking');
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-sky-600 rounded-md hover:bg-slate-100"
                                    title="View location on map"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
