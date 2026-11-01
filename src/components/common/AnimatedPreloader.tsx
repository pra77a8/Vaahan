// =============================================================================
// VAAHAN TRANSIT SYSTEM - PREMIUM METALLIC CHROME PRELOADER
// 100% Reliable Inline SVG Path Drawing with Framer Motion (motion/react)
//
// Drawing Sequence:
//   1. Starts at top-left endpoint (46, 42)
//   2. Draws first diagonal down to bottom-center apex (100, 160) (\)
//   3. Continues seamlessly from bottom-center up to top-right (154, 42) (/)
//   4. Finishes with one complete, symmetrical uppercase V
//   5. Completed V remains visible during specular light sweep & brand reveal
//
// 3D-Inspired Visual Quality:
//   - Layered multi-tone metallic chrome gradients (pure platinum, silver, ice blue)
//   - Polished chrome outer bevel chassis with electric cyan & sky blue edge reflections
//   - Hairline specular center-ridge highlight for sculpted knife-edge bevel look
//   - Subtle 3D ambient depth shadow on dark midnight navy background
//   - Animated specular light sweep across finished chrome bevels
//   - Zero reliance on Three.js, WebGL clipping, or dynamic polygons
// =============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { motion, type Transition } from 'motion/react';

interface AnimatedPreloaderProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

export const AnimatedPreloader: React.FC<AnimatedPreloaderProps> = ({
  onComplete,
  minDurationMs = 2800,
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

    // Hard fail-safe timeout
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, minDurationMs + 800);

    // Keyboard skip (Escape or Spacebar)
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

  // Exact continuous uppercase V vector path:
  // Top-Left (46, 42) -> Bottom-Center Apex (100, 160) -> Top-Right (154, 42)
  const vPathData = 'M 46 42 L 100 160 L 154 42';

  // Shared two-phase timing:
  // Phase 1 (0 -> 0.48): First diagonal draws from top-left to apex (\)
  // Apex pause (0.48 -> 0.52): Micro-inflection at apex
  // Phase 2 (0.52 -> 1.00): Second diagonal continues from apex to top-right (/)
  const strokeAnimation = {
    pathLength: [0, 0.5, 0.5, 1],
    opacity: [0, 1, 1, 1],
  };

  const strokeTransition: Transition = {
    duration: 1.45,
    delay: 0.25,
    times: [0, 0.48, 0.52, 1],
    ease: 'easeInOut',
  };

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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] rounded-full bg-sky-500/10 blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full bg-cyan-600/8 blur-[85px]" />
      </div>

      {/* Main container: responsive width & spacing for mobile and laptop */}
      <div className="relative flex flex-col items-center justify-center space-y-4 sm:space-y-5 md:space-y-6 z-10 max-w-sm sm:max-w-md md:max-w-lg w-full">
        {/* ============================================================== */}
        {/* CENTRAL HERO CANVAS: 3D-SCULPTED CHROME V EMBLEM */}
        {/* Responsive sizing:
            - Mobile (<640px): w-48 h-48 (192px) - bold, clear, perfectly proportioned
            - Tablet (sm): w-60 h-60 (240px)
            - Laptop/Desktop (md): w-72 h-72 (288px) - crisp, spacious hero center
        */}
        {/* ============================================================== */}
        <div className="relative w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 flex items-center justify-center">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-[0_18px_40px_rgba(14,165,233,0.32)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* 1. Chrome Bevel Outer Gradient: Slate silver with cyan rim */}
              <linearGradient id="chromeBevelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="25%" stopColor="#E2E8F0" />
                <stop offset="48%" stopColor="#0EA5E9" />
                <stop offset="52%" stopColor="#38BDF8" />
                <stop offset="78%" stopColor="#E2E8F0" />
                <stop offset="100%" stopColor="#CBD5E1" />
              </linearGradient>

              {/* 2. Chrome Core Gradient: High-polish platinum silver & sky blue */}
              <linearGradient id="chromeCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="20%" stopColor="#F1F5F9" />
                <stop offset="38%" stopColor="#94A3B8" />
                <stop offset="50%" stopColor="#E0F2FE" />
                <stop offset="68%" stopColor="#38BDF8" />
                <stop offset="85%" stopColor="#F8FAFC" />
                <stop offset="100%" stopColor="#FFFFFF" />
              </linearGradient>

              {/* 3. Hairline Specular Ridge Gradient: Intense white reflection */}
              <linearGradient id="specularRidgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="35%" stopColor="#E0F2FE" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="70%" stopColor="#BAE6FD" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
              </linearGradient>

              {/* 4. Moving Light Sweep Specular Glint Gradient */}
              <linearGradient id="lightSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
                <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="60%" stopColor="#38BDF8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
              </linearGradient>

              {/* 5. Chrome Node Ball Gradient */}
              <radialGradient id="chromeBallGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="40%" stopColor="#E2E8F0" />
                <stop offset="75%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#0284C7" />
              </radialGradient>

              {/* 6. Soft Inner Aura Bloom */}
              <radialGradient id="vInnerAura" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.22" />
                <stop offset="70%" stopColor="#0EA5E9" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#070B14" stopOpacity="0" />
              </radialGradient>

              {/* 7. Subtle Cyan Depth Shadow Filter */}
              <filter id="cyanGlowShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                <feFlood floodColor="#0284C7" floodOpacity="0.5" result="color" />
                <feComposite in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ---------------------------------------------------------- */}
            {/* LAYER 1: SILHOUETTE GUIDE TRACK (Visual Anchor) */}
            {/* ---------------------------------------------------------- */}
            <path
              d={vPathData}
              stroke="rgba(148, 163, 184, 0.12)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 2: 3D AMBIENT DEPTH SHADOW (Offset by +3px in Y) */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d="M 46 45 L 100 163 L 154 45"
              stroke="rgba(2, 132, 199, 0.3)"
              strokeWidth="15"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#cyanGlowShadow)"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={strokeAnimation}
              transition={strokeTransition}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 3: CHROME BEVEL CHASSIS (Outer Metallic Rim) */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d={vPathData}
              stroke="url(#chromeBevelGrad)"
              strokeWidth="13"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={strokeAnimation}
              transition={strokeTransition}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 4: POLISHED PLATINUM CHROME CORE (Main Body) */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d={vPathData}
              stroke="url(#chromeCoreGrad)"
              strokeWidth="8.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={strokeAnimation}
              transition={strokeTransition}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 5: SPECULAR KNIFE-EDGE RIDGE (Brilliant Highlight) */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d={vPathData}
              stroke="url(#specularRidgeGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={strokeAnimation}
              transition={strokeTransition}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 6: SPECULAR LIGHT SWEEP ACROSS FINISHED CHROME V */}
            {/* Glints across the finished V after completion (t = 1.6s - 2.3s) */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d={vPathData}
              stroke="url(#lightSweepGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0.22, pathOffset: -0.22, opacity: 0 }}
              animate={{
                pathOffset: [ -0.22, 1.05 ],
                opacity: [ 0, 0.9, 0.9, 0 ],
              }}
              transition={{
                delay: 1.65,
                duration: 0.75,
                ease: 'easeInOut',
              }}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 7: CHROME BEVEL ACCENT NODES */}
            {/* Top-Left node: pops in as stroke starts (t = 0.25s) */}
            {/* ---------------------------------------------------------- */}
            <motion.circle
              cx="46"
              cy="42"
              r="5.5"
              fill="url(#chromeBallGrad)"
              stroke="#FFFFFF"
              strokeWidth="1"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.28, type: 'spring', stiffness: 350, damping: 20 }}
            />

            {/* Bottom-Center Apex node: pops in as Stroke 1 arrives at apex (t = 0.85s) */}
            <motion.circle
              cx="100"
              cy="160"
              r="6"
              fill="url(#chromeBallGrad)"
              stroke="#38BDF8"
              strokeWidth="1.2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.88, type: 'spring', stiffness: 350, damping: 20 }}
            />

            {/* Top-Right node: pops in as Stroke 2 completes (t = 1.60s) */}
            <motion.circle
              cx="154"
              cy="42"
              r="5.5"
              fill="url(#chromeBallGrad)"
              stroke="#FFFFFF"
              strokeWidth="1"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.62, type: 'spring', stiffness: 350, damping: 20 }}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 8: COMPLETED V SOFT INNER AURA (t = 1.65s) */}
            {/* ---------------------------------------------------------- */}
            <motion.polygon
              points="46,42 100,160 154,42"
              fill="url(#vInnerAura)"
              initial={{ fillOpacity: 0 }}
              animate={{ fillOpacity: 0.2 }}
              transition={{ delay: 1.65, duration: 0.6 }}
            />

            {/* Inner high-tech telemetry chevron */}
            <motion.path
              d="M 68 64 L 100 134 L 132 64"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 4"
              fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              transition={{ delay: 1.65, duration: 0.5 }}
            />
          </svg>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* BRAND TYPOGRAPHY REVEAL (Accompanies Step 4 & 5) */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col items-center justify-center space-y-1.5 sm:space-y-2 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10, letterSpacing: '0.24em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.14em' }}
            transition={{ duration: 0.55, delay: 1.65, ease: [0.25, 1, 0.5, 1] }}
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
            transition={{ duration: 0.45, delay: 1.8, ease: 'easeOut' }}
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
          transition={{ duration: 0.3, delay: 1.85 }}
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

      {/* Skip control in bottom right for fast navigation */}
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
