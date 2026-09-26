'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { BranchStoryData } from '@/data/branches';
import { ScrollStateRef } from '@/hooks/useScrollProgress';
import { computeTimelineSnapshot } from '@/hooks/useExperienceTimeline';

interface HangingCardProps {
  branch: BranchStoryData;
  index: number;
  scrollRef: React.MutableRefObject<ScrollStateRef>;
  reducedMotion: boolean;
  onSelectBranch: (branch: BranchStoryData) => void;
}

/**
 * Generates a high-resolution archival letterpress & cotton-rag paper texture
 * for the lower matboard of the 3D hanging photo card so typography lives
 * physically inside the 3D WebGL world with real lighting and shadows.
 */
function createArchivalLabelTexture(branch: BranchStoryData, hovered: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Warm museum archival paper background
    ctx.fillStyle = '#f4efe4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle organic paper grain
    ctx.fillStyle = 'rgba(28, 24, 18, 0.025)';
    for (let i = 0; i < 600; i++) {
      const gx = (i * 97) % canvas.width;
      const gy = (i * 53) % canvas.height;
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Thin inner archival border rule
    ctx.strokeStyle = hovered ? '#b89028' : 'rgba(32, 28, 22, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 18, canvas.width - 52, canvas.height - 36);

    // Category + Epoch header
    ctx.fillStyle = '#7a6332';
    ctx.font = '600 21px monospace';
    ctx.fillText(branch.category, 52, 66);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#6e685c';
    ctx.font = '500 19px monospace';
    ctx.fillText(branch.year, canvas.width - 52, 66);

    // Divider line
    ctx.strokeStyle = 'rgba(122, 99, 50, 0.32)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(52, 86);
    ctx.lineTo(canvas.width - 52, 86);
    ctx.stroke();

    // Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#141714';
    ctx.font = 'italic 600 44px Georgia, serif';
    ctx.fillText(`“${branch.title}”`, 52, 146);

    // Wrapped description
    ctx.fillStyle = '#383630';
    ctx.font = '400 23px sans-serif';
    const words = branch.description.split(' ');
    let line = '';
    let y = 198;
    const maxWidth = canvas.width - 104;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 52, y);
        line = words[n] + ' ';
        y += 33;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 52, y);

    // Bottom CTA pill
    const btnY = 322;
    ctx.fillStyle = hovered ? '#1b3824' : '#141815';
    ctx.fillRect(52, btnY, 265, 50);
    ctx.strokeStyle = '#c8a455';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(52, btnY, 265, 50);

    ctx.fillStyle = '#f4efe4';
    ctx.font = '600 19px monospace';
    ctx.fillText(`[ ${branch.ctaLabel} ]`, 72, btnY + 32);

    // Coordinates stamp
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7c7466';
    ctx.font = '500 18px monospace';
    ctx.fillText(branch.metadata.coordinates, canvas.width - 52, btnY + 32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function HangingCard({
  branch,
  index,
  scrollRef,
  reducedMotion,
  onSelectBranch,
}: HangingCardProps) {
  const pendulumRef = useRef<THREE.Group>(null);
  const cardLightRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);

  // Load the cohesive generated botanical photograph
  const photoTexture = useTexture(branch.image);
  useMemo(() => {
    photoTexture.colorSpace = THREE.SRGBColorSpace;
    photoTexture.anisotropy = 4;
  }, [photoTexture]);

  const labelTexture = useMemo(
    () => createArchivalLabelTexture(branch, hovered),
    [branch, hovered]
  );

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  // Pendulum physics state
  const physicsRef = useRef({
    angleX: 0,
    angleZ: 0,
    velX: 0,
    velZ: 0,
  });

  const cordLength = branch.branchAttachment.y - branch.cardPosition.y;

  useFrame((state) => {
    if (!pendulumRef.current) return;
    const elapsed = state.clock.getElapsedTime();
    const s = scrollRef.current;
    const snap = computeTimelineSnapshot(s.smoothProgress, s.velocity);

    // Cards unfurl as the tree reaches Stage 04 Full Tree (scrollProgress 0.54 -> 0.68)
    const cardReveal = THREE.MathUtils.smoothstep(
      s.smoothProgress,
      0.54 + index * 0.018,
      0.66 + index * 0.018
    );
    pendulumRef.current.scale.setScalar(Math.max(0.0001, cardReveal));
    pendulumRef.current.visible = cardReveal > 0.005;

    if (cardReveal <= 0.005) return;

    // Physical pendulum simulation driven by wind, scroll velocity, and mouse parallax
    const p = physicsRef.current;
    const motionScale = reducedMotion ? 0.15 : 1.0;

    const windForceZ =
      Math.sin(elapsed * 1.35 + index * 1.7) * 0.045 +
      Math.cos(elapsed * 2.6 + index) * 0.018;
    const windForceX =
      Math.cos(elapsed * 1.1 + index * 1.3) * 0.035;

    const scrollImpulseZ = THREE.MathUtils.clamp(s.velocity * 0.16, -0.18, 0.18);
    const pointerParallaxZ = s.pointerX * 0.045;
    const pointerParallaxX = -s.pointerY * 0.035;

    const targetZ = (windForceZ + scrollImpulseZ + pointerParallaxZ) * motionScale;
    const targetX = (windForceX + pointerParallaxX) * motionScale;

    // Spring-damper integration
    p.velZ += (targetZ - p.angleZ) * 0.08;
    p.velX += (targetX - p.angleX) * 0.08;
    p.velZ *= 0.88;
    p.velX *= 0.88;
    p.angleZ += p.velZ;
    p.angleX += p.velX;

    pendulumRef.current.rotation.set(
      branch.rotation.x + p.angleX,
      branch.rotation.y + Math.sin(elapsed * 0.7 + index) * 0.04 * motionScale,
      branch.rotation.z + p.angleZ
    );

    // Illuminate card warmly when it is the active branch or hovered
    if (cardLightRef.current) {
      const isActive = snap.activeBranchIndex === index;
      const targetIntensity = isActive
        ? 1.85 + snap.branchLockFactor * 1.2
        : hovered
        ? 1.4
        : 0.45 * cardReveal;
      cardLightRef.current.intensity = THREE.MathUtils.lerp(
        cardLightRef.current.intensity,
        targetIntensity,
        0.1
      );
    }
  });

  return (
    <group
      position={[
        branch.branchAttachment.x,
        branch.branchAttachment.y,
        branch.branchAttachment.z,
      ]}
    >
      {/* Dedicated warm museum gallery light illuminating this hanging card */}
      <pointLight
        ref={cardLightRef}
        position={[0.15, -cordLength * 0.65, 0.85]}
        color={branch.accentColor}
        intensity={0.5}
        distance={3.6}
      />

      {/* Pivoting Pendulum Assembly anchored right at the branch knot */}
      <group ref={pendulumRef}>
        {/* Brass Branch Tie Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.042, 0.008, 10, 24]} />
          <meshStandardMaterial color="#c9a44c" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* Fine Braided Linen & Brass Suspension Cord */}
        <mesh position={[0, -cordLength * 0.5, 0]}>
          <cylinderGeometry args={[0.0045, 0.0045, cordLength, 8]} />
          <meshStandardMaterial color="#b89852" metalness={0.6} roughness={0.45} />
        </mesh>

        {/* Top Brass Clasp at Frame Crown */}
        <mesh position={[0, -cordLength + 0.44, 0]}>
          <cylinderGeometry args={[0.016, 0.022, 0.04, 12]} />
          <meshStandardMaterial color="#d4af37" metalness={0.88} roughness={0.22} />
        </mesh>

        {/* THE PHYSICAL 3D ARCHIVAL PHOTO CARD */}
        <group
          position={[0, -cordLength, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectBranch(branch);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        >
          {/* Outer Sculpted Dark Bronze Gallery Frame */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.72, 0.94, 0.026]} />
            <meshStandardMaterial
              color={hovered ? '#2a2419' : '#171512'}
              metalness={0.55}
              roughness={0.38}
            />
          </mesh>

          {/* Thin Inner Gold Filigree Bevel */}
          <mesh position={[0, 0, 0.004]}>
            <boxGeometry args={[0.685, 0.905, 0.022]} />
            <meshStandardMaterial
              color="#c5a049"
              metalness={0.78}
              roughness={0.26}
            />
          </mesh>

          {/* Warm Cotton-Rag Archival Matboard */}
          <mesh position={[0, 0, 0.008]}>
            <boxGeometry args={[0.665, 0.885, 0.018]} />
            <meshStandardMaterial
              color="#f2ece0"
              roughness={0.88}
              metalness={0.02}
            />
          </mesh>

          {/* Upper Photographic Print (3:4 Fine Art Botanical Image) */}
          <mesh position={[0, 0.165, 0.018]}>
            <planeGeometry args={[0.59, 0.49]} />
            <meshStandardMaterial
              map={photoTexture}
              roughness={0.32}
              metalness={0.04}
            />
          </mesh>

          {/* Lower Letterpress Archival Story & Metadata Print */}
          <mesh position={[0, -0.24, 0.018]}>
            <planeGeometry args={[0.61, 0.33]} />
            <meshStandardMaterial
              map={labelTexture}
              roughness={0.75}
              metalness={0.02}
            />
          </mesh>

          {/* Backside Embossed Brass Medallion (visible as camera orbits behind branches) */}
          <mesh position={[0, 0, -0.014]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.64, 0.86]} />
            <meshStandardMaterial
              color="#1b1813"
              roughness={0.65}
              metalness={0.35}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
