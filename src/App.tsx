import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DragSetup } from './components/DragSetup';
import { LiveDrag } from './components/LiveDrag';
import { RunComplete } from './components/RunComplete';
import { HistoryList } from './components/HistoryList';
import { SettingsView } from './components/SettingsView';
import { AppSettings, VehicleSettings, RaceHistoryEntry } from './types';
import { Flame, Clock, Settings as SettingsIcon, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';

type ScreenState = 'HOME' | 'DRAG_SETUP' | 'LIVE_DRAG' | 'RUN_COMPLETE' | 'HISTORY' | 'SETTING';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('HOME');
  
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('racebox_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('racebox_theme', theme);
  }, [theme]);

  // Settings and vehicle profiles states
  const [vehicle, setVehicle] = useState<VehicleSettings>({
    name: '',
    weightMotor: undefined,
    weightRider: undefined,
    engineCC: undefined,
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    unit: 'KMH',
    checkpoints: [60, 100, 201, 300, 400, 500],
    highAccuracy: true,
  });

  // Track run settings
  const [selectedTarget, setSelectedTarget] = useState<number>(201);
  const [latestRunResult, setLatestRunResult] = useState<RaceHistoryEntry | null>(null);

  // Initialize and load configurations
  useEffect(() => {
    const storedVehicle = localStorage.getItem('racebox_vehicle');
    const storedSettings = localStorage.getItem('racebox_settings');

    if (storedVehicle) {
      try {
        setVehicle(JSON.parse(storedVehicle));
      } catch (e) {
        console.error('Error parsing stored vehicle', e);
      }
    } else {
      // Seed default empty vehicle as requested to keep the app clean on first use
      const emptyVehicle = {
        name: '',
        weightMotor: undefined,
        weightRider: undefined,
        engineCC: undefined,
      };
      setVehicle(emptyVehicle);
      localStorage.setItem('racebox_vehicle', JSON.stringify(emptyVehicle));
    }

    if (storedSettings) {
      try {
        setAppSettings(JSON.parse(storedSettings));
      } catch (e) {
        console.error('Error parsing stored settings', e);
      }
    } else {
      // Seed default
      localStorage.setItem('racebox_settings', JSON.stringify(appSettings));
    }
  }, []);

  // Sync state whenever settings change globally
  const refreshConfigurations = () => {
    const storedVehicle = localStorage.getItem('racebox_vehicle');
    const storedSettings = localStorage.getItem('racebox_settings');
    if (storedVehicle) setVehicle(JSON.parse(storedVehicle));
    if (storedSettings) setAppSettings(JSON.parse(storedSettings));
  };

  const handleStartRun = (target: number) => {
    setSelectedTarget(target);
    setCurrentScreen('LIVE_DRAG');
  };

  const handleFinishRun = (result: RaceHistoryEntry) => {
    setLatestRunResult(result);
    setCurrentScreen('RUN_COMPLETE');
  };

  const handleNavigate = (screen: ScreenState) => {
    refreshConfigurations();
    setCurrentScreen(screen);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-[var(--text-main)] flex flex-col antialiased">
      <main className="flex-grow flex flex-col justify-start max-w-lg mx-auto w-full relative">
        
        {/* State Route Rendering */}
        {currentScreen === 'HOME' && (
          <div className="flex flex-col h-full animate-fadeIn px-4 pb-12">
            <Header theme={theme} setTheme={setTheme} />

            {/* INTRO SPECS SUMMARY */}
            <div className="mt-5 rounded-xl border border-card-border bg-card-bg p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase text-text-dim tracking-widest font-orbitron">KENDARAAN</p>
                  <p className="text-xs font-black uppercase text-white tracking-wide font-orbitron">
                    {vehicle.name || 'BELUM DIATUR'} {vehicle.engineCC ? `(${vehicle.engineCC} CC)` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right border-l border-card-border/60 pl-4">
                <p className="text-[10px] font-bold uppercase text-text-dim tracking-widest font-orbitron">SATUAN</p>
                <p className="text-xs font-black text-[#00ff66] font-orbitron uppercase tracking-widest">{appSettings.unit}</p>
              </div>
            </div>

            {/* THREE LARGE NAVIGATION TILES */}
            <div className="mt-6 space-y-4">
              
              {/* CARD 1: DRAG METER */}
              <button
                onClick={() => handleNavigate('DRAG_SETUP')}
                className="group w-full rounded-2xl border border-card-border bg-card-bg p-6 text-left shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange hover:shadow-brand-orange/5 relative overflow-hidden"
                id="menu-drag-meter"
              >
                <div className="absolute top-0 left-0 h-full w-1.5 bg-brand-orange transition-all duration-300 group-hover:w-2"></div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏁</span>
                      <h3 className="font-orbitron text-base font-black tracking-wider text-white uppercase">
                        DRAG METER
                      </h3>
                    </div>
                    <p className="text-xs text-text-dim leading-normal max-w-[240px]">
                      Mulai pengukuran waktu akselerasi kendaraan baru secara realtime.
                    </p>
                  </div>
                  <div className="rounded-full bg-[#1c2030] p-3 text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-all">
                    <Flame size={18} fill="currentColor" />
                  </div>
                </div>
              </button>

              {/* CARD 2: HISTORY */}
              <button
                onClick={() => handleNavigate('HISTORY')}
                className="group w-full rounded-2xl border border-card-border bg-card-bg p-6 text-left shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00ff66] hover:shadow-emerald-950/5 relative overflow-hidden"
                id="menu-history"
              >
                <div className="absolute top-0 left-0 h-full w-1.5 bg-[#00ff66] transition-all duration-300 group-hover:w-2"></div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🕘</span>
                      <h3 className="font-orbitron text-base font-black tracking-wider text-white uppercase">
                        HISTORY LOGS
                      </h3>
                    </div>
                    <p className="text-xs text-text-dim leading-normal max-w-[240px]">
                      Lihat hasil pengujian terdahulu lengkap dengan analisis kurva grafik.
                    </p>
                  </div>
                  <div className="rounded-full bg-[#1c2030] p-3 text-[#00ff66] group-hover:bg-[#00ff66] group-hover:text-black transition-all">
                    <Clock size={18} />
                  </div>
                </div>
              </button>

              {/* CARD 3: SETTING */}
              <button
                onClick={() => handleNavigate('SETTING')}
                className="group w-full rounded-2xl border border-card-border bg-card-bg p-6 text-left shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-500 relative overflow-hidden"
                id="menu-setting"
              >
                <div className="absolute top-0 left-0 h-full w-1.5 bg-text-dim transition-all duration-300 group-hover:bg-white group-hover:w-2"></div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚙️</span>
                      <h3 className="font-orbitron text-base font-black tracking-wider text-white uppercase">
                        SETTING
                      </h3>
                    </div>
                    <p className="text-xs text-text-dim leading-normal max-w-[240px]">
                      Konfigurasi profil berat kendaraan, satuan, dan checkpoint.
                    </p>
                  </div>
                  <div className="rounded-full bg-[#1c2030] p-3 text-text-dim group-hover:bg-white group-hover:text-black transition-all">
                    <SettingsIcon size={18} />
                  </div>
                </div>
              </button>

            </div>

            {/* NOTIFICATION STICKER DISCLAIMER */}
            <div className="mt-8 rounded-xl border border-card-border bg-[#0d0e14] p-4 space-y-2">
              <div className="flex items-center gap-2 text-brand-orange">
                <AlertTriangle size={15} />
                <span className="font-orbitron text-[10px] font-black tracking-wider uppercase">NOTIFIKASI AKURASI</span>
              </div>
              <p className="text-[11px] leading-relaxed text-text-dim">
                Akurasi data sangat bergantung pada kualitas chipset sensor GPS Geolocation HP Anda. Gunakan di luar ruangan dengan langit cerah untuk hasil terbaik.
              </p>
            </div>

            {/* APP FOOTER */}
            <div className="mt-auto pt-8 text-center text-[10px] text-text-dim uppercase tracking-widest font-tech font-bold opacity-50">
              RACEBOX Telemetry App © 2026
            </div>
          </div>
        )}

        {currentScreen === 'DRAG_SETUP' && (
          <DragSetup
            appSettings={appSettings}
            vehicle={vehicle}
            onBack={() => handleNavigate('HOME')}
            onStartRun={handleStartRun}
          />
        )}

        {currentScreen === 'LIVE_DRAG' && (
          <LiveDrag
            targetDistance={selectedTarget}
            appSettings={appSettings}
            vehicle={vehicle}
            onCancel={() => handleNavigate('DRAG_SETUP')}
            onFinishRun={handleFinishRun}
          />
        )}

        {currentScreen === 'RUN_COMPLETE' && latestRunResult && (
          <RunComplete
            runData={latestRunResult}
            onRunAgain={() => handleNavigate('DRAG_SETUP')}
            onGoToHistory={() => handleNavigate('HISTORY')}
          />
        )}

        {currentScreen === 'HISTORY' && (
          <HistoryList onBack={() => handleNavigate('HOME')} />
        )}

        {currentScreen === 'SETTING' && (
          <SettingsView onBack={() => handleNavigate('HOME')} />
        )}

      </main>
    </div>
  );
}
