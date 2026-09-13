import React from 'react';
import { Compass, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, setTheme }) => {
  return (
    <header className="w-full text-center py-6 border-b border-card-border/40 relative">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-orange via-red-600 to-[#00ff66]"></div>
      
      {/* Absolute theme toggle on top right */}
      <div className="absolute top-4 right-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-full p-2 bg-card-bg border border-card-border hover:border-brand-orange text-brand-orange transition-all cursor-pointer flex items-center justify-center shadow-sm"
          title={theme === 'dark' ? 'Aktifkan Layar Putih (Light Mode)' : 'Aktifkan Layar Gelap (Dark Mode)'}
          id="theme-toggle"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
      
      <div className="flex flex-col items-center justify-center">
        {/* LOGO GRID / ICON */}
        <div className="mb-2 flex items-center justify-center gap-1 bg-[#ff4500]/10 px-3 py-1 rounded-full border border-[#ff4500]/20 animate-pulse">
          <Compass size={13} className="text-brand-orange" />
          <span className="font-orbitron text-[9px] font-black tracking-widest text-brand-orange">
            TELEMETRY LINK ACTIVE
          </span>
        </div>

        {/* BRAND TYPOGRAPHY */}
        <h1 className="font-orbitron text-3xl font-extrabold tracking-widest text-white leading-none">
          RACE<span className="text-brand-orange">BOX</span>
        </h1>
        
        <p className="font-orbitron text-[10px] tracking-widest text-text-dim uppercase mt-1 font-bold">
          GPS Performance Meter
        </p>
      </div>
    </header>
  );
};
