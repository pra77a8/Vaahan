import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KKWaghLogo } from '../common/KKWaghLogo';
import { StudentAvatar } from '../common/StudentAvatar';
import {
  Shield,
  Bus,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Fuel,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    fleet,
    routes,
    drivers,
    allStudents,
    setRole,
    setStudentTab,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'fleet' | 'students' | 'routes'>('fleet');
  const [broadcastText, setBroadcastText] = useState('');

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    showToast(`Notice broadcasted to all students & drivers: "${broadcastText}"`);
    setBroadcastText('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Admin Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              Transport Department Portal
            </span>
            <span className="text-xs text-slate-500 font-medium">
              K.K. Wagh Education Society
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Campus Fleet Control & Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time fleet health, driver assignments, pass verifications, and route scheduling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRole('student');
              setStudentTab('buses-routes');
            }}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Bus className="w-3.5 h-3.5" />
            <span>Open Student Fleet Directory</span>
          </button>
          <button
            onClick={() => setRole('student')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            Student Portal
          </button>
        </div>
      </div>

      {/* Quick KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-400 uppercase">Active Buses</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{fleet.length} <span className="text-xs text-emerald-600 font-bold">100% On-Time</span></p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-400 uppercase">Registered Students</p>
          <p className="text-2xl font-extrabold text-sky-700 mt-1">214 <span className="text-xs text-slate-500 font-medium">Pass Holders</span></p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-400 uppercase">Active Drivers</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{drivers.length} <span className="text-xs text-slate-500 font-medium">Verified</span></p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-400 uppercase">Annual Revenue</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">₹39.5L <span className="text-xs text-slate-500 font-medium">Collected</span></p>
        </div>
      </div>

      {/* Broadcast Announcement Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-600" /> Instant Transit Broadcast Alert
        </h3>
        <form onSubmit={handleBroadcast} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            placeholder="Send instant alert to all students (e.g. Route 02 delayed 10 mins due to rain)..."
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-sky-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-2xs"
          >
            Broadcast to All
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('fleet')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'fleet'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Buses & Vehicles ({fleet.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'students'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Students & Pass Holders ({allStudents.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'fleet' ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase text-slate-400 tracking-wider">
            Live Fleet Status
          </div>
          <div className="divide-y divide-slate-100">
            {fleet.map((bus) => {
              const driver = drivers.find((d) => d.id === bus.driverId);
              const route = routes.find((r) => r.id === bus.routeId);

              return (
                <div key={bus.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center font-bold text-sky-800 text-xs shrink-0">
                      {bus.busNumber.replace('Bus ', '#')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{bus.busNumber}</h4>
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {bus.plateNumber}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          {bus.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {route?.routeNumber}: {route?.name} · Driver: <strong className="text-slate-800">{driver?.name}</strong> ({driver?.phone})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Occupancy</span>
                      <span className="font-bold">{bus.currentOccupancy}/{bus.capacity} seats</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Speed</span>
                      <span className="font-bold">{bus.currentSpeedKmH} km/h</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Fuel</span>
                      <span className="font-bold text-emerald-700">{bus.fuelPercent}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase text-slate-400 tracking-wider">
            Student Pass Database
          </div>
          <div className="divide-y divide-slate-100">
            {allStudents.map((std) => (
              <div key={std.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <StudentAvatar
                    name={std.name}
                    seed={std.avatarSeed}
                    gender={std.gender}
                    bgColor={std.avatarBg}
                    size="md"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{std.name}</h4>
                    <p className="text-xs text-slate-500">
                      PRN: <strong className="text-slate-700">{std.prn}</strong> · {std.branch} ({std.year}) · Stop: {std.stopName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    PASS ACTIVE
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
