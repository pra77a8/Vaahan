import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KKWaghLogo } from '../common/KKWaghLogo';
import { StudentAvatar } from '../common/StudentAvatar';
import {
  Bus,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Users,
  ShieldAlert,
  Fuel,
  ArrowRight,
} from 'lucide-react';

export const DriverDashboard: React.FC = () => {
  const {
    currentBus,
    currentRoute,
    currentDriver,
    allStudents,
    busProgressPercent,
    currentSpeed,
    isSimulating,
    toggleSimulation,
    showToast,
    setRole,
  } = useApp();

  const [checkedStops, setCheckedStops] = useState<Record<string, boolean>>({
    'r1-s1': true,
    'r1-s2': true,
    'r1-s3': true,
  });

  const toggleStop = (stopId: string) => {
    setCheckedStops((prev) => ({
      ...prev,
      [stopId]: !prev[stopId],
    }));
    showToast('Stop arrival status updated');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Driver Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <StudentAvatar
            name={currentDriver?.name || 'Driver'}
            seed={currentDriver?.id || 'drv'}
            gender="male"
            bgColor="bg-sky-100 text-sky-800"
            size="xl"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                Driver Console
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Badge: {currentDriver?.badgeNumber}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">{currentDriver?.name}</h1>
            <p className="text-xs text-slate-500">
              Assigned to <strong className="text-slate-800">{currentBus?.busNumber}</strong> ({currentBus?.plateNumber}) · {currentRoute?.routeNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSimulation}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              isSimulating
                ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? 'Pause Trip' : 'Start Trip Run'}</span>
          </button>
          <button
            onClick={() => setRole('student')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            Switch to Student Portal
          </button>
        </div>
      </div>

      {/* Real-time Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">Current Speed</p>
          <p className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">{currentSpeed} <span className="text-xs font-medium text-slate-500">km/h</span></p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">Boarded Students</p>
          <p className="text-2xl font-extrabold text-sky-700 mt-0.5">39 / 48</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">Fuel Level</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">{currentBus?.fuelPercent}%</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">Trip Progress</p>
          <p className="text-2xl font-extrabold text-indigo-700 mt-0.5">{busProgressPercent}%</p>
        </div>
      </div>

      {/* Stop Check-in List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Route Stop Check-In Log</h2>
            <p className="text-xs text-slate-500">
              Tap a stop to log arrival and notify waiting students at upcoming stages.
            </p>
          </div>
          <span className="text-xs font-bold text-sky-700">{currentRoute?.name}</span>
        </div>

        <div className="space-y-2.5">
          {currentRoute?.stops.map((stop, idx) => {
            const isChecked = checkedStops[stop.id];

            return (
              <div
                key={`${stop.id}-${(stop as any).sequenceNumber || idx}`}
                onClick={() => toggleStop(stop.id)}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isChecked
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-600'
                    }`}
                  >
                    {isChecked ? <CheckCircle2 className="w-4 h-4" /> : stop.sequence}
                  </div>
                  <div>
                    <p className={`text-xs sm:text-sm font-bold ${isChecked ? 'text-emerald-950' : 'text-slate-800'}`}>
                      {stop.name}
                    </p>
                    <p className="text-[11px] text-slate-500">{stop.landmark}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-600">
                    {stop.morningPickup}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isChecked
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isChecked ? 'DEPARTED' : 'PENDING'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
