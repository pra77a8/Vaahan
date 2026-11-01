// =============================================================================
// VAAHAN TRANSIT SYSTEM - PREMIUM METALLIC CHROME 'V' PRELOADER
// 100% Reliable Inline SVG Path Drawing with Framer Motion (motion/react)
// Faithfully matching the official reference visual treatment:
//   - Polished silver/chrome central surface with sharp specular bevels
//   - Bright electric cyan (#00BFFF) / sky-blue (#38BDF8) illuminated outer edges
//   - Subtle dark metallic inner bevel channel for genuine 3D sculpted depth
//   - Controlled cyan glow aura around the V emblem
//   - Tasteful specular highlights: 4-point star lens flare at top-right,
//     polished chrome cap at top-left, and glowing junction at apex
//   - Subtle horizontal cyan ground reflection beneath the hovering apex
//   - VAAHAN bold typography, KK WAGH badge, and illuminated divider with center flare
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020817] select-none overflow-hidden px-4 py-6"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 43%, rgba(0, 191, 255, 0.11) 0%, rgba(3, 16, 43, 0.55) 45%, #020817 80%)',
      }}
    >
      {/* Background ambient lighting glow (subtle, noise-free, elegant) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] rounded-full bg-[#00BFFF]/8 blur-[110px]" />
        <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-[#38BDF8]/6 blur-[80px]" />
      </div>

      {/* Main container: responsive width & spacing for mobile and laptop */}
      <div className="relative flex flex-col items-center justify-center space-y-4 sm:space-y-5 md:space-y-6 z-10 max-w-sm sm:max-w-md md:max-w-lg w-full">
        {/* ============================================================== */}
        {/* CENTRAL HERO CANVAS: METALLIC CHROME 'V' EMBLEM */}
        {/* Responsive sizing:
            - Mobile (<640px): w-52 h-52 (208px)
            - Tablet (sm): w-64 h-64 (256px)
            - Laptop/Desktop (md): w-76 h-76 (304px)
        */}
        {/* ============================================================== */}
        <div className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-76 md:h-76 flex items-center justify-center">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-[0_16px_36px_rgba(0,191,255,0.25)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* 1. Electric Cyan & Sky-Blue Outer Rim Gradient */}
              <linearGradient id="neonCyanRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00BFFF" />
                <stop offset="28%" stopColor="#38BDF8" />
                <stop offset="50%" stopColor="#00E5FF" />
                <stop offset="72%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#00BFFF" />
              </linearGradient>

              {/* 2. Dark Metallic Inner Bevel Channel (Genuine 3D sculpted depth) */}
              <linearGradient id="darkInnerBevelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0A1325" />
                <stop offset="25%" stopColor="#1E293B" />
                <stop offset="50%" stopColor="#0B162C" />
                <stop offset="75%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#0A1325" />
              </linearGradient>

              {/* 3. Polished Chrome Silver Central Surface */}
              <linearGradient id="chromeSurfaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="16%" stopColor="#F8FAFC" />
                <stop offset="32%" stopColor="#CBD5E1" />
                <stop offset="48%" stopColor="#94A3B8" />
                <stop offset="52%" stopColor="#E0F2FE" />
                <stop offset="68%" stopColor="#CBD5E1" />
                <stop offset="84%" stopColor="#F8FAFC" />
                <stop offset="100%" stopColor="#FFFFFF" />
              </linearGradient>

              {/* 4. Specular Knife-Edge Center Ridge Highlight */}
              <linearGradient id="specularCenterRidgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="25%" stopColor="#E0F2FE" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="75%" stopColor="#BAE6FD" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
              </linearGradient>

              {/* 5. Moving Specular Light Sweep Glint */}
              <linearGradient id="lightSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00BFFF" stopOpacity="0" />
                <stop offset="35%" stopColor="#38BDF8" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="65%" stopColor="#38BDF8" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#00BFFF" stopOpacity="0" />
              </linearGradient>

              {/* 6. Chrome Endcap Node Gradient */}
              <radialGradient id="chromeCapGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="45%" stopColor="#E2E8F0" />
                <stop offset="75%" stopColor="#00BFFF" />
                <stop offset="100%" stopColor="#0369A1" />
              </radialGradient>

              {/* 7. Star Glint Beam Horizontal Gradient */}
              <linearGradient id="starBeamH" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00BFFF" stopOpacity="0" />
                <stop offset="35%" stopColor="#38BDF8" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="65%" stopColor="#38BDF8" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#00BFFF" stopOpacity="0" />
              </linearGradient>

              {/* 8. Star Glint Beam Vertical Gradient */}
              <linearGradient id="starBeamV" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00BFFF" stopOpacity="0" />
                <stop offset="35%" stopColor="#38BDF8" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="65%" stopColor="#38BDF8" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#00BFFF" stopOpacity="0" />
              </linearGradient>

              {/* 9. Under-Apex Ground Light Pool Gradient */}
              <radialGradient id="groundReflectGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00BFFF" stopOpacity="0.85" />
                <stop offset="30%" stopColor="#38BDF8" stopOpacity="0.45" />
                <stop offset="70%" stopColor="#0284C7" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#020817" stopOpacity="0" />
              </radialGradient>

              {/* Filters */}
              {/* Controlled Cyan Aura Glow Filter */}
              <filter id="cyanGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Star Glint Lens Blur Filter */}
              <filter id="glintBlurFilter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
              </filter>

              {/* Ground Reflection Blur Filter */}
              <filter id="groundBlurFilter" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" />
              </filter>
            </defs>

            {/* ---------------------------------------------------------- */}
            {/* LAYER 1: SILHOUETTE GUIDE TRACK (Structural Blueprint) */}
            {/* ---------------------------------------------------------- */}
            <path
              d={vPathData}
              stroke="rgba(148, 163, 184, 0.08)"
              strokeWidth="15"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 2: CONTROLLED ELECTRIC CYAN OUTER GLOW (Reference Aura) */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d={vPathData}
              stroke="#00BFFF"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.4}
              filter="url(#cyanGlowFilter)"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={strokeAnimation}
              transition={strokeTransition}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 3: BRIGHT ELECTRIC CYAN ILLUMINATED OUTER EDGE */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d={vPathData}
              stroke="url(#neonCyanRimGrad)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={strokeAnimation}
              transition={strokeTransition}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 4: DARK METALLIC INNER BEVEL CHANNEL */}
            {/* Creates the recessed inner groove for 3D metallic realism */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d={vPathData}
              stroke="url(#darkInnerBevelGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={strokeAnimation}
              transition={strokeTransition}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 5: POLISHED SILVER / CHROME CENTRAL SURFACE */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d={vPathData}
              stroke="url(#chromeSurfaceGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={strokeAnimation}
              transition={strokeTransition}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 6: SPECULAR KNIFE-EDGE RIDGE (Razor White Reflection) */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d={vPathData}
              stroke="url(#specularCenterRidgeGrad)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={strokeAnimation}
              transition={strokeTransition}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 7: SUBTLE SPECULAR LIGHT SWEEP ACROSS COMPLETED V */}
            {/* Passes over the finished V after strokes meet (t = 1.65s - 2.4s) */}
            {/* ---------------------------------------------------------- */}
            <motion.path
              d={vPathData}
              stroke="url(#lightSweepGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0.22, pathOffset: -0.22, opacity: 0 }}
              animate={{
                pathOffset: [-0.22, 1.05],
                opacity: [0, 0.95, 0.95, 0],
              }}
              transition={{
                delay: 1.65,
                duration: 0.75,
                ease: 'easeInOut',
              }}
            />

            {/* ---------------------------------------------------------- */}
            {/* LAYER 8: SUBTLE REFLECTION BENEATH THE V (Reference Pool) */}
            {/* Positioned right under the apex at y = 178 */}
            {/* ---------------------------------------------------------- */}
            <motion.g
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.55, duration: 0.55, ease: 'easeOut' }}
            >
              {/* Diffuse horizontal reflection pool */}
              <ellipse
                cx="100"
                cy="178"
                rx="32"
                ry="3.5"
                fill="url(#groundReflectGrad)"
                filter="url(#groundBlurFilter)"
              />
              {/* Sharp specular center reflection line */}
              <line
                x1="84"
                y1="178"
                x2="116"
                y2="178"
                stroke="#00BFFF"
                strokeWidth="1.2"
                strokeOpacity="0.75"
                strokeLinecap="round"
              />
            </motion.g>

            {/* ---------------------------------------------------------- */}
            {/* LAYER 9: TASTEFUL HIGHLIGHTS AT THE 3 JUNCTIONS */}
            {/* ---------------------------------------------------------- */}

            {/* A. Top-Left Endpoint (46, 42): Polished chrome cap with cyan rim */}
            <motion.circle
              cx="46"
              cy="42"
              r="4.8"
              fill="url(#chromeCapGrad)"
              stroke="#38BDF8"
              strokeWidth="1.2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.28, type: 'spring', stiffness: 350, damping: 20 }}
            />
            {/* Top-Left soft specular glow */}
            <motion.circle
              cx="46"
              cy="42"
              r="2"
              fill="#FFFFFF"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: 0.32 }}
            />

            {/* B. Bottom-Center Apex (100, 160): Glowing cyan apex junction */}
            <motion.circle
              cx="100"
              cy="160"
              r="5.2"
              fill="#00BFFF"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.88, type: 'spring', stiffness: 350, damping: 20 }}
            />
            <motion.circle
              cx="100"
              cy="160"
              r="2.5"
              fill="#FFFFFF"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.92 }}
            />

            {/* C. Top-Right Endpoint (154, 42): 4-POINT STAR LENS FLARE / GLINT */}
            {/* Matches the diamond star flare in the reference image */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 1.6,
                type: 'spring',
                stiffness: 300,
                damping: 18,
              }}
            >
              {/* Cyan halo bloom */}
              <circle
                cx="154"
                cy="42"
                r="9"
                fill="#00BFFF"
                fillOpacity="0.4"
                filter="url(#glintBlurFilter)"
              />
              {/* Horizontal lens flare needle */}
              <line
                x1="136"
                y1="42"
                x2="172"
                y2="42"
                stroke="url(#starBeamH)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Vertical lens flare needle */}
              <line
                x1="154"
                y1="24"
                x2="154"
                y2="60"
                stroke="url(#starBeamV)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* 45-degree diagonal specular gleams */}
              <line
                x1="145"
                y1="33"
                x2="163"
                y2="51"
                stroke="#FFFFFF"
                strokeWidth="0.8"
                strokeOpacity="0.65"
              />
              <line
                x1="145"
                y1="51"
                x2="163"
                y2="33"
                stroke="#FFFFFF"
                strokeWidth="0.8"
                strokeOpacity="0.65"
              />
              {/* Bright white star core */}
              <circle cx="154" cy="42" r="3" fill="#FFFFFF" />
              <circle cx="154" cy="42" r="4.5" fill="none" stroke="#38BDF8" strokeWidth="0.8" />
            </motion.g>
          </svg>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* BRAND TYPOGRAPHY REVEAL (Matching Reference Image) */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col items-center justify-center space-y-2 sm:space-y-2.5 text-center">
          {/* VAAHAN + KK WAGH BADGE */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 1.65, ease: [0.25, 1, 0.5, 1] }}
            className="flex items-center gap-2.5 sm:gap-3"
          >
            <span className="font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-[0.08em] text-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif]">
              VAAHAN
            </span>
            <span className="bg-[#0A1C38]/85 text-[#38BDF8] border border-[#00BFFF]/45 text-[10px] sm:text-[11px] md:text-xs font-bold px-2 py-0.5 rounded-md tracking-wider uppercase shadow-[0_0_12px_rgba(0,191,255,0.2)]">
              KK WAGH
            </span>
          </motion.div>

          {/* INSTITUTIONAL TRANSIT & FLEET TELEMETRY SYSTEM */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 1.8, ease: 'easeOut' }}
            className="text-[10px] sm:text-[11px] md:text-xs font-semibold text-[#94A3B8] tracking-[0.16em] uppercase px-2"
          >
            Institutional Transit & Fleet Telemetry System
          </motion.p>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* ILLUMINATED CYAN DIVIDER WITH CENTER FLARE PIP */}
        {/* Directly inspired by the reference image's horizontal light line */}
        {/* ---------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0.7 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.55, delay: 1.9, ease: 'easeOut' }}
          className="relative flex items-center justify-center w-52 sm:w-64 md:w-76 h-3 mt-0.5"
        >
          {/* Main glowing divider line fading out at both ends */}
          <div className="w-full h-[1.2px] bg-gradient-to-r from-transparent via-[#00BFFF]/65 to-transparent" />

          {/* Center cyan glow halo */}
          <div className="absolute w-14 h-1.5 bg-gradient-to-r from-transparent via-[#00BFFF] to-transparent blur-[3px]" />

          {/* Center bright flare pip */}
          <div className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#00BFFF,0_0_4px_#FFFFFF]" />
        </motion.div>
      </div>

      {/* Skip Intro button at bottom-right */}
      <motion.button
        type="button"
        onClick={handleFinish}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.65 }}
        whileHover={{ opacity: 1, scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-5 right-5 text-[11px] sm:text-xs font-medium text-slate-400 hover:text-white transition-all cursor-pointer bg-[#0A1325]/80 hover:bg-[#0F1E38] px-3.5 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-sm shadow-sm"
      >
        Skip Intro →
      </motion.button>
    </motion.div>
  );
};
