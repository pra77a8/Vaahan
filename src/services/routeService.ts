import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Shift,
  OfficialRoute,
  Stop,
  OfficialRouteStop,
  TripDirection,
  DirectionalRouteStop,
  RouteAssignment,
} from '../types';

// =============================================================================
// OFFICIAL KKWAGH DATASET (IDENTICAL TO SUPABASE SEED MIGRATION 015)
// Exact stop names, verified coordinates, and terminal stops matching Section 1
// =============================================================================

export const OFFICIAL_SHIFTS: Shift[] = [
  {
    id: 'shift-morning-01',
    code: 'MORNING',
    name: 'Morning Shift',
    startTime: '07:15 AM',
    endTime: '01:30 PM',
  },
  {
    id: 'shift-general-02',
    code: 'GENERAL',
    name: 'General Shift',
    startTime: '08:45 AM',
    endTime: '05:15 PM',
  },
];

export const OFFICIAL_STOPS: Record<string, Stop> = {
  // Terminals
  'kkw-campus': { id: '13cb56c1-96f0-49d0-90d7-d690eb73415f', name: 'K K Wagh Education Society', landmark: 'Amrutdham Campus Gate', latitude: 20.0258, longitude: 73.8268 },
  'jail-road': { id: 'stop-jail-road', name: 'Jail Road', landmark: 'Jail Road Terminal / Nashik Road', latitude: 19.9480, longitude: 73.8410 },
  'pune-road': { id: 'stop-pune-road', name: 'Pune Road', landmark: 'Pune Road Highway Terminal', latitude: 19.9450, longitude: 73.8050 },
  'cidco': { id: 'stop-cidco', name: 'CIDCO', landmark: 'CIDCO Bus Stand / Trimurti Chowk', latitude: 19.9650, longitude: 73.7550 },
  'college-road': { id: 'ae63895c-108b-484f-a6f6-03ea5b5006cf', name: 'College Road', landmark: 'KTHM / BYK College Belt', latitude: 20.0050, longitude: 73.7620 },
  'gangapur-road': { id: '794a7a7f-b398-4d34-8cee-d5ee901d42ec', name: 'Gangapur Road', landmark: 'Gangapur Road Main Avenue', latitude: 20.0130, longitude: 73.7700 },

  // Intermediate Corridor Stops
  'sailani-baba': { id: '6534d0ff-52f0-425e-9f8b-5e56e3fb3b21', name: 'Sailani Baba Square', landmark: 'Jail Road Junction', latitude: 19.9540, longitude: 73.8390 },
  'bytco-point': { id: '8625d90e-3c6c-4aa3-a56f-dbd84d045c8d', name: 'Bytco Point', landmark: 'Nashik Road Bytco Hospital Circle', latitude: 19.9634, longitude: 73.8291 },
  'datta-mandir': { id: 'stop-datta-mandir', name: 'Datta Mandir Square', landmark: 'Datta Mandir Road', latitude: 19.9660, longitude: 73.8270 },
  'vijay-mamta': { id: 'stop-vijay-mamta', name: 'Vijay Mamta', landmark: 'Vijay Mamta Chowk', latitude: 19.9710, longitude: 73.8220 },
  'bodhale-nagar': { id: 'd1045051-9e01-4d13-b5d2-7926811c26cc', name: 'Bodhale Nagar', landmark: 'Pune Highway Junction', latitude: 19.9790, longitude: 73.8150 },
  'kathe-lane': { id: '6dad7dc9-04c5-465b-be1e-dd82ef9b6b2a', name: 'Kathe Lane', landmark: 'Dwarka-Kathe Galli Corridor', latitude: 19.9931, longitude: 73.8098 },
  'dwarka-stop': { id: '76e04d9e-6fbb-4c95-b962-94844c4edff1', name: 'Dwarka Stop', landmark: 'Dwarka Circle Underpass', latitude: 19.9880, longitude: 73.8050 },
  'dwaraka-stop': { id: '06a41769-277c-4c46-843e-96ae888f553f', name: 'Dwaraka Stop', landmark: 'Dwarka Circle Flyover Pillar', latitude: 19.9882, longitude: 73.8054 },
  'bombay-naka': { id: '392c9c04-ba4a-43a7-bc1c-6e2b2f318626', name: 'Bombay Naka', landmark: 'Near Old Agra Road Crossing', latitude: 19.9860, longitude: 73.7880 },
  'kamod-nagar': { id: '68dcd1da-b9ca-4980-bbe8-5ffb26095dc7', name: 'Kamod Nagar', landmark: 'Indira Nagar Approach', latitude: 19.9720, longitude: 73.7780 },
  'bombay-kamod': { id: 'stop-bombay-kamod', name: 'Bombay Naka / Kamod Nagar', landmark: 'Bombay Naka Corridor', latitude: 19.9790, longitude: 73.7830 },
  'indira-nagar': { id: 'ff42cfe4-9b18-41f4-a596-5e678e42e719', name: 'Indira Nagar Jogging Track', landmark: 'Jogging Track Corner', latitude: 19.9670, longitude: 73.7740 },
  'rane-nagar': { id: 'cae0bb35-7c82-408a-b162-b217c5acfbfc', name: 'Rane Nagar', landmark: 'Highway Service Road Cross', latitude: 19.9590, longitude: 73.7690 },
  'pathardi-phata': { id: 'f3eee25f-5d7e-4c76-9082-2e4b6ec2ef03', name: 'Pathardi Phata', landmark: 'Mumbai-Agra Highway Junction', latitude: 19.9480, longitude: 73.7620 },
  'shubham-park': { id: 'ff0c5860-6b4f-4195-a082-34e03a7d0c04', name: 'Shubham Park', landmark: 'CIDCO Sector 4 Corner', latitude: 19.9620, longitude: 73.7580 },
  'trimurti-square': { id: '3809b085-5174-4c1c-85dd-816e6fad2196', name: 'Trimurti Square', landmark: 'Trimurti Chowk CIDCO', latitude: 19.9720, longitude: 73.7590 },
  'tidake-colony': { id: 'a5b3b448-a85f-4c01-9438-72311c10ca79', name: 'Tidake Colony', landmark: 'Near Tidke Colony Chowk', latitude: 19.9840, longitude: 73.7720 },
  'tidke-colony': { id: '4d3da8b3-1db8-4dc0-8118-a6944f629349', name: 'Tidke Colony', landmark: 'Tidke Colony Central Square', latitude: 19.9845, longitude: 73.7725 },
  'divya-adlab': { id: '4a06cf47-8c35-4ba3-aac6-b0a371b5ab8c', name: 'Divya AdLab', landmark: 'CIDCO Multiplex Square', latitude: 19.9770, longitude: 73.7610 },
  'untwadi': { id: '9bda6243-4c16-42f9-bd62-3dfac881dad4', name: 'Untwadi', landmark: 'Untwadi Road Bridge', latitude: 19.9790, longitude: 73.7690 },
  'sarada-circle': { id: '411ebd02-32b1-4d34-908c-b3762f0c33b1', name: 'Sarada Circle', landmark: 'Sharda Kanya Vidyalaya', latitude: 19.9920, longitude: 73.7950 },
  'rajiv-gandhi-bhavan': { id: '7930f2ed-fa6c-4cce-b6b0-6fffced7b448', name: 'Rajiv Gandhi Bhavan', landmark: 'NMC Headquarters', latitude: 20.0040, longitude: 73.7790 },
  'canada-corner': { id: '44271209-6a30-4e20-86e2-7457c6ef6d1c', name: 'Canada Corner', landmark: 'Canada Corner Signal Junction', latitude: 20.0030, longitude: 73.7740 },
  'bhosla-school': { id: '0464fe0a-ecb6-49e4-af1c-cecb7538e5f8', name: 'Bhosla School', landmark: 'Bhosla Military Campus Crossing', latitude: 19.9980, longitude: 73.7680 },
  'abb-circle': { id: '371b6e74-0cc3-4841-8434-a483f864458e', name: 'ABB Circle', landmark: 'Trimbak Road Signal', latitude: 19.9890, longitude: 73.7660 },
  'civil-hospital': { id: '8046d346-ebad-45dc-a50f-c2215b270e52', name: 'Civil Hospital', landmark: 'District Civil Hospital Gate', latitude: 20.0010, longitude: 73.7860 },
  'shalimar': { id: 'ca6a6b73-76cf-4b60-91ac-7b9eeb15b5f8', name: 'Shalimar', landmark: 'CBS Shalimar Central Chowk', latitude: 19.9970, longitude: 73.7890 },
  'shalimar-stop': { id: 'ca6a6b73-76cf-4b60-91ac-7b9eeb15b5f8', name: 'Shalimar', landmark: 'CBS Shalimar Central Chowk', latitude: 19.9970, longitude: 73.7890 },
  'nimani': { id: 'ddc7fa6a-ebff-4e1f-87d9-d29cc1a6fedc', name: 'Nimani', landmark: 'Nimani Bus Stand Panchavati', latitude: 20.0120, longitude: 73.8010 },
  'makhamalabad-naka': { id: '1c84ace1-8b27-421c-b02e-70dc464d31c1', name: 'Makhamalabad Naka', landmark: 'Panchavati Extension Crossing', latitude: 20.0270, longitude: 73.7850 },
  'chopada-lawns': { id: '49b1d6f6-8b28-4637-bc3b-efaacf440102', name: 'Chopada Lawns', landmark: 'Near Godavari River Bank', latitude: 20.0240, longitude: 73.7670 },
  'horizon-school': { id: '70cd3c4e-84e9-4a04-a641-68743a893b33', name: 'Horizon School', landmark: 'Gangapur Shivar', latitude: 20.0210, longitude: 73.7580 },
  'jehan-circle': { id: 'de99fdc6-86ea-4541-9815-f07ff5e9f6e3', name: 'Jehan Circle', landmark: 'Gangapur Naka Circle', latitude: 20.0160, longitude: 73.7630 },
  'nerlikar-hospital': { id: '6dd70310-20fa-4422-b381-fe797f3b9fcf', name: 'Nerlikar Hospital', landmark: 'Nerlikar Chowk', latitude: 20.0100, longitude: 73.7780 },
  'ashok-stambh': { id: 'bbbf8da3-b4b7-42b3-b0f8-204d1558127a', name: 'Ashok Stambh', landmark: 'Central Commercial Hub', latitude: 20.0030, longitude: 73.7890 },
  'ramwadi': { id: '9c5e3689-a67c-41de-b5df-e72a94eb159e', name: 'Ramwadi', landmark: 'Ramwadi Police Chowky', latitude: 20.0070, longitude: 73.7990 },
};

const createRouteStops = (
  routeId: string,
  stopKeys: { key: string; time?: string; drop?: string; eligible?: boolean }[]
): OfficialRouteStop[] => {
  return stopKeys.map((item, index) => {
    const stop = OFFICIAL_STOPS[item.key] || {
      id: `custom-stop-${index}`,
      name: item.key,
      landmark: '',
      latitude: 20.0258,
      longitude: 73.8268,
    };
    return {
      id: `${routeId}-rs-${index + 1}`,
      routeId,
      stopId: stop.id,
      sequenceNumber: index + 1,
      morningPickupTime: item.time || '07:30 AM',
      dropTime: item.drop || '05:30 PM',
      isPickupEligible: item.eligible !== undefined ? item.eligible : index !== stopKeys.length - 1,
      stop,
    };
  });
};

export const OFFICIAL_ROUTES: OfficialRoute[] = [
  // ---------------------------------------------------------------------------
  // MORNING SHIFT (5 OFFICIAL CORRIDORS)
  // ---------------------------------------------------------------------------
  {
    id: '71ef9ab8-1aec-479e-86f7-6bdeba5dd13e',
    shiftId: 'shift-morning-01',
    routeNumber: 'ROUTE 1',
    name: 'ROUTE 1 – JAIL ROAD',
    description: 'Official Corridor: Jail Road → Sailani Baba Square → Bytco Point → K. K. Wagh Education Society',
    isActive: true,
    routeStops: createRouteStops('71ef9ab8-1aec-479e-86f7-6bdeba5dd13e', [
      { key: 'jail-road', time: '07:15 AM', drop: '01:50 PM', eligible: true },
      { key: 'sailani-baba', time: '07:30 AM', drop: '01:35 PM', eligible: true },
      { key: 'bytco-point', time: '07:42 AM', drop: '01:25 PM', eligible: true },
      { key: 'kkw-campus', time: '08:00 AM', drop: '01:15 PM', eligible: false },
    ]),
  },
  {
    id: '6ce02568-ec23-444f-be44-4ef801d299ce',
    shiftId: 'shift-morning-01',
    routeNumber: 'ROUTE 2',
    name: 'ROUTE 2 – PUNE ROAD',
    description: 'Official Corridor: Pune Road → Bytco Point → Datta Mandir Square → Vijay Mamta → Bodhale Nagar → Kathe Lane → K. K. Wagh Education Society',
    isActive: true,
    routeStops: createRouteStops('6ce02568-ec23-444f-be44-4ef801d299ce', [
      { key: 'pune-road', time: '07:15 AM', drop: '01:55 PM', eligible: true },
      { key: 'bytco-point', time: '07:25 AM', drop: '01:45 PM', eligible: true },
      { key: 'datta-mandir', time: '07:32 AM', drop: '01:38 PM', eligible: true },
      { key: 'vijay-mamta', time: '07:38 AM', drop: '01:32 PM', eligible: true },
      { key: 'bodhale-nagar', time: '07:45 AM', drop: '01:25 PM', eligible: true },
      { key: 'kathe-lane', time: '07:52 AM', drop: '01:18 PM', eligible: true },
      { key: 'kkw-campus', time: '08:05 AM', drop: '01:10 PM', eligible: false },
    ]),
  },
  {
    id: 'f68f6708-c18a-4cde-8778-dc152012a5f5',
    shiftId: 'shift-morning-01',
    routeNumber: 'ROUTE 3',
    name: 'ROUTE 3 – CIDCO',
    description: 'Official Corridor: CIDCO → Dwarka Stop → Tidake Colony → Trimurti Square → Shubham Park → Pathardi Phata → Rane Nagar → Indira Nagar Jogging Track → Bombay Naka → Dwarka Stop → K. K. Wagh Education Society',
    isActive: true,
    routeStops: createRouteStops('f68f6708-c18a-4cde-8778-dc152012a5f5', [
      { key: 'cidco', time: '07:05 AM', drop: '02:00 PM', eligible: true },
      { key: 'dwarka-stop', time: '07:18 AM', drop: '01:48 PM', eligible: true },
      { key: 'tidake-colony', time: '07:25 AM', drop: '01:40 PM', eligible: true },
      { key: 'trimurti-square', time: '07:32 AM', drop: '01:33 PM', eligible: true },
      { key: 'shubham-park', time: '07:38 AM', drop: '01:27 PM', eligible: true },
      { key: 'pathardi-phata', time: '07:44 AM', drop: '01:21 PM', eligible: true },
      { key: 'rane-nagar', time: '07:49 AM', drop: '01:16 PM', eligible: true },
      { key: 'indira-nagar', time: '07:54 AM', drop: '01:11 PM', eligible: true },
      { key: 'bombay-naka', time: '07:59 AM', drop: '01:06 PM', eligible: true },
      { key: 'dwarka-stop', time: '08:05 AM', drop: '01:00 PM', eligible: true },
      { key: 'kkw-campus', time: '08:20 AM', drop: '12:45 PM', eligible: false },
    ]),
  },
  {
    id: 'd95402ed-5b5b-4b47-b2c2-8a6ddc3a5af9',
    shiftId: 'shift-morning-01',
    routeNumber: 'ROUTE 4',
    name: 'ROUTE 4 – COLLEGE ROAD',
    description: 'Official Corridor: College Road → Rajiv Gandhi Bhavan → Canada Corner → Bhosla School → ABB Circle → Civil Hospital → Shalimar → K. K. Wagh Education Society',
    isActive: true,
    routeStops: createRouteStops('d95402ed-5b5b-4b47-b2c2-8a6ddc3a5af9', [
      { key: 'college-road', time: '07:10 AM', drop: '01:55 PM', eligible: true },
      { key: 'rajiv-gandhi-bhavan', time: '07:22 AM', drop: '01:43 PM', eligible: true },
      { key: 'canada-corner', time: '07:29 AM', drop: '01:36 PM', eligible: true },
      { key: 'bhosla-school', time: '07:37 AM', drop: '01:28 PM', eligible: true },
      { key: 'abb-circle', time: '07:44 AM', drop: '01:21 PM', eligible: true },
      { key: 'civil-hospital', time: '07:50 AM', drop: '01:15 PM', eligible: true },
      { key: 'shalimar', time: '07:56 AM', drop: '01:09 PM', eligible: true },
      { key: 'kkw-campus', time: '08:15 AM', drop: '12:50 PM', eligible: false },
    ]),
  },
  {
    id: '1b70cc60-7e5a-42b2-8f3b-5cd11cb67209',
    shiftId: 'shift-morning-01',
    routeNumber: 'ROUTE 5',
    name: 'ROUTE 5 – GANGAPUR ROAD',
    description: 'Official Corridor: Gangapur Road → Nimani → Makhamalabad Naka → Chopada Lawns → Horizon School → Jehan Circle → Nerlikar Hospital → Gangapur Road → Ashok Stambh → Ramwadi → Nimani',
    isActive: true,
    routeStops: createRouteStops('1b70cc60-7e5a-42b2-8f3b-5cd11cb67209', [
      { key: 'gangapur-road', time: '07:05 AM', drop: '02:00 PM', eligible: true },
      { key: 'nimani', time: '07:15 AM', drop: '01:50 PM', eligible: true },
      { key: 'makhamalabad-naka', time: '07:22 AM', drop: '01:43 PM', eligible: true },
      { key: 'chopada-lawns', time: '07:28 AM', drop: '01:37 PM', eligible: true },
      { key: 'horizon-school', time: '07:35 AM', drop: '01:30 PM', eligible: true },
      { key: 'jehan-circle', time: '07:41 AM', drop: '01:24 PM', eligible: true },
      { key: 'nerlikar-hospital', time: '07:47 AM', drop: '01:18 PM', eligible: true },
      { key: 'gangapur-road', time: '07:53 AM', drop: '01:12 PM', eligible: true },
      { key: 'ashok-stambh', time: '07:59 AM', drop: '01:06 PM', eligible: true },
      { key: 'ramwadi', time: '08:05 AM', drop: '01:00 PM', eligible: true },
      { key: 'nimani', time: '08:15 AM', drop: '12:50 PM', eligible: false },
    ]),
  },

  // ---------------------------------------------------------------------------
  // GENERAL SHIFT (4 OPERATIONAL CORRIDORS)
  // ---------------------------------------------------------------------------
  {
    id: '9b31648c-f04f-4f47-80e7-aab1d0783953',
    shiftId: 'shift-general-02',
    routeNumber: 'ROUTE 1',
    name: 'ROUTE 1 – JAIL ROAD',
    description: 'General Shift Jail Road Corridor',
    isActive: true,
    routeStops: createRouteStops('9b31648c-f04f-4f47-80e7-aab1d0783953', [
      { key: 'jail-road', time: '08:45 AM', drop: '05:35 PM', eligible: true },
      { key: 'sailani-baba', time: '09:00 AM', drop: '05:20 PM', eligible: true },
      { key: 'bytco-point', time: '09:12 AM', drop: '05:10 PM', eligible: true },
      { key: 'kkw-campus', time: '09:30 AM', drop: '05:00 PM', eligible: false },
    ]),
  },
  {
    id: '23879342-f436-433e-8d22-0f7f105b8247',
    shiftId: 'shift-general-02',
    routeNumber: 'ROUTE 2',
    name: 'ROUTE 2 – PUNE ROAD',
    description: 'General Shift Pune Road Corridor',
    isActive: true,
    routeStops: createRouteStops('23879342-f436-433e-8d22-0f7f105b8247', [
      { key: 'pune-road', time: '08:45 AM', drop: '05:40 PM', eligible: true },
      { key: 'bytco-point', time: '08:58 AM', drop: '05:27 PM', eligible: true },
      { key: 'datta-mandir', time: '09:05 AM', drop: '05:20 PM', eligible: true },
      { key: 'vijay-mamta', time: '09:14 AM', drop: '05:11 PM', eligible: true },
      { key: 'bodhale-nagar', time: '09:22 AM', drop: '05:03 PM', eligible: true },
      { key: 'kathe-lane', time: '09:30 AM', drop: '04:55 PM', eligible: true },
      { key: 'kkw-campus', time: '09:40 AM', drop: '04:45 PM', eligible: false },
    ]),
  },
  {
    id: 'e85a6020-13c9-4b73-a0cc-f539bc4c91d0',
    shiftId: 'shift-general-02',
    routeNumber: 'ROUTE 3',
    name: 'ROUTE 3 – CIDCO',
    description: 'General Shift CIDCO Corridor',
    isActive: true,
    routeStops: createRouteStops('e85a6020-13c9-4b73-a0cc-f539bc4c91d0', [
      { key: 'cidco', time: '08:35 AM', drop: '05:55 PM', eligible: true },
      { key: 'dwarka-stop', time: '08:48 AM', drop: '05:42 PM', eligible: true },
      { key: 'tidake-colony', time: '08:55 AM', drop: '05:35 PM', eligible: true },
      { key: 'trimurti-square', time: '09:02 AM', drop: '05:28 PM', eligible: true },
      { key: 'shubham-park', time: '09:08 AM', drop: '05:22 PM', eligible: true },
      { key: 'pathardi-phata', time: '09:14 AM', drop: '05:16 PM', eligible: true },
      { key: 'rane-nagar', time: '09:20 AM', drop: '05:10 PM', eligible: true },
      { key: 'indira-nagar', time: '09:25 AM', drop: '05:05 PM', eligible: true },
      { key: 'bombay-naka', time: '09:30 AM', drop: '05:00 PM', eligible: true },
      { key: 'dwarka-stop', time: '09:35 AM', drop: '04:55 PM', eligible: true },
      { key: 'kkw-campus', time: '09:55 AM', drop: '04:40 PM', eligible: false },
    ]),
  },
  {
    id: '1978d846-792c-44e6-a23b-3b11d4afd362',
    shiftId: 'shift-general-02',
    routeNumber: 'ROUTE 4',
    name: 'ROUTE 4 – COLLEGE ROAD',
    description: 'General Shift College Road Corridor',
    isActive: true,
    routeStops: createRouteStops('1978d846-792c-44e6-a23b-3b11d4afd362', [
      { key: 'college-road', time: '08:40 AM', drop: '05:50 PM', eligible: true },
      { key: 'rajiv-gandhi-bhavan', time: '08:52 AM', drop: '05:38 PM', eligible: true },
      { key: 'canada-corner', time: '08:58 AM', drop: '05:32 PM', eligible: true },
      { key: 'bhosla-school', time: '09:05 AM', drop: '05:25 PM', eligible: true },
      { key: 'abb-circle', time: '09:12 AM', drop: '05:18 PM', eligible: true },
      { key: 'civil-hospital', time: '09:18 AM', drop: '05:12 PM', eligible: true },
      { key: 'shalimar', time: '09:24 AM', drop: '05:06 PM', eligible: true },
      { key: 'kkw-campus', time: '09:45 AM', drop: '04:45 PM', eligible: false },
    ]),
  },
];

// =============================================================================
// SERVICE API METHODS
// =============================================================================

export const fetchShifts = async (): Promise<Shift[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          startTime: s.start_time,
          endTime: s.end_time,
        }));
      }
    } catch {
      // Fallback
    }
  }
  return OFFICIAL_SHIFTS;
};

const isUuid = (str: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * Cleanly formats route number and name for user-friendly display across all modules
 * Example: "Route 1 – Jail Road"
 */
export const formatRouteDisplay = (route?: { routeNumber?: string; name?: string } | null): string => {
  if (!route) return '';
  const num = route.routeNumber ? route.routeNumber.replace(/^route\s*/i, 'Route ') : '';
  let name = route.name || '';
  const match = name.match(/^ROUTE\s*\d+\s*[–-]\s*(.+)$/i);
  if (match) {
    name = match[1].trim();
  }
  const formattedName = name
    .split(' ')
    .map((w) => {
      if (w === '/' || w === '–' || w === '-') return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
  return num ? `${num} – ${formattedName}` : formattedName;
};

export const fetchAllOfficialRoutes = async (): Promise<OfficialRoute[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*, shift:shifts(*), route_stops(*, stop:stops(*))')
        .eq('is_active', true)
        .order('route_number', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((r) => ({
          id: r.id,
          shiftId: r.shift_id,
          routeNumber: r.route_number,
          name: r.name,
          description: r.description,
          isActive: r.is_active,
          routeStops: (r.route_stops || [])
            .sort((a: any, b: any) => a.sequence_number - b.sequence_number)
            .map((rs: any) => ({
              id: rs.id,
              routeId: rs.route_id,
              stopId: rs.stop_id,
              sequenceNumber: rs.sequence_number,
              morningPickupTime: rs.morning_pickup_time,
              dropTime: rs.drop_time,
              isPickupEligible: rs.is_pickup_eligible,
              stop: {
                id: rs.stop.id,
                name: rs.stop.name,
                landmark: rs.stop.landmark,
                latitude: rs.stop.latitude,
                longitude: rs.stop.longitude,
              },
            })),
        }));
      }
    } catch {
      // Fallback below
    }
  }
  return OFFICIAL_ROUTES;
};

export const fetchRoutesByShift = async (shiftId: string): Promise<OfficialRoute[]> => {
  if (isSupabaseConfigured()) {
    try {
      let targetShiftId = shiftId;
      if (!isUuid(shiftId)) {
        const isMorn = shiftId.toLowerCase().includes('morn');
        const code = isMorn ? 'MORNING' : 'GENERAL';
        const { data: shiftRow } = await supabase
          .from('shifts')
          .select('id')
          .eq('code', code)
          .maybeSingle();
        if (shiftRow?.id) {
          targetShiftId = shiftRow.id;
        }
      }

      if (isUuid(targetShiftId)) {
        const { data, error } = await supabase
          .from('routes')
          .select('*, route_stops(*, stop:stops(*))')
          .eq('shift_id', targetShiftId)
          .eq('is_active', true)
          .order('route_number', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((r) => ({
            id: r.id,
            shiftId: r.shift_id,
            routeNumber: r.route_number,
            name: r.name,
            description: r.description,
            isActive: r.is_active,
            routeStops: (r.route_stops || [])
              .sort((a: any, b: any) => a.sequence_number - b.sequence_number)
              .map((rs: any) => ({
                id: rs.id,
                routeId: rs.route_id,
                stopId: rs.stop_id,
                sequenceNumber: rs.sequence_number,
                morningPickupTime: rs.morning_pickup_time,
                dropTime: rs.drop_time,
                isPickupEligible: rs.is_pickup_eligible,
                stop: {
                  id: rs.stop.id,
                  name: rs.stop.name,
                  landmark: rs.stop.landmark,
                  latitude: rs.stop.latitude,
                  longitude: rs.stop.longitude,
                },
              })),
          }));
        }
      }
    } catch {
      // Fallback
    }
  }

  // Local fallback
  return OFFICIAL_ROUTES.filter(
    (r) =>
      r.shiftId === shiftId ||
      (shiftId.toLowerCase().includes('morn') && (r.name.includes('Morning') || r.id.startsWith('m-') || r.shiftId === 'shift-morning-01')) ||
      (shiftId.toLowerCase().includes('gen') && (r.name.includes('General') || r.id.startsWith('g-') || r.shiftId === 'shift-general-02'))
  );
};

export const fetchStopsForRoute = async (
  routeId: string,
  pickupOnly: boolean = false
): Promise<OfficialRouteStop[]> => {
  if (isSupabaseConfigured()) {
    try {
      let targetRouteId = routeId;
      if (!isUuid(routeId)) {
        const routeObj = OFFICIAL_ROUTES.find((r) => r.id === routeId);
        if (routeObj) {
          const { data: dbRoute } = await supabase
            .from('routes')
            .select('id')
            .eq('route_number', routeObj.routeNumber)
            .maybeSingle();
          if (dbRoute?.id) targetRouteId = dbRoute.id;
        }
      }

      if (isUuid(targetRouteId)) {
        let query = supabase
          .from('route_stops')
          .select('*, stop:stops(*)')
          .eq('route_id', targetRouteId)
          .order('sequence_number', { ascending: true });

        if (pickupOnly) {
          query = query.eq('is_pickup_eligible', true);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((rs: any) => ({
            id: rs.id,
            routeId: rs.route_id,
            stopId: rs.stop_id,
            sequenceNumber: rs.sequence_number,
            morningPickupTime: rs.morning_pickup_time,
            dropTime: rs.drop_time,
            isPickupEligible: rs.is_pickup_eligible,
            stop: {
              id: rs.stop.id,
              name: rs.stop.name,
              landmark: rs.stop.landmark,
              latitude: rs.stop.latitude,
              longitude: rs.stop.longitude,
            },
          }));
        }
      }
    } catch {
      // Fallback
    }
  }

  // Local fallback
  const route = OFFICIAL_ROUTES.find((r) => r.id === routeId);
  if (!route) return [];
  if (pickupOnly) {
    return route.routeStops.filter((rs) => rs.isPickupEligible);
  }
  return route.routeStops;
};

export const fetchRouteById = async (routeId: string): Promise<OfficialRoute | null> => {
  if (isSupabaseConfigured() && isUuid(routeId)) {
    try {
      const { data: r, error } = await supabase
        .from('routes')
        .select('*, shift:shifts(*), route_stops(*, stop:stops(*))')
        .eq('id', routeId)
        .maybeSingle();

      if (!error && r) {
        return {
          id: r.id,
          shiftId: r.shift_id,
          routeNumber: r.route_number,
          name: r.name,
          description: r.description,
          isActive: r.is_active,
          routeStops: (r.route_stops || [])
            .sort((a: any, b: any) => a.sequence_number - b.sequence_number)
            .map((rs: any) => ({
              id: rs.id,
              routeId: rs.route_id,
              stopId: rs.stop_id,
              sequenceNumber: rs.sequence_number,
              morningPickupTime: rs.morning_pickup_time,
              dropTime: rs.drop_time,
              isPickupEligible: rs.is_pickup_eligible,
              stop: {
                id: rs.stop.id,
                name: rs.stop.name,
                landmark: rs.stop.landmark,
                latitude: rs.stop.latitude,
                longitude: rs.stop.longitude,
              },
            })),
        };
      }
    } catch {
      // Fallback
    }
  }
  const match = OFFICIAL_ROUTES.find((r) => r.id === routeId);
  return match || null;
};

/**
 * Normalizes journey direction:
 * Supports 'TO_COLLEGE' (inbound) and 'TO_HOME' / 'RETURNING_HOME' (outbound).
 */
export const normalizeDirection = (dir?: string): 'TO_COLLEGE' | 'TO_HOME' => {
  if (!dir) return 'TO_COLLEGE';
  const upper = dir.toUpperCase();
  if (upper.includes('HOME') || upper.includes('RETURN')) return 'TO_HOME';
  return 'TO_COLLEGE';
};

/**
 * Fetches direction-specific ordered stops for a route.
 * Handles TO_COLLEGE and TO_HOME / RETURNING_HOME.
 * Follows the strict rule in Section 1:
 * TO_COLLEGE: Route-name Terminal -> intermediate stops in reverse order -> K. K. Wagh Education Society
 * TO_HOME: K. K. Wagh Education Society -> intermediate stops in original order -> Route-name Terminal
 */
export const fetchDirectionalRouteStops = async (
  routeId: string,
  direction: TripDirection
): Promise<DirectionalRouteStop[]> => {
  const normDir = normalizeDirection(direction);

  if (isSupabaseConfigured()) {
    try {
      let targetRouteId = routeId;
      if (!isUuid(routeId)) {
        const routeObj = OFFICIAL_ROUTES.find((r) => r.id === routeId);
        if (routeObj) {
          const { data: dbRoute } = await supabase
            .from('routes')
            .select('id')
            .eq('route_number', routeObj.routeNumber)
            .maybeSingle();
          if (dbRoute?.id) targetRouteId = dbRoute.id;
        }
      }

      if (isUuid(targetRouteId)) {
        // Query route_direction_stops for the direction or alias
        const directionQuery = normDir === 'TO_HOME' ? ['TO_HOME', 'RETURNING_HOME'] : ['TO_COLLEGE'];

        const { data, error } = await supabase
          .from('route_direction_stops')
          .select('*, stop:stops(*)')
          .eq('route_id', targetRouteId)
          .in('direction', directionQuery)
          .order('sequence_number', { ascending: true });

        if (!error && data && data.length > 0) {
          // Group by sequence number to avoid duplicate rows if both TO_HOME and RETURNING_HOME were returned
          const seenSeqs = new Set<number>();
          const uniqueRows = data.filter((row: any) => {
            if (seenSeqs.has(row.sequence_number)) return false;
            seenSeqs.add(row.sequence_number);
            return true;
          });

          return uniqueRows.map((rds: any) => ({
            id: rds.id,
            routeId: rds.route_id,
            direction: rds.direction as TripDirection,
            sequenceNumber: rds.sequence_number,
            stopId: rds.stop_id,
            pickupTime: rds.pickup_time,
            dropTime: rds.drop_time,
            isStudentStop: rds.is_student_stop,
            stop: {
              id: rds.stop.id,
              name: rds.stop.name,
              landmark: rds.stop.landmark,
              latitude: rds.stop.latitude,
              longitude: rds.stop.longitude,
            },
          }));
        }
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback if offline or local:
  const baseStops = await fetchStopsForRoute(routeId, false);
  const isToCollege = normDir === 'TO_COLLEGE';
  const orderedStops = isToCollege ? baseStops : [...baseStops].reverse();

  return orderedStops.map((s, idx) => ({
    id: `fb-rds-${normDir}-${idx + 1}`,
    routeId,
    direction: normDir,
    sequenceNumber: idx + 1,
    stopId: s.stopId,
    pickupTime: isToCollege ? s.morningPickupTime : s.dropTime,
    dropTime: isToCollege ? s.dropTime : s.morningPickupTime,
    isStudentStop: idx !== orderedStops.length - 1,
    stop: s.stop,
  }));
};

// =============================================================================
// ROUTE ASSIGNMENTS & STUDENT NOTIFICATION INTEGRATION
// =============================================================================

export const fetchRouteAssignments = async (): Promise<RouteAssignment[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('route_assignments')
        .select(`
          id,
          route_id,
          shift_id,
          bus_id,
          driver_id,
          updated_at,
          route:routes(*),
          shift:shifts(*),
          bus:buses(*),
          driver:drivers(*)
        `);

      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          routeId: row.route_id,
          shiftId: row.shift_id,
          busId: row.bus_id,
          driverId: row.driver_id,
          updatedAt: row.updated_at,
          route: row.route,
          shift: row.shift,
          bus: row.bus,
          driver: row.driver,
        }));
      }
    } catch (e) {
      console.warn('Error fetching route assignments from Supabase:', e);
    }
  }
  return [];
};

export const assignDriverAndBusToRoute = async (
  routeId: string,
  shiftId: string,
  busId: string,
  driverId: string
): Promise<{
  success: boolean;
  updated?: boolean;
  notifiedCount?: number;
  message?: string;
  driverName?: string;
  busPlate?: string;
  routeName?: string;
  error?: string;
}> => {
  if (!isSupabaseConfigured()) {
    return { success: true, updated: true, notifiedCount: 0, message: 'Local mode assignment recorded.' };
  }

  try {
    // 1. Try Calling Server RPC admin_assign_driver_bus
    const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_assign_driver_bus', {
      p_route_id: routeId,
      p_shift_id: shiftId,
      p_bus_id: busId,
      p_driver_id: driverId,
    });

    if (!rpcErr && rpcData?.success) {
      return {
        success: true,
        updated: rpcData.updated !== false,
        notifiedCount: rpcData.notified_count || 0,
        driverName: rpcData.driver_name,
        busPlate: rpcData.bus_plate,
        routeName: rpcData.route_name,
        message: rpcData.message || `Assigned successfully. Notified ${rpcData.notified_count || 0} students.`,
      };
    }

    if (rpcErr) {
      console.warn('admin_assign_driver_bus RPC error, trying direct table update:', rpcErr);
    }

    // 2. Direct Table Fallback
    const { data: existing } = await supabase
      .from('route_assignments')
      .select('bus_id, driver_id')
      .eq('route_id', routeId)
      .eq('shift_id', shiftId)
      .maybeSingle();

    if (existing && existing.bus_id === busId && existing.driver_id === driverId) {
      return {
        success: true,
        updated: false,
        notifiedCount: 0,
        message: 'Assignment is unchanged; duplicate notifications skipped.',
      };
    }

    const { error: upsertErr } = await supabase
      .from('route_assignments')
      .upsert(
        {
          route_id: routeId,
          shift_id: shiftId,
          bus_id: busId,
          driver_id: driverId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'route_id,shift_id' }
      );

    if (upsertErr) {
      return { success: false, error: upsertErr.message };
    }

    // Query details to generate notifications safely guarding UUID types
    const busPromise = isUuid(busId)
      ? supabase.from('buses').select('bus_number, plate_number').eq('id', busId).maybeSingle()
      : Promise.resolve({ data: null, error: null });
    const driverPromise = isUuid(driverId)
      ? supabase.from('drivers').select('full_name').eq('id', driverId).maybeSingle()
      : Promise.resolve({ data: null, error: null });
    const routePromise = isUuid(routeId)
      ? supabase.from('routes').select('name').eq('id', routeId).maybeSingle()
      : Promise.resolve({ data: null, error: null });
    const shiftPromise = isUuid(shiftId)
      ? supabase.from('shifts').select('name').eq('id', shiftId).maybeSingle()
      : Promise.resolve({ data: null, error: null });
    const studentsPromise = isUuid(routeId) && isUuid(shiftId)
      ? supabase
          .from('student_transport')
          .select('student_id, pickup_stop_id, stops(name)')
          .eq('route_id', routeId)
          .eq('shift_id', shiftId)
          .eq('status', 'approved')
      : Promise.resolve({ data: [], error: null });

    const [busRes, driverRes, routeRes, shiftRes, studentsRes] = await Promise.all([
      busPromise,
      driverPromise,
      routePromise,
      shiftPromise,
      studentsPromise,
    ]);

    const driverName = driverRes.data?.full_name || 'Assigned Driver';
    const busPlate = busRes.data?.plate_number || busRes.data?.bus_number || 'Assigned Bus';
    const routeName = routeRes.data?.name || 'Assigned Route';
    const shiftName = shiftRes.data?.name || 'Shift';

    let notifiedCount = 0;
    const students = studentsRes.data || [];

    for (const std of students) {
      const stopName = (std.stops as any)?.name || 'Designated Stop';
      const msg = `Your transport assignment has been updated. Driver: ${driverName}. Bus: ${busPlate}. Route: ${routeName}. Shift: ${shiftName}. Pickup: ${stopName}.`;

      await supabase.from('notifications').insert({
        user_id: std.student_id,
        title: 'Transport Assignment Updated',
        message: msg,
        category: 'ROUTE_ALERT',
        route_id: routeId,
        is_read: false,
      });
      notifiedCount++;
    }

    return {
      success: true,
      updated: true,
      notifiedCount,
      driverName,
      busPlate,
      routeName,
      message: `Assignment saved. Notified ${notifiedCount} approved students.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to assign route' };
  }
};
