// =============================================================================
// VAAHAN TRANSIT SYSTEM - ANIMATED VECTOR PRELOADER
// Progressive SVG stroke path drawing with Framer Motion (motion/react)
// Three-Step Sequence:
//   Step 1: First stroke (\) drawn from top-left to bottom-center
//   Step 2: Second stroke (/) continues from bottom-center to top-right forming 'V'
//   Step 3: Completed 'V' remains visible, glowing & revealing brand identity
// Perfectly responsive for mobile screens (360px+) and laptops (1024px-1920px+)
// =============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';

interface AnimatedPreloaderProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

export const AnimatedPreloader: React.FC<AnimatedPreloaderProps> = ({
  onComplete,
  minDurationMs = 2300,
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

    // Hard fail-safe timeout to guarantee the preloader never gets stuck
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070B14] select-none overflow-hidden px-4 py-6"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 46%, rgba(14, 165, 233, 0.16) 0%, rgba(15, 23, 42, 0.85) 45%, rgba(7, 11, 20, 0.98) 85%)',
      }}
    >
      {/* Background ambient lighting effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] rounded-full bg-sky-500/12 blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full bg-amber-500/8 blur-[85px]" />
      </div>

      {/* Main container: responsive width & spacing for mobile and laptop */}
      <div className="relative flex flex-col items-center justify-center space-y-5 sm:space-y-6 md:space-y-7 z-10 max-w-sm sm:max-w-md md:max-w-lg w-full">
        {/* ============================================================== */}
        {/* CENTRAL VECTOR CANVAS: THE ICONIC 'V' */}
        {/* Responsive sizing:
            - Mobile: w-44 h-44 (176px) - bold, clear, perfectly proportioned
            - Tablet: sm:w-56 sm:h-56 (224px)
            - Laptop/Desktop: md:w-64 md:h-64 (256px) - crisp, spacious
        */}
        {/* ============================================================== */}
        <div className="relative w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 flex items-center justify-center">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-[0_12px_32px_rgba(14,165,233,0.35)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Step 1 Stroke Gradient: Top-left to bottom-center */}
              <linearGradient id="vStrokeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="70%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>

              {/* Step 2 Stroke Gradient: Bottom-center to top-right */}
              <linearGradient id="vStrokeGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284C7" />
                <stop offset="35%" stopColor="#0EA5E9" />
                <stop offset="80%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>

              {/* Step 3 Inner Bloom Gradient */}
              <radialGradient id="vInnerBloom" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.3" />
                <stop offset="70%" stopColor="#0284C7" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#070B14" stopOpacity="0" />
              </radialGradient>

              {/* Laser neon glow filter for drawing strokes */}
              <filter id="vNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ---------------------------------------------------------- */}
            {/* GUIDE TRACK: Faint background outline giving visual anchor */}
            {/* ---------------------------------------------------------- */}
            <path
              d="M 46 44 L 100 156 L 154 44"
              stroke="rgba(56, 189, 248, 0.12)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* ---------------------------------------------------------- */}
            {/* STEP 3 COMPLETED LOGO: Inner soft bloom */}
            {/* ---------------------------------------------------------- */}
            <motion.polygon
              points="46,44 100,156 154,44"
              fill="url(#vInnerBloom)"
              initial={{ fillOpacity: 0 }}
              animate={{ fillOpacity: 0.2 }}
              transition={{ delay: 1.35, duration: 0.6 }}
            />

            {/* ---------------------------------------------------------- */}
            {/* STEP 1: FIRST STROKE (\) */}
            {/* Draws from top-left (46, 44) to bottom-center (100, 156) */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d="M 46 44 L 100 156"
              stroke="url(#vStrokeGrad1)"
              strokeWidth="12"
              strokeLinecap="round"
              filter="url(#vNeonGlow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 0.55, delay: 0.25, ease: [0.35, 1, 0.45, 1] },
                opacity: { duration: 0.12, delay: 0.25 },
              }}
            />

            {/* Apex connection node: Illuminates as stroke 1 arrives */}
            <motion.circle
              cx="100"
              cy="156"
              r="4.5"
              fill="#38BDF8"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.76, type: 'spring', stiffness: 350, damping: 20 }}
            />

            {/* ---------------------------------------------------------- */}
            {/* STEP 2: SECOND STROKE (/) */}
            {/* Continues from bottom-center (100, 156) to top-right (154, 44) */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d="M 100 156 L 154 44"
              stroke="url(#vStrokeGrad2)"
              strokeWidth="12"
              strokeLinecap="round"
              filter="url(#vNeonGlow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 0.55, delay: 0.8, ease: [0.35, 1, 0.45, 1] },
                opacity: { duration: 0.12, delay: 0.8 },
              }}
            />

            {/* ---------------------------------------------------------- */}
            {/* STEP 3: COMPLETED LOGO REMAINS VISIBLE */}
            {/* Top-right beacon node: Illuminates as stroke 2 finishes */}
            {/* ---------------------------------------------------------- */}
            <motion.circle
              cx="154"
              cy="44"
              r="4.5"
              fill="#F59E0B"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.32, type: 'spring', stiffness: 350, damping: 20 }}
            />

            {/* Top-left beacon node */}
            <motion.circle
              cx="46"
              cy="44"
              r="4.5"
              fill="#38BDF8"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 350, damping: 20 }}
            />

            {/* Subtle inner decorative telemetry chevrons (Step 3 highlight) */}
            <motion.path
              d="M 68 66 L 100 132 L 132 66"
              stroke="#38BDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 4"
              fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              transition={{ delay: 1.35, duration: 0.5 }}
            />
          </svg>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* BRAND TYPOGRAPHY REVEAL (Accompanies Step 3) */}
        {/* Perfectly legible on mobile and laptop */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col items-center justify-center space-y-1.5 sm:space-y-2 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10, letterSpacing: '0.26em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.14em' }}
            transition={{ duration: 0.5, delay: 1.25, ease: [0.25, 1, 0.5, 1] }}
            className="flex items-center gap-2 sm:gap-2.5"
          >
            <span className="font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-[0.14em] text-white font-['Plus_Jakarta_Sans',sans-serif]">
              VAAHAN
            </span>
            <span className="bg-sky-500/20 text-sky-400 border border-sky-400/30 text-[10px] sm:text-xs font-extrabold px-1.5 py-0.5 rounded-sm tracking-widest uppercase">
              KK WAGH
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 1.45, ease: 'easeOut' }}
            className="text-[11px] sm:text-xs md:text-sm font-semibold text-slate-400 tracking-wider uppercase px-2"
          >
            Institutional Transit & Fleet Telemetry System
          </motion.p>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* STREAMLINED TRANSIT PULSE LINE */}
        {/* ---------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 1.5 }}
          className="w-32 sm:w-40 md:w-48 h-0.5 bg-slate-800/80 rounded-full overflow-hidden mt-1 relative"
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

      {/* Unobtrusive skip control in bottom right for fast navigation */}
      <motion.button
        type="button"
        onClick={handleFinish}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-5 right-5 text-[11px] sm:text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/60 hover:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60 backdrop-blur-xs"
      >
        Skip Intro →
      </motion.button>
    </motion.div>
  );
};
