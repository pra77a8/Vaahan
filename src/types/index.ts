export type UserRole = 'student' | 'driver' | 'admin';

export type AccountStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'blocked'
  | 'active'
  | 'disabled';

export type StudentGender = 'female' | 'male' | 'other';

export type ShiftCode = 'MORNING' | 'GENERAL';

export interface Shift {
  id: string;
  code: ShiftCode;
  name: string;
  startTime: string;
  endTime: string;
}

export interface Stop {
  id: string;
  name: string;
  landmark: string;
  latitude: number;
  longitude: number;
}

export interface OfficialRouteStop {
  id: string;
  routeId: string;
  stopId: string;
  sequenceNumber: number;
  morningPickupTime?: string;
  dropTime?: string;
  isPickupEligible: boolean;
  stop: Stop;
}

export interface OfficialRoute {
  id: string;
  shiftId: string;
  routeNumber: string;
  name: string;
  description?: string;
  isActive: boolean;
  shift?: Shift;
  routeStops: OfficialRouteStop[];
}

export interface StudentProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'student';
  status: AccountStatus;
  avatarSeed: string;
  avatarBg: string;
  prn: string;
  rollNo?: string;
  department: string;
  academicYear: 'FE' | 'SE' | 'TE' | 'BE';
  division: string;
  gender: StudentGender;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  registrationDate?: string;
  passExpiryDate?: string;
  passIssueDate?: string;
  passStatus?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING_EXPIRY';
  feeReceiptUrl?: string;
  feeReceiptName?: string;
  feeReceiptSize?: number;
  feeReceiptType?: string;
  feeReceiptPath?: string;
  transport?: {
    shiftId: string;
    routeId: string;
    pickupStopId: string;
    shiftName: string;
    routeName: string;
    routeNumber: string;
    pickupStopName: string;
    pickupTime?: string;
    status: AccountStatus;
    passExpiryDate?: string;
    passIssueDate?: string;
    feeReceiptUrl?: string;
    feeReceiptName?: string;
    feeReceiptSize?: number;
    feeReceiptType?: string;
    feeReceiptPath?: string;
  };
}

export interface DriverProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'driver';
  status: AccountStatus;
  licenseNumber?: string;
  badgeNumber?: string;
  experienceYears?: number;
  assignedBusNumber?: string;
  rating?: number;
  createdAt?: string;
  avatarSeed?: string;
  avatarBg?: string;
}

export interface CreateDriverAccountData {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  licenseNumber?: string;
  status: 'active' | 'disabled';
}

export interface UpdateDriverProfileData {
  fullName?: string;
  phone?: string;
  licenseNumber?: string;
  status?: AccountStatus;
  experienceYears?: number;
  assignedBusNumber?: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'admin';
  status: AccountStatus;
}

export interface StudentRegistrationData {
  // Step 1: Personal
  fullName: string;
  email: string;
  phone: string;
  gender?: 'female' | 'male' | 'other';
  password: string;
  confirmPassword: string;
  // Step 2: Academic
  prn: string;
  department: string;
  academicYear: 'FE' | 'SE' | 'TE' | 'BE';
  division: string;
  // Step 3: Transportation (Shift -> Route -> Pickup Stop. No destination!)
  shiftId: string;
  routeId: string;
  pickupStopId: string;
  passExpiryDate?: string;
  // Fee Receipt (Optional)
  feeReceiptFile?: File | null;
  feeReceiptDataUrl?: string;
  feeReceiptName?: string;
  feeReceiptSize?: number;
  feeReceiptType?: string;
  feeReceiptPath?: string;
}

export type TripDirection = 'TO_COLLEGE' | 'RETURNING_HOME' | 'TO_HOME';
export type TripMode = 'LIVE_GPS' | 'SIMULATION';

export interface RouteAssignment {
  id: string;
  routeId: string;
  shiftId: string;
  busId: string;
  driverId: string;
  assignedBy?: string;
  updatedAt?: string;
  route?: OfficialRoute;
  shift?: Shift;
  bus?: BusVehicle;
  driver?: Driver;
}

export interface DirectionalRouteStop {
  id: string;
  routeId: string;
  direction: TripDirection;
  sequenceNumber: number;
  stopId: string;
  pickupTime?: string;
  dropTime?: string;
  isStudentStop: boolean;
  stop: Stop;
}

export interface JourneyStudentManifest {
  studentId: string;
  fullName: string;
  prn: string;
  department: string;
  academicYear: 'FE' | 'SE' | 'TE' | 'BE';
  division: string;
  pickupStopId: string;
  pickupStopName: string;
  status: AccountStatus;
  gender?: StudentGender;
  rollNo?: string;
  phone?: string;
}

export interface TripStop {
  id: string;
  tripId: string;
  stopId: string;
  sequenceNumber: number;
  status: 'PENDING' | 'REACHED' | 'SKIPPED';
  reachedAt?: string;
  stop: Stop;
}

export interface Trip {
  id: string;
  routeId: string;
  driverId: string;
  busId: string;
  shiftId: string;
  direction: TripDirection;
  tripDate?: string;
  mode?: TripMode;
  sourceStopId?: string;
  destinationStopId?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt?: string;
  endedAt?: string;
  currentStopIndex: number;
  assignedStudentCount?: number;
  boardedStudentCount?: number;
  remarks?: string;
  route?: OfficialRoute;
  shift?: Shift;
  bus?: BusVehicle;
  driver?: Driver;
  sourceStop?: Stop;
  destinationStop?: Stop;
  tripStops: TripStop[];
  manifest?: JourneyStudentManifest[];
  latestLocation?: LiveLocation;
}

export interface LiveLocation {
  id?: number | string;
  tripId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  recordedAt: string;
}

// -----------------------------------------------------------------------------
// Legacy & Compatibility Interfaces (For preserving existing student components)
// -----------------------------------------------------------------------------

export interface Student {
  id: string;
  prn: string;
  rollNo: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  year: 'FE' | 'SE' | 'TE' | 'BE';
  division: string;
  avatarSeed: string;
  avatarBg: string;
  gender: StudentGender;
  assignedRouteId: string;
  assignedBusId?: string;
  stopName: string;
  stopPickupTime: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  bloodGroup: string;
  passStatus: 'ACTIVE' | 'PENDING_RENEWAL' | 'EXPIRED' | 'BLOCKED' | 'EXPIRING_SOON' | 'MISSING_EXPIRY';
  approvalStatus?: AccountStatus;
  passExpiryDate?: string;
  passIssueDate?: string;
  shiftName?: string;
  routeName?: string;
  routeNumber?: string;
  assignedRouteName?: string;
}

export type PassExpiryStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING_EXPIRY';

export interface PassRenewalRecord {
  id: string;
  studentId: string;
  previousExpiryDate: string | null;
  newExpiryDate: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  paymentStatus: string;
  term: string;
  createdAt: string;
  studentName?: string;
  prn?: string;
  department?: string;
}

export interface RouteStop {
  id: string;
  name: string;
  landmark: string;
  morningPickup: string;
  eveningDrop: string;
  sequence: number;
  latitude: number;
  longitude: number;
  isMainJunction?: boolean;
}

export interface BusRoute {
  id: string;
  routeNumber: string;
  name: string;
  source: string;
  destination: string;
  totalDistanceKm: number;
  estimatedDurationMins: number;
  morningDeparture: string;
  eveningCampusDeparture: string;
  assignedBusId?: string;
  stops: RouteStop[];
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  licenseNumber: string;
  experienceYears: number;
  rating: number;
  avatarBg: string;
  badgeNumber: string;
  assignedBusNumber: string;
}

export interface BusVehicle {
  id: string;
  busNumber: string;
  plateNumber: string;
  registration?: string;
  model: string;
  capacity: number;
  currentOccupancy: number;
  routeId?: string;
  driverId?: string;
  status: 'ON_ROUTE' | 'AT_STOP' | 'AT_CAMPUS' | 'MAINTENANCE' | 'IDLE';
  currentSpeedKmH: number;
  lastUpdated: string;
  currentLocationName: string;
  isAC: boolean;
  gpsActive: boolean;
  fuelPercent?: number; // Deprecated - actual fuel levels not recorded by system
  rcExpiry?: string;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  permitExpiry?: string;
  pucExpiry?: string;
  lastServiceDate?: string;
  maintenanceRemarks?: string;
}

export interface BusPass {
  id: string;
  passNumber: string;
  studentId: string;
  academicYear: string;
  validFrom: string;
  validTill: string;
  term: 'Semester 1 & 2' | 'Semester 3 & 4' | 'Semester 5 & 6' | 'Semester 7 & 8';
  qrData: string;
  feePaid: number;
  paymentRef: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'EXPIRING_SOON' | 'MISSING_EXPIRY';
  approvedBy: string;
  approvedDate: string;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  studentId: string;
  amount: number;
  date: string;
  paymentMode: 'UPI' | 'NET_BANKING' | 'CREDIT_DEBIT_CARD' | 'COLLEGE_CHALLAN' | 'RAZORPAY_TEST' | 'RAZORPAY';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  term: string;
  transactionRef: string;
  pdfAvailable: boolean;
}

export interface TransitNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: 'DELAY' | 'ROUTE_ALERT' | 'FEE_REMINDER' | 'ANNOUNCEMENT' | 'EMERGENCY' | 'PASS_EXPIRY';
  routeId?: string;
  isRead: boolean;
}

export type SosAlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface SosAlert {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  busNumber?: string;
  busId?: string;
  tripId?: string;
  routeName?: string;
  direction?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationDescription?: string;
  emergencyType: string;
  remarks?: string;
  status: SosAlertStatus;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  acknowledgedByName?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolutionNotes?: string;
}

export type StudentActiveTab =
  | 'home'
  | 'tracking'
  | 'track'
  | 'my-route'
  | 'route'
  | 'pass'
  | 'payments'
  | 'notifications'
  | 'profile'
  | 'buses-routes';

export type DriverActiveTab =
  | 'dashboard'
  | 'start-trip'
  | 'active-trip'
  | 'history'
  | 'profile'
  | 'help';
