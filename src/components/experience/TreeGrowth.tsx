'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { ScrollStateRef } from '@/hooks/useScrollProgress';
import { TreeModel } from './TreeModel';

interface TreeGrowthProps {
  scrollRef: React.MutableRefObject<ScrollStateRef>;
  isMobile: boolean;
  reducedMotion: boolean;
}

/**
 * Creates a displaced organic forest clearing mound geometry with radial vertex-color
 * falloff to pure black so the forest floor blends seamlessly into the dark woodland horizon.
 */
function createForestFloorGeometry(isMobile: boolean): THREE.BufferGeometry {
  const segs = isMobile ? 64 : 104;
  const geom = new THREE.PlaneGeometry(42, 42, segs, segs);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const centerColor = new THREE.Color('#c8c1b4');
  const midColor = new THREE.Color('#3b3930');
  const edgeColor = new THREE.Color('#000000');
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const angle = Math.atan2(z, x);

    // Gentle root-crown swell near center (r < 2.8m) + natural forest floor undulation
    const rootMound = Math.exp(-r * r * 0.28) * 0.045;
    const radialSlope = -Math.pow(Math.min(r / 12.0, 1.0), 1.7) * 0.62;
    const microTerrain =
      (Math.sin(x * 2.4 + z * 1.8) * 0.018 +
        Math.cos(x * 4.5 - z * 3.7) * 0.01 +
        Math.sin(angle * 7.0) * Math.exp(-r * 0.5) * 0.024) *
      THREE.MathUtils.smoothstep(r, 0.06, 0.65);

    pos.setY(i, rootMound + radialSlope + microTerrain - 0.042);

    // Radial vignette vertex color so outer floor blends invisibly into #070a07 fog
    if (r < 3.6) {
      const t = r / 3.6;
      tmpColor.copy(centerColor).lerp(midColor, t * 0.45);
    } else {
      const t = THREE.MathUtils.clamp((r - 3.6) / 6.8, 0, 1);
      tmpColor.copy(centerColor).lerp(midColor, 0.45).lerp(edgeColor, THREE.MathUtils.smoothstep(t, 0.0, 1.0));
    }
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  return geom;
}

export function TreeGrowth({ scrollRef, isMobile, reducedMotion }: TreeGrowthProps) {
  const soilGranulesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const granuleGeometry = useMemo(() => new THREE.DodecahedronGeometry(1, 1), []);
  const floorGeometry = useMemo(() => createForestFloorGeometry(isMobile), [isMobile]);

  // Load photorealistic forest floor humus, moss & bark-chip texture
  const soilTexture = useTexture('/textures/forest-soil.jpg');
  useMemo(() => {
    soilTexture.wrapS = THREE.RepeatWrapping;
    soilTexture.wrapT = THREE.RepeatWrapping;
    soilTexture.repeat.set(28, 28);
    soilTexture.colorSpace = THREE.SRGBColorSpace;
    soilTexture.anisotropy = 8;
    soilTexture.needsUpdate = true;
  }, [soilTexture]);

  // Organic soil clods, small moss cushions, and bark fragments around the seedling & roots
  const granules = useMemo(() => {
    const count = isMobile ? 130 : 260;
    const items: {
      pos: THREE.Vector3;
      rot: THREE.Euler;
      scale: THREE.Vector3;
      color: THREE.Color;
    }[] = [];

    const palette = [
      new THREE.Color('#211b14'), // Rich dark humus clod
      new THREE.Color('#2b231a'), // Weathered bark fragment
      new THREE.Color('#362b20'), // Forest earth pebble
      new THREE.Color('#23361c'), // Forest moss cushion
      new THREE.Color('#2f4524'), // Lichen/moss tuft
    ];

    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 2.2) * 3.4 + 0.022;
      const theta = Math.random() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const rootMound = Math.exp(-r * r * 0.28) * 0.045;
      const radialSlope = -Math.pow(Math.min(r / 12.0, 1.0), 1.7) * 0.62;
      const microTerrain =
        (Math.sin(x * 2.4 + z * 1.8) * 0.018 +
          Math.cos(x * 4.5 - z * 3.7) * 0.01 +
          Math.sin(theta * 7.0) * Math.exp(-r * 0.5) * 0.024) *
        THREE.MathUtils.smoothstep(r, 0.06, 0.65);
      const y = rootMound + radialSlope + microTerrain - 0.045;

      const s = 0.005 + Math.random() * 0.014 * (0.4 + r * 0.45);
      items.push({
        pos: new THREE.Vector3(x, y, z),
        rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
        scale: new THREE.Vector3(
          s * (0.8 + Math.random() * 0.7),
          s * (0.45 + Math.random() * 0.35),
          s * (0.8 + Math.random() * 0.7)
        ),
        color: palette[i % palette.length],
      });
    }
    return items;
  }, [isMobile]);

  useEffect(() => {
    if (!soilGranulesRef.current) return;
    granules.forEach((g, idx) => {
      dummy.position.copy(g.pos);
      dummy.rotation.copy(g.rot);
      dummy.scale.copy(g.scale);
      dummy.updateMatrix();
      soilGranulesRef.current!.setMatrixAt(idx, dummy.matrix);
      soilGranulesRef.current!.setColorAt(idx, g.color);
    });
    soilGranulesRef.current.instanceMatrix.needsUpdate = true;
    if (soilGranulesRef.current.instanceColor) {
      soilGranulesRef.current.instanceColor.needsUpdate = true;
    }
  }, [granules, dummy]);

  return (
    <group name="tree-growth-stage">
      {/* Photorealistic Displaced Forest Humus & Moss Clearing */}
      <mesh geometry={floorGeometry} receiveShadow>
        <meshLambertMaterial
          map={soilTexture}
          bumpMap={soilTexture}
          bumpScale={0.035}
          vertexColors
        />
      </mesh>

      {/* 3D Micro-Soil Clods, Moss Cushions & Bark Fragments */}
      <instancedMesh
        key={isMobile ? 'granules-m' : 'granules-d'}
        ref={soilGranulesRef}
        args={[granuleGeometry, undefined, granules.length]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial
          map={soilTexture}
          roughness={0.95}
          metalness={0.01}
        />
      </instancedMesh>

      {/* The Continuously Growing 3D Ancient Oak Tree */}
      <TreeModel
        scrollRef={scrollRef}
        isMobile={isMobile}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}
