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
  time: number; // elapsed time in seconds
  speed: number; // speed in km/h or mph (based on app unit when run)
  passed: boolean;
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
}
