import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentAvatar } from '../common/StudentAvatar';
import {
  Bus,
  MapPin,
  Navigation,
  Phone,
  Clock,
  Gauge,
  Play,
  Pause,
  RefreshCw,
  Share2,
  AlertTriangle,
  Compass,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

export const LiveTrackingView: React.FC = () => {
  const {
    currentStudent,
    currentBus,
    currentRoute,
    currentDriver,
    routes,
    fleet,
    drivers,
    busProgressPercent,
    currentSpeed,
    isSimulating,
    toggleSimulation,
    showToast,
    selectedRouteId,
    setSelectedRouteId,
  } = useApp();

  const [activeRouteId, setActiveRouteId] = useState<string>(
    selectedRouteId || currentStudent.assignedRouteId
  );

  const activeRoute = routes.find((r) => r.id === activeRouteId) || currentRoute || routes[0];
  const activeBus = fleet.find((b) => b.routeId === activeRoute?.id) || currentBus;
  const activeDriver = drivers.find((d) => d.id === activeBus?.driverId) || currentDriver;

  // Calculate simulated stop index based on progress percent
  const totalStops = activeRoute?.stops.length || 8;
  const currentStopIndex = Math.min(
    totalStops - 1,
    Math.floor((busProgressPercent / 100) * totalStops)
  );

  return (
    <div className="space-y-8">
      {/* Top Controls Header - Generous & Clean */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Live Telemetry Active
            </span>
            <span className="text-xs text-slate-500 font-medium">
              GPS Refresh: 2.5s
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Live Bus Tracking & ETA
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time GPS tracking for {activeBus?.busNumber} ({activeRoute?.name})
          </p>
        </div>

        {/* Route Selector & Sim controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeRouteId}
            onChange={(e) => {
              setActiveRouteId(e.target.value);
              setSelectedRouteId(e.target.value);
            }}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-sky-500"
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.routeNumber}: {r.name.split('⇄')[0]}
              </option>
            ))}
          </select>

          <button
            onClick={toggleSimulation}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
            title={isSimulating ? 'Pause GPS simulation' : 'Resume GPS simulation'}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{isSimulating ? 'Pause GPS' : 'Resume GPS'}</span>
          </button>

          <button
            onClick={() => showToast('Shareable live tracking link copied to clipboard!')}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Main Map & Telemetry Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: High-Fidelity Light Styled Interactive Map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden relative">
            {/* Map Top Status Pill Overlay */}
            <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 text-xs">
                <Gauge className="w-4 h-4 text-sky-600" />
                <span className="font-semibold text-slate-600">Speed:</span>
                <span className="font-mono font-bold text-slate-900">{currentSpeed} km/h</span>
              </div>
              <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 text-xs">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-600">ETA to Campus:</span>
                <span className="font-bold text-emerald-700">~14 mins</span>
              </div>
            </div>

            {/* Interactive Vector / Schematic Map Canvas */}
            <div className="relative h-[420px] sm:h-[480px] bg-slate-100 overflow-hidden select-none">
              {/* Soft Map Grid Pattern & Roads */}
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                {/* Land background with soft Nashik geographical tones */}
                <rect width="100%" height="100%" fill="#f8fafc" />

                {/* River Godavari representation running through Nashik */}
                <path
                  d="M -20 180 Q 200 230, 400 190 T 900 210"
                  fill="none"
                  stroke="#bae6fd"
                  strokeWidth="24"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <text x="320" y="195" fill="#0284c7" fontSize="10" fontWeight="bold" opacity="0.6">
                  ~ Godavari River ~
                </text>

                {/* City Roads Grid */}
                <path
                  d="M 50 0 L 50 600 M 180 0 L 180 600 M 340 0 L 340 600 M 520 0 L 520 600 M 700 0 L 700 600"
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                />
                <path
                  d="M 0 80 L 1000 80 M 0 240 L 1000 240 M 0 380 L 1000 380"
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                />

                {/* National Highway NH-3 Route Arterial Line */}
                <path
                  d="M 60 400 Q 250 360, 460 270 T 800 90"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M 60 400 Q 250 360, 460 270 T 800 90"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                {/* Transit Route Path Highlight */}
                <path
                  id="activeBusRoutePath"
                  d="M 80 380 C 180 360, 240 320, 360 280 C 450 250, 520 220, 620 170 C 690 140, 750 110, 810 80"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="8 4"
                />

                {/* KK Wagh Engineering College Campus Marker */}
                <g transform="translate(810, 80)">
                  <circle cx="0" cy="0" r="28" fill="#dcfce7" opacity="0.7" />
                  <circle cx="0" cy="0" r="14" fill="#16a34a" />
                  <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                    KKW
                  </text>
                  <rect x="-85" y="-36" width="170" height="24" rx="6" fill="#1e293b" opacity="0.9" />
                  <text x="0" y="-20" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                    KK Wagh College Campus
                  </text>
                </g>

                {/* Route stops rendered along path */}
                {activeRoute?.stops.map((stop, i) => {
                  // Coordinate interpolation
                  const t = i / (totalStops - 1);
                  const x = 80 + t * (810 - 80) + (Math.sin(t * Math.PI) * 40);
                  const y = 380 - t * (380 - 80) + (Math.cos(t * Math.PI) * 20);
                  const isPassed = i <= currentStopIndex;
                  const isCurrent = i === currentStopIndex;

                  return (
                    <g key={`${stop.id}-${(stop as any).sequenceNumber || i}`} transform={`translate(${x}, ${y})`}>
                      <circle
                        cx="0"
                        cy="0"
                        r={isCurrent ? '10' : '6'}
                        fill={isCurrent ? '#0284c7' : isPassed ? '#10b981' : '#ffffff'}
                        stroke={isCurrent ? '#bae6fd' : '#94a3b8'}
                        strokeWidth={isCurrent ? '4' : '2'}
                      />
                      {/* Stop Label pill on alternate sides */}
                      <g transform={`translate(${i % 2 === 0 ? 12 : -12}, ${i % 2 === 0 ? -14 : 18})`}>
                        <text
                          textAnchor={i % 2 === 0 ? 'start' : 'end'}
                          fill="#1e293b"
                          fontSize="10"
                          fontWeight="700"
                          className="drop-shadow-xs"
                        >
                          {stop.name.split('/')[0].split('(')[0].trim()}
                        </text>
                        <text
                          y="11"
                          textAnchor={i % 2 === 0 ? 'start' : 'end'}
                          fill="#64748b"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {stop.morningPickup}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Animated Bus Icon on Path */}
                {(() => {
                  const t = busProgressPercent / 100;
                  const busX = 80 + t * (810 - 80) + (Math.sin(t * Math.PI) * 40);
                  const busY = 380 - t * (380 - 80) + (Math.cos(t * Math.PI) * 20);

                  return (
                    <g transform={`translate(${busX}, ${busY})`}>
                      {/* Pulse beacon */}
                      <circle cx="0" cy="0" r="26" fill="#0284c7" fillOpacity="0.2">
                        <animate attributeName="r" values="18;34;18" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="0" cy="0" r="16" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
                      <g transform="translate(-8, -8) scale(0.68)">
                        <path
                          d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"
                          fill="#ffffff"
                        />
                      </g>

                      {/* Bus callout flag */}
                      <g transform="translate(18, -26)">
                        <rect x="0" y="0" width="100" height="34" rx="6" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                        <text x="8" y="14" fill="#0f172a" fontSize="10" fontWeight="bold">
                          {activeBus?.busNumber}
                        </text>
                        <text x="8" y="26" fill="#0284c7" fontSize="9" fontWeight="bold">
                          {currentSpeed} km/h · On Route
                        </text>
                      </g>
                    </g>
                  );
                })()}
              </svg>

              {/* Map Corner Compass */}
              <div className="absolute bottom-4 right-4 bg-white/95 p-2 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <Compass className="w-4 h-4 text-sky-600 animate-spin" style={{ animationDuration: '16s' }} />
                <span>Nashik East Sector</span>
              </div>
            </div>

            {/* Bottom Live Bar inside Map Container */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="text-slate-600">Current GPS Fix:</span>
                <span className="font-bold text-slate-900">
                  {activeRoute?.stops[currentStopIndex]?.name || 'Dwarka Circle Flyover Pillar 14'}
                </span>
              </div>
              <div className="text-slate-500 text-[11px]">
                Target Arrival at College: <strong className="text-slate-800">08:00 AM (Sharp)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Driver Details & Route Progress Timeline */}
        <div className="space-y-5">
          {/* Driver Contact & Emergency Card */}
          {activeDriver && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Assigned Driver</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  On Duty
                </span>
              </div>

              <div className="flex items-center gap-3">
                <StudentAvatar
                  name={activeDriver.name}
                  seed={activeDriver.id}
                  gender="male"
                  bgColor="bg-sky-100 text-sky-800"
                  size="lg"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{activeDriver.name}</h4>
                  <p className="text-xs text-slate-500">
                    Badge: <strong className="text-slate-700">{activeDriver.badgeNumber}</strong> · Exp: {activeDriver.experienceYears} yrs
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Bus: {activeBus?.busNumber} ({activeBus?.plateNumber})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`tel:${activeDriver.phone}`}
                  onClick={() => showToast(`Dialing driver ${activeDriver.name}`)}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Driver</span>
                </a>
                <button
                  onClick={() => showToast('Emergency alert triggered to Transport Cell & Driver')}
                  className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>SOS Alert</span>
                </button>
              </div>
            </div>
          )}

          {/* Sequential Route Stop Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Route Stop Sequence</span>
              <span className="text-xs font-semibold text-sky-700">{activeRoute?.routeNumber}</span>
            </h3>

            <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {activeRoute?.stops.map((stop, idx) => {
                const isPassed = idx < currentStopIndex;
                const isCurrent = idx === currentStopIndex;
                const isStudentStop =
                  currentStudent.stopName.toLowerCase().includes(stop.name.toLowerCase().slice(0, 10));

                return (
                  <div key={`${stop.id}-${(stop as any).sequenceNumber || idx}`} className="relative flex items-start gap-3 text-xs">
                    {/* Timeline line */}
                    {idx < (activeRoute?.stops.length || 0) - 1 && (
                      <div
                        className={`absolute left-3.5 top-6 bottom-0 w-0.5 ${
                          isPassed ? 'bg-emerald-400' : 'bg-slate-200'
                        }`}
                      />
                    )}

                    {/* Timeline dot */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 z-10 ${
                        isCurrent
                          ? 'bg-sky-600 text-white ring-4 ring-sky-100'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-500 border border-slate-300'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>

                    <div
                      className={`flex-1 p-2 rounded-xl border transition-colors ${
                        isCurrent
                          ? 'bg-sky-50 border-sky-300'
                          : isStudentStop
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-slate-50/60 border-slate-200/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-slate-900 leading-tight">
                          {stop.name}
                        </p>
                        <span className="font-mono text-[10px] font-bold text-slate-600 shrink-0">
                          {stop.morningPickup}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                        {stop.landmark}
                      </p>
                      {isStudentStop && (
                        <p className="text-[10px] font-bold text-amber-800 mt-1">
                          ★ Your Boarding Point
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
