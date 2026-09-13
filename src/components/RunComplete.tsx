import React, { useState } from 'react';
import { RaceHistoryEntry } from '../types';
import { MotorsportChart } from './MotorsportChart';
import { BarChart3, Save, RotateCcw, CheckCircle2, ShieldAlert, Check, X } from 'lucide-react';

interface RunCompleteProps {
  runData: RaceHistoryEntry;
  onRunAgain: () => void;
  onGoToHistory: () => void;
}

export const RunComplete: React.FC<RunCompleteProps> = ({
  runData,
  onRunAgain,
  onGoToHistory,
}) => {
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveResult = () => {
    if (isSaved) return;

    try {
      // Load current history from LocalStorage
      const existingHistoryStr = localStorage.getItem('racebox_history');
      let historyArray: RaceHistoryEntry[] = [];
      
      if (existingHistoryStr) {
        try {
          historyArray = JSON.parse(existingHistoryStr);
        } catch (e) {
          console.error('Failed to parse existing history', e);
        }
      }

      // Add new run to head of history list
      historyArray.unshift(runData);

      // Save back to LocalStorage
      localStorage.setItem('racebox_history', JSON.stringify(historyArray));
      
      setIsSaved(true);
      setErrorMsg(null);
    } catch (e) {
      console.error('LocalStorage write error', e);
      setErrorMsg('Gagal menyimpan hasil: Memori penyimpanan penuh/error.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 font-sans">
      
      {/* HEADER HERO ACCENT */}
      <div className="mb-6 text-center">
        <span className="inline-block rounded-full bg-brand-orange/15 px-4 py-1 text-xs font-black tracking-widest text-brand-orange font-orbitron uppercase border border-brand-orange/20 animate-bounce">
          🏆 RUN COMPLETE
        </span>
        <h2 className="mt-2 text-3xl font-black tracking-tighter text-white font-orbitron">Podium Report</h2>
        <p className="text-xs text-text-dim font-tech mt-1">{runData.date}</p>
      </div>

      {/* BASIC DETAILS BLOCK */}
      <div className="mb-5 rounded-xl border border-card-border bg-card-bg p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-brand-orange to-[#00ff66]"></div>
        
        <div className="mb-4 flex items-center justify-between border-b border-card-border pb-3">
          <div>
            <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest font-orbitron">KENDARAAN</span>
            <p className="text-base font-black text-white font-orbitron uppercase tracking-wide">
              {runData.vehicleName} {runData.engineCC ? `(${runData.engineCC} CC)` : ''}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest font-orbitron">TARGET DISTANCE</span>
            <p className="font-orbitron text-base font-extrabold text-[#00ff66]">{runData.targetDistance} M</p>
          </div>
        </div>

        {/* GPS ACCURACY & DATA QUALITY INFO */}
        <div className="mb-4 grid grid-cols-2 gap-3 border-b border-card-border pb-3">
          <div>
            <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest font-orbitron block">GPS ACCURACY (AVG)</span>
            <p className="text-xs font-mono font-bold text-white">
              {runData.gpsAccuracyAvg !== undefined ? `${runData.gpsAccuracyAvg.toFixed(1)} m` : '-- m'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest font-orbitron block">DATA QUALITY</span>
            <p className={`text-xs font-black uppercase font-orbitron ${
              runData.dataQuality === 'HIGH' ? 'text-[#00ff66]' : runData.dataQuality === 'MEDIUM' ? 'text-amber-400' : 'text-red-500 animate-pulse'
            }`}>
              {runData.dataQuality || 'LOW'}
            </p>
          </div>
        </div>

        {/* HERO TIME DISPLAY */}
        <div className="mb-4 text-center bg-[#0d0e14] border border-card-border rounded-xl py-4 shadow-inner relative overflow-hidden">
          <span className="text-[10px] font-bold tracking-widest text-text-dim uppercase font-orbitron">ELAPSED TIME (WAKTU UTAMA)</span>
          <p className="font-orbitron text-5xl font-extrabold tracking-tight text-[#00ff66] mt-1.5 font-black">
            {runData.totalTime.toFixed(2)}<span className="text-xl font-black text-[#00ff66] ml-0.5">S</span>
          </p>
        </div>

        {/* TOP SPEED & AVG SPEED GRID */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-card-border bg-[#0d0e14] p-3 text-center">
            <span className="text-[8px] font-bold text-text-dim uppercase tracking-wider block mb-1 font-orbitron">TOP SPEED</span>
            <p className="font-orbitron text-xl font-black text-white">
              {runData.topSpeed.toFixed(1)} <span className="text-[10px] font-black text-brand-orange">{runData.unit}</span>
            </p>
          </div>

          <div className="rounded-xl border border-card-border bg-[#0d0e14] p-3 text-center">
            <span className="text-[8px] font-bold text-text-dim uppercase tracking-wider block mb-1 font-orbitron">AVG SPEED</span>
            <p className="font-orbitron text-xl font-black text-white">
              {runData.averageSpeed.toFixed(1)} <span className="text-[10px] font-black text-brand-orange">{runData.unit}</span>
            </p>
          </div>
        </div>
      </div>

      {/* CHECKPOINTS LIST TABLE */}
      <div className="mb-5 rounded-xl border border-card-border bg-card-bg p-5 shadow-lg">
        <h3 className="mb-3 text-xs font-bold tracking-widest text-text-dim uppercase font-orbitron">
          REKOR CHECKPOINT DRAG
        </h3>

        <div className="space-y-2">
          {runData.checkpoints.map((cp) => (
            <div
              key={`result-cp-${cp.distance}`}
              className="flex items-center justify-between border-b border-card-border/60 pb-2.5 last:border-0 last:pb-0 font-mono text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00ff66]"></span>
                <span className="font-bold text-white font-orbitron text-xs">{cp.distance} Meter</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-extrabold text-[#00ff66] font-orbitron text-sm">
                  {cp.time.toFixed(2)} S
                </span>
                <span className="text-xs text-text-dim min-w-[70px] text-right font-tech">
                  {cp.speed.toFixed(1)} {runData.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHARTS GRAPH COMPONENT */}
      <div className="space-y-4 animate-fadeIn mb-6">
        <MotorsportChart gpsTrack={runData.gpsTrack} unit={runData.unit} type="distance" />
        <MotorsportChart gpsTrack={runData.gpsTrack} unit={runData.unit} type="time" />
      </div>

      {/* TOAST NOTIFICATIONS */}
      {runData.dataQuality === 'LOW' && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-900/40 bg-red-950/20 p-3.5 text-xs text-red-400 font-sans">
          <ShieldAlert size={16} className="shrink-0 mt-0.5 text-red-500 animate-pulse" />
          <span>Hasil kurang optimal karena kualitas GPS rendah.</span>
        </div>
      )}

      {isSaved && (
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3.5 text-xs text-emerald-400 font-sans">
          <CheckCircle2 size={16} className="shrink-0 text-[#00ff66]" />
          <span>Hasil pengujian berhasil disimpan ke LocalStorage!</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-900/50 bg-red-950/20 p-3.5 text-xs text-red-400 font-sans">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ACTION CONTROLS UNDER CHARTS */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {/* Ulangi */}
        <button
          onClick={onRunAgain}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-card-border bg-card-bg py-3 text-xs font-black uppercase tracking-wider font-orbitron text-text-dim hover:text-white hover:border-brand-orange transition-all shadow-md cursor-pointer"
          id="btn-run-again"
        >
          <RotateCcw size={16} className="text-brand-orange" />
          <span>Ulangi</span>
        </button>

        {/* Simpan */}
        <button
          onClick={handleSaveResult}
          disabled={isSaved}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 text-xs font-black uppercase tracking-wider font-orbitron transition-all shadow-md ${
            isSaved
              ? 'border-emerald-600 bg-emerald-950/20 text-emerald-400 cursor-not-allowed'
              : 'border-brand-orange bg-brand-orange/10 text-white hover:bg-brand-orange/20 cursor-pointer'
          }`}
          id="btn-save-run"
        >
          {isSaved ? <Check size={16} className="text-[#00ff66]" /> : <Save size={16} className="text-brand-orange" />}
          <span>{isSaved ? 'Tersimpan' : 'Simpan'}</span>
        </button>

        {/* Keluar */}
        <button
          onClick={onGoToHistory}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-card-border bg-card-bg py-3 text-xs font-black uppercase tracking-wider font-orbitron text-text-dim hover:text-white hover:border-red-500 transition-all shadow-md cursor-pointer"
          id="btn-exit"
        >
          <X size={16} className="text-red-500" />
          <span>Keluar</span>
        </button>
      </div>

    </div>
  );
};
