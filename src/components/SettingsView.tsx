import React, { useState, useEffect } from 'react';
import { VehicleSettings, AppSettings } from '../types';
import { Save, ShieldAlert, CheckCircle, Smartphone, Sliders, Navigation } from 'lucide-react';

interface SettingsViewProps {
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  // Load initial vehicle configuration
  const [vehicle, setVehicle] = useState<VehicleSettings>({
    name: '',
    weightMotor: undefined,
    weightRider: undefined,
    engineCC: undefined,
  });

  // Load initial app settings
  const [appSettings, setAppSettings] = useState<AppSettings>({
    unit: 'KMH',
    checkpoints: [60, 100, 201, 300, 400, 500],
    highAccuracy: true,
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Load from local storage
    const storedVehicle = localStorage.getItem('racebox_vehicle');
    const storedSettings = localStorage.getItem('racebox_settings');

    if (storedVehicle) {
      try {
        setVehicle(JSON.parse(storedVehicle));
      } catch (e) {
        console.error('Failed to parse vehicle configuration', e);
      }
    }

    if (storedSettings) {
      try {
        setAppSettings(JSON.parse(storedSettings));
      } catch (e) {
        console.error('Failed to parse app settings', e);
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate inputs
    if (!vehicle.name.trim()) {
      setErrorMsg('Nama kendaraan tidak boleh kosong');
      return;
    }
    if (vehicle.weightMotor === undefined || vehicle.weightMotor <= 0 || isNaN(vehicle.weightMotor)) {
      setErrorMsg('Berat kendaraan harus lebih dari 0');
      return;
    }
    if (vehicle.weightRider === undefined || vehicle.weightRider <= 0 || isNaN(vehicle.weightRider)) {
      setErrorMsg('Berat pengendara harus lebih dari 0');
      return;
    }
    if (vehicle.engineCC !== undefined && vehicle.engineCC !== null && (vehicle.engineCC <= 0 || isNaN(vehicle.engineCC))) {
      setErrorMsg('Kapasitas mesin (CC) harus lebih dari 0');
      return;
    }
    if (appSettings.checkpoints.length === 0) {
      setErrorMsg('Pilih minimal satu checkpoint untuk pengukuran');
      return;
    }

    try {
      localStorage.setItem('racebox_vehicle', JSON.stringify(vehicle));
      localStorage.setItem('racebox_settings', JSON.stringify(appSettings));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setErrorMsg('LocalStorage penuh atau tidak tersedia!');
      console.error(e);
    }
  };

  const handleCheckpointToggle = (distance: number) => {
    setAppSettings((prev) => {
      let updatedCheckpoints = [...prev.checkpoints];
      if (updatedCheckpoints.includes(distance)) {
        // Prevent removal if it's the last checkpoint
        updatedCheckpoints = updatedCheckpoints.filter((cp) => cp !== distance);
      } else {
        updatedCheckpoints.push(distance);
      }
      // Sort checkpoints ascending
      updatedCheckpoints.sort((a, b) => a - b);
      return { ...prev, checkpoints: updatedCheckpoints };
    });
  };

  const availableCheckpoints = [60, 100, 201, 300, 400, 500];

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 bg-brand-orange"></span>
          <h2 className="text-xl font-bold tracking-wider font-orbitron uppercase">SETTING</h2>
        </div>
        <button
          onClick={onBack}
          className="rounded border border-card-border bg-card-bg px-4 py-1.5 text-xs font-bold uppercase tracking-wider font-orbitron hover:border-brand-orange hover:text-white transition-colors"
          id="btn-settings-back"
        >
          KEMBALI
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* VEHICLE CONFIGURATION */}
        <div className="rounded-xl border border-card-border bg-card-bg p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-brand-orange to-red-600"></div>
          <div className="mb-4 flex items-center gap-2 text-brand-orange">
            <Smartphone size={16} />
            <h3 className="text-xs font-bold tracking-widest font-orbitron uppercase">KENDARAAN (VEHICLE)</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold tracking-widest text-text-dim uppercase font-orbitron">
                NAMA MOTOR / MOBIL
              </label>
              <input
                type="text"
                value={vehicle.name}
                onChange={(e) => setVehicle({ ...vehicle, name: e.target.value })}
                className="w-full rounded border border-card-border bg-[#0d0e14] px-3 py-2 text-sm text-white font-mono font-bold uppercase tracking-wider focus:border-brand-orange focus:outline-none transition-colors"
                placeholder="Masukkan nama kendaraan"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold tracking-widest text-text-dim uppercase font-orbitron">
                KAPASITAS MESIN (CC)
              </label>
              <input
                type="number"
                value={vehicle.engineCC !== undefined && vehicle.engineCC !== null ? vehicle.engineCC : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setVehicle({ ...vehicle, engineCC: val === '' ? undefined : parseFloat(val) });
                }}
                className="w-full rounded border border-card-border bg-[#0d0e14] px-3 py-2 text-sm text-white font-mono font-bold focus:border-brand-orange focus:outline-none transition-colors"
                placeholder="Masukkan kapasitas mesin (CC)"
                min="1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-widest text-text-dim uppercase font-orbitron">
                  BERAT MOTOR (KG)
                </label>
                <input
                  type="number"
                  value={vehicle.weightMotor !== undefined && vehicle.weightMotor !== null ? vehicle.weightMotor : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVehicle({ ...vehicle, weightMotor: val === '' ? undefined : parseFloat(val) });
                  }}
                  className="w-full rounded border border-card-border bg-[#0d0e14] px-3 py-2 text-sm text-white font-mono font-bold focus:border-brand-orange focus:outline-none transition-colors"
                  placeholder="Masukkan berat kendaraan"
                  min="1"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-widest text-text-dim uppercase font-orbitron">
                  BERAT RIDER (KG)
                </label>
                <input
                  type="number"
                  value={vehicle.weightRider !== undefined && vehicle.weightRider !== null ? vehicle.weightRider : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVehicle({ ...vehicle, weightRider: val === '' ? undefined : parseFloat(val) });
                  }}
                  className="w-full rounded border border-card-border bg-[#0d0e14] px-3 py-2 text-sm text-white font-mono font-bold focus:border-brand-orange focus:outline-none transition-colors"
                  placeholder="Masukkan berat pengendara"
                  min="1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SATUAN & UNIT CONFIGURATION */}
        <div className="rounded-xl border border-card-border bg-card-bg p-5 shadow-lg">
          <div className="mb-4 flex items-center gap-2 text-[#00ff66]">
            <Sliders size={16} />
            <h3 className="text-xs font-bold tracking-widest font-orbitron uppercase">SATUAN KECEPATAN (UNIT)</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAppSettings({ ...appSettings, unit: 'KMH' })}
              className={`rounded py-2.5 text-xs font-bold uppercase tracking-widest font-orbitron transition-all border ${
                appSettings.unit === 'KMH'
                  ? 'bg-gradient-to-r from-[#00cc55] to-[#00ff66] text-black border-transparent shadow-md font-extrabold'
                  : 'bg-[#0d0e14] border-card-border text-text-dim hover:text-white'
              }`}
            >
              KM/H
            </button>
            <button
              type="button"
              onClick={() => setAppSettings({ ...appSettings, unit: 'MPH' })}
              className={`rounded py-2.5 text-xs font-bold uppercase tracking-widest font-orbitron transition-all border ${
                appSettings.unit === 'MPH'
                  ? 'bg-gradient-to-r from-[#00cc55] to-[#00ff66] text-black border-transparent shadow-md font-extrabold'
                  : 'bg-[#0d0e14] border-card-border text-text-dim hover:text-white'
              }`}
            >
              MPH
            </button>
          </div>
        </div>

        {/* CHECKPOINT CONFIGURATION */}
        <div className="rounded-xl border border-card-border bg-card-bg p-5 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-orange">
              <span className="h-1 w-3 bg-brand-orange"></span>
              <h3 className="text-xs font-bold tracking-widest font-orbitron uppercase">CHECKPOINT AKTIF</h3>
            </div>
            <span className="text-[9px] font-tech text-text-dim uppercase tracking-wider">300M & 400M OPSIONAL</span>
          </div>

          <p className="mb-4 text-[11px] leading-relaxed text-text-dim">
            Checkpoint ini akan dihitung secara otomatis saat drag berlangsung berdasarkan koordinat GPS Anda.
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {availableCheckpoints.map((cp) => {
              const isActive = appSettings.checkpoints.includes(cp);
              const isOptional = cp === 300 || cp === 400;
              return (
                <button
                  type="button"
                  key={`cp-setting-${cp}`}
                  onClick={() => handleCheckpointToggle(cp)}
                  className={`flex flex-col items-center justify-center rounded border p-3 font-orbitron transition-all ${
                    isActive
                      ? 'border-brand-orange bg-brand-orange/10 text-white shadow-sm'
                      : 'border-card-border bg-[#0d0e14] text-text-dim hover:text-white'
                  }`}
                >
                  <span className="text-sm font-black tracking-tighter">{cp}M</span>
                  <span className="mt-1 text-[8px] tracking-wider uppercase opacity-80">
                    {isActive ? 'AKTIF ✓' : isOptional ? 'OFF' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* GPS HARDWARE CONFIGURATION */}
        <div className="rounded-xl border border-card-border bg-card-bg p-5 shadow-lg">
          <div className="mb-4 flex items-center gap-2 text-brand-orange">
            <Navigation size={16} />
            <h3 className="text-xs font-bold tracking-widest font-orbitron uppercase">GEOLOCATION HARDWARE</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide font-orbitron text-white">HIGH ACCURACY (GPS)</h4>
              <p className="mt-0.5 text-[10px] text-text-dim">
                Gunakan asisten sensor GPS HP dengan akurasi tinggi (disarankan aktif).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAppSettings({ ...appSettings, highAccuracy: !appSettings.highAccuracy })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                appSettings.highAccuracy ? 'bg-[#00ff66]' : 'bg-[#1e2230]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  appSettings.highAccuracy ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* FEEDBACK & SAVE ACTION */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-900/50 bg-red-950/20 p-3.5 text-xs text-red-400">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3.5 text-xs text-emerald-400">
            <CheckCircle size={16} className="shrink-0" />
            <span>Pengaturan berhasil disimpan ke LocalStorage!</span>
          </div>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-orange to-red-600 py-3 text-sm font-black tracking-widest text-white uppercase font-orbitron shadow-lg shadow-brand-orange/15 hover:brightness-110 active:scale-[0.99] transition-all"
          id="btn-settings-save"
        >
          <Save size={16} />
          SIMPAN PENGATURAN
        </button>
      </form>
    </div>
  );
};
