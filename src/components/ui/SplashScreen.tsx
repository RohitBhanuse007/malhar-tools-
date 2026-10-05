import React from 'react';

interface SplashScreenProps {
  isExiting?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isExiting = false }) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-950 text-white px-4 select-none transition-opacity duration-500 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Soft warm radial glow backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Single Animated Brand Element */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Container with smooth breathing & golden glow */}
        <div className="relative p-3.5 sm:p-4 rounded-3xl bg-black border border-amber-500/40 shadow-2xl animate-logo-pulse">
          <img
            src="/logo.png"
            alt="Malhar Tools Logo"
            className="w-28 h-28 sm:w-36 sm:h-36 object-contain"
          />
        </div>

        {/* Brand Name Typography */}
        <div className="text-center mt-6">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center justify-center gap-2">
            <span className="text-amber-400">MALHAR</span>
            <span className="text-white">TOOLS</span>
          </h1>

          {/* Subtitle / Tagline */}
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-amber-200/90 font-semibold mt-2">
            HARDWARE • TOOLS • SPARES
          </p>

          <p className="text-xs text-amber-400/80 font-medium mt-1">
            हार्डवेअर • टूल्स • स्पेअर्स
          </p>
        </div>

        {/* Single subtle indeterminate loader line */}
        <div className="w-44 sm:w-52 h-1 bg-white/10 rounded-full overflow-hidden mt-6 relative">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-loading-bar" />
        </div>
      </div>
    </div>
  );
};
