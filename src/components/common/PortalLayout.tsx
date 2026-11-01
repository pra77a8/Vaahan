import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ShieldCheck,
  GraduationCap,
  Car,
  Bell,
  Sparkles,
  Phone,
} from 'lucide-react';
import { KKWaghLogo } from './KKWaghLogo';
import { UserRole } from '../../types';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  isPrimary?: boolean; // Appears on mobile bottom bar
}

interface PortalLayoutProps {
  role: UserRole;
  roleTitle: string;
  user: any;
  navItems: NavItem[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({
  role,
  roleTitle,
  user,
  navItems,
  activeTab,
  onSelectTab,
  onSignOut,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  // Split items for mobile bottom bar: primary (first 4) and secondary (in More drawer)
  const primaryNavItems = navItems.filter((item) => item.isPrimary ?? true).slice(0, 4);
  const secondaryNavItems = navItems.filter(
    (item) => !primaryNavItems.some((p) => p.id === item.id)
  );

  // Close drawers when tab changes or escape is pressed
  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    setMobileDrawerOpen(false);
    setMobileMoreOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false);
        setMobileMoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Touch Swipe Navigation (Right Swipe to Go Back in browser history)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;

    // Check if target was inside interactive inputs or map
    const target = e.target as HTMLElement | null;
    const isInteractive = target?.closest('input, textarea, select, button, .leaflet-container');

    if (!isInteractive && deltaX > 85 && Math.abs(deltaY) < 55 && elapsed < 450) {
      // Valid left-to-right swipe -> navigate back
      window.history.back();
    }

    touchStartRef.current = null;
  };

  // Role accent colors
  const roleBadgeStyles =
    role === 'admin'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : role === 'driver'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-sky-100 text-sky-800 border-sky-200';

  const roleActiveTabStyles =
    role === 'admin'
      ? 'bg-emerald-700 text-white font-bold shadow-xs'
      : role === 'driver'
      ? 'bg-amber-600 text-white font-bold shadow-xs'
      : 'bg-sky-700 text-white font-bold shadow-xs';

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col text-slate-800 antialiased"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ===================================================================== */}
      {/* TOP INSTITUTIONAL BAR (Mobile & Tablet Header) */}
      {/* ===================================================================== */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 py-2.5 px-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Menu className="w-5 h-5" />
          </button>
          <KKWaghLogo size="sm" showSubtitle={false} />
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${roleBadgeStyles}`}
          >
            {roleTitle}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign Out"
            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* DESKTOP PERSISTENT LEFT SIDEBAR */}
      {/* ===================================================================== */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="overflow-hidden">
              <KKWaghLogo size="sm" showSubtitle={false} />
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${roleBadgeStyles}`}
                >
                  {roleTitle}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Autonomous</span>
              </div>
            </div>
          ) : (
            <div className="mx-auto font-black text-sky-800 text-lg">V</div>
          )}

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items (Vertical List) */}
        <nav
          className="flex-1 p-3 space-y-1 overflow-y-auto"
          aria-label="Desktop primary navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  isActive
                    ? roleActiveTabStyles
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                {!sidebarCollapsed && item.badge && (
                  <span
                    className={`ml-auto text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      item.badgeColor || 'bg-amber-400 text-slate-900'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer (User Info & Sign Out) */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          {!sidebarCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 px-2 py-1">
                <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-300 text-sky-800 font-bold flex items-center justify-center text-xs shrink-0">
                  {user?.fullName?.charAt(0) || user?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user?.fullName || user?.name || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user?.prn ? `PRN: ${user.prn}` : user?.email || roleTitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignOut}
              title="Sign Out"
              aria-label="Sign out"
              className="w-full p-2 rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ===================================================================== */}
      {/* TABLET / MOBILE SLIDE-OUT DRAWER (Full navigation) */}
      {/* ===================================================================== */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex"
        >
          <div className="w-72 bg-white h-full flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <KKWaghLogo size="sm" showSubtitle={false} />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2">
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${roleBadgeStyles}`}
              >
                {roleTitle}
              </span>
            </div>

            <nav className="flex-1 py-2 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? roleActiveTabStyles : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileDrawerOpen(false)} />
        </div>
      )}

      {/* ===================================================================== */}
      {/* MOBILE "MORE" DRAWER */}
      {/* ===================================================================== */}
      {mobileMoreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end"
        >
          <div className="flex-1" onClick={() => setMobileMoreOpen(false)} />
          <div className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">More Options</h3>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                aria-label="Close more options"
                className="p-1 rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                      isActive ? roleActiveTabStyles : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors mt-2 border-t border-slate-100"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ===================================================================== */}
      <div
        className={`flex-1 transition-all duration-300 pb-20 lg:pb-8 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7">{children}</main>

        <footer className="mt-8 border-t border-slate-200 py-6 text-center text-xs text-slate-400 px-4">
          <p className="font-semibold text-slate-600">
            K. K. Wagh Institute of Engineering Education & Research (KKWIEER), Nashik
          </p>
          <p className="text-[11px] mt-0.5">
            Hirabai Haridas Vidyanagari, Amrutdham, Panchavati, Nashik · Smart Transit System
          </p>
        </footer>
      </div>

      {/* ===================================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {/* ===================================================================== */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 shadow-lg flex items-center justify-around"
        aria-label="Mobile bottom navigation"
      >
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all relative ${
                isActive
                  ? role === 'admin'
                    ? 'text-emerald-700'
                    : role === 'driver'
                    ? 'text-amber-700'
                    : 'text-sky-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="truncate max-w-[68px]">{item.label}</span>
              {item.badge && (
                <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}

        {/* More Button */}
        {secondaryNavItems.length > 0 && (
          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-all"
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        )}
      </nav>
    </div>
  );
};
