// =============================================================================
// VAAHAN TRANSIT SYSTEM - PREMIUM 3D ANIMATED PRELOADER
// Real 3D Extruded Geometry with Polished Metallic PBR Shading in Three.js
//
// Animation Sequence:
//   Step 1: First 3D stroke forms from top-left to bottom-center (\)
//   Step 2: Second 3D stroke continues from bottom-center to top-right (/)
//   Step 3: Both strokes connect seamlessly into a monolithic solid 3D V
//   Step 4: Physically based specular light sweep glints across the beveled edges
//   Step 5: Reveal VAAHAN and KK WAGH typography underneath
//
// Technical Requirements:
//   - Real 3D depth and extrusion with smooth beveled edges
//   - Glossy metallic cyan/electric-blue PBR material
//   - Realistic highlights, reflections, and studio depth shadows
//   - Dark navy background with ambient atmospheric lighting
//   - Graceful fallback to 2D SVG if WebGL is unavailable or reduced-motion is requested
//   - Responsive sizing for mobile (360px+) and laptops (1024px-1920px+)
//   - Preserves Skip Intro & keyboard controls (Escape/Space)
// =============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ThreeDLogoCanvas } from './ThreeDLogoCanvas';
import { isWebGLAvailable } from '../../utils/webgl';

interface AnimatedPreloaderProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

export const AnimatedPreloader: React.FC<AnimatedPreloaderProps> = ({
  onComplete,
  minDurationMs = 2700,
}) => {
  const [isFinishing, setIsFinishing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [has3DError, setHas3DError] = useState(false);

  // Check WebGL availability and accessibility preferences
  const [canUse3D] = useState(() => {
    if (typeof window === 'undefined') return false;
    const prefersReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    )?.matches;
    return !prefersReducedMotion && isWebGLAvailable();
  });

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
        {/* CENTRAL HERO CANVAS: PREMIUM 3D V LOGO */}
        {/* Responsive sizing:
            - Mobile (<640px): w-48 h-48 (192px) - bold, clear, perfectly proportioned
            - Tablet (sm): w-60 h-60 (240px)
            - Laptop/Desktop (md): w-72 h-72 (288px) - crisp, spacious hero center
        */}
        {/* ============================================================== */}
        <div className="relative w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 flex items-center justify-center">
          {canUse3D && !has3DError ? (
            /* REAL 3D THREE.JS WEBGL RENDERER */
            <ThreeDLogoCanvas
              className="w-full h-full"
              onStepComplete={(step) => setCurrentStep(step)}
              onError={() => setHas3DError(true)}
            />
          ) : (
            /* GRACEFUL 2D SVG FALLBACK (if WebGL is unavailable or reduced-motion is requested) */
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full drop-shadow-[0_12px_32px_rgba(14,165,233,0.35)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="vStrokeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="40%" stopColor="#E2E8F0" />
                  <stop offset="75%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#0EA5E9" />
                </linearGradient>
                <linearGradient id="vStrokeGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0EA5E9" />
                  <stop offset="35%" stopColor="#38BDF8" />
                  <stop offset="70%" stopColor="#E2E8F0" />
                  <stop offset="100%" stopColor="#FFFFFF" />
                </linearGradient>
                <radialGradient id="vInnerBloom" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
                  <stop offset="70%" stopColor="#0EA5E9" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#070B14" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Guide Track */}
              <path
                d="M 46 44 L 100 156 L 154 44"
                stroke="rgba(148, 163, 184, 0.15)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Step 1: Left stroke (\) */}
              <motion.path
                d="M 46 44 L 100 156"
                stroke="url(#vStrokeGrad1)"
                strokeWidth="12"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 0.65, delay: 0.2, ease: [0.35, 1, 0.45, 1] },
                  opacity: { duration: 0.12, delay: 0.2 },
                }}
              />

              {/* Step 2: Right stroke (/) */}
              <motion.path
                d="M 100 156 L 154 44"
                stroke="url(#vStrokeGrad2)"
                strokeWidth="12"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 0.65, delay: 0.85, ease: [0.35, 1, 0.45, 1] },
                  opacity: { duration: 0.12, delay: 0.85 },
                }}
              />

              {/* Step 3: Complete V soft bloom */}
              <motion.polygon
                points="46,44 100,156 154,44"
                fill="url(#vInnerBloom)"
                initial={{ fillOpacity: 0 }}
                animate={{ fillOpacity: 0.2 }}
                transition={{ delay: 1.5, duration: 0.6 }}
              />
            </svg>
          )}
        </div>

        {/* ---------------------------------------------------------- */}
        {/* STEP 5: BRAND TYPOGRAPHY REVEAL */}
        {/* Appears after Step 3 / during the 3D Light Sweep */}
        {/* Perfectly legible on mobile and laptop */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col items-center justify-center space-y-1.5 sm:space-y-2 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10, letterSpacing: '0.24em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.14em' }}
            transition={{ duration: 0.55, delay: 1.5, ease: [0.25, 1, 0.5, 1] }}
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
            transition={{ duration: 0.45, delay: 1.65, ease: 'easeOut' }}
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
          transition={{ duration: 0.3, delay: 1.7 }}
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
