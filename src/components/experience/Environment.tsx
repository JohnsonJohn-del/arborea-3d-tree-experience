'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ScrollStateRef } from '@/hooks/useScrollProgress';
import { computeTimelineSnapshot } from '@/hooks/useExperienceTimeline';

interface EnvironmentProps {
  scrollRef: React.MutableRefObject<ScrollStateRef>;
  isMobile: boolean;
}

function createGodRayGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const imgData = ctx.createImageData(128, 256);
    for (let y = 0; y < 256; y++) {
      const v = y / 255;
      const vFade = Math.pow(Math.sin(v * Math.PI), 1.8);
      for (let x = 0; x < 128; x++) {
        const u = x / 127;
        const uFade = Math.pow(Math.sin(u * Math.PI), 2.6);
        const alpha = Math.round(vFade * uFade * 255);
        const idx = (y * 128 + x) * 4;
        imgData.data[idx] = 248;
        imgData.data[idx + 1] = 232;
        imgData.data[idx + 2] = 188;
        imgData.data[idx + 3] = alpha;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function Environment({ scrollRef, isMobile }: EnvironmentProps) {
  const { scene } = useThree();

  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const fillLightRef = useRef<THREE.DirectionalLight>(null);
  const crownGlowRef = useRef<THREE.PointLight>(null);
  const godRaysGroupRef = useRef<THREE.Group>(null);

  const fogColor = useMemo(() => new THREE.Color('#070a07'), []);
  const godRayTexture = useMemo(() => createGodRayGradientTexture(), []);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    const s = scrollRef.current;
    const snap = computeTimelineSnapshot(s.smoothProgress, s.velocity);

    if (scene.fog && scene.fog instanceof THREE.FogExp2) {
      const targetDensity =
        snap.scrollProgress < 0.25
          ? THREE.MathUtils.lerp(0.045, 0.032, snap.scrollProgress / 0.25)
          : THREE.MathUtils.lerp(0.032, 0.018, snap.treeGrowth);
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, targetDensity, 0.08);
    }

    // Physically plausible golden-hour sunlight
    if (keyLightRef.current) {
      const baseIntensity = 2.4 + snap.treeGrowth * 1.15 + snap.finaleFactor * 0.5;
      keyLightRef.current.intensity = baseIntensity;
      keyLightRef.current.position.set(
        6.5 + Math.sin(elapsed * 0.12) * 0.4,
        11.5 + snap.treeGrowth * 2.0,
        6.2
      );
    }

    if (rimLightRef.current) {
      rimLightRef.current.intensity = 1.25 + snap.treeGrowth * 0.85;
    }

    if (fillLightRef.current) {
      fillLightRef.current.intensity = 0.85 + snap.treeGrowth * 0.45;
    }

    if (crownGlowRef.current) {
      crownGlowRef.current.intensity =
        snap.treeGrowth * 1.8 + snap.finaleFactor * 1.4;
    }

    // Subtle volumetric sunbeams high in the upper canopy (only visible when tree canopy is developed)
    if (godRaysGroupRef.current) {
      const rayVisibility = THREE.MathUtils.smoothstep(snap.treeGrowth, 0.48, 0.88);
      godRaysGroupRef.current.visible = rayVisibility > 0.01;
      godRaysGroupRef.current.children.forEach((child, idx) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const shimmer = 0.8 + 0.2 * Math.sin(elapsed * 0.7 + idx * 1.8);
        mat.opacity = rayVisibility * (0.042 + snap.finaleFactor * 0.025) * shimmer;
      });
    }
  });

  return (
    <>
      <color attach="background" args={['#070a07']} />
      <fogExp2 attach="fog" args={[fogColor, 0.032]} />

      {/* Natural Sky-to-Forest-Floor Hemisphere Illumination */}
      <hemisphereLight args={['#5e7d63', '#1c1812', 1.35]} />

      {/* Primary Warm Golden-Hour Sunlight with Wide Shadow Frustum */}
      <directionalLight
        ref={keyLightRef}
        position={[6.5, 12, 6]}
        color="#fff1d6"
        intensity={2.5}
        castShadow={!isMobile}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0005}
      />

      {/* Soft Sky Diffuse Fill from Opposite Side */}
      <directionalLight
        ref={fillLightRef}
        position={[-6, 5, 4]}
        color="#96b39b"
        intensity={0.95}
      />

      {/* Warm Backlight for Subsurface Leaf Translucency */}
      <directionalLight
        ref={rimLightRef}
        position={[-5, 9, -7]}
        color="#dceaa8"
        intensity={1.45}
      />

      {/* Subtle Canopy Interior Bounce Light */}
      <pointLight
        ref={crownGlowRef}
        position={[0, 4.2, 0.5]}
        color="#d4c48a"
        intensity={1.35}
        distance={14}
      />

      {/* High Canopy Volumetric Sunbeam Shafts (Positioned high above sapling at y=5.6m) */}
      <group ref={godRaysGroupRef} position={[0.8, 5.6, -1.0]} rotation={[0.08, 0.15, -0.34]}>
        <mesh position={[-1.5, 0, 0]}>
          <planeGeometry args={[2.6, 8.5]} />
          <meshBasicMaterial
            map={godRayTexture}
            transparent
            opacity={0.04}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh position={[0.5, 0.4, 0.4]} rotation={[0, 0.35, 0.05]}>
          <planeGeometry args={[2.2, 8.0]} />
          <meshBasicMaterial
            map={godRayTexture}
            transparent
            opacity={0.035}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh position={[1.9, -0.2, -0.4]} rotation={[0, -0.25, -0.04]}>
          <planeGeometry args={[2.4, 8.5]} />
          <meshBasicMaterial
            map={godRayTexture}
            transparent
            opacity={0.038}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </>
  );
}
