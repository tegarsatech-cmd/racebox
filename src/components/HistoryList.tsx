import React, { useState, useEffect } from 'react';
import { RaceHistoryEntry } from '../types';
import { MotorsportChart } from './MotorsportChart';
import { Calendar, Trash2, ChevronDown, ChevronUp, Clock, Info, ShieldAlert } from 'lucide-react';

interface HistoryListProps {
  onBack: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ onBack }) => {
  const [history, setHistory] = useState<RaceHistoryEntry[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Load history from LocalStorage
  const loadHistory = () => {
    const stored = localStorage.getItem('racebox_history');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse history from localStorage', e);
      }
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDeleteItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem('racebox_history', JSON.stringify(updated));
    setHistory(updated);
    setConfirmDeleteId(null);
    if (selectedRunId === id) {
      setSelectedRunId(null);
    }
  };

  const handleDeleteAll = () => {
    localStorage.removeItem('racebox_history');
    setHistory([]);
    setConfirmDeleteAll(false);
    setSelectedRunId(null);
  };

  const toggleDetail = (id: string) => {
    if (selectedRunId === id) {
      setSelectedRunId(null);
    } else {
      setSelectedRunId(id);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 font-sans">
      
      {/* HEADER SECTION */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 bg-brand-orange"></span>
          <h2 className="text-xl font-bold tracking-wider font-orbitron uppercase">HISTORY</h2>
        </div>
        <div className="flex gap-2">
          {history.length > 0 && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="rounded border border-red-900/40 bg-red-950/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 font-orbitron hover:bg-red-950/40 hover:border-red-500 transition-colors"
            >
              HAPUS SEMUA
            </button>
          )}
          <button
            onClick={onBack}
            className="rounded border border-card-border bg-card-bg px-4 py-1.5 text-xs font-bold uppercase tracking-wider font-orbitron hover:border-brand-orange hover:text-white transition-colors"
            id="btn-history-back"
          >
            KEMBALI
          </button>
        </div>
      </div>

      {/* CONFIRM DELETE ALL DIALOG */}
      {confirmDeleteAll && (
        <div className="mb-5 rounded-xl border border-red-900/50 bg-red-950/30 p-5 shadow-lg">
          <div className="flex items-start gap-3 text-red-400">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-extrabold uppercase font-orbitron">Konfirmasi Hapus Semua</h3>
              <p className="mt-1 text-xs text-red-300 leading-normal">
                Apakah Anda yakin ingin menghapus seluruh riwayat pengujian? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2 text-xs">
            <button
              onClick={() => setConfirmDeleteAll(false)}
              className="rounded bg-card-bg border border-card-border px-4 py-2 font-bold font-orbitron text-text-dim hover:text-white"
            >
              BATAL
            </button>
            <button
              onClick={handleDeleteAll}
              className="rounded bg-red-600 px-4 py-2 font-bold font-orbitron text-white hover:bg-red-700"
              id="confirm-delete-all-btn"
            >
              YA, HAPUS SEMUA
            </button>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {history.length === 0 ? (
        <div className="rounded-xl border border-card-border bg-card-bg p-8 text-center shadow">
          <Info size={32} className="mx-auto mb-3 text-text-dim opacity-40" />
          <h3 className="text-sm font-bold uppercase tracking-wider font-orbitron text-white">Belum Ada History</h3>
          <p className="mt-1.5 text-xs text-text-dim leading-relaxed max-w-xs mx-auto">
            Lakukan pengujian baru di menu Drag Meter. Hasil balap Anda akan tercatat secara otomatis di sini.
          </p>
        </div>
      ) : (
        /* HISTORY CARDS LIST */
        <div className="space-y-4">
          {history.map((run) => {
            const isExpanded = selectedRunId === run.id;
            const isDeletingThis = confirmDeleteId === run.id;

            return (
              <div
                key={run.id}
                className={`rounded-xl border transition-all ${
                  isExpanded ? 'border-brand-orange bg-card-bg shadow-md' : 'border-card-border bg-card-bg hover:border-card-border/80'
                }`}
                id={`history-item-${run.id}`}
              >
                {/* HEADER COLLAPSED VIEW */}
                <div
                  onClick={() => toggleDetail(run.id)}
                  className="flex items-center justify-between p-4 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-orbitron text-sm font-black text-white uppercase tracking-wide">
                        {run.vehicleName} {run.engineCC ? `(${run.engineCC} CC)` : ''}
                      </span>
                      <span className="rounded bg-brand-orange/10 px-2 py-0.5 text-[8px] font-bold text-brand-orange font-orbitron">
                        {run.targetDistance}M
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-text-dim font-tech">
                      <Calendar size={11} className="text-brand-orange" />
                      <span>{run.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[8px] block font-bold text-text-dim uppercase tracking-wider font-orbitron">ET (WAKTU)</span>
                      <p className="font-orbitron text-base font-extrabold text-[#00ff66] tracking-tighter">
                        {run.totalTime.toFixed(2)} S
                      </p>
                    </div>

                    <div className="text-text-dim">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* DETAILS EXPANDED ACCORDION VIEW */}
                {isExpanded && (
                  <div className="border-t border-card-border/60 p-4 space-y-5 bg-[#090a10]/50 rounded-b-xl">
                    
                    {/* CONFIRM DELETE INDIVIDUAL RUN */}
                    {isDeletingThis ? (
                      <div className="rounded border border-red-900/50 bg-red-950/20 p-3.5 text-xs text-red-400">
                        <p className="font-bold uppercase font-orbitron">Hapus Run Ini?</p>
                        <p className="mt-1 text-[11px] text-red-300 leading-normal">
                          Apakah Anda yakin ingin menghapus catatan waktu {run.totalTime.toFixed(2)}s ini?
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded border border-card-border bg-card-bg px-2.5 py-1 font-bold font-orbitron text-[10px] text-text-dim"
                          >
                            BATAL
                          </button>
                          <button
                            onClick={() => handleDeleteItem(run.id)}
                            className="rounded bg-red-600 px-3 py-1 font-bold font-orbitron text-[10px] text-white hover:bg-red-700"
                            id={`btn-confirm-delete-${run.id}`}
                          >
                            YA, HAPUS
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* METRICS GRID */
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded border border-card-border bg-[#0d0e14] p-2">
                            <span className="text-[8px] block font-bold text-text-dim uppercase tracking-wider font-orbitron">TOP SPEED</span>
                            <p className="font-orbitron text-sm font-black text-white mt-0.5">
                              {run.topSpeed.toFixed(1)} <span className="text-[9px] font-black text-brand-orange">{run.unit}</span>
                            </p>
                          </div>
                          <div className="rounded border border-card-border bg-[#0d0e14] p-2">
                            <span className="text-[8px] block font-bold text-text-dim uppercase tracking-wider font-orbitron">AVG SPEED</span>
                            <p className="font-orbitron text-sm font-black text-white mt-0.5">
                              {run.averageSpeed.toFixed(1)} <span className="text-[9px] font-black text-brand-orange">{run.unit}</span>
                            </p>
                          </div>
                          <div className="rounded border border-card-border bg-[#0d0e14] p-2">
                            <span className="text-[8px] block font-bold text-text-dim uppercase tracking-wider font-orbitron">TOTAL BERAT</span>
                            <p className="font-tech text-sm font-bold text-white mt-0.5">
                              {((run.vehicleWeight || 0) + (run.riderWeight || 0))} kg
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                          <div className="rounded border border-card-border bg-[#0d0e14] py-1.5 px-2.5 flex justify-between items-center">
                            <span className="text-[8px] font-bold text-text-dim uppercase font-orbitron">GPS ACC (AVG)</span>
                            <span className="font-mono font-bold text-white text-[11px]">
                              {run.gpsAccuracyAvg !== undefined ? `${run.gpsAccuracyAvg.toFixed(1)} m` : '--'}
                            </span>
                          </div>
                          <div className="rounded border border-card-border bg-[#0d0e14] py-1.5 px-2.5 flex justify-between items-center">
                            <span className="text-[8px] font-bold text-[#f1f1f1]/70 uppercase font-orbitron">QUALITY</span>
                            <span className={`font-black uppercase font-orbitron text-[10px] ${
                              run.dataQuality === 'HIGH' ? 'text-[#00ff66]' : run.dataQuality === 'MEDIUM' ? 'text-amber-400' : 'text-red-400 animate-pulse'
                            }`}>
                              {run.dataQuality || 'LOW'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CHECKPOINT ACCORDION VIEW */}
                    <div className="rounded-lg border border-card-border bg-[#0d0e14] p-3 space-y-1.5">
                      <span className="block text-[8px] font-bold text-text-dim uppercase tracking-widest font-orbitron mb-2">
                        CATATAN CHECKPOINT SEKTOR
                      </span>
                      {run.checkpoints.map((cp) => (
                        <div key={`hist-cp-${cp.distance}`} className="flex items-center justify-between text-xs font-mono">
                          <span className="font-orbitron text-[10px] text-text-dim">{cp.distance} Meter</span>
                          <div className="flex gap-4">
                            <span className="font-bold text-[#00ff66] font-orbitron">{cp.time.toFixed(2)} S</span>
                            <span className="text-text-dim min-w-[65px] text-right font-tech">{cp.speed.toFixed(1)} {run.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* HISTORIC RUN GRAPHS */}
                    <div className="space-y-4">
                      <MotorsportChart gpsTrack={run.gpsTrack} unit={run.unit} type="distance" />
                      <MotorsportChart gpsTrack={run.gpsTrack} unit={run.unit} type="time" />
                    </div>

                    {/* DELETE ACTION TRIGGER */}
                    {!isDeletingThis && (
                      <button
                        onClick={() => setConfirmDeleteId(run.id)}
                        className="flex w-full items-center justify-center gap-1.5 rounded bg-red-950/20 border border-red-900/30 py-2 text-xs font-bold text-red-400 font-orbitron uppercase hover:bg-red-950/40"
                        id={`btn-delete-${run.id}`}
                      >
                        <Trash2 size={13} />
                        HAPUS CATATAN INI
                      </button>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
