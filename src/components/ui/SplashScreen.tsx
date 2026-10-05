import React from 'react';
import { Cog } from 'lucide-react';

interface SplashScreenProps {
  isExiting?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isExiting = false }) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-stone-950 via-slate-950 to-black text-white px-4 select-none transition-opacity duration-500 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background radial ambiance */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Subtle background spinning gear */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500/[0.04] pointer-events-none">
        <Cog className="w-80 h-80 sm:w-96 sm:h-96 animate-gear-spin" />
      </div>

      {/* Main Logo Container with animated pulse & glow */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative p-3.5 sm:p-4 rounded-3xl bg-black border-2 border-amber-500/50 shadow-2xl animate-logo-pulse">
          {/* Subtle ambient halo */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-600/30 blur-md -z-10 opacity-70" />
          <img
            src="/logo.png"
            alt="Malhar Tools Logo"
            className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-xl"
          />
        </div>

        {/* Brand Name Typography */}
        <div className="text-center mt-7">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center justify-center gap-2">
            <span className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">
              MALHAR
            </span>
            <span className="text-white drop-shadow-sm">TOOLS</span>
          </h1>

          {/* English Tagline */}
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-amber-200/90 font-semibold mt-2">
            HARDWARE • TOOLS • SPARES
          </p>

          {/* Marathi Tagline */}
          <p className="text-xs text-amber-400/80 font-medium mt-1">
            हार्डवेअर • टूल्स • स्पेअर्स
          </p>
        </div>

        {/* Indeterminate Amber Loading Bar */}
        <div className="w-48 sm:w-60 h-1.5 bg-slate-800/80 rounded-full overflow-hidden mt-7 relative border border-amber-500/30 shadow-inner">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-loading-bar" />
        </div>

        {/* Animated Loading Status */}
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>Starting application...</span>
        </div>
      </div>
    </div>
  );
};
