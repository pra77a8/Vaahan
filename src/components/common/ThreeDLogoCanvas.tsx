// =============================================================================
// VAAHAN TRANSIT SYSTEM - 3D LOGO CANVAS
// Real 3D Extruded Geometry with Polished Metallic PBR Shading in Three.js
// Features:
//   - Authentic 3D depth and smooth beveled edges
//   - Glossy metallic cyan/electric-blue MeshPhysicalMaterial
//   - Step 1: 3D Left stroke forms from top-left to bottom-center (\)
//   - Step 2: 3D Right stroke forms from bottom-center to top-right (/)
//   - Step 3: Strokes seamlessly unite into a monolithic solid 3D V
//   - Step 4: Physically based specular light sweep across the beveled edges
//   - Robust WebGL initialization with zero precision/null crashes
//   - 60 FPS performance with dynamic canvas lifecycle & clean disposal
// =============================================================================

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeDLogoCanvasProps {
  onProgress?: (progress: number) => void;
  onStepComplete?: (step: number) => void;
  onError?: () => void;
  className?: string;
}

export const ThreeDLogoCanvas: React.FC<ThreeDLogoCanvasProps> = ({
  onProgress,
  onStepComplete,
  onError,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // -------------------------------------------------------------------------
    // 1. DYNAMIC FRESH CANVAS CREATION & SAFE CONTEXT ACQUISITION
    // Creating the canvas dynamically prevents stale WebGL context reuse
    // and eliminates React StrictMode remount precision errors.
    // -------------------------------------------------------------------------
    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full block filter drop-shadow-[0_16px_36px_rgba(2,132,199,0.4)]';
    container.appendChild(canvas);

    let gl: RenderingContext | null = null;
    const contextAttributes: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      powerPreference: 'default', // 'default' avoids multi-GPU / sandboxed null context failures
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    };

    try {
      gl =
        canvas.getContext('webgl2', contextAttributes) ||
        canvas.getContext('webgl', contextAttributes) ||
        canvas.getContext('experimental-webgl', contextAttributes);
    } catch {
      gl = null;
    }

    if (!gl) {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      onError?.();
      return;
    }

    // -------------------------------------------------------------------------
    // 2. SCENE, CAMERA & RENDERER INITIALIZATION
    // -------------------------------------------------------------------------
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        context: gl as WebGLRenderingContext | WebGL2RenderingContext,
        alpha: true,
        antialias: true,
        powerPreference: 'default',
      });
    } catch {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      onError?.();
      return;
    }

    const scene = new THREE.Scene();

    const width = container.clientWidth || 240;
    const height = container.clientHeight || 240;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.8);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // -------------------------------------------------------------------------
    // 3. STUDIO LIGHTING RIG
    // -------------------------------------------------------------------------
    // Ambient light: Deep navy shadow fill
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.4);
    scene.add(ambientLight);

    // Key light: Crisp cool white-cyan casting highlights on top & front bevels
    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 3.2);
    keyLight.position.set(3.5, 4.5, 5.0);
    scene.add(keyLight);

    // Fill light: Deep electric blue
    const fillLight = new THREE.DirectionalLight(0x0284c7, 1.8);
    fillLight.position.set(-4.5, -2.5, 3.0);
    scene.add(fillLight);

    // Rim light: Sky cyan edge accent
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
    rimLight.position.set(0.0, 3.5, -4.0);
    scene.add(rimLight);

    // Light Sweep: Moving specular spotlight for Step 4
    const sweepLight = new THREE.PointLight(0xffffff, 0, 9.0, 1.2);
    sweepLight.position.set(-4.0, 3.0, 2.5);
    scene.add(sweepLight);

    // -------------------------------------------------------------------------
    // 4. GLOSSY METALLIC PBR MATERIAL
    // -------------------------------------------------------------------------
    const metallicMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x0ea5e9), // Vibrant Cyan / Electric Transit Blue
      emissive: new THREE.Color(0x0284c7), // Subtle deep-blue luster
      emissiveIntensity: 0.2,
      metalness: 0.88, // Highly metallic reflection
      roughness: 0.15, // Polished specular highlights on bevels
      clearcoat: 1.0, // High-gloss clearcoat
      clearcoatRoughness: 0.08,
      reflectivity: 0.95,
      side: THREE.DoubleSide,
    });

    // -------------------------------------------------------------------------
    // 5. UNIFIED 3D V GEOMETRY & EXTRUSION SETTINGS
    // -------------------------------------------------------------------------
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 1,
      depth: 0.44, // Physical 3D thickness in Z
      bevelEnabled: true,
      bevelThickness: 0.1, // Smooth beveled edges
      bevelSize: 0.08,
      bevelOffset: 0,
      bevelSegments: 4, // Silky rounded bevel transitions
    };

    // Unified monolithic solid V shape
    const fullShape = new THREE.Shape();
    fullShape.moveTo(-2.313, 2.0); // Top-left outer
    fullShape.lineTo(0.0, -2.626); // Bottom outer apex
    fullShape.lineTo(2.313, 2.0); // Top-right outer
    fullShape.lineTo(1.687, 2.0); // Top-right inner
    fullShape.lineTo(0.0, -1.374); // Inner crotch apex
    fullShape.lineTo(-1.687, 2.0); // Top-left inner
    fullShape.closePath();

    const fullGeometry = new THREE.ExtrudeGeometry(fullShape, extrudeSettings);
    fullGeometry.center();

    const fullMesh = new THREE.Mesh(fullGeometry, metallicMaterial);
    fullMesh.visible = false;

    // Master group with realistic 3D perspective tilt
    const vGroup = new THREE.Group();
    vGroup.rotation.x = 0.22; // ~12.5 deg tilt backwards
    vGroup.rotation.y = -0.12; // ~7 deg tilt to side
    vGroup.position.set(0, 0.15, 0);

    vGroup.add(fullMesh);
    scene.add(vGroup);

    // Dynamic stroke meshes for progressive Step 1 and Step 2
    let stroke1Mesh: THREE.Mesh | null = null;
    let stroke2Mesh: THREE.Mesh | null = null;
    let prevGeom1: THREE.BufferGeometry | null = null;
    let prevGeom2: THREE.BufferGeometry | null = null;

    // Helper to build progressive stroke 1 (top-left to bottom-center)
    const updateStroke1Geometry = (p: number) => {
      try {
        const pClamped = Math.max(0.02, Math.min(1.0, p));
        const shape = new THREE.Shape();
        shape.moveTo(-2.313, 2.0);
        shape.lineTo(-2.313 * (1 - pClamped), 2.0 - 4.626 * pClamped);
        shape.lineTo(-1.687 * (1 - pClamped), 2.0 - 3.374 * pClamped);
        shape.lineTo(-1.687, 2.0);
        shape.closePath();

        const geom = new THREE.ExtrudeGeometry(shape, {
          ...extrudeSettings,
          bevelSegments: 3,
        });

        if (prevGeom1) prevGeom1.dispose();
        prevGeom1 = geom;

        if (!stroke1Mesh) {
          stroke1Mesh = new THREE.Mesh(geom, metallicMaterial);
          vGroup.add(stroke1Mesh);
        } else {
          stroke1Mesh.geometry = geom;
        }
        stroke1Mesh.visible = true;
      } catch {
        // Safe no-op on transient geometry frames
      }
    };

    // Helper to build progressive stroke 2 (bottom-center to top-right)
    const updateStroke2Geometry = (p: number) => {
      try {
        const pClamped = Math.max(0.02, Math.min(1.0, p));
        const shape = new THREE.Shape();
        shape.moveTo(0.0, -1.374);
        shape.lineTo(1.687 * pClamped, -1.374 + 3.374 * pClamped);
        shape.lineTo(2.313 * pClamped, -2.626 + 4.626 * pClamped);
        shape.lineTo(0.0, -2.626);
        shape.closePath();

        const geom = new THREE.ExtrudeGeometry(shape, {
          ...extrudeSettings,
          bevelSegments: 3,
        });

        if (prevGeom2) prevGeom2.dispose();
        prevGeom2 = geom;

        if (!stroke2Mesh) {
          stroke2Mesh = new THREE.Mesh(geom, metallicMaterial);
          vGroup.add(stroke2Mesh);
        } else {
          stroke2Mesh.geometry = geom;
        }
        stroke2Mesh.visible = true;
      } catch {
        // Safe no-op on transient geometry frames
      }
    };

    // -------------------------------------------------------------------------
    // 6. ANIMATION LIFECYCLE CONTROLLER
    // -------------------------------------------------------------------------
    let animationFrameId: number;
    const startTime = performance.now();

    const STEP1_START = 200; // t = 0.2s
    const STEP1_END = 750; // t = 0.75s (Stroke 1 \ forms)
    const STEP2_START = 750; // t = 0.75s
    const STEP2_END = 1300; // t = 1.30s (Stroke 2 / continues to top-right)
    const STEP3_UNIFY = 1300; // t = 1.30s (Strokes merge into solid 3D V)
    const SWEEP_START = 1300; // t = 1.30s (Light sweep glints across metallic bevels)
    const SWEEP_END = 2050; // t = 2.05s

    let stepNotified = 0;

    const cubicEase = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (now: number) => {
      const elapsed = now - startTime;

      // -----------------------------------------------------------------------
      // STEP 1: First 3D Stroke Forms (\)
      // -----------------------------------------------------------------------
      if (elapsed >= STEP1_START && elapsed < STEP1_END) {
        const rawProgress = (elapsed - STEP1_START) / (STEP1_END - STEP1_START);
        const p1 = cubicEase(Math.min(1.0, rawProgress));
        updateStroke1Geometry(p1);

        if (stepNotified < 1) {
          stepNotified = 1;
          onStepComplete?.(1);
        }
      }

      // -----------------------------------------------------------------------
      // STEP 2: Second 3D Stroke Continues to Top-Right (/)
      // -----------------------------------------------------------------------
      if (elapsed >= STEP2_START && elapsed < STEP2_END) {
        updateStroke1Geometry(1.0);

        const rawProgress = (elapsed - STEP2_START) / (STEP2_END - STEP2_START);
        const p2 = cubicEase(Math.min(1.0, rawProgress));
        updateStroke2Geometry(p2);

        if (stepNotified < 2) {
          stepNotified = 2;
          onStepComplete?.(2);
        }
      }

      // -----------------------------------------------------------------------
      // STEP 3 & 4: Seamless Monolithic Solid 3D V + Specular Light Sweep
      // -----------------------------------------------------------------------
      if (elapsed >= STEP3_UNIFY) {
        if (stroke1Mesh) stroke1Mesh.visible = false;
        if (stroke2Mesh) stroke2Mesh.visible = false;
        fullMesh.visible = true;

        if (stepNotified < 3) {
          stepNotified = 3;
          onStepComplete?.(3);
        }

        // STEP 4: Specular Light Sweep across the finished 3D metallic bevels
        if (elapsed >= SWEEP_START && elapsed <= SWEEP_END) {
          const sweepP = (elapsed - SWEEP_START) / (SWEEP_END - SWEEP_START);
          const sweepX = -4.5 + sweepP * 9.0;
          const sweepY = 3.0 - Math.sin(sweepP * Math.PI) * 2.2;
          sweepLight.position.set(sweepX, sweepY, 3.2);

          const intensity = Math.sin(sweepP * Math.PI) * 4.5;
          sweepLight.intensity = intensity;

          vGroup.rotation.y = -0.12 + Math.sin(sweepP * Math.PI) * 0.08;
          vGroup.rotation.x = 0.22 - Math.sin(sweepP * Math.PI) * 0.04;
        } else if (elapsed > SWEEP_END) {
          sweepLight.intensity = 0;
          vGroup.rotation.y = -0.06;
          vGroup.rotation.x = 0.18;
        }
      }

      const totalProgress = Math.min(1.0, elapsed / SWEEP_END);
      onProgress?.(totalProgress);

      try {
        renderer.render(scene, camera);
      } catch {
        // Safe render error handling
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    // -------------------------------------------------------------------------
    // 7. RESPONSIVE RESIZE OBSERVER
    // -------------------------------------------------------------------------
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // -------------------------------------------------------------------------
    // 8. CLEANUP (Without forceContextLoss to avoid destroying canvas context)
    // -------------------------------------------------------------------------
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      if (prevGeom1) prevGeom1.dispose();
      if (prevGeom2) prevGeom2.dispose();
      fullGeometry.dispose();
      metallicMaterial.dispose();
      renderer.dispose();

      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [onProgress, onStepComplete, onError]);

  return <div ref={containerRef} className={`relative ${className}`} />;
};
