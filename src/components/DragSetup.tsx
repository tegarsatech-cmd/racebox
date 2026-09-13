import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, VehicleSettings } from '../types';
import { Navigation, Play, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { convertSpeed } from '../utils';

interface DragSetupProps {
  appSettings: AppSettings;
  vehicle: VehicleSettings;
  onBack: () => void;
  onStartRun: (targetDistance: number) => void;
}

export const DragSetup: React.FC<DragSetupProps> = ({
  appSettings,
  vehicle,
  onBack,
  onStartRun,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<number>(201);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'connected' | 'ready' | 'error' | 'denied'>('searching');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0); // in m/s
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Auto-calculated checkpoints based on target and settings
  const getActiveCheckpoints = (target: number): number[] => {
    let list: number[] = [];
    if (target === 60) list = [60];
    else if (target === 100) list = [60, 100];
    else if (target === 201) list = [60, 100, 201];
    else if (target === 500) list = [60, 100, 201, 300, 400, 500];
    else list = [target];

    // Filter checkpoints against settings
    return list.filter((cp) => appSettings.checkpoints.includes(cp) || cp === target);
  };

  const activeCheckpoints = getActiveCheckpoints(selectedTarget);

  useEffect(() => {
    setGpsStatus('searching');
    setErrorMsg(null);

    if (!('geolocation' in navigator)) {
      setGpsStatus('error');
      setErrorMsg('Perangkat Anda tidak mendukung sensor GPS Geolocation.');
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const acc = position.coords.accuracy;
      const speed = position.coords.speed || 0; // m/s or null

      setAccuracy(acc);
      setCurrentSpeed(speed);

      // A good GPS telemetry considers accuracy under 10 meters as connected, under 5 meters as ready
      if (acc > 25) {
        setGpsStatus('connected'); // connected but bad accuracy
        setErrorMsg('Akurasi GPS buruk (> 25m). Cari tempat lapang terbuka.');
      } else if (acc > 8) {
        setGpsStatus('connected'); // connected
        setErrorMsg(null);
      } else {
        setGpsStatus('ready'); // ready for action
        setErrorMsg(null);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('GPS Watch error', error);
      if (error.code === error.PERMISSION_DENIED) {
        setGpsStatus('denied');
        setErrorMsg('Izin akses lokasi ditolak. Silakan aktifkan izin lokasi di browser Anda untuk menggunakan Drag Meter.');
      } else {
        setGpsStatus('error');
        setErrorMsg(`Sensor GPS Error: ${error.message}. Coba segarkan halaman.`);
      }
    };

    // Watch position
    try {
      const id = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: appSettings.highAccuracy,
        maximumAge: 0,
        timeout: 10000,
      });
      watchIdRef.current = id;
    } catch (e: any) {
      setGpsStatus('error');
      setErrorMsg(`Gagal memulai GPS: ${e.message}`);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [appSettings.highAccuracy]);

  const handleStart = () => {
    // Only block if GPS is in error/denied state
    if (gpsStatus === 'error' || gpsStatus === 'denied') {
      alert('Tidak bisa memulai: GPS tidak aktif atau izin ditolak.');
      return;
    }

    // Clear watcher so LiveDrag can start its own
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    onStartRun(selectedTarget);
  };

  const getStatusColor = () => {
    switch (gpsStatus) {
      case 'ready':
        return 'bg-emerald-500 text-emerald-500';
      case 'connected':
        return 'bg-amber-500 text-amber-500';
      case 'searching':
        return 'bg-blue-500 text-blue-500 animate-pulse';
      case 'error':
      case 'denied':
      default:
        return 'bg-red-500 text-red-500';
    }
  };

  const getStatusText = () => {
    switch (gpsStatus) {
      case 'ready':
        return 'GPS ● READY';
      case 'connected':
        return 'GPS ● CONNECTED (AKURASI RENDAH)';
      case 'searching':
        return 'GPS ● SEARCHING SENSOR...';
      case 'denied':
        return 'GPS ● PERMISSION DENIED';
      case 'error':
      default:
        return 'GPS ● ERROR';
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 bg-brand-orange animate-pulse"></span>
          <h2 className="text-xl font-bold tracking-wider font-orbitron uppercase">DRAG SETUP</h2>
        </div>
        <button
          onClick={onBack}
          className="rounded border border-card-border bg-card-bg px-4 py-1.5 text-xs font-bold uppercase tracking-wider font-orbitron hover:border-brand-orange hover:text-white transition-colors"
          id="btn-drag-setup-back"
        >
          KEMBALI
        </button>
      </div>

      {/* VEHICLE BANNER */}
      <div className="mb-5 rounded-lg border border-card-border bg-[#0d0e14] px-4 py-2.5 flex items-center justify-between">
        <div>
          <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest font-orbitron">KENDARAAN AKTIF</span>
          <p className="text-sm font-bold text-[#00ff66] font-orbitron uppercase tracking-wide">
            {vehicle.name || 'BELUM DIATUR'} {vehicle.engineCC ? `(${vehicle.engineCC} CC)` : ''}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest font-orbitron font-tech">TOTAL BERAT</span>
          <p className="text-xs font-mono font-bold text-white">
            {((vehicle.weightMotor || 0) + (vehicle.weightRider || 0)) > 0 
              ? `${(vehicle.weightMotor || 0) + (vehicle.weightRider || 0)} kg` 
              : 'Belum diatur'}
          </p>
        </div>
      </div>

      {/* TARGET ACCURACY CARDS */}
      <div className="mb-6 space-y-4">
        <div className="rounded-xl border border-card-border bg-card-bg p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-widest text-text-dim uppercase font-orbitron">PILIH JARAK FINISH</h3>
            <span className="rounded bg-brand-orange/10 px-2 py-0.5 text-[9px] font-bold text-brand-orange font-orbitron uppercase tracking-wider">
              TARGET UTAMA
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[60, 100, 201, 500].map((distance) => (
              <button
                key={`distance-${distance}`}
                onClick={() => setSelectedTarget(distance)}
                className={`flex flex-col items-center justify-center rounded-lg border py-3.5 transition-all ${
                  selectedTarget === distance
                    ? 'border-brand-orange bg-brand-orange/10 text-white shadow'
                    : 'border-card-border bg-[#0d0e14] text-text-dim hover:text-white'
                }`}
                id={`btn-target-${distance}`}
              >
                <span className="font-orbitron text-base font-black tracking-tighter">{distance}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider font-orbitron">METER</span>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded border border-[#1e2230] bg-[#0d0e14] p-3">
            <span className="text-[9px] font-bold tracking-widest text-text-dim uppercase font-orbitron block mb-1.5">
              CHECKPOINT OTOMATIS:
            </span>
            <div className="flex flex-wrap gap-2">
              {activeCheckpoints.map((cp) => (
                <span
                  key={`setup-cp-${cp}`}
                  className={`rounded px-2.5 py-1 text-xs font-tech font-bold ${
                    cp === selectedTarget
                      ? 'bg-brand-orange text-white'
                      : 'bg-card-border text-[#00ff66]'
                  }`}
                >
                  {cp} Meter
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* GPS LIVE DIAGNOSTICS */}
        <div className="rounded-xl border border-card-border bg-card-bg p-5 shadow-md relative overflow-hidden">
          <div className="mb-4 flex items-center gap-2">
            <Navigation size={15} className="text-brand-orange" />
            <h3 className="text-xs font-bold tracking-widest text-text-dim uppercase font-orbitron">DIAGNOSIS GPS GEOLOCATION</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* STATUS DIAGNOSTIC */}
            <div className="rounded border border-card-border bg-[#0d0e14] p-3 text-center">
              <span className="text-[8px] font-bold text-text-dim uppercase tracking-wider block mb-1">STATUS</span>
              <div className="flex items-center justify-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${gpsStatus === 'ready' ? 'bg-[#00ff66] neon-glow-green' : gpsStatus === 'connected' ? 'bg-amber-400' : 'bg-red-500'}`}></span>
                <span className="font-orbitron text-[10px] font-extrabold uppercase tracking-tighter text-white">
                  {gpsStatus === 'ready' ? 'READY' : gpsStatus === 'connected' ? 'CONNECTED' : gpsStatus === 'searching' ? 'SEARCHING' : 'OFFLINE'}
                </span>
              </div>
            </div>

            {/* ACCURACY DIAGNOSTIC */}
            <div className="rounded border border-card-border bg-[#0d0e14] p-3 text-center">
              <span className="text-[8px] font-bold text-text-dim uppercase tracking-wider block mb-1">ACCURACY</span>
              <p className="font-tech text-sm font-bold text-white">
                {accuracy !== null ? `${accuracy.toFixed(1)} m` : '--.- m'}
              </p>
            </div>

            {/* CURRENT SPEED DIAGNOSTIC */}
            <div className="rounded border border-card-border bg-[#0d0e14] p-3 text-center">
              <span className="text-[8px] font-bold text-text-dim uppercase tracking-wider block mb-1">LIVE SPEED</span>
              <p className="font-tech text-sm font-bold text-white">
                {convertSpeed(currentSpeed, appSettings.unit).toFixed(1)} {appSettings.unit}
              </p>
            </div>
          </div>

          {/* WARNING & INFO */}
          {errorMsg && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-900/50 bg-red-950/10 p-3 text-xs text-red-400 leading-normal">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!errorMsg && gpsStatus === 'searching' && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-dim font-tech py-1.5">
              <RefreshCw size={12} className="animate-spin text-brand-orange" />
              <span>Menunggu sinyal akurasi tinggi Geolocation...</span>
            </div>
          )}

          {!errorMsg && gpsStatus === 'ready' && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-900/50 bg-emerald-950/10 p-3 text-xs text-emerald-400">
              <CheckCircle2 size={15} className="shrink-0 text-[#00ff66]" />
              <div>
                <span className="font-bold">GPS AKURASI TINGGI TERHUBUNG</span>
                <p className="mt-0.5 text-[10px] text-emerald-400/80 leading-normal">
                  Sinyal sangat baik ({accuracy?.toFixed(1)}m). Bersiap di garis start, lalu tekan tombol MULAI.
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-card-border pt-3 text-center">
            <span className="text-[8px] tracking-wide text-text-dim uppercase">
              * Aplikasi ini memerlukan langit terbuka untuk performa GPS Geolocation maksimal.
            </span>
          </div>
        </div>
      </div>

      {/* START RUN BUTTON */}
      <button
        onClick={handleStart}
        className={`flex w-full items-center justify-center gap-2.5 rounded-xl py-4 text-base font-black tracking-widest text-white uppercase font-orbitron shadow-lg transition-all active:scale-[0.98] ${
          gpsStatus === 'ready' || gpsStatus === 'connected'
            ? 'bg-gradient-to-r from-brand-orange to-red-600 shadow-brand-orange/20 cursor-pointer hover:brightness-110'
            : 'bg-[#1e2230] border border-card-border text-text-dim cursor-not-allowed opacity-65'
        }`}
        id="btn-start-run"
      >
        <Play size={18} fill="currentColor" />
        🏁 MULAI PENGUJIAN
      </button>
    </div>
  );
};
