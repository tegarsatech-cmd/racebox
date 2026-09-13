export interface VehicleSettings {
  name: string;
  weightMotor?: number; // in kg
  weightRider?: number; // in kg
  engineCC?: number; // engine CC
}

export interface AppSettings {
  unit: 'KMH' | 'MPH';
  checkpoints: number[]; // e.g., [60, 100, 201, 300, 400, 500]
  highAccuracy: boolean;
}

export interface GPSTrackPoint {
  lat: number;
  lng: number;
  timestamp: number; // Elapsed timestamp in milliseconds since run started
  realTimestamp: number; // Epoch timestamp
  accuracy: number;
  speed: number; // Speed in m/s from Geolocation API
  cumulativeDistance: number; // cumulative distance in meters
}

export interface CheckpointRecord {
  distance: number; // Checkpoint target (e.g. 60, 100, 201, etc.)
  time: number; // elapsed time in seconds (checkpointET)
  avgSpeed: number; // average speed from start to checkpoint in app unit
  instantSpeed: number; // instantaneous speed at checkpoint crossing in app unit
  passed: boolean;
}

export interface GPSLogSample {
  timestamp: number; // Epoch timestamp
  elapsedTime: number; // in seconds since true movement
  latitude: number;
  longitude: number;
  accuracy: number;
  gpsSpeed: number; // m/s reported by GPS
  calculatedSpeed: number; // m/s from segmentDistance / dt
  segmentDistance: number; // meters
  totalDistance: number; // cumulative distance
  isValid: boolean;
  rejectReason?: string;
}

export interface RaceHistoryEntry {
  id: string;
  date: string; // Date string
  vehicleName: string;
  vehicleWeight: number;
  riderWeight: number;
  engineCC?: number;
  targetDistance: number;
  checkpoints: CheckpointRecord[];
  topSpeed: number; // in app unit
  averageSpeed: number; // in app unit
  totalTime: number; // in seconds
  gpsTrack: GPSTrackPoint[];
  unit: 'KMH' | 'MPH';
  gpsAccuracyAvg?: number;
  dataQuality?: 'HIGH' | 'MEDIUM' | 'LOW';
  debugLogs?: GPSLogSample[]; // Store internal debug logs
}
