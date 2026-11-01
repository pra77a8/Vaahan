import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StudentAvatar } from '../common/StudentAvatar';
import {
  Bus,
  MapPin,
  Clock,
  Phone,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Bell,
  Sparkles,
  Route,
  Navigation,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  Compass,
} from 'lucide-react';
import {
  computePassStatus,
  calculateDaysRemaining,
  formatDateReadable,
} from '../../services/razorpayService';

export const StudentHome: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentStudent,
    activePass,
    notifications,
    setStudentTab,
    showToast,
  } = useApp();

  const isApproved =
    currentStudent.approvalStatus === 'approved' ||
    currentStudent.passStatus === 'ACTIVE' ||
    currentStudent.passStatus === 'EXPIRING_SOON' ||
    currentStudent.passStatus === 'EXPIRED';
  const activeAlert = notifications.find((n) => !n.isRead);

  const passStatus = computePassStatus(currentStudent.passExpiryDate);
  const daysRemaining = calculateDaysRemaining(currentStudent.passExpiryDate);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Student Welcome Header Card - Light Theme & Generously Spaced */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-sky-50/70 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5 sm:gap-6">
            <StudentAvatar
              name={currentStudent.name}
              seed={currentStudent.avatarSeed}
              gender={currentStudent.gender}
              bgColor={currentStudent.avatarBg}
              size="xl"
              showBadge={true}
              status={isApproved ? 'active' : 'offline'}
            />

            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Welcome, {currentStudent.name}
                </h1>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isApproved
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                >
                  {isApproved ? 'Pass Active & Verified' : 'Pending Admin Verification'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {currentStudent.branch} ({currentStudent.year} · Div {currentStudent.division}) · PRN:{' '}
                <span className="font-mono text-slate-800 font-bold">{currentStudent.prn}</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  {currentStudent.stopName}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Pickup: <strong className="text-slate-900">{currentStudent.stopPickupTime || '07:42 AM'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Pass Badge Card */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shrink-0 gap-3">
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Digital Pass Status
              </p>
              <p className="text-xs sm:text-sm font-mono font-bold text-slate-800 mt-0.5">
                {isApproved ? activePass.passNumber : 'Verification Pending'}
              </p>
              {currentStudent.passExpiryDate && (
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  Valid till: {formatDateReadable(currentStudent.passExpiryDate)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate('/student/pass')}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>View Pass</span>
            </button>
          </div>
        </div>
      </div>

      {/* PASS EXPIRING SOON BANNER */}
      {passStatus === 'EXPIRING_SOON' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-amber-950 flex items-center gap-2">
                <span>Bus Pass Expiring in {daysRemaining} Day(s)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                  Due {formatDateReadable(currentStudent.passExpiryDate)}
                </span>
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Renew your college bus concession pass now for 180 days to avoid any disruption in transit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/student/pass')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shrink-0 flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Renew Pass (₹1)</span>
          </button>
        </div>
      )}

      {/* PASS EXPIRED BANNER */}
      {passStatus === 'EXPIRED' && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-rose-950">
                Your College Bus Pass Has Expired
              </p>
              <p className="text-xs text-rose-800 mt-0.5">
                Expired on {formatDateReadable(currentStudent.passExpiryDate)}. Please renew immediately to regain valid transit privileges.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/student/pass')}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Renew Expired Pass (₹1)</span>
          </button>
        </div>
      )}

      {/* Account Pending Approval Notice if not approved */}
      {!isApproved && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs sm:text-sm font-bold text-amber-950">
              Account Registration Pending Administrator Verification
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Your enrollment details under PRN <strong className="font-mono">{currentStudent.prn}</strong> are being verified by the Transport Cell. Once approved by the administrator, your digital pass will activate and you will be able to access live bus tracking for your route.
            </p>
          </div>
        </div>
      )}

      {/* Alert Banner if present */}
      {activeAlert && (
        <div className="bg-sky-50 border border-sky-200/90 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center shrink-0 mt-0.5 text-sky-700">
              <Bell className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-bold text-sky-950">{activeAlert.title}</p>
              <p className="text-xs text-sky-800 leading-relaxed">{activeAlert.message}</p>
              <p className="text-[10px] text-sky-600 font-medium pt-1">{activeAlert.timestamp}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/student/notifications')}
            className="text-xs font-bold text-sky-900 hover:text-sky-950 shrink-0 underline"
          >
            All Notices
          </button>
        </div>
      )}

      {/* Main Grid: Track Bus Card & Route Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Cols: Live Transit Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-sky-700" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Live GPS Bus Tracking
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Real-time tracking for your approved route and pickup stop
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                  isApproved
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isApproved ? 'Available on Active Run' : 'Pending Verification'}
              </span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Approved Route:</span>
                  <span className="font-bold text-slate-900">
                    {currentStudent.shiftName || 'Morning Shift'} · {currentStudent.routeName || currentStudent.assignedRouteName || 'Assigned Route'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Designated Pickup Point:</span>
                  <span className="font-bold text-sky-700">{currentStudent.stopName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Morning Scheduled Time:</span>
                  <span className="font-mono font-bold text-slate-800">{currentStudent.stopPickupTime || '07:42 AM'}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                When your assigned bus driver starts their morning or general shift trip, browser GPS tracking broadcasts coordinates in real-time. Students whose stops match the active journey can monitor the live map.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/student/track')}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <Navigation className="w-4 h-4" />
                <span>Open Live GPS Tracker</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/student/route')}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <Compass className="w-4 h-4 text-slate-500" />
                <span>View Route Timeline</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Support & Pass Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Campus Transport Support</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              For route modification requests, bus delay queries, or pass fee inquiries:
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-800 text-xs">Coordinator Office: Transport Cell</p>
              <p className="text-[11px] text-slate-500">Room 104, Campus Administration Building</p>
              <p className="font-mono font-bold text-xs text-sky-800 pt-1">Helpline: +91 0253 2512876</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
