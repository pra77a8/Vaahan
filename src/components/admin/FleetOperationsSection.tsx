import React, { useState, useEffect, useMemo } from 'react';
import {
  Bus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Users,
  Shield,
  Calendar,
  Clock,
  ArrowRight,
  Eye,
  X,
  MapPin,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  Car,
  Compass,
  Wrench,
  Check,
} from 'lucide-react';
import { BusVehicle, OfficialRoute, Trip, Shift } from '../../types';
import { fetchFleetBuses, fetchFleetKPIs, FleetKPIs, fetchBusMaintenanceRecords } from '../../services/fleetService';
import { getBusTripHistory, getRouteTripHistory, getTripLocationHistory } from '../../services/tripService';
import { fetchShifts, fetchRoutesByShift, formatRouteDisplay } from '../../services/routeService';
import { MapView } from '../common/MapView';

export const FleetOperationsSection: React.FC = () => {
  const [buses, setBuses] = useState<BusVehicle[]>([]);
  const [kpis, setKpis] = useState<FleetKPIs>({
    totalBuses: 6,
    inServiceBuses: 0,
    maintenanceBuses: 0,
    activeTrips: 0,
    totalCapacity: 264,
    assignedStudents: 0,
  });

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [routes, setRoutes] = useState<OfficialRoute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [acFilter, setAcFilter] = useState<string>('ALL');

  // Selected Bus for Detail Modal/Drawer
  const [selectedBus, setSelectedBus] = useState<BusVehicle | null>(null);
  const [busTrips, setBusTrips] = useState<Trip[]>([]);
  const [busMaintenance, setBusMaintenance] = useState<any[]>([]);
  const [detailTab, setDetailTab] = useState<'calendar' | 'route-calendar' | 'trips' | 'drivers' | 'documents'>('calendar');

  // Calendar State
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedDayTrips, setSelectedDayTrips] = useState<{ dateStr: string; trips: Trip[] } | null>(null);

  // Trip Inspection Modal
  const [inspectingTrip, setInspectingTrip] = useState<Trip | null>(null);
  const [inspectingTripLocations, setInspectingTripLocations] = useState<any[]>([]);

  // Selected Route for Route Calendar View
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [routeTrips, setRouteTrips] = useState<Trip[]>([]);

  // Initial Load
  const loadFleetData = async () => {
    setLoading(true);
    try {
      const [busList, kpiData, shiftList] = await Promise.all([
        fetchFleetBuses(),
        fetchFleetKPIs(),
        fetchShifts(),
      ]);
      setBuses(busList);
      setKpis(kpiData);
      setShifts(shiftList);

      if (shiftList.length > 0) {
        const morningRoutes = await fetchRoutesByShift(shiftList[0].id);
        const generalShift = shiftList.find((s) => s.code === 'GENERAL');
        const generalRoutes = generalShift ? await fetchRoutesByShift(generalShift.id) : [];
        const allRoutes = [...morningRoutes, ...generalRoutes];
        setRoutes(allRoutes);
        if (allRoutes.length > 0) {
          setSelectedRouteId(allRoutes[0].id);
        }
      }
    } catch (e) {
      console.warn('Error loading fleet operations data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleetData();
  }, []);

  // When bus is selected, load its trip history & maintenance records, and poll every 3s to keep calendar live
  useEffect(() => {
    if (!selectedBus) {
      setBusTrips([]);
      setBusMaintenance([]);
      setSelectedDayTrips(null);
      return;
    }

    let isSubscribed = true;

    const refreshBusTrips = async () => {
      try {
        const trips = await getBusTripHistory(selectedBus.id);
        if (!isSubscribed) return;
        setBusTrips(trips);

        setSelectedDayTrips((prev) => {
          if (prev) {
            const updated = trips.filter(
              (t) => (t.tripDate || t.startedAt?.slice(0, 10)) === prev.dateStr
            );
            return { dateStr: prev.dateStr, trips: updated };
          }
          const todayStr = new Date().toISOString().slice(0, 10);
          const todayTrips = trips.filter(
            (t) => t.tripDate === todayStr || t.startedAt?.slice(0, 10) === todayStr
          );
          if (todayTrips.length > 0) {
            return { dateStr: todayStr, trips: todayTrips };
          } else if (trips.length > 0) {
            const firstTripDate = trips[0].tripDate || trips[0].startedAt?.slice(0, 10) || todayStr;
            return {
              dateStr: firstTripDate,
              trips: trips.filter((t) => (t.tripDate || t.startedAt?.slice(0, 10)) === firstTripDate),
            };
          }
          return null;
        });
      } catch (err) {
        console.warn('Error loading bus trip history:', err);
      }
    };

    refreshBusTrips();
    const interval = setInterval(refreshBusTrips, 3000);

    fetchBusMaintenanceRecords(selectedBus.id).then((records) => {
      if (isSubscribed) setBusMaintenance(records);
    });

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [selectedBus]);

  // Load Route Trips when Route is selected in Route Calendar tab
  useEffect(() => {
    if (!selectedRouteId) return;
    getRouteTripHistory(selectedRouteId).then((rTrips) => {
      setRouteTrips(rTrips);
    });
  }, [selectedRouteId]);

  // When inspecting a trip, load location history
  useEffect(() => {
    if (!inspectingTrip) {
      setInspectingTripLocations([]);
      return;
    }
    getTripLocationHistory(inspectingTrip.id).then((locs) => {
      setInspectingTripLocations(locs);
    });
  }, [inspectingTrip]);

  // Filtered Buses
  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      const matchesSearch =
        bus.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bus.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bus.model.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ON_ROUTE' && bus.status === 'ON_ROUTE') ||
        (statusFilter === 'IDLE' && bus.status === 'IDLE') ||
        (statusFilter === 'MAINTENANCE' && bus.status === 'MAINTENANCE');

      const matchesAc =
        acFilter === 'ALL' ||
        (acFilter === 'AC' && bus.isAC) ||
        (acFilter === 'NON_AC' && !bus.isAC);

      return matchesSearch && matchesStatus && matchesAc;
    });
  }, [buses, searchTerm, statusFilter, acFilter]);

  // Calendar calculations (Month View)
  const daysInMonth = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 for Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: { date: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Prefix blanks
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ date: 0, dateStr: '', isCurrentMonth: false });
    }

    // Month days
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      days.push({ date: d, dateStr, isCurrentMonth: true });
    }

    return days;
  }, [calendarDate]);

  // Map trips by dateStr for the selected bus
  const tripsByDate = useMemo(() => {
    const map = new Map<string, Trip[]>();
    for (const t of busTrips) {
      const d = t.tripDate || (t.startedAt ? t.startedAt.slice(0, 10) : '');
      if (d) {
        const list = map.get(d) || [];
        list.push(t);
        map.set(d, list);
      }
    }
    return map;
  }, [busTrips]);

  // Map trips by dateStr for the selected route
  const routeTripsByDate = useMemo(() => {
    const map = new Map<string, Trip[]>();
    for (const t of routeTrips) {
      const d = t.tripDate || (t.startedAt ? t.startedAt.slice(0, 10) : '');
      if (d) {
        const list = map.get(d) || [];
        list.push(t);
        map.set(d, list);
      }
    }
    return map;
  }, [routeTrips]);

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="space-y-6">
      {/* Fleet Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 uppercase">
              Transit Fleet Operations
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">KKWIEER Real Vehicle Inventory</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Institutional Fleet & Operating Logbook
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Real database records of campus buses across Morning and General Shifts. Track vehicle assignments, seating utilization, and complete individual operating calendars.
          </p>
        </div>
      </div>

      {/* KPI METRICS (CALCULATED FROM DATABASE RECORDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Buses</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-slate-900">{kpis.totalBuses}</span>
            <Bus className="w-5 h-5 text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Registered fleet</span>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-2xs bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-700 uppercase block">In Service</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-emerald-700">{kpis.inServiceBuses}</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Currently active</span>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200/80 p-4 shadow-2xs bg-rose-50/20">
          <span className="text-[11px] font-bold text-rose-700 uppercase block">Maintenance</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-rose-700">{kpis.maintenanceBuses}</span>
            <Wrench className="w-5 h-5 text-rose-600" />
          </div>
          <span className="text-[10px] text-rose-600 mt-0.5 block">Under service</span>
        </div>

        <div className="bg-white rounded-2xl border border-sky-200/80 p-4 shadow-2xs bg-sky-50/20">
          <span className="text-[11px] font-bold text-sky-700 uppercase block">Active Trips</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-sky-700">{kpis.activeTrips}</span>
            <Compass className="w-5 h-5 text-sky-600" />
          </div>
          <span className="text-[10px] text-sky-600 mt-0.5 block">Live on road</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-600 uppercase block">Seat Capacity</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-slate-900">{kpis.totalCapacity}</span>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Authorized seats</span>
        </div>

        <div className="bg-white rounded-2xl border border-indigo-200/80 p-4 shadow-2xs bg-indigo-50/20">
          <span className="text-[11px] font-bold text-indigo-700 uppercase block">Assigned Students</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-indigo-700">{kpis.assignedStudents}</span>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <span className="text-[10px] text-indigo-600 mt-0.5 block">Approved allocations</span>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by bus number, registration plate, or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold"
          >
            <option value="ALL">All Operational Statuses</option>
            <option value="ON_ROUTE">In Service / On Route</option>
            <option value="IDLE">Idle / Ready at Depot</option>
            <option value="MAINTENANCE">Under Maintenance</option>
          </select>

          <select
            value={acFilter}
            onChange={(e) => setAcFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold"
          >
            <option value="ALL">All Climate Types</option>
            <option value="AC">AC Equipped</option>
            <option value="NON_AC">Standard Ventilation</option>
          </select>
        </div>
      </div>

      {/* BUS CARDS GRID (REDESIGNED: NO FUEL BARS, CLEAN METRICS, VIEW DETAILS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBuses.map((bus) => {
          const isOperational = bus.status !== 'MAINTENANCE';
          const isOnRoute = bus.status === 'ON_ROUTE';

          return (
            <div
              key={bus.id}
              className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                      <Bus className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">{bus.busNumber}</h3>
                      <p className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                        {bus.plateNumber}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isOnRoute
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : isOperational
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnRoute
                          ? 'bg-emerald-500 animate-pulse'
                          : isOperational
                          ? 'bg-slate-400'
                          : 'bg-rose-500'
                      }`}
                    />
                    {isOnRoute ? 'On Route' : isOperational ? 'Idle / Ready' : 'Maintenance'}
                  </span>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Chassis Model</span>
                    <p className="font-semibold text-slate-800 mt-0.5 truncate">{bus.model}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Seating Capacity</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">{bus.capacity} Authorized Seats</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Climate Equipment</span>
                    <p className="font-bold text-xs mt-0.5">
                      {bus.isAC ? (
                        <span className="text-emerald-700">AC Equipped</span>
                      ) : (
                        <span className="text-slate-600">Standard Ventilation</span>
                      )}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Document Status</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {bus.rcExpiry ? 'Verified on Record' : 'Not recorded'}
                    </p>
                  </div>
                </div>

                {/* Operational Context */}
                <div className="p-3 rounded-2xl bg-sky-50/50 border border-sky-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Operation Status:</span>
                    <span className="font-bold text-slate-800">
                      {isOnRoute ? 'Active Daily Trip' : 'Available for Assignment'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Fitness Expiry:</span>
                    <span className="font-semibold text-slate-700">
                      {bus.fitnessExpiry || 'Not recorded'}
                    </span>
                  </div>
                </div>
              </div>

              {/* View Details Action Button */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedBus(bus)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details & Operating History</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================================= */}
      {/* SECTION 8: BUS DETAILS, OPERATING CALENDAR & HISTORY MODAL / DRAWER     */}
      {/* ======================================================================= */}
      {selectedBus && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-extrabold text-xl shrink-0">
                  <Bus className="w-7 h-7 text-sky-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {selectedBus.plateNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedBus.status === 'ON_ROUTE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedBus.status === 'MAINTENANCE'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedBus.status}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    {selectedBus.busNumber} · {selectedBus.model}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized Seating: {selectedBus.capacity} Seats · {selectedBus.isAC ? 'Climate-Controlled AC' : 'Standard Ventilation'} · Location: {selectedBus.currentLocationName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBus(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="px-6 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setDetailTab('calendar')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  detailTab === 'calendar'
                    ? 'border-sky-600 text-sky-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Bus Operating Calendar</span>
              </button>

              <button
                onClick={() => setDetailTab('route-calendar')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  detailTab === 'route-calendar'
                    ? 'border-sky-600 text-sky-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Route Operating Calendar</span>
              </button>

              <button
                onClick={() => setDetailTab('trips')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  detailTab === 'trips'
                    ? 'border-sky-600 text-sky-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Trip History ({busTrips.length})</span>
              </button>

              <button
                onClick={() => setDetailTab('drivers')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  detailTab === 'drivers'
                    ? 'border-sky-600 text-sky-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Driver Assignment History</span>
              </button>

              <button
                onClick={() => setDetailTab('documents')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  detailTab === 'documents'
                    ? 'border-sky-600 text-sky-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Maintenance & Documents</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1: BUS MONTHLY OPERATING CALENDAR */}
              {detailTab === 'calendar' && (
                <div className="space-y-6">
                  {/* Calendar Navigation & Legend */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <h3 className="font-extrabold text-base text-slate-900">
                        {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                      </h3>
                      <button
                        onClick={handleNextMonth}
                        className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Status Legend */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Completed Trip</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Active Trip</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span>Multiple Trips</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Cancelled Trip</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <span>Maintenance</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        <span>No Trip Recorded</span>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Grid (Days of Week + Days) */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="grid grid-cols-7 bg-slate-50 text-center font-bold text-[11px] text-slate-500 border-b border-slate-200 py-2">
                      <span>Sun</span>
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                    </div>

                    <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-white">
                      {daysInMonth.map((day, idx) => {
                        if (!day.isCurrentMonth) {
                          return <div key={idx} className="h-20 bg-slate-50/50 p-2" />;
                        }

                        const dayTrips = tripsByDate.get(day.dateStr) || [];
                        const isSelected = selectedDayTrips?.dateStr === day.dateStr;
                        const hasActive = dayTrips.some((t) => t.status === 'IN_PROGRESS');
                        const hasCompleted = dayTrips.some((t) => t.status === 'COMPLETED');
                        const hasCancelled = dayTrips.some((t) => t.status === 'CANCELLED');
                        const isMaintenanceDay = (busMaintenance || []).some(
                          (m) => (m.maintenance_date || m.service_date)?.slice(0, 10) === day.dateStr
                        );

                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedDayTrips({ dateStr: day.dateStr, trips: dayTrips })}
                            className={`h-20 p-2 cursor-pointer transition-colors relative flex flex-col justify-between ${
                              isSelected
                                ? 'bg-sky-50/80 ring-2 ring-sky-500 z-10'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-700">{day.date}</span>

                            {hasActive ? (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded block truncate bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                ● Active Trip
                              </span>
                            ) : dayTrips.length > 1 ? (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded block truncate bg-indigo-100 text-indigo-800">
                                {dayTrips.length} Trips
                              </span>
                            ) : hasCompleted ? (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded block truncate bg-emerald-100 text-emerald-800">
                                Completed
                              </span>
                            ) : hasCancelled ? (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded block truncate bg-rose-100 text-rose-800">
                                Cancelled
                              </span>
                            ) : isMaintenanceDay ? (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded block truncate bg-orange-100 text-orange-800">
                                Maintenance
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-300 block">No trips</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Day Trips Drill-Down */}
                  {selectedDayTrips && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-slate-900">
                          Trip Records for {selectedDayTrips.dateStr}
                        </h4>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {selectedDayTrips.trips.length} Recorded Trips
                        </span>
                      </div>

                      {selectedDayTrips.trips.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No trips recorded for this bus on {selectedDayTrips.dateStr}.</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedDayTrips.trips.map((t) => (
                            <div
                              key={t.id}
                              className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-slate-900">
                                    {t.route ? formatRouteDisplay(t.route) : `Route ${t.routeId}`}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                                    {t.direction === 'TO_COLLEGE' ? 'To College' : 'Returning Home'}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                    {t.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  Driver: <strong>{t.driver?.name}</strong> · Started: <strong>{new Date(t.startedAt || '').toLocaleTimeString()}</strong> · Ended: <strong>{t.endedAt ? new Date(t.endedAt).toLocaleTimeString() : 'In Progress'}</strong> · Assigned Students: <strong>{t.assignedStudentCount || 0}</strong>
                                </p>
                              </div>

                              <button
                                onClick={() => setInspectingTrip(t)}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0"
                              >
                                Inspect Trip Run
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ROUTE OPERATING CALENDAR */}
              {detailTab === 'route-calendar' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Individual Route Operating Calendar
                      </h3>
                      <p className="text-xs text-slate-500">
                        Select an institutional route to inspect its daily bus operational history.
                      </p>
                    </div>

                    <select
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900"
                    >
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="grid grid-cols-7 bg-slate-50 text-center font-bold text-[11px] text-slate-500 border-b border-slate-200 py-2">
                      <span>Sun</span>
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                    </div>

                    <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-white">
                      {daysInMonth.map((day, idx) => {
                        if (!day.isCurrentMonth) {
                          return <div key={idx} className="h-20 bg-slate-50/50 p-2" />;
                        }

                        const dayTrips = routeTripsByDate.get(day.dateStr) || [];

                        return (
                          <div key={idx} className="h-20 p-2 flex flex-col justify-between">
                            <span className="text-xs font-bold text-slate-700">{day.date}</span>
                            {dayTrips.length > 0 ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 truncate block">
                                {dayTrips.length} {dayTrips.length > 1 ? 'Buses' : 'Bus'} Operated
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-300 block">No run</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: COMPLETE TRIP HISTORY */}
              {detailTab === 'trips' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900">Historical Trip Records for {selectedBus.busNumber}</h3>
                    <span className="text-xs text-slate-500">{busTrips.length} Total Journeys</span>
                  </div>

                  {busTrips.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">No trips recorded for this bus.</div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Route</th>
                            <th className="p-3">Direction</th>
                            <th className="p-3">Driver</th>
                            <th className="p-3">Start / End</th>
                            <th className="p-3">Assigned Students</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {busTrips.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono font-semibold">{t.tripDate}</td>
                              <td className="p-3 font-bold text-slate-900">{t.route?.name}</td>
                              <td className="p-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800">
                                  {t.direction === 'TO_COLLEGE' ? 'To College' : 'Returning Home'}
                                </span>
                              </td>
                              <td className="p-3 font-semibold text-slate-800">{t.driver?.name}</td>
                              <td className="p-3 font-mono text-slate-600 text-[11px]">
                                {new Date(t.startedAt || '').toLocaleTimeString()} - {t.endedAt ? new Date(t.endedAt).toLocaleTimeString() : 'Live'}
                              </td>
                              <td className="p-3 font-bold text-slate-900">{t.assignedStudentCount || 0}</td>
                              <td className="p-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  {t.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setInspectingTrip(t)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px]"
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DRIVER ASSIGNMENT HISTORY */}
              {detailTab === 'drivers' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Driver Assignment & Vehicle History
                      </h3>
                      <p className="text-xs text-slate-500">
                        Records answering which authorized driver operated this vehicle on each date.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {busTrips.map((t) => (
                      <div key={t.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-bold shrink-0">
                            <Car className="w-5 h-5 text-amber-700" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">{t.driver?.name}</p>
                            <p className="text-[11px] text-slate-500">
                              Badge: {t.driver?.badgeNumber} · License: {t.driver?.licenseNumber} · Phone: {t.driver?.phone}
                            </p>
                          </div>
                        </div>

                        <div className="text-right space-y-0.5">
                          <span className="font-mono text-[11px] font-bold text-slate-600 block">{t.tripDate}</span>
                          <span className="text-[11px] font-semibold text-sky-800">{t.route?.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: MAINTENANCE & DOCUMENTS (NO FUEL!) */}
              {detailTab === 'documents' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Official Vehicle Certificates & Roadworthiness</h3>
                    <p className="text-xs text-slate-500">
                      Mandatory institutional documentation. Missing certificates are clearly marked "Not uploaded".
                    </p>
                  </div>

                  {/* Documents Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Registration Certificate (RC)</span>
                      <p className="font-extrabold text-sm text-slate-900">{selectedBus.rcExpiry || 'Not recorded'}</p>
                      <span className="text-[10px] text-emerald-700 font-bold block">✓ Verified on File</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Comprehensive Insurance</span>
                      <p className="font-extrabold text-sm text-slate-900">{selectedBus.insuranceExpiry || 'Not recorded'}</p>
                      <span className="text-[10px] text-emerald-700 font-bold block">✓ Valid Institutional Policy</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">RTO Fitness Certificate</span>
                      <p className="font-extrabold text-sm text-slate-900">{selectedBus.fitnessExpiry || 'Not recorded'}</p>
                      <span className="text-[10px] text-emerald-700 font-bold block">✓ Certified Roadworthy</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Educational Institution Permit</span>
                      <p className="font-extrabold text-sm text-slate-900">{selectedBus.permitExpiry || 'Not recorded'}</p>
                      <span className="text-[10px] text-emerald-700 font-bold block">✓ Transport Cell Authorized</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Pollution Under Control (PUC)</span>
                      <p className="font-extrabold text-sm text-slate-900">{selectedBus.pucExpiry || 'Not recorded'}</p>
                      <span className="text-[10px] text-emerald-700 font-bold block">✓ Emission Standards Passed</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Periodic Service</span>
                      <p className="font-extrabold text-sm text-slate-900">{selectedBus.lastServiceDate || 'Not recorded'}</p>
                      <span className="text-[10px] text-slate-500 block truncate">{selectedBus.maintenanceRemarks || 'Regular maintenance completed.'}</span>
                    </div>
                  </div>

                  {/* Maintenance Log */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-xs text-slate-800">Maintenance & Service Log</h4>
                    {busMaintenance.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No external garage maintenance incidents recorded.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                        {busMaintenance.map((m) => (
                          <div key={m.id} className="p-3 text-xs flex justify-between">
                            <div>
                              <p className="font-bold text-slate-900">{m.maintenance_type}</p>
                              <p className="text-slate-500 text-[11px]">{m.description}</p>
                            </div>
                            <span className="font-mono text-slate-500">{m.serviced_at}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TRIP DETAIL INSPECTION MODAL (WITH MAP BREADCRUMBS)                     */}
      {/* ======================================================================= */}
      {inspectingTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Trip Run Audit: {inspectingTrip.route?.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectingTrip.tripDate} · {inspectingTrip.direction === 'TO_COLLEGE' ? 'To College' : 'Returning Home'} · Driver: {inspectingTrip.driver?.name}
                </p>
              </div>
              <button
                onClick={() => setInspectingTrip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Telemetry Map */}
              <MapView
                stops={inspectingTrip.tripStops.map((ts) => ({
                  stop: ts.stop,
                  sequenceNumber: ts.sequenceNumber,
                  status: ts.status,
                }))}
                currentLocation={inspectingTripLocations[inspectingTripLocations.length - 1] || null}
                busNumber={inspectingTrip.bus?.busNumber || 'Bus'}
                speedKmh={0}
                height="280px"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Vehicle</span>
                  <span className="font-bold text-slate-800">{inspectingTrip.bus?.busNumber}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Students</span>
                  <span className="font-bold text-slate-800">{inspectingTrip.assignedStudentCount || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Started At</span>
                  <span className="font-bold text-slate-800">{new Date(inspectingTrip.startedAt || '').toLocaleTimeString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Ended At</span>
                  <span className="font-bold text-slate-800">{inspectingTrip.endedAt ? new Date(inspectingTrip.endedAt).toLocaleTimeString() : 'N/A'}</span>
                </div>
              </div>

              {/* Stop Sequence */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Ordered Stops Sequence:</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {inspectingTrip.tripStops.map((ts, idx) => (
                    <div key={ts.id} className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        #{idx + 1} {ts.stop.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        ts.status === 'REACHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {ts.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
