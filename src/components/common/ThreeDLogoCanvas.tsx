// =============================================================================
// VAAHAN TRANSIT SYSTEM - 3D LOGO CANVAS
// Real 3D Extruded Geometry with Polished Metallic Silver/Chrome & Cyan Highlights
//
// Animation Sequence:
//   Step 1: First 3D stroke draws from top-left to bottom-center (\)
//   Step 2: Second 3D stroke continues from bottom-center to top-right (/)
//   Step 3: Both strokes meet seamlessly to form the complete symmetrical uppercase 3D V
//   Step 4: Physically based specular light sweep glints across the chrome bevels
//   Step 5: Brand typography reveals beneath the completed 3D emblem
//
// Architecture:
//   - Zero runtime geometry re-creation: uses pre-built extruded beveled 3D solids
//   - Local clipping planes guarantee that Stroke 1 and Stroke 2 ALWAYS execute fully
//   - Polished metallic chrome material with electric cyan and sky blue highlights
//   - Zero precision crashes, safe dynamic canvas lifecycle, and clean disposal
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
    // 1. DYNAMIC FRESH CANVAS & SAFE CONTEXT ACQUISITION
    // -------------------------------------------------------------------------
    const canvas = document.createElement('canvas');
    canvas.className =
      'w-full h-full block filter drop-shadow-[0_18px_40px_rgba(14,165,233,0.35)]';
    container.appendChild(canvas);

    let gl: RenderingContext | null = null;
    const contextAttributes: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      powerPreference: 'default',
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

    // Enable local clipping planes for smooth, un-failing stroke progression
    renderer.localClippingEnabled = true;

    const scene = new THREE.Scene();

    const width = container.clientWidth || 260;
    const height = container.clientHeight || 260;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 8.2);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    // -------------------------------------------------------------------------
    // 3. MULTI-TIER STUDIO LIGHTING RIG
    // Polished Silver/Chrome with Electric Cyan & Light Sky Blue Reflections
    // -------------------------------------------------------------------------
    // Ambient light: Deep navy shadow fill
    const ambientLight = new THREE.AmbientLight(0x0a1128, 1.2);
    scene.add(ambientLight);

    // Key Light 1 (White Specular Core): Gleaming silver chrome highlights
    const keyLightWhite = new THREE.DirectionalLight(0xffffff, 3.5);
    keyLightWhite.position.set(2.5, 4.0, 5.0);
    scene.add(keyLightWhite);

    // Key Light 2 (Electric Cyan Accent): Vibrant electric cyan edge glints
    const keyLightCyan = new THREE.DirectionalLight(0x0ea5e9, 3.2);
    keyLightCyan.position.set(-4.5, -1.5, 3.5);
    scene.add(keyLightCyan);

    // Fill Light (Light Sky Blue): Highlights the right wing and extrusion depths
    const fillLightSky = new THREE.DirectionalLight(0x38bdf8, 2.6);
    fillLightSky.position.set(4.0, -2.5, 4.0);
    scene.add(fillLightSky);

    // Rim Light (Ice Blue Specular Contour): Highlights the rear bevels
    const rimLightIce = new THREE.DirectionalLight(0x7dd3fc, 3.0);
    rimLightIce.position.set(0.0, 4.0, -3.5);
    scene.add(rimLightIce);

    // Light Sweep: Moving specular point light for Step 4
    const sweepLight = new THREE.PointLight(0xffffff, 0, 9.0, 1.2);
    sweepLight.position.set(-4.5, 3.5, 3.0);
    scene.add(sweepLight);

    // -------------------------------------------------------------------------
    // 4. POLISHED METALLIC CHROME & SILVER MATERIALS
    // -------------------------------------------------------------------------
    // Left Stroke Clipping Plane (Sweeps top-left -> bottom-center)
    const clipPlaneLeft = new THREE.Plane(
      new THREE.Vector3(-0.3876, 0.9218, 0),
      -3.4
    );

    // Right Stroke Clipping Plane (Sweeps bottom-center -> top-right)
    const clipPlaneRight = new THREE.Plane(
      new THREE.Vector3(-0.3876, -0.9218, 0),
      -2.5
    );

    // Shared material configuration for polished metallic chrome
    const createChromeMaterial = (clippingPlanes: THREE.Plane[] = []) =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xf1f5f9), // Polished platinum / chrome silver
        emissive: new THREE.Color(0x0284c7), // Subtle cyan undertone
        emissiveIntensity: 0.12, // Subtle, clean luster without neon wash
        metalness: 0.94, // High-gloss metallic chrome
        roughness: 0.1, // Mirror polish for crisp specular bevel reflections
        clearcoat: 1.0, // High-gloss automotive clearcoat layer
        clearcoatRoughness: 0.05,
        reflectivity: 1.0,
        clippingPlanes,
        clipShadows: true,
        side: THREE.DoubleSide,
      });

    const materialLeft = createChromeMaterial([clipPlaneLeft]);
    const materialRight = createChromeMaterial([clipPlaneRight]);
    const materialFull = createChromeMaterial([]);

    // -------------------------------------------------------------------------
    // 5. MATHEMATICALLY EXACT 3D V GEOMETRIES (Counter-Clockwise Winding)
    // -------------------------------------------------------------------------
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 1,
      depth: 0.48, // Physical 3D thickness in Z
      bevelEnabled: true,
      bevelThickness: 0.09, // Smooth beveled edges
      bevelSize: 0.08,
      bevelOffset: 0,
      bevelSegments: 4, // Silky rounded bevel transitions
    };

    // A. Left Arm Shape (\ stroke: top-left to apex)
    const leftShape = new THREE.Shape();
    leftShape.moveTo(-2.186, 2.6); // Top-left outer
    leftShape.lineTo(0.0, -2.6); // Outer apex
    leftShape.lineTo(0.0, -1.0); // Inner crotch
    leftShape.lineTo(-1.514, 2.6); // Top-left inner
    leftShape.closePath();

    const leftGeometry = new THREE.ExtrudeGeometry(leftShape, extrudeSettings);
    const leftMesh = new THREE.Mesh(leftGeometry, materialLeft);

    // B. Right Arm Shape (/ stroke: apex to top-right)
    const rightShape = new THREE.Shape();
    rightShape.moveTo(0.0, -2.6); // Outer apex
    rightShape.lineTo(2.186, 2.6); // Top-right outer
    rightShape.lineTo(1.514, 2.6); // Top-right inner
    rightShape.lineTo(0.0, -1.0); // Inner crotch
    rightShape.closePath();

    const rightGeometry = new THREE.ExtrudeGeometry(rightShape, extrudeSettings);
    const rightMesh = new THREE.Mesh(rightGeometry, materialRight);
    rightMesh.visible = false; // Hidden until Step 1 completes

    // C. Unified Monolithic Complete 3D V Shape
    const fullShape = new THREE.Shape();
    fullShape.moveTo(0.0, -2.6); // Outer apex
    fullShape.lineTo(2.186, 2.6); // Top-right outer
    fullShape.lineTo(1.514, 2.6); // Top-right inner
    fullShape.lineTo(0.0, -1.0); // Inner crotch
    fullShape.lineTo(-1.514, 2.6); // Top-left inner
    fullShape.lineTo(-2.186, 2.6); // Top-left outer
    fullShape.closePath();

    const fullGeometry = new THREE.ExtrudeGeometry(fullShape, extrudeSettings);
    const fullMesh = new THREE.Mesh(fullGeometry, materialFull);
    fullMesh.visible = false; // Activated once both strokes complete

    // Master group with realistic 3D perspective tilt
    const vGroup = new THREE.Group();
    // Default 3D isometric tilt to exhibit real depth, extrusion, and beveled reflections
    vGroup.rotation.x = 0.22; // ~12.5 deg tilt backwards
    vGroup.rotation.y = -0.12; // ~7 deg tilt to side
    vGroup.position.set(0, 0.1, 0);

    vGroup.add(leftMesh);
    vGroup.add(rightMesh);
    vGroup.add(fullMesh);
    scene.add(vGroup);

    // -------------------------------------------------------------------------
    // 6. ANIMATION LIFECYCLE CONTROLLER
    // -------------------------------------------------------------------------
    let animationFrameId: number;
    const startTime = performance.now();

    // Timeline in milliseconds:
    const STEP1_START = 200; // t = 0.20s: First stroke begins
    const STEP1_END = 850; // t = 0.85s: First stroke completes at bottom-center (\)
    const STEP2_START = 850; // t = 0.85s: Second stroke begins from bottom-center
    const STEP2_END = 1500; // t = 1.50s: Second stroke completes at top-right (/)
    const STEP3_UNIFY = 1500; // t = 1.50s: Seamless solid 3D V
    const SWEEP_START = 1500; // t = 1.50s: Specular light sweep across chrome bevels
    const SWEEP_END = 2300; // t = 2.30s: Sweep completes

    let stepNotified = 0;

    const cubicEase = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (now: number) => {
      const elapsed = now - startTime;

      // -----------------------------------------------------------------------
      // STEP 1: First 3D Stroke Forms (\) from top-left to bottom-center
      // -----------------------------------------------------------------------
      if (elapsed < STEP2_START) {
        leftMesh.visible = true;
        rightMesh.visible = false;
        fullMesh.visible = false;

        const rawP1 = Math.max(
          0,
          Math.min(1.0, (elapsed - STEP1_START) / (STEP1_END - STEP1_START))
        );
        const p1 = cubicEase(rawP1);
        // Plane moves from -3.40 (fully clipped) to +2.60 (fully revealed)
        clipPlaneLeft.constant = -3.4 + p1 * 6.0;

        if (rawP1 > 0 && stepNotified < 1) {
          stepNotified = 1;
          onStepComplete?.(1);
        }
      }

      // -----------------------------------------------------------------------
      // STEP 2: Second 3D Stroke Continues from bottom-center to top-right (/)
      // -----------------------------------------------------------------------
      if (elapsed >= STEP2_START && elapsed < STEP3_UNIFY) {
        // Ensure Stroke 1 stays 100% visible
        leftMesh.visible = true;
        clipPlaneLeft.constant = 2.6;

        // Reveal Stroke 2 progressively upwards
        rightMesh.visible = true;
        fullMesh.visible = false;

        const rawP2 = Math.max(
          0,
          Math.min(1.0, (elapsed - STEP2_START) / (STEP2_END - STEP2_START))
        );
        const p2 = cubicEase(rawP2);
        // Plane moves from -2.50 (at bottom apex) up to +3.40 (fully revealed at top-right)
        clipPlaneRight.constant = -2.5 + p2 * 5.9;

        if (stepNotified < 2) {
          stepNotified = 2;
          onStepComplete?.(2);
        }
      }

      // -----------------------------------------------------------------------
      // STEP 3 & 4: Seamless Monolithic Solid 3D V + Specular Light Sweep
      // -----------------------------------------------------------------------
      if (elapsed >= STEP3_UNIFY) {
        leftMesh.visible = false;
        rightMesh.visible = false;
        fullMesh.visible = true;

        if (stepNotified < 3) {
          stepNotified = 3;
          onStepComplete?.(3);
        }

        // STEP 4: Specular Light Sweep glints across the finished chrome bevels
        if (elapsed >= SWEEP_START && elapsed <= SWEEP_END) {
          const sweepP = (elapsed - SWEEP_START) / (SWEEP_END - SWEEP_START);
          // Sweep path: Top-left -> Apex -> Top-right
          const sweepX = -4.5 + sweepP * 9.0;
          const sweepY = 3.5 - Math.sin(sweepP * Math.PI) * 2.5;
          sweepLight.position.set(sweepX, sweepY, 3.2);

          // Specular flare intensity
          const intensity = Math.sin(sweepP * Math.PI) * 5.5;
          sweepLight.intensity = intensity;

          // Camera micro-yaw conveying realistic physical depth
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
        // Safe frame skip
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
    // 8. RESOURCE CLEANUP
    // -------------------------------------------------------------------------
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      leftGeometry.dispose();
      rightGeometry.dispose();
      fullGeometry.dispose();
      materialLeft.dispose();
      materialRight.dispose();
      materialFull.dispose();
      renderer.dispose();

      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [onProgress, onStepComplete, onError]);

  return <div ref={containerRef} className={`relative ${className}`} />;
};
