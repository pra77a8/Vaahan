// =============================================================================
// VAAHAN TRANSIT SYSTEM - ANIMATED VECTOR PRELOADER
// Progressive SVG stroke path drawing with Framer Motion (motion/react)
// Recreates sequential diagonal letter stroke drawing with premium transport-tech visual style
// =============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';

interface AnimatedPreloaderProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

export const AnimatedPreloader: React.FC<AnimatedPreloaderProps> = ({
  onComplete,
  minDurationMs = 2100,
}) => {
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinish = useCallback(() => {
    if (isFinishing) return;
    setIsFinishing(true);
    onComplete?.();
  }, [isFinishing, onComplete]);

  useEffect(() => {
    // Primary animation completion timer
    const timer = setTimeout(() => {
      handleFinish();
    }, minDurationMs);

    // Fail-safe timeout to guarantee the preloader never gets stuck under any condition
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, minDurationMs + 800);

    // Optional keyboard skip (Escape or Spacebar)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [minDurationMs, handleFinish]);

  return (
    <motion.div
      key="vaahan-animated-preloader"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.03,
        filter: 'blur(6px)',
        transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070B14] select-none overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 45%, rgba(14, 165, 233, 0.15) 0%, rgba(15, 23, 42, 0.8) 45%, rgba(7, 11, 20, 0.98) 85%)',
      }}
    >
      {/* Background ambient lighting effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-sky-500/10 blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-amber-500/8 blur-[80px]" />
      </div>

      <div className="relative flex flex-col items-center justify-center space-y-7 z-10 px-4 max-w-sm sm:max-w-md w-full">
        {/* ============================================================== */}
        {/* CENTRAL VECTOR LOGO CANVAS */}
        {/* ============================================================== */}
        <div className="relative w-56 h-40 sm:w-68 sm:h-48 flex items-center justify-center">
          <svg
            viewBox="0 0 200 120"
            className="w-full h-full drop-shadow-[0_10px_28px_rgba(14,165,233,0.3)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Dynamic stroke gradient across the central W-wings */}
              <linearGradient id="vaahanStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="45%" stopColor="#0EA5E9" />
                <stop offset="75%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>

              {/* Accent golden gradient for frame & highlights */}
              <linearGradient id="vaahanGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>

              {/* Laser glow filter for drawing stroke trail */}
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Subtle inner radial glow upon completion */}
              <radialGradient id="vaahanInnerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.4" />
                <stop offset="60%" stopColor="#0284C7" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#070B14" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ---------------------------------------------------------- */}
            {/* 1. BOTTOM LAUREL FLOURISHES (Drawn outwards from center) */}
            {/* ---------------------------------------------------------- */}
            {/* Left flourish guide track */}
            <path
              d="M 10 105 C 30 105, 45 85, 60 92 C 72 98, 78 112, 92 112 C 100 112, 105 105, 100 100 C 95 95, 88 100, 88 105 C 88 108, 92 110, 95 108 C 82 108, 75 92, 62 88 C 45 82, 30 102, 12 98 C 6 96, 2 92, 2 92"
              stroke="rgba(14, 165, 233, 0.12)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Left flourish animated drawing */}
            <motion.path
              d="M 10 105 C 30 105, 45 85, 60 92 C 72 98, 78 112, 92 112 C 100 112, 105 105, 100 100 C 95 95, 88 100, 88 105 C 88 108, 92 110, 95 108 C 82 108, 75 92, 62 88 C 45 82, 30 102, 12 98 C 6 96, 2 92, 2 92"
              stroke="#0284C7"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.85 }}
              transition={{
                pathLength: { duration: 0.85, delay: 0.5, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.2, delay: 0.5 },
              }}
            />

            {/* Right flourish guide track */}
            <path
              d="M 190 105 C 170 105, 155 85, 140 92 C 128 98, 122 112, 108 112 C 100 112, 95 105, 100 100 C 105 95, 112 100, 112 105 C 112 108, 108 110, 105 108 C 118 108, 125 92, 138 88 C 155 82, 170 102, 188 98 C 194 96, 198 92, 198 92"
              stroke="rgba(14, 165, 233, 0.12)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Right flourish animated drawing */}
            <motion.path
              d="M 190 105 C 170 105, 155 85, 140 92 C 128 98, 122 112, 108 112 C 100 112, 95 105, 100 100 C 105 95, 112 100, 112 105 C 112 108, 108 110, 105 108 C 118 108, 125 92, 138 88 C 155 82, 170 102, 188 98 C 194 96, 198 92, 198 92"
              stroke="#0284C7"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.85 }}
              transition={{
                pathLength: { duration: 0.85, delay: 0.5, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.2, delay: 0.5 },
              }}
            />

            {/* ---------------------------------------------------------- */}
            {/* 2. CENTRAL OVAL FRAMES */}
            {/* ---------------------------------------------------------- */}
            {/* Outer oval frame guide track */}
            <ellipse
              cx="100"
              cy="52"
              rx="38"
              ry="48"
              stroke="rgba(14, 165, 233, 0.15)"
              strokeWidth="3.2"
            />
            {/* Outer oval animated stroke */}
            <motion.ellipse
              cx="100"
              cy="52"
              rx="38"
              ry="48"
              stroke="url(#vaahanStrokeGrad)"
              strokeWidth="3.2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 0.95, delay: 0.2, ease: 'easeInOut' },
                opacity: { duration: 0.2, delay: 0.2 },
              }}
            />

            {/* Inner dashed decorative oval */}
            <motion.ellipse
              cx="100"
              cy="52"
              rx="34"
              ry="44"
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.5, delay: 0.85 }}
            />

            {/* Soft inner fill bloom on completion */}
            <motion.ellipse
              cx="100"
              cy="52"
              rx="37"
              ry="47"
              fill="url(#vaahanInnerGlow)"
              initial={{ fillOpacity: 0 }}
              animate={{ fillOpacity: 0.35 }}
              transition={{ duration: 0.6, delay: 1.05 }}
            />

            {/* ---------------------------------------------------------- */}
            {/* 3. CENTRAL MONOGRAM (The Iconic W & K Letterforms) */}
            {/* ---------------------------------------------------------- */}
            <g transform="translate(100, 52) scale(0.72)">
              {/* Stylized K Left Vertical Stem */}
              <motion.path
                d="M -22 -35 L -22 35"
                stroke="#0EA5E9"
                strokeWidth="5"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 0.55, delay: 0.35, ease: 'easeOut' },
                  opacity: { duration: 0.15, delay: 0.35 },
                }}
              />

              {/* Stylized K Upper Branch Diagonal */}
              <motion.path
                d="M -22 0 L 0 -35"
                stroke="#0EA5E9"
                strokeWidth="4.8"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 0.4, delay: 0.65, ease: 'easeOut' },
                  opacity: { duration: 0.1, delay: 0.65 },
                }}
              />

              {/* Stylized K Lower Branch Diagonal */}
              <motion.path
                d="M -10 -15 L 2 35"
                stroke="#0EA5E9"
                strokeWidth="4.8"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 0.4, delay: 0.75, ease: 'easeOut' },
                  opacity: { duration: 0.1, delay: 0.75 },
                }}
              />

              {/* Guide shadow track for Central W */}
              <path
                d="M -30 -20 L -18 30 L 0 -15 L 18 30 L 30 -20"
                stroke="rgba(14, 165, 233, 0.15)"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* ========================================================== */}
              {/* CORE ANIMATION: DIRECTIONAL SEQUENTIAL 'W' STROKES */}
              {/* 1st stroke: diagonal down-right (-30,-20 to -18,30) */}
              {/* 2nd stroke: diagonal up-right (-18,30 to 0,-15) */}
              {/* 3rd stroke: diagonal down-right (0,-15 to 18,30) */}
              {/* 4th stroke: diagonal up-right (18,30 to 30,-20) */}
              {/* ========================================================== */}
              <motion.path
                d="M -30 -20 L -18 30 L 0 -15 L 18 30 L 30 -20"
                stroke="url(#vaahanStrokeGrad)"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#neonGlow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 1.15, delay: 0.1, ease: [0.65, 0, 0.35, 1] },
                  opacity: { duration: 0.15, delay: 0.1 },
                }}
              />

              {/* Stylized E & S motif curve */}
              <motion.path
                d="M -14 22 C -6 32, 10 32, 18 20 C 22 14, 15 5, 0 5 C -15 5, -20 -5, -15 -14"
                stroke="#38BDF8"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={{
                  pathLength: { duration: 0.65, delay: 0.85, ease: 'easeOut' },
                  opacity: { duration: 0.15, delay: 0.85 },
                }}
              />

              {/* Stylized accent beads popping in */}
              <motion.circle
                cx="-16"
                cy="-28"
                r="3"
                fill="#38BDF8"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.05, type: 'spring', stiffness: 350, damping: 20 }}
              />
              <motion.circle
                cx="16"
                cy="-28"
                r="3"
                fill="#38BDF8"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.1, type: 'spring', stiffness: 350, damping: 20 }}
              />
              <motion.circle
                cx="0"
                cy="32"
                r="3.5"
                fill="#F59E0B"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.15, type: 'spring', stiffness: 350, damping: 20 }}
              />
            </g>
          </svg>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* 4. BRAND TYPOGRAPHY REVEAL */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col items-center justify-center space-y-1.5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10, letterSpacing: '0.28em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.14em' }}
            transition={{ duration: 0.55, delay: 1.15, ease: [0.25, 1, 0.5, 1] }}
            className="flex items-center gap-2"
          >
            <span className="font-extrabold text-2xl sm:text-3xl tracking-[0.14em] text-white font-['Plus_Jakarta_Sans',sans-serif]">
              VAAHAN
            </span>
            <span className="bg-sky-500/20 text-sky-400 border border-sky-400/30 text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm tracking-widest uppercase">
              KK WAGH
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 1.35, ease: 'easeOut' }}
            className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-wider uppercase"
          >
            Campus Transit & Fleet Telemetry System
          </motion.p>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* 5. STREAMLINED TRANSIT PULSE LINE */}
        {/* ---------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 1.4 }}
          className="w-36 h-0.5 bg-slate-800/80 rounded-full overflow-hidden mt-1 relative"
        >
          <motion.div
            className="absolute top-0 bottom-0 w-16 bg-gradient-to-r from-transparent via-sky-400 to-transparent rounded-full"
            initial={{ x: '-100%' }}
            animate={{ x: '250%' }}
            transition={{
              repeat: Infinity,
              duration: 1.1,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      </div>

      {/* Unobtrusive skip control in bottom right for fast developer navigation */}
      <motion.button
        type="button"
        onClick={handleFinish}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-5 right-5 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/60 hover:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60 backdrop-blur-xs"
      >
        Skip Intro →
      </motion.button>
    </motion.div>
  );
};
