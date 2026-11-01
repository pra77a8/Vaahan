import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { AnimatedPreloader } from './components/common/AnimatedPreloader';
import { StudentAuthView } from './components/auth/StudentAuthView';
import { DriverAuthView } from './components/auth/DriverAuthView';
import { AdminAuthView } from './components/auth/AdminAuthView';
import { PortalLayout, NavItem } from './components/common/PortalLayout';
import { StudentHome } from './components/student/StudentHome';
import { TrackBusView } from './components/student/TrackBusView';
import { MyRouteView } from './components/student/MyRouteView';
import { BusPassView } from './components/student/BusPassView';
import { PaymentView } from './components/student/PaymentView';
import { NotificationsView } from './components/student/NotificationsView';
import { StudentProfile as StudentProfileView } from './components/student/StudentProfile';
import { DriverPortal } from './components/driver/DriverPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import {
  Home,
  Navigation,
  Route as RouteIcon,
  QrCode,
  CreditCard,
  Bell,
  User,
  Gauge,
  Play,
  Car,
  History,
  HelpCircle,
  Users,
  Compass,
  Bus,
  Radio,
} from 'lucide-react';
import { DriverActiveTab, StudentActiveTab, StudentProfile } from './types';

// =============================================================================
// TOAST NOTIFICATION CONTAINER
// =============================================================================
const ToastContainer: React.FC<{ toastMessage: string | null }> = ({ toastMessage }) => {
  if (!toastMessage) return null;
  return (
    <div className="fixed bottom-16 lg:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
      <span>{toastMessage}</span>
    </div>
  );
};

// =============================================================================
// STUDENT PORTAL SHELL WITH URL ROUTING
// =============================================================================
const StudentPortalShell: React.FC = () => {
  const { isAuthenticated, role, userProfile, currentStudent, signOut, notifications } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Route Protection: Unauthenticated users redirected to Student Login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  // Prevent cross-role access:
  if (role !== 'student' || (userProfile?.role && userProfile.role !== 'student')) {
    if (role === 'driver' || userProfile?.role === 'driver') return <Navigate to="/driver/dashboard" replace />;
    if (role === 'admin' || userProfile?.role === 'admin') return <Navigate to="/admin/verifications" replace />;
    return <Navigate to="/" replace />;
  }

  // Redirect root /student or /student/ to default dashboard
  if (location.pathname === '/student' || location.pathname === '/student/') {
    return <Navigate to="/student/home" replace />;
  }

  // Derive current tab from pathname: e.g. /student/track -> 'track'
  const pathParts = location.pathname.split('/');
  const activeTab = pathParts[2] || 'home';

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  const studentNavItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home, isPrimary: true },
    { id: 'track', label: 'Track Bus', icon: Navigation, isPrimary: true },
    { id: 'route', label: 'My Route', icon: RouteIcon, isPrimary: true },
    { id: 'pass', label: 'Bus Pass', icon: QrCode, isPrimary: true },
    { id: 'payments', label: 'Payments', icon: CreditCard, isPrimary: false },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      isPrimary: false,
    },
    { id: 'profile', label: 'Profile', icon: User, isPrimary: false },
  ];

  const handleSelectTab = (tabId: string) => {
    navigate(`/student/${tabId}`);
  };

  const handleSignOut = () => {
    signOut();
    navigate('/', { replace: true });
  };

  const studentProfile: StudentProfile = {
    id: userProfile?.id || currentStudent.id,
    email: userProfile?.email || currentStudent.email,
    fullName: userProfile?.fullName || currentStudent.name,
    phone: userProfile?.phone || currentStudent.phone,
    role: 'student',
    status: userProfile?.status || currentStudent.approvalStatus || 'approved',
    avatarSeed: userProfile?.avatarSeed || currentStudent.avatarSeed,
    avatarBg: userProfile?.avatarBg || currentStudent.avatarBg,
    prn: userProfile?.prn || currentStudent.prn,
    department: userProfile?.department || currentStudent.branch,
    academicYear: userProfile?.academicYear || currentStudent.year,
    division: userProfile?.division || currentStudent.division,
    gender: userProfile?.gender || currentStudent.gender,
    bloodGroup: userProfile?.bloodGroup || currentStudent.bloodGroup,
    registrationDate: userProfile?.registrationDate,
    feeReceiptPath: userProfile?.feeReceiptPath,
    feeReceiptName: userProfile?.feeReceiptName,
    feeReceiptSize: userProfile?.feeReceiptSize,
    feeReceiptType: userProfile?.feeReceiptType,
    feeReceiptUrl: userProfile?.feeReceiptUrl,
    transport: userProfile?.transport || {
      shiftId: 'shift-morning-01',
      routeId: currentStudent.assignedRouteId || '71ef9ab8-1aec-479e-86f7-6bdeba5dd13e',
      pickupStopId: 'stop-01',
      shiftName: currentStudent.shiftName || 'Morning Shift',
      routeName: currentStudent.routeName || 'ROUTE 1 – JAIL ROAD',
      routeNumber: currentStudent.routeNumber || 'ROUTE 1',
      pickupStopName: currentStudent.stopName || 'Jail Road',
      pickupTime: currentStudent.stopPickupTime || '07:15 AM',
      status: currentStudent.approvalStatus || 'approved',
    },
  };

  return (
    <PortalLayout
      role="student"
      roleTitle="Student Transit"
      user={studentProfile}
      navItems={studentNavItems}
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      onSignOut={handleSignOut}
    >
      <Routes>
        <Route path="" element={<Navigate to="home" replace />} />
        <Route path="home" element={<StudentHome />} />
        <Route
          path="track"
          element={
            <TrackBusView
              student={studentProfile}
              onNavigateTab={(t) => navigate(`/student/${t}`)}
            />
          }
        />
        <Route path="route" element={<MyRouteView student={studentProfile} />} />
        <Route path="pass" element={<BusPassView />} />
        <Route path="payments" element={<PaymentView />} />
        <Route path="notifications" element={<NotificationsView />} />
        <Route path="profile" element={<StudentProfileView />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Routes>
    </PortalLayout>
  );
};

// =============================================================================
// DRIVER PORTAL SHELL WITH URL ROUTING
// =============================================================================
const DriverPortalShell: React.FC = () => {
  const { isAuthenticated, role, userProfile, signOut } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Route Protection: Unauthenticated users redirected to Driver Login
  if (!isAuthenticated) {
    return <Navigate to="/management-driver" replace />;
  }
  // Prevent cross-role access:
  if (role !== 'driver' || (userProfile?.role && userProfile.role !== 'driver')) {
    if (role === 'student' || userProfile?.role === 'student') return <Navigate to="/student/home" replace />;
    if (role === 'admin' || userProfile?.role === 'admin') return <Navigate to="/admin/verifications" replace />;
    return <Navigate to="/management-driver" replace />;
  }

  // Redirect root /driver or /driver/ to default dashboard
  if (location.pathname === '/driver' || location.pathname === '/driver/') {
    return <Navigate to="/driver/dashboard" replace />;
  }

  const pathParts = location.pathname.split('/');
  const tabFromUrl = pathParts[2] as DriverActiveTab;
  const activeTab: DriverActiveTab =
    ['dashboard', 'start-trip', 'active-trip', 'history', 'profile', 'help'].includes(tabFromUrl)
      ? tabFromUrl
      : 'dashboard';

  const driverNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge, isPrimary: true },
    { id: 'start-trip', label: 'Start Trip', icon: Play, isPrimary: true },
    { id: 'active-trip', label: 'Active Trip', icon: Car, isPrimary: true },
    { id: 'history', label: 'Trip History', icon: History, isPrimary: true },
    { id: 'profile', label: 'Profile', icon: User, isPrimary: false },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, isPrimary: false },
  ];

  const handleSelectTab = (tabId: string) => {
    navigate(`/driver/${tabId}`);
  };

  const handleSignOut = () => {
    signOut();
    navigate('/management-driver', { replace: true });
  };

  return (
    <PortalLayout
      role="driver"
      roleTitle="Driver Console"
      user={userProfile}
      navItems={driverNavItems}
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      onSignOut={handleSignOut}
    >
      <DriverPortal
        driver={userProfile}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        onTabChange={(tab) => navigate(`/driver/${tab}`)}
      />
    </PortalLayout>
  );
};

// =============================================================================
// ADMINISTRATOR PORTAL SHELL WITH URL ROUTING
// =============================================================================
const AdminPortalShell: React.FC = () => {
  const { isAuthenticated, role, userProfile, signOut } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Route Protection: Unauthenticated users redirected to Admin Login
  if (!isAuthenticated) {
    return <Navigate to="/management-vaahan" replace />;
  }
  // Prevent cross-role access:
  if (role !== 'admin' || (userProfile?.role && userProfile.role !== 'admin')) {
    if (role === 'student' || userProfile?.role === 'student') return <Navigate to="/student/home" replace />;
    if (role === 'driver' || userProfile?.role === 'driver') return <Navigate to="/driver/dashboard" replace />;
    return <Navigate to="/management-vaahan" replace />;
  }

  // Redirect root /admin or /admin/ to default verifications section
  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    return <Navigate to="/admin/verifications" replace />;
  }

  const pathParts = location.pathname.split('/');
  const sectionFromUrl = pathParts[2] as 'verifications' | 'active-trips' | 'routes' | 'drivers' | 'fleet';
  const activeSection = ['verifications', 'active-trips', 'routes', 'drivers', 'fleet'].includes(sectionFromUrl)
    ? sectionFromUrl
    : 'verifications';

  const adminNavItems: NavItem[] = [
    {
      id: 'verifications',
      label: 'Registrations & Approvals',
      icon: Users,
      isPrimary: true,
    },
    {
      id: 'active-trips',
      label: 'Active Trips Live Map',
      icon: Radio,
      isPrimary: true,
    },
    {
      id: 'routes',
      label: 'Official Routes & Stops',
      icon: Compass,
      isPrimary: true,
    },
    {
      id: 'drivers',
      label: 'Driver Management',
      icon: Car,
      isPrimary: true,
    },
    {
      id: 'fleet',
      label: 'Bus Fleet Operations',
      icon: Bus,
      isPrimary: true,
    },
  ];

  const handleSelectTab = (tabId: string) => {
    navigate(`/admin/${tabId}`);
  };

  const handleSignOut = () => {
    signOut();
    navigate('/management-vaahan', { replace: true });
  };

  return (
    <PortalLayout
      role="admin"
      roleTitle="Transport Admin"
      user={userProfile}
      navItems={adminNavItems}
      activeTab={activeSection}
      onSelectTab={handleSelectTab}
      onSignOut={handleSignOut}
    >
      <AdminPortal
        admin={userProfile}
        onSignOut={handleSignOut}
        activeSection={activeSection}
        onNavigateSection={(sec) => navigate(`/admin/${sec}`)}
      />
    </PortalLayout>
  );
};

// =============================================================================
// PUBLIC ENTRY ROUTE HANDLERS
// =============================================================================

const StudentEntryPage: React.FC = () => {
  const { isAuthenticated, role, loginUser } = useApp();
  const navigate = useNavigate();

  // ONLY redirect to student dashboard if an authenticated student visits their login page
  if (isAuthenticated && role === 'student') {
    return <Navigate to="/student/home" replace />;
  }

  return (
    <StudentAuthView
      onLoginSuccess={(student) => {
        loginUser('student', student);
        navigate('/student/home', { replace: true });
      }}
    />
  );
};

const DriverEntryPage: React.FC = () => {
  const { isAuthenticated, role, loginUser } = useApp();
  const navigate = useNavigate();

  // ONLY redirect to driver dashboard if an authenticated driver visits their login page
  if (isAuthenticated && role === 'driver') {
    return <Navigate to="/driver/dashboard" replace />;
  }

  return (
    <DriverAuthView
      onLoginSuccess={(driver) => {
        loginUser('driver', driver);
        navigate('/driver/dashboard', { replace: true });
      }}
    />
  );
};

const AdminEntryPage: React.FC = () => {
  const { isAuthenticated, role, loginUser } = useApp();
  const navigate = useNavigate();

  // ONLY redirect to admin dashboard if an authenticated admin visits their login page
  if (isAuthenticated && role === 'admin') {
    return <Navigate to="/admin/verifications" replace />;
  }

  return (
    <AdminAuthView
      onLoginSuccess={(admin) => {
        loginUser('admin', admin);
        navigate('/admin/verifications', { replace: true });
      }}
    />
  );
};

const CatchAllRedirect: React.FC = () => {
  const { isAuthenticated, role } = useApp();
  if (isAuthenticated) {
    if (role === 'student') return <Navigate to="/student/home" replace />;
    if (role === 'driver') return <Navigate to="/driver/dashboard" replace />;
    if (role === 'admin') return <Navigate to="/admin/verifications" replace />;
  }
  return <Navigate to="/" replace />;
};

// =============================================================================
// MAIN ROUTER
// =============================================================================
const AppRoutes: React.FC = () => {
  const { toastMessage } = useApp();

  return (
    <>
      <Routes>
        {/* 1. Public Role Entry Points */}
        <Route path="/" element={<StudentEntryPage />} />
        <Route path="/management-driver" element={<DriverEntryPage />} />
        <Route path="/management-vaahan" element={<AdminEntryPage />} />

        {/* 2. Role-Protected Portals */}
        <Route path="/student/*" element={<StudentPortalShell />} />
        <Route path="/driver/*" element={<DriverPortalShell />} />
        <Route path="/admin/*" element={<AdminPortalShell />} />

        {/* 3. Catch-all for unrecognized URLs */}
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
      <ToastContainer toastMessage={toastMessage} />
    </>
  );
};

export default function App() {
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    // Allows developers or QA to trigger a replay on demand:
    // window.dispatchEvent(new CustomEvent('vaahan:replay-preloader'));
    const handleReplay = () => setShowPreloader(true);
    window.addEventListener('vaahan:replay-preloader', handleReplay);
    return () => window.removeEventListener('vaahan:replay-preloader', handleReplay);
  }, []);

  return (
    <AppProvider>
      <AnimatePresence mode="wait">
        {showPreloader && (
          <AnimatedPreloader onComplete={() => setShowPreloader(false)} />
        )}
      </AnimatePresence>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
