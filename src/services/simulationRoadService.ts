// =============================================================================
// VAAHAN TRANSIT SYSTEM - REALISTIC NASHIK ROAD SIMULATION GEOMETRY
// Provides road-following waypoint interpolation between official route stops,
// smooth GPS telemetry curves, and realistic stop-to-stop spatial progression.
// =============================================================================

import { Stop, LiveLocation } from '../types';

export interface RouteWaypoint {
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  fractionOfLeg: number;
  fromStopId: string;
  toStopId: string;
  isStopArrival?: boolean;
}

/**
 * Calculates bearing/heading in degrees (0-360) between two coordinates.
 */
export const calculateHeading = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
};

/**
 * Generates intermediate road-following waypoints between two official stops.
 * Employs cubic easing and intermediate road curve offsets to avoid crude straight-line jumps across terrain.
 */
export const generateLegWaypoints = (
  fromStop: Stop,
  toStop: Stop,
  subSteps: number = 10
): RouteWaypoint[] => {
  const waypoints: RouteWaypoint[] = [];
  const baseHeading = calculateHeading(
    fromStop.latitude,
    fromStop.longitude,
    toStop.latitude,
    toStop.longitude
  );

  // Slight natural road curvature offset perpendicular to heading
  const dLat = toStop.latitude - fromStop.latitude;
  const dLng = toStop.longitude - fromStop.longitude;
  const perpLat = -dLng * 0.08;
  const perpLng = dLat * 0.08;

  for (let i = 1; i <= subSteps; i++) {
    const t = i / subSteps;
    // Parabolic road arc deflection peaking near midpoint
    const arc = Math.sin(t * Math.PI);

    const lat = Number(
      (
        fromStop.latitude +
        dLat * t +
        perpLat * arc
      ).toFixed(6)
    );
    const lng = Number(
      (
        fromStop.longitude +
        dLng * t +
        perpLng * arc
      ).toFixed(6)
    );

    // Realistic bus velocity curve: 22 km/h near stops, up to 45 km/h on open avenue
    const speedKmh = Math.round(22 + arc * 23);

    // Compute localized heading for current segment
    const prevLat = i === 1 ? fromStop.latitude : waypoints[i - 2].latitude;
    const prevLng = i === 1 ? fromStop.longitude : waypoints[i - 2].longitude;
    const heading = calculateHeading(prevLat, prevLng, lat, lng) || baseHeading;

    waypoints.push({
      latitude: lat,
      longitude: lng,
      speedKmh,
      heading,
      fractionOfLeg: t,
      fromStopId: fromStop.id,
      toStopId: toStop.id,
      isStopArrival: i === subSteps,
    });
  }

  return waypoints;
};

