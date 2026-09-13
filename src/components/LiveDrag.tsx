import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, VehicleSettings, CheckpointRecord, GPSTrackPoint } from '../types';
import { haversineDistance, interpolateCheckpoint, filterGPSPoint, convertSpeed, formatTime } from '../utils';
import { ShieldAlert, Timer, Compass, Zap, Ban } from 'lucide-react';

interface LiveDragProps {
  targetDistance: number;
  appSettings: AppSettings;
  vehicle: VehicleSettings;
  onCancel: () => void;
  onFinishRun: (historyEntry: any) => void;
}

export const LiveDrag: React.FC<LiveDragProps> = ({
  targetDistance,
  appSettings,
  vehicle,
  onCancel,
  onFinishRun,
}) => {
  const [distance, setDistance] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0); // in m/s
  const [elapsedTime, setElapsedTime] = useState<number>(0); // in seconds
  const [isStarted, setIsStarted] = useState<boolean>(false); // Auto-starts when movement begins
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [liveTopSpeed, setLiveTopSpeed] = useState<number>(0);
  
  // Lists of checkpoints to capture
  const [checkpoints, setCheckpoints] = useState<CheckpointRecord[]>([]);
  const [gpsTrack, setGpsTrack] = useState<GPSTrackPoint[]>([]);

  // Refs for tracking mutable coordinates & state across re-renders
  const lastPointRef = useRef<GPSTrackPoint | null>(null);
  const gpsTrackRef = useRef<GPSTrackPoint[]>([]);
  const checkpointsRef = useRef<CheckpointRecord[]>([]);
  const isStartedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const anchorPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const gpsPointsForStartRef = useRef<{ lat: number; lng: number }[]>([]);
  const gpsAccuracyListRef = useRef<number[]>([]);
  const consecutiveMovementPointsRef = useRef<number>(0);
  const consecutiveMovementSamplesRef = useRef<{ lat: number; lng: number; timestamp: number; speed: number; accuracy: number }[]>([]);
  const distanceRef = useRef<number>(0);
  const liveTopSpeedRef = useRef<number>(0);
  const lastSampleRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  // Initialize and reset tracking states on mount
  useEffect(() => {
    isStartedRef.current = false;
    startTimeRef.current = 0;
    distanceRef.current = 0;
    liveTopSpeedRef.current = 0;
    gpsPointsForStartRef.current = [];
    consecutiveMovementSamplesRef.current = [];
    consecutiveMovementPointsRef.current = 0;
    lastSampleRef.current = null;
    lastPointRef.current = null;
    gpsTrackRef.current = [];
  }, []);

  // Initialize checkpoints list
  useEffect(() => {
    // Generate checkpoints for selected target
    let rawCheckpoints: number[] = [];
    if (targetDistance === 60) rawCheckpoints = [60];
    else if (targetDistance === 100) rawCheckpoints = [60, 100];
    else if (targetDistance === 201) rawCheckpoints = [60, 100, 201];
    else if (targetDistance === 500) rawCheckpoints = [60, 100, 201, 300, 400, 500];
    else rawCheckpoints = [targetDistance];

    const records: CheckpointRecord[] = rawCheckpoints.map((cp) => ({
      distance: cp,
      time: 0,
      speed: 0,
      passed: false,
    }));

    setCheckpoints(records);
    checkpointsRef.current = records;
  }, [targetDistance]);

  // Handle run stop & finish preparation
  const handleFinish = () => {
    // Stop all watchers and timers
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const currentTrack = gpsTrackRef.current;
    const finalCps = checkpointsRef.current;

    // Use our highly-validated liveTopSpeed to prevent drift spikes from affecting history
    const maxSpeed = liveTopSpeedRef.current;
    
    // Average speed from checkpoints or track
    const totalDuration = elapsedTime;
    const avgSpeed = totalDuration > 0 ? convertSpeed(distanceRef.current / totalDuration, appSettings.unit) : 0;

    // Use interpolated time for the target checkpoint as totalTime if available (more accurate)
    const targetCp = finalCps.find((cp) => cp.distance === targetDistance && cp.passed);
    const finalElapsedTime = targetCp ? targetCp.time : elapsedTime;

    // Compute average GPS Accuracy recorded during active run
    const avgAccuracy = gpsAccuracyListRef.current.length > 0
      ? gpsAccuracyListRef.current.reduce((sum, v) => sum + v, 0) / gpsAccuracyListRef.current.length
      : (gpsAccuracy || 5.0);

    // Compute Data Quality
    const qualityLevel = avgAccuracy <= 6.0 ? 'HIGH' : avgAccuracy <= 12.0 ? 'MEDIUM' : 'LOW';

    const runResult = {
      id: `run_${Date.now()}`,
      date: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      vehicleName: vehicle.name || 'Kendaraan Tanpa Nama',
      vehicleWeight: vehicle.weightMotor || 0,
      riderWeight: vehicle.weightRider || 0,
      engineCC: vehicle.engineCC || 0,
      targetDistance: targetDistance,
      checkpoints: finalCps,
      topSpeed: maxSpeed,
      averageSpeed: avgSpeed,
      totalTime: finalElapsedTime,
      gpsTrack: currentTrack,
      unit: appSettings.unit,
      gpsAccuracyAvg: avgAccuracy,
      dataQuality: qualityLevel,
    };

    onFinishRun(runResult);
  };

  // --- UNIFIED GPS UPDATE ENGINE (USED BY BOTH SENSOR & SIMULATION) ---
  const handleGPSUpdate = (position: { coords: { latitude: number; longitude: number; accuracy: number; speed: number | null }; timestamp: number }) => {
    const now = position.timestamp || Date.now();
    const coords = position.coords;
    const acc = coords.accuracy;
    
    // 1. REJECT STALE GPS READINGS (older than 3 seconds)
    const staleAgeMs = Date.now() - now;
    // For simulations or current sensor inputs, we tolerate small lag, but reject real stale data
    if (staleAgeMs > 3000) {
      console.warn('GPS data too stale:', staleAgeMs, 'ms. Ignored.');
      return;
    }

    // 2. FILTER OUT POOR ACCURACY POINTS
    setGpsAccuracy(acc);
    if (acc > 20) {
      console.warn('GPS accuracy too poor:', acc, 'm. Point rejected.');
      return;
    }

    const currentLat = coords.latitude;
    const currentLng = coords.longitude;
    const rawSpeed = coords.speed !== null && coords.speed >= 0 ? coords.speed : 0; // m/s

    // 3. READY STATE: COLLECT STABLE START POSITION REFERENCE & FILTER DRIFT
    if (!isStartedRef.current) {
      // Collect coordinates to calculate a stable start point
      gpsPointsForStartRef.current.push({ lat: currentLat, lng: currentLng });
      
      // Wait until we have at least 5 samples for stationary validation
      if (gpsPointsForStartRef.current.length < 5) {
        // Absolute zero-lock when still stabilizing
        setDistance(0);
        setElapsedTime(0);
        setSpeed(0);
        setLiveTopSpeed(0);
        lastSampleRef.current = { lat: currentLat, lng: currentLng, timestamp: now };
        return;
      }

      if (gpsPointsForStartRef.current.length > 5) {
        gpsPointsForStartRef.current.shift();
      }

      // Calculate stable averaged start point (centroid of the 5 stationary samples)
      const len = gpsPointsForStartRef.current.length;
      const avgLat = gpsPointsForStartRef.current.reduce((sum, p) => sum + p.lat, 0) / len;
      const avgLng = gpsPointsForStartRef.current.reduce((sum, p) => sum + p.lng, 0) / len;
      anchorPointRef.current = { lat: avgLat, lng: avgLng };

      // Calculate displacement from our stable start reference
      const displacementFromAnchor = haversineDistance(
        anchorPointRef.current.lat,
        anchorPointRef.current.lng,
        currentLat,
        currentLng
      );

      // Calculate distance and time from the previous sample
      let distFromLast = 0;
      let dtFromLast = 0;
      if (lastSampleRef.current) {
        distFromLast = haversineDistance(
          lastSampleRef.current.lat,
          lastSampleRef.current.lng,
          currentLat,
          currentLng
        );
        dtFromLast = (now - lastSampleRef.current.timestamp) / 1000;
      }

      const calculatedSpeed = dtFromLast > 0 ? (distFromLast / dtFromLast) : 0;

      // Adaptive movement threshold based on GPS accuracy: movementThreshold = f(accuracy)
      // If accuracy is poor (e.g. 10m), we require larger displacement (22m) to declare movement
      const movementThreshold = Math.max(12.0, acc * 2.2);
      
      // Check if position change is beyond our adaptive threshold
      const isPositionMoving = displacementFromAnchor > movementThreshold;

      // Check if speed shows true movement and has a reasonable displacement
      // speed > 1.2 m/s (~4.3 km/h) is a clear indication of a moving vehicle
      const isSpeedMoving = (rawSpeed > 1.2 || calculatedSpeed > 1.2) && displacementFromAnchor > 3.5;

      // Validated time interval (ensure sample rates are reasonable, e.g. 0.1s to 4.0s)
      const isTimeValid = dtFromLast > 0 && dtFromLast < 4.0;

      // Direction consistency: position should be moving consistently away from anchor
      const displacementPrevious = lastSampleRef.current ? haversineDistance(anchorPointRef.current.lat, anchorPointRef.current.lng, lastSampleRef.current.lat, lastSampleRef.current.lng) : 0;
      const isConsistentDirection = lastSampleRef.current === null || displacementFromAnchor >= displacementPrevious - 0.2;

      // Check if this sample itself meets movement criteria
      const isSampleMoving = (isPositionMoving || isSpeedMoving) && isTimeValid && isConsistentDirection;

      if (isSampleMoving) {
        consecutiveMovementSamplesRef.current.push({
          lat: currentLat,
          lng: currentLng,
          timestamp: now,
          speed: rawSpeed,
          accuracy: acc
        });
      } else {
        // Clear history of movement candidates if they break consistency
        consecutiveMovementSamplesRef.current = [];
        consecutiveMovementPointsRef.current = 0;
        
        // Zero-Velocity Update (ZUPT):
        // If stationary, slowly match anchor to current position to absorb steady GPS drift
        if (rawSpeed < 0.3 && displacementFromAnchor < 4.0) {
          anchorPointRef.current = { lat: currentLat, lng: currentLng };
        }
      }

      // Require at least 3 consecutive updates showing true consistent movement to trigger READY -> RUNNING
      // This prevents single coordinate spikes/drifts from triggering a false start
      if (consecutiveMovementSamplesRef.current.length >= 3) {
        isStartedRef.current = true;
        setIsStarted(true);

        const candidates = consecutiveMovementSamplesRef.current;
        // The exact moment movement started is the timestamp of the FIRST candidate point!
        // This eliminates any start-lag and ensures 100% accurate Elapsed Time (ET).
        const startMovementTimestamp = candidates[0].timestamp;
        startTimeRef.current = startMovementTimestamp;
        
        // Reconstruct the initial track and cumulative distance from the candidate points
        let currentCumulativeDistance = 0;
        const initialTrack: GPSTrackPoint[] = [];

        // Add the averaged anchor as our absolute starting coordinate (at t=0, speed=0, dist=0)
        const pointZero: GPSTrackPoint = {
          lat: anchorPointRef.current.lat,
          lng: anchorPointRef.current.lng,
          timestamp: 0,
          realTimestamp: startMovementTimestamp,
          accuracy: candidates[0].accuracy,
          speed: 0, // Starts at exact zero velocity
          cumulativeDistance: 0,
        };
        initialTrack.push(pointZero);

        let previousPoint = pointZero;

        // Process candidate points (1 to N)
        for (let i = 0; i < candidates.length; i++) {
          const cand = candidates[i];
          const candDt = (cand.timestamp - previousPoint.realTimestamp) / 1000;
          const candDist = haversineDistance(previousPoint.lat, previousPoint.lng, cand.lat, cand.lng);
          
          currentCumulativeDistance += candDist;
          
          let candSpeed = cand.speed;
          if (candSpeed <= 0 && candDt > 0) {
            candSpeed = candDist / candDt;
          }

          const currentPoint: GPSTrackPoint = {
            lat: cand.lat,
            lng: cand.lng,
            timestamp: cand.timestamp - startMovementTimestamp,
            realTimestamp: cand.timestamp,
            accuracy: cand.accuracy,
            speed: candSpeed,
            cumulativeDistance: currentCumulativeDistance,
          };

          initialTrack.push(currentPoint);
          previousPoint = currentPoint;
        }

        distanceRef.current = currentCumulativeDistance;
        setDistance(currentCumulativeDistance);
        setElapsedTime((now - startMovementTimestamp) / 1000);
        
        // Top Speed and Live Speed from the latest candidate
        const latestPoint = initialTrack[initialTrack.length - 1];
        const latestSpeed = latestPoint.speed;
        setSpeed(latestSpeed);

        const speedUnitValue = convertSpeed(latestSpeed, appSettings.unit);
        liveTopSpeedRef.current = speedUnitValue;
        setLiveTopSpeed(speedUnitValue);

        gpsAccuracyListRef.current = candidates.map(c => c.accuracy);
        
        lastPointRef.current = latestPoint;
        gpsTrackRef.current = initialTrack;
        setGpsTrack([...initialTrack]);

        // Evaluate any checkpoint crossed during initialization
        const initialCps = checkpointsRef.current.map((cp) => {
          if (cp.passed) return cp;
          
          // Find if any segment in our initialTrack crossed the checkpoint
          for (let k = 1; k < initialTrack.length; k++) {
            const pA = initialTrack[k - 1];
            const pB = initialTrack[k];
            if (pA.cumulativeDistance < cp.distance && pB.cumulativeDistance >= cp.distance) {
              const interpolated = interpolateCheckpoint(pA, pB, cp.distance);
              return {
                ...cp,
                passed: true,
                time: interpolated.time,
                speed: convertSpeed(interpolated.speed, appSettings.unit),
              };
            }
          }
          return cp;
        });
        checkpointsRef.current = initialCps;
        setCheckpoints(initialCps);

      } else {
        // Keep all stats completely locked to 0 while stationary/stabilizing
        setDistance(0);
        setElapsedTime(0);
        setSpeed(0);
        setLiveTopSpeed(0);
        liveTopSpeedRef.current = 0;
      }

      lastSampleRef.current = { lat: currentLat, lng: currentLng, timestamp: now };
      return;
    }

    // 4. RUNNING STATE: ACTIVE PRECISION TRACKING
    const lastPoint = lastPointRef.current;
    if (!lastPoint) return;

    // Filter out impossible coordinates jump or outlier jumps
    const testPoint = {
      lat: currentLat,
      lng: currentLng,
      accuracy: acc,
      speed: rawSpeed,
      timestamp: now,
    };
    if (!filterGPSPoint(testPoint, lastPoint)) {
      console.warn('Point failed secondary filter validation.');
      return;
    }

    // Record accuracy for confidence evaluation
    gpsAccuracyListRef.current.push(acc);

    // Calculate incremental distance from previous coordinate
    let incrementalDistance = haversineDistance(
      lastPoint.lat,
      lastPoint.lng,
      currentLat,
      currentLng
    );

    // Filter minor jitter or small drift movements when speed is negligible
    if (rawSpeed < 0.3 && incrementalDistance < 1.0) {
      incrementalDistance = 0;
    }

    const elapsedMs = now - startTimeRef.current;
    const elapsedSec = elapsedMs / 1000;

    // Rate-of-change speed validation to reject outlier spikes
    const dt = (now - lastPoint.realTimestamp) / 1000;
    
    // Implied speed from position change
    const impliedSpeed = dt > 0 ? (incrementalDistance / dt) : 0;
    let finalSpeed = rawSpeed;

    // GPS Spike and Outlier Filter:
    // If coords.speed (rawSpeed) shows an impossible spike not supported by coordinate displacement,
    // fallback to impliedSpeed or cap it to prevent fake top speed records
    if (dt > 0) {
      // 1. Extreme spike detection (e.g. rawSpeed is > 15 m/s (~54 km/h) and more than 3x the impliedSpeed)
      if (rawSpeed > 15 && rawSpeed > impliedSpeed * 3) {
        finalSpeed = impliedSpeed;
      }

      // 2. Physical acceleration limit filter (max 13.0 m/s^2 accel, max 22.0 m/s^2 decel)
      const maxAcceleration = 13.0; // m/s^2
      const maxDeceleration = 22.0; // m/s^2
      const maxSpeedLimit = lastPoint.speed + maxAcceleration * dt;
      const minSpeedLimit = Math.max(0, lastPoint.speed - maxDeceleration * dt);
      
      if (finalSpeed > maxSpeedLimit) {
        finalSpeed = maxSpeedLimit;
      } else if (finalSpeed < minSpeedLimit) {
        finalSpeed = minSpeedLimit;
      }
    }

    // If speed is extremely small/negligible, set to 0 to prevent drift
    if (finalSpeed < 0.1) {
      finalSpeed = 0;
    }

    // Speed Smoothing (Exponential filter: 70% last, 30% current)
    const smoothedSpeed = lastPoint ? (lastPoint.speed * 0.7 + finalSpeed * 0.3) : finalSpeed;

    // Update distance and speed
    const newCumulativeDistance = distanceRef.current + incrementalDistance;
    distanceRef.current = newCumulativeDistance;
    setDistance(newCumulativeDistance);
    setSpeed(smoothedSpeed);

    // Track Top Speed only from validated smoothed speed
    const speedUnitValue = convertSpeed(smoothedSpeed, appSettings.unit);
    const currentTop = Math.max(liveTopSpeedRef.current, speedUnitValue);
    liveTopSpeedRef.current = currentTop;
    setLiveTopSpeed(currentTop);

    // Create GPSTrackPoint record
    const currentPoint: GPSTrackPoint = {
      lat: currentLat,
      lng: currentLng,
      timestamp: elapsedMs,
      realTimestamp: now,
      accuracy: acc,
      speed: smoothedSpeed,
      cumulativeDistance: newCumulativeDistance,
    };

    gpsTrackRef.current.push(currentPoint);
    setGpsTrack([...gpsTrackRef.current]);

    // Checkpoints crossing with linear interpolation
    const updatedCps = checkpointsRef.current.map((cp) => {
      if (cp.passed) return cp;

      if (newCumulativeDistance >= cp.distance) {
        let interpTime = elapsedSec;
        let interpSpeed = smoothedSpeed;

        // Interpolation using two points that sandwich the checkpoint
        if (lastPoint.cumulativeDistance < cp.distance) {
          const interpolated = interpolateCheckpoint(lastPoint, currentPoint, cp.distance);
          interpTime = interpolated.time;
          interpSpeed = interpolated.speed;
        }

        return {
          ...cp,
          passed: true,
          time: interpTime,
          speed: convertSpeed(interpSpeed, appSettings.unit),
        };
      }
      return cp;
    });

    checkpointsRef.current = updatedCps;
    setCheckpoints(updatedCps);

    lastPointRef.current = currentPoint;

    // Auto Finish
    if (newCumulativeDistance >= targetDistance) {
      handleFinish();
    }
  };

  // Smooth timer counting up in 60 FPS once the run is active
  useEffect(() => {
    if (!isStarted) return;

    let active = true;
    const updateTimer = () => {
      if (!active) return;
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      setElapsedTime(elapsed);
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    };

    animationFrameRef.current = requestAnimationFrame(updateTimer);

    return () => {
      active = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isStarted]);

  // --- REAL SENSOR (GEOLOCATION WATCHPOSITION) ---
  useEffect(() => {
    setGpsAccuracy(null);

    const handleGPSError = (err: GeolocationPositionError) => {
      console.error('GPS tracking error', err);
    };

    // Begin active watch position
    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => handleGPSUpdate(pos),
        handleGPSError,
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        }
      );
      watchIdRef.current = id;
    } catch (e) {
      console.error('Failed to register watchPosition', e);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [targetDistance, appSettings.unit]);

  const getAccuracyQuality = (acc: number | null): { text: string; color: string } => {
    if (acc === null) return { text: 'MENCARI...', color: 'text-text-dim border-card-border bg-[#0d0e14]' };
    if (acc <= 5) return { text: 'EXCELLENT', color: 'text-[#00ff66] border-emerald-500/20 bg-emerald-950/20' };
    if (acc <= 10) return { text: 'GOOD', color: 'text-green-400 border-green-500/10 bg-green-950/10' };
    if (acc <= 20) return { text: 'FAIR', color: 'text-amber-400 border-amber-500/10 bg-amber-950/10' };
    return { text: 'POOR', color: 'text-red-500 border-red-500/20 bg-red-950/20' };
  };

  const displaySpeed = convertSpeed(speed, appSettings.unit);
  const percentComplete = Math.min(100, (distance / targetDistance) * 100);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-5 font-sans flex flex-col h-[calc(100vh-20px)] justify-between select-none">
      
      {/* COCKPIT HEADER */}
      <div>
        <div className="flex items-center justify-between border-b border-card-border pb-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
            <span className="font-orbitron text-xs font-black tracking-widest text-white">LIVE COCKPIT HUD</span>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black font-orbitron ${getAccuracyQuality(gpsAccuracy).color}`}>
              <span>GPS: {gpsAccuracy !== null ? `${gpsAccuracy.toFixed(1)}m` : '--'}</span>
              <span className="opacity-40">|</span>
              <span>{getAccuracyQuality(gpsAccuracy).text}</span>
            </div>
          </div>
        </div>

        {/* READY TO LAUNCH / TIMER BANNER */}
        {!isStarted && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded bg-brand-orange/10 border border-brand-orange/30 py-2.5 text-center px-4 animate-pulse">
            <Timer size={14} className="text-brand-orange shrink-0" />
            <span className="font-orbitron text-[10px] font-black uppercase tracking-wider text-brand-orange">
              {gpsAccuracy === null
                ? '📡 MENCARI SINYAL SENSOR GPS...'
                : gpsAccuracy > 20
                  ? '⚠️ GPS KURANG AKURAT - CARI AREA TERBUKA'
                  : gpsPointsForStartRef.current.length < 5
                    ? `📡 STABILISASI POSISI START (${gpsPointsForStartRef.current.length}/5 SAMPLES)...`
                    : '⏱️ STATUS READY - KENDARAAN DIAM (SIAP DIUJI)'}
            </span>
          </div>
        )}

        {isStarted && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded bg-emerald-950/20 border border-emerald-900/30 py-2.5 text-center px-4">
            <Zap size={14} className="text-[#00ff66] animate-bounce shrink-0" />
            <span className="font-orbitron text-[10px] font-black uppercase tracking-wider text-[#00ff66]">
              🚀 MEASUREMENT IN PROGRESS
            </span>
          </div>
        )}
      </div>

      {/* GIANT RACING METERS HUD */}
      <div className="my-4 py-2 space-y-6 flex-grow flex flex-col justify-center">
        
        {/* SPEED DISPLAY */}
        <div className="text-center relative">
          <span className="block text-[10px] font-bold tracking-widest text-text-dim uppercase font-orbitron">SPEED</span>
          <div className="flex items-baseline justify-center">
            <span className="font-orbitron text-7xl font-extrabold tracking-tighter text-white font-black">
              {displaySpeed.toFixed(1)}
            </span>
            <span className="ml-1.5 font-orbitron text-base font-black text-brand-orange">
              {appSettings.unit}
            </span>
          </div>
          {/* Real-time Top Speed Indicator */}
          <div className="mt-1 flex items-center justify-center gap-1 font-orbitron text-[10px] font-bold text-white uppercase tracking-wider">
            <span className="text-text-dim">TOP SPEED:</span>
            <span className="text-brand-orange font-black">
              {liveTopSpeed.toFixed(1)} {appSettings.unit}
            </span>
          </div>
        </div>

        {/* PROGRESS GRAPH BAR */}
        <div className="space-y-1">
          <div className="flex items-center justify-between font-orbitron text-[10px] font-black tracking-widest text-text-dim">
            <span>JARAK RUN: {distance.toFixed(1)}M</span>
            <span>TARGET: {targetDistance}M</span>
          </div>
          <div className="relative h-4 w-full rounded bg-[#12141d] border border-card-border overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-orange to-red-500 transition-all duration-75"
              style={{ width: `${percentComplete}%` }}
            ></div>
            {/* Checkpoint visual marks */}
            {checkpoints.map((cp) => {
              const pos = (cp.distance / targetDistance) * 100;
              if (pos >= 100) return null;
              return (
                <div
                  key={`progress-mark-${cp.distance}`}
                  className="absolute top-0 h-full w-[2px] bg-card-border"
                  style={{ left: `${pos}%` }}
                  title={`${cp.distance}m mark`}
                >
                  <span className="absolute -top-1 left-0 transform -translate-x-1/2 text-[7px] text-text-dim font-tech">
                    |
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* GPS DATA QUALITY STATUS GRID */}
        <div className="grid grid-cols-3 gap-2 bg-[#090a10] border border-card-border rounded-xl p-2.5 text-center shadow-inner">
          <div>
            <span className="block text-[8px] font-bold text-text-dim uppercase font-orbitron">GPS QUALITY</span>
            <span className={`text-[10px] font-black uppercase font-orbitron ${
              gpsAccuracy === null ? 'text-text-dim' : gpsAccuracy <= 5 ? 'text-[#00ff66]' : gpsAccuracy <= 10 ? 'text-green-400' : gpsAccuracy <= 20 ? 'text-amber-400' : 'text-red-500 animate-pulse'
            }`}>
              {gpsAccuracy === null ? 'LOCATING...' : gpsAccuracy <= 5 ? 'EXCELLENT' : gpsAccuracy <= 10 ? 'GOOD' : gpsAccuracy <= 20 ? 'FAIR' : 'POOR'}
            </span>
          </div>
          <div>
            <span className="block text-[8px] font-bold text-text-dim uppercase font-orbitron">ACCURACY</span>
            <span className="text-[10px] font-mono font-bold text-white">
              {gpsAccuracy !== null ? `${gpsAccuracy.toFixed(1)} m` : '-- m'}
            </span>
          </div>
          <div>
            <span className="block text-[8px] font-bold text-text-dim uppercase font-orbitron">CONFIDENCE</span>
            <span className={`text-[10px] font-black uppercase font-orbitron ${
              gpsAccuracy === null ? 'text-text-dim' : gpsAccuracy <= 6 ? 'text-[#00ff66]' : gpsAccuracy <= 12 ? 'text-amber-400' : 'text-red-500'
            }`}>
              {gpsAccuracy === null ? 'LOCATING...' : gpsAccuracy <= 6 ? 'HIGH' : gpsAccuracy <= 12 ? 'MEDIUM' : 'LOW'}
            </span>
          </div>
        </div>

        {/* TIME ELAPSED */}
        <div className="text-center bg-[#0d0e14] border border-card-border rounded-xl py-3 shadow">
          <span className="text-[10px] font-bold tracking-widest text-text-dim uppercase font-orbitron">ELAPSED TIME</span>
          <p className="font-orbitron text-4xl font-extrabold tracking-tight text-white mt-1">
            {formatTime(elapsedTime)}<span className="text-sm font-black text-[#00ff66] ml-0.5">S</span>
          </p>
        </div>

        {/* CHECKPOINTS AUTO TICKERS */}
        <div className="rounded-xl border border-card-border bg-card-bg p-4 space-y-2.5 shadow-md">
          <span className="block text-[9px] font-bold tracking-widest text-text-dim uppercase font-orbitron mb-1.5">
            REKOR CHECKPOINT TELEMETRY
          </span>
          <div className="grid grid-cols-2 gap-2">
            {checkpoints.map((cp, idx) => (
              <div
                key={`cp-row-${cp.distance}`}
                className={`flex items-center justify-between rounded border px-3 py-2 transition-all ${
                  cp.passed
                    ? 'border-[#00ff66]/20 bg-[#00ff66]/5'
                    : 'border-card-border bg-[#0d0e14]'
                }`}
              >
                <div>
                  <span className="font-orbitron text-xs font-black text-white">{cp.distance} M</span>
                </div>
                <div className="text-right">
                  {cp.passed ? (
                    <div className="flex flex-col items-end">
                      <span className="font-orbitron text-xs font-extrabold text-[#00ff66] font-black">
                        {cp.time.toFixed(2)} S
                      </span>
                      <span className="font-tech text-[8px] text-text-dim font-bold">
                        {cp.speed.toFixed(1)} {appSettings.unit}
                      </span>
                    </div>
                  ) : (
                    <span className="font-tech text-xs text-text-dim font-bold tracking-widest">
                      --.-- S
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CANCEL/STOP BUTTON */}
      <div>
        <button
          onClick={onCancel}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-950/40 border border-red-500/30 py-3.5 text-xs font-extrabold tracking-widest text-red-400 uppercase font-orbitron transition-all hover:bg-red-950/60 active:scale-[0.98]"
          id="btn-stop-run"
        >
          <Ban size={15} />
          BATALKAN PENGUJIAN (STOP)
        </button>
      </div>

    </div>
  );
};
