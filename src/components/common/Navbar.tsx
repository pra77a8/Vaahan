import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KKWaghLogo } from './KKWaghLogo';
import { StudentAvatar } from './StudentAvatar';
import {
  Bell,
  Bus,
  MapPin,
  QrCode,
  CreditCard,
  User,
  Shield,
  Car,
  GraduationCap,
  ChevronDown,
  Compass,
  Check,
  Radio,
  Menu,
  X,
  Phone,
  LogOut,
  Navigation,
} from 'lucide-react';
import { StudentActiveTab } from '../../types';

interface NavbarProps {
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSignOut }) => {
  const {
    role,
    setRole,
    currentStudent,
    setCurrentStudentId,
    allStudents,
    studentTab,
    setStudentTab,
    notifications,
    fleet,
  } = useApp();

  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const navItems: { id: StudentActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home', label: 'Home', icon: <Compass className="w-4 h-4 shrink-0" /> },
    { id: 'tracking', label: 'Track Bus', icon: <Navigation className="w-4 h-4 shrink-0" /> },
    { id: 'my-route', label: 'My Route', icon: <MapPin className="w-4 h-4 shrink-0" /> },
    { id: 'pass', label: 'Bus Pass', icon: <QrCode className="w-4 h-4 shrink-0" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4 shrink-0" /> },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: <Bell className="w-4 h-4 shrink-0" />, 
      badge: unreadCount > 0 ? `${unreadCount}` : undefined 
    },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4 shrink-0" /> },
    { 
      id: 'buses-routes', 
      label: 'Fleet Directory', 
      icon: <Bus className="w-4 h-4 shrink-0" /> 
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
      {/* Top Banner with College Identity */}
      <div className="bg-sky-50/80 border-b border-sky-100/80 py-1.5 text-xs text-sky-900 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-semibold text-slate-800 truncate">
              K. K. Wagh Institute of Engineering Education & Research (Autonomous), Nashik
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-sky-700 font-medium shrink-0">NAAC A-Grade · AICTE Approved</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500 shrink-0">
            <span className="flex items-center gap-1 font-medium">
              <Phone className="w-3 h-3 text-slate-400" /> Control Cell: 0253-2512876
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-emerald-600 animate-pulse" /> Vaahan Transit Verified
            </span>
          </div>
        </div>
      </div>

      {/* Main Top Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4 sm:gap-6">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => {
                setStudentTab('home');
              }}
              className="flex items-center gap-2 text-left group focus:outline-hidden hover:opacity-95 transition-opacity"
            >
              <KKWaghLogo size="md" showSubtitle={true} />
            </button>
          </div>

          {/* Right Action Controls: Student Profile, Demo Switcher, Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {role === 'student' && (
              <div className="relative">
                <button
                  onClick={() => setStudentDropdownOpen(!studentDropdownOpen)}
                  className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 text-slate-700 text-xs font-medium transition-all shadow-2xs"
                  title="Switch Demo Student Profile"
                >
                  <StudentAvatar
                    name={currentStudent.name}
                    seed={currentStudent.avatarSeed}
                    gender={currentStudent.gender}
                    bgColor={currentStudent.avatarBg}
                    size="sm"
                  />
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="font-bold text-slate-900 leading-tight">
                      {currentStudent.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono leading-tight">
                      {currentStudent.prn}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </button>

                {studentDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Switch Demo Student Profile
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {allStudents.map((std) => (
                        <button
                          key={std.id}
                          onClick={() => {
                            setCurrentStudentId(std.id);
                            setStudentDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs transition-colors hover:bg-slate-50 ${
                            std.id === currentStudent.id ? 'bg-sky-50 text-sky-950 font-semibold' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <StudentAvatar
                              name={std.name}
                              seed={std.avatarSeed}
                              gender={std.gender}
                              bgColor={std.avatarBg}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-900">{std.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">
                                PRN: {std.prn}
                              </p>
                            </div>
                          </div>
                          {std.id === currentStudent.id && (
                            <Check className="w-4 h-4 text-sky-600 shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sign Out Button */}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Sign Out of Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

            {/* Mobile Drawer Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Navigation Bar for Student Module (Spacious, Responsive) */}
      {role === 'student' && (
        <div className="border-t border-slate-200/70 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar py-2">
              {navItems.map((item) => {
                const isActive = studentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setStudentTab(item.id)}
                    className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-white text-sky-800 shadow-xs border border-slate-200 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 border border-transparent'
                    }`}
                  >
                    <span className={isActive ? 'text-sky-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Drawer Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 shadow-lg">
          {role === 'student' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {navItems.map((item) => {
                const isActive = studentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setStudentTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-colors ${
                      isActive
                        ? 'bg-sky-50 text-sky-800 border border-sky-200 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? 'text-sky-600' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
