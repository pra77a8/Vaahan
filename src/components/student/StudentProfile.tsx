import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StudentAvatar } from '../common/StudentAvatar';
import { StudentGender } from '../../types';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  GraduationCap,
  Bus,
  MapPin,
  Heart,
  Palette,
  Check,
  Sparkles,
  QrCode,
} from 'lucide-react';

const AVATAR_COLOR_OPTIONS = [
  { label: 'Sky Blue', bg: 'bg-sky-100 text-sky-800 border-sky-300' },
  { label: 'Indigo', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { label: 'Emerald', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { label: 'Amber', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
  { label: 'Rose', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
  { label: 'Violet', bg: 'bg-violet-100 text-violet-800 border-violet-300' },
  { label: 'Teal', bg: 'bg-teal-100 text-teal-800 border-teal-300' },
];

export const StudentProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentStudent, currentBus, currentRoute, activePass, updateStudentAvatar } = useApp();

  const [selectedGender, setSelectedGender] = useState<StudentGender>(currentStudent.gender);
  const [selectedBg, setSelectedBg] = useState<string>(currentStudent.avatarBg);
  const [selectedSeed, setSelectedSeed] = useState<string>(currentStudent.avatarSeed);

  const handleSaveAvatar = () => {
    updateStudentAvatar(selectedSeed, selectedGender, selectedBg);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Profile Card - Generously Spaced */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-sky-50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
          {/* Main Avatar display */}
          <div className="relative shrink-0">
            <StudentAvatar
              name={currentStudent.name}
              seed={selectedSeed}
              gender={selectedGender}
              bgColor={selectedBg}
              size="2xl"
              showBadge={true}
              status="active"
            />
          </div>

          <div className="flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{currentStudent.name}</h1>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Verified Student
              </span>
            </div>

            <p className="text-sm sm:text-base text-slate-600 font-medium">
              {currentStudent.branch} · {currentStudent.year} (Division {currentStudent.division})
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-2 gap-x-5 text-xs sm:text-sm text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 font-mono">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                PRN: <strong className="text-slate-800">{currentStudent.prn}</strong>
              </span>
              <span>•</span>
              <span>Roll: <strong className="text-slate-800">{currentStudent.rollNo}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                <Heart className="w-4 h-4" /> Blood Group: {currentStudent.bloodGroup}
              </span>
            </div>

            <div className="pt-3.5 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                type="button"
                onClick={() => navigate('/student/pass')}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-2 shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>View Digital Pass</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/student/route')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <Bus className="w-3.5 h-3.5 text-slate-500" />
                <span>Explore Route</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Avatar Customizer Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Customize Your Student Avatar</h2>
          </div>
          <span className="text-xs text-slate-500">Official Student Identity Avatar</span>
        </div>

        <p className="text-xs text-slate-600">
          Personalize your avatar style and color theme. This avatar is rendered on your Digital Bus Pass, Attendance Logs, and Driver Verification scans.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          {/* Character Style Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Character Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedGender('female')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedGender === 'female'
                    ? 'bg-sky-50 border-sky-400 text-sky-800 ring-2 ring-sky-100'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Style A (Female)</span>
                {selectedGender === 'female' && <Check className="w-4 h-4 text-sky-600" />}
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender('male')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedGender === 'male'
                    ? 'bg-sky-50 border-sky-400 text-sky-800 ring-2 ring-sky-100'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Style B (Male)</span>
                {selectedGender === 'male' && <Check className="w-4 h-4 text-sky-600" />}
              </button>
            </div>
          </div>

          {/* Color Palette Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Badge Color Palette
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSelectedBg(opt.bg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${opt.bg} ${
                    selectedBg === opt.bg ? 'ring-2 ring-sky-500 scale-105 shadow-xs' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSaveAvatar}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply & Save Avatar</span>
          </button>
        </div>
      </div>

      {/* Transit & Academic Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transit Assignment */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3.5">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Bus className="w-4 h-4 text-sky-600" /> Transit & Boarding Profile
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Assigned Bus:</span>
              <span className="font-bold text-slate-900">{currentBus?.busNumber} ({currentBus?.plateNumber})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Route:</span>
              <span className="font-bold text-slate-900">
                {currentStudent.routeName || (currentRoute ? `${currentRoute.routeNumber} - ${currentRoute.name.split('⇄')[0]}` : 'Assigned Route')}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Designated Stop:</span>
              <span className="font-bold text-sky-800">{currentStudent.stopName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Pickup Time:</span>
              <span className="font-mono font-bold text-slate-900">{currentStudent.stopPickupTime}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Pass Validity:</span>
              <span className="font-bold text-emerald-700">{activePass.validTill}</span>
            </div>
          </div>
        </div>

        {/* Emergency & Contact Information */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3.5">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600" /> Emergency & Contact Info
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Registered Email:</span>
              <span className="font-semibold text-slate-800">{currentStudent.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Student Phone:</span>
              <span className="font-mono font-bold text-slate-900">{currentStudent.phone}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Emergency Contact:</span>
              <span className="font-bold text-slate-900">
                {currentStudent.emergencyContact.name} ({currentStudent.emergencyContact.relation})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Emergency Phone:</span>
              <span className="font-mono font-bold text-rose-700">{currentStudent.emergencyContact.phone}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">College Authority:</span>
              <span className="font-bold text-slate-800">Transport Cell (Room 104)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
