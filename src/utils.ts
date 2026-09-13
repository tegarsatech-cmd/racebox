import { GPSTrackPoint } from './types';

/**
 * Calculates the geodetic distance between two coordinates in meters using the Haversine formula.
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Interpolates time and speed at a target checkpoint distance between two consecutive GPS points.
 * Point A is before the checkpoint, Point B is after the checkpoint.
 * Target distance dC is between dA and dB.
 */
export function interpolateCheckpoint(
  pointA: GPSTrackPoint,
  pointB: GPSTrackPoint,
  targetDistance: number
): { time: number; speed: number } {
  const dA = pointA.cumulativeDistance;
  const dB = pointB.cumulativeDistance;
  
  if (dB === dA) {
    return {
      time: pointA.timestamp / 1000,
      speed: pointA.speed
    };
  }

  const fraction = (targetDistance - dA) / (dB - dA);

  const tA = pointA.timestamp / 1000; // convert to seconds
  const tB = pointB.timestamp / 1000; // convert to seconds
  
  const interpolatedTime = tA + fraction * (tB - tA);
  
  // Speed is in m/s, convert to m/s for interpolation first
  const vA = pointA.speed;
  const vB = pointB.speed;
  const interpolatedSpeed = vA + fraction * (vB - vA);

  return {
    time: Math.max(0, interpolatedTime),
    speed: Math.max(0, interpolatedSpeed)
  };
}

/**
 * Validates a GPS point. Filters out points that:
 * - Have accuracy worse than 15 meters
 * - Have extreme changes indicating jumps (e.g. speed jump > 200 m/s)
 */
export function filterGPSPoint(
  newPoint: { lat: number; lng: number; accuracy: number; speed: number | null; timestamp: number },
  lastPoint: GPSTrackPoint | null
): boolean {
  // If accuracy is worse than 20 meters, reject the data (sport telemetry needs relative accuracy)
  if (newPoint.accuracy > 20) {
    return false;
  }

  if (lastPoint) {
    const elapsedSeconds = (newPoint.timestamp - lastPoint.realTimestamp) / 1000;
    if (elapsedSeconds <= 0) return false;

    const dist = haversineDistance(lastPoint.lat, lastPoint.lng, newPoint.lat, newPoint.lng);
    
    // Implied speed from coordinates jump
    const impliedSpeed = dist / elapsedSeconds; 
    
    // Max reasonable speed (say, 300 km/h -> 83.3 m/s)
    if (impliedSpeed > 83.3) {
      return false; // Position jumped too far, likely a GPS glitch
    }
  }

  return true;
}

/**
 * Format speed in m/s to display unit
 */
export function convertSpeed(speedMS: number, unit: 'KMH' | 'MPH'): number {
  if (unit === 'KMH') {
    return speedMS * 3.6; // 1 m/s = 3.6 km/h
  } else {
    return speedMS * 2.23694; // 1 m/s = 2.23694 mph
  }
}

/**
 * Format elapsed time to readable format (e.g., 2.41 s or 02:30.41)
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === null) return '--.--';
  return seconds.toFixed(2);
}
