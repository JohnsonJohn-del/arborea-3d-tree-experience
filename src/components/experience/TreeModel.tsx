'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { ScrollStateRef } from '@/hooks/useScrollProgress';
import { computeTimelineSnapshot } from '@/hooks/useExperienceTimeline';
import { generateProceduralTree } from '@/lib/treeGenerator';
import { getBotanicalTextures } from '@/lib/botanicalTextures';
import { applyBarkGrowthShader, BarkShaderUniforms } from '@/shaders/treeShaders';

interface TreeModelProps {
  scrollRef: React.MutableRefObject<ScrollStateRef>;
  isMobile: boolean;
  reducedMotion: boolean;
}

/**
 * Creates a 3D doubly-curved single oak leaf mesh with UVs [0..1] mapped to leafColorMap / leafNormalMap.
 * Pivot is at the base of the petiole (0, 0, 0) extending along +Y, oriented so pitching outward (+X)
 * points the upper leaf blade normal toward the sky (+Y).
 */
function createCurvedOakLeafGeometry(): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(0.72, 1.0, 6, 8);
  // Shift plane so bottom edge (petiole base) sits at y = 0
  geom.translate(0, 0.5, 0);
  // Orient front face so when pitched outward (+X rotation), front normal points upward (+Y)
  geom.rotateY(Math.PI);

  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Natural downward arch along length + V-channel along midrib + subtle wavy margin
    const archZ = Math.sin(y * Math.PI) * 0.11 - Math.abs(x) * 0.15 + Math.sin(y * 9.0 + x * 6.0) * 0.016;
    pos.setZ(i, archZ);
  }
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates a 3D volumetric 3-plane botanical twig spray cluster geometry.
 * Three curved planes intersect at different 3D angles so the foliage cluster
 * has genuine volume and depth from every camera angle without billboard artifacts.
 */
function createVolumetricSprayGeometry(): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];
  const angles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

  angles.forEach((ang, idx) => {
    const plane = new THREE.PlaneGeometry(1.12, 1.12, 4, 4);
    plane.translate(0, 0.50, 0);
    plane.rotateY(Math.PI);
    const pos = plane.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const zCurve = Math.sin(y * Math.PI) * 0.15 - Math.abs(x) * 0.13;
      pos.setZ(i, zCurve);
    }
    plane.rotateX(0.32 + idx * 0.08);
    plane.rotateY(ang);
    plane.computeVertexNormals();
    geometries.push(plane);
  });

  // Merge the 3 planes into a single BufferGeometry
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let offset = 0;

  for (const g of geometries) {
    const p = g.attributes.position.array as Float32Array;
    const n = g.attributes.normal.array as Float32Array;
    const u = g.attributes.uv.array as Float32Array;
    const idxArr = g.index!.array;

    for (let i = 0; i < p.length; i++) positions.push(p[i]);
    for (let i = 0; i < n.length; i++) normals.push(n[i]);
    for (let i = 0; i < u.length; i++) uvs.push(u[i]);
    for (let i = 0; i < idxArr.length; i++) indices.push(idxArr[i] + offset);

    offset += g.attributes.position.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  return merged;
}

export function TreeModel({ scrollRef, isMobile, reducedMotion }: TreeModelProps) {
  const treeData = useMemo(() => generateProceduralTree(isMobile), [isMobile]);
  const singleLeafGeo = useMemo(() => createCurvedOakLeafGeometry(), []);
  const sprayClusterGeo = useMemo(() => createVolumetricSprayGeometry(), []);
  const botanicalTextures = useMemo(() => getBotanicalTextures(), []);

  // Load photorealistic ancient oak bark texture
  const barkTexture = useTexture('/textures/oak-bark.jpg');
  useMemo(() => {
    barkTexture.wrapS = THREE.RepeatWrapping;
    barkTexture.wrapT = THREE.RepeatWrapping;
    barkTexture.colorSpace = THREE.SRGBColorSpace;
    barkTexture.anisotropy = 8;
    barkTexture.needsUpdate = true;
  }, [barkTexture]);

  // Slender, natural botanical seedling stem & root geometries for Stage 01
  const { saplingStemGeo, radicleRootGeo, petioleGeo } = useMemo(() => {
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, -0.015, 0.0),
      new THREE.Vector3(0.004, 0.065, 0.003),
      new THREE.Vector3(-0.005, 0.145, -0.002),
      new THREE.Vector3(0.002, 0.225, 0.002),
      new THREE.Vector3(0.0, 0.285, 0.0),
    ]);
    const stem = new THREE.TubeGeometry(stemCurve, 24, 0.0042, 10, false);

    // Taper stem naturally from hypocotyl base toward top apex
    const sPos = stem.attributes.position;
    for (let i = 0; i < sPos.count; i++) {
      const y = sPos.getY(i);
      const t = THREE.MathUtils.clamp(y / 0.285, 0, 1);
      const taper = 1.15 - t * 0.45;
      sPos.setX(i, sPos.getX(i) * taper);
      sPos.setZ(i, sPos.getZ(i) * taper);
    }
    stem.computeVertexNormals();

    const rootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.008, 0.012, 0.004),
      new THREE.Vector3(0.015, 0.004, 0.018),
      new THREE.Vector3(0.038, -0.008, 0.028),
      new THREE.Vector3(0.065, -0.025, 0.035),
    ]);
    const root = new THREE.TubeGeometry(rootCurve, 12, 0.0026, 6, false);

    const petCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.12, 0.03),
      new THREE.Vector3(0, 0.24, 0.07),
    ]);
    const pet = new THREE.TubeGeometry(petCurve, 8, 0.014, 6, false);

    return { saplingStemGeo: stem, radicleRootGeo: root, petioleGeo: pet };
  }, []);

  const sprayMeshRef = useRef<THREE.InstancedMesh>(null);
  const leafMeshRef = useRef<THREE.InstancedMesh>(null);
  const fallenMeshRef = useRef<THREE.InstancedMesh>(null);

  const saplingGroupRef = useRef<THREE.Group>(null);
  const saplingLightRef = useRef<THREE.PointLight>(null);
  const saplingLeavesRef = useRef<(THREE.Group | null)[]>([]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const barkUniforms = useMemo<BarkShaderUniforms>(
    () => ({
      uGrowth: { value: 0.01 },
      uTime: { value: 0 },
      uWindStrength: { value: 1.0 },
      uFinaleGlow: { value: 0.0 },
    }),
    []
  );

  const barkMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: barkTexture,
      bumpMap: barkTexture,
      bumpScale: 0.11,
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.03,
      emissive: new THREE.Color('#1c150e'),
      emissiveIntensity: 0.26,
    });
    mat.onBeforeCompile = (shader) => applyBarkGrowthShader(shader, barkUniforms);
    return mat;
  }, [barkTexture, barkUniforms]);

  const barkDepthMaterial = useMemo(() => {
    const mat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    mat.onBeforeCompile = (shader) => applyBarkGrowthShader(shader, barkUniforms);
    return mat;
  }, [barkUniforms]);

  // Initialize instance colors once for sprays, close-up leaves, and fallen leaves
  useEffect(() => {
    if (sprayMeshRef.current) {
      treeData.sprayClusters.forEach((item, i) => {
        sprayMeshRef.current!.setColorAt(i, item.color);
      });
      if (sprayMeshRef.current.instanceColor) {
        sprayMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
    if (leafMeshRef.current) {
      treeData.individualLeaves.forEach((item, i) => {
        leafMeshRef.current!.setColorAt(i, item.color);
      });
      if (leafMeshRef.current.instanceColor) {
        leafMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
    if (fallenMeshRef.current) {
      treeData.fallenLeaves.forEach((item, i) => {
        dummy.position.copy(item.position);
        dummy.rotation.copy(item.rotation);
        dummy.scale.setScalar(item.scale);
        dummy.updateMatrix();
        fallenMeshRef.current!.setMatrixAt(i, dummy.matrix);
        fallenMeshRef.current!.setColorAt(i, item.color);
      });
      fallenMeshRef.current.instanceMatrix.needsUpdate = true;
      if (fallenMeshRef.current.instanceColor) {
        fallenMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [treeData, dummy]);

  // 7 Realistic Quercus robur sapling leaves arranged in natural spiral phyllotaxy.
  const saplingLeafConfigs = useMemo(
    () => [
      // Lower juvenile pair spreading wide
      { y: 0.095, rotY: 0.72, tiltX: 0.96, rollZ: 0.22, baseScale: 0.105, birth: 0.0 },
      { y: 0.118, rotY: -0.78, tiltX: 0.94, rollZ: -0.22, baseScale: 0.112, birth: 0.0 },
      // Mid-stem alternate leaves
      { y: 0.168, rotY: 1.28, tiltX: 0.86, rollZ: 0.28, baseScale: 0.132, birth: 0.0 },
      { y: 0.192, rotY: -1.32, tiltX: 0.84, rollZ: -0.28, baseScale: 0.128, birth: 0.0 },
      // Upper terminal rosette of young oak leaves at shoot apex
      { y: 0.248, rotY: 0.48, tiltX: 0.78, rollZ: 0.18, baseScale: 0.142, birth: 0.0 },
      { y: 0.258, rotY: -0.52, tiltX: 0.80, rollZ: -0.18, baseScale: 0.138, birth: 0.01 },
      { y: 0.268, rotY: 2.85, tiltX: 0.84, rollZ: 0.15, baseScale: 0.118, birth: 0.02 },
    ],
    []
  );

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    const s = scrollRef.current;
    const snap = computeTimelineSnapshot(s.smoothProgress, s.velocity);

    const effectiveGrowth = snap.treeGrowth;
    const windFactor = reducedMotion
      ? 0.12
      : 0.85 + Math.min(1.1, Math.abs(s.velocity) * 1.6);

    // 1. Update GPU Bark Shader Uniforms
    barkUniforms.uGrowth.value = effectiveGrowth;
    barkUniforms.uTime.value = elapsed;
    barkUniforms.uWindStrength.value = windFactor;
    barkUniforms.uFinaleGlow.value = snap.finaleFactor;

    // 2. Animate Realistic Botanical Oak Sapling (Stage 01 -> seamlessly absorbed into woody trunk)
    if (saplingGroupRef.current) {
      saplingGroupRef.current.visible = s.smoothProgress < 0.23;
      const saplingGrowth = THREE.MathUtils.clamp(s.smoothProgress / 0.22, 0, 1);
      const gentleBreeze = Math.sin(elapsed * 1.35) * 0.018 * windFactor;
      saplingGroupRef.current.rotation.z = gentleBreeze;
      saplingGroupRef.current.rotation.x = Math.cos(elapsed * 1.05) * 0.012 * windFactor;

      const stemStretchY = 1.0 + saplingGrowth * 1.85;
      const stemThickXZ = 1.0 + saplingGrowth * 1.4;
      saplingGroupRef.current.scale.set(stemThickXZ, stemStretchY, stemThickXZ);

      if (saplingLightRef.current) {
        saplingLightRef.current.intensity = (1.0 - THREE.MathUtils.smoothstep(s.smoothProgress, 0.14, 0.35)) * 2.2;
      }

      saplingLeafConfigs.forEach((cfg, idx) => {
        const pitchGrp = saplingLeavesRef.current[idx];
        if (!pitchGrp) return;
        const leafUnfurl = THREE.MathUtils.smoothstep(s.smoothProgress, cfg.birth, cfg.birth + 0.12);
        const flutter = Math.sin(elapsed * 2.1 + idx * 1.4) * 0.038 * windFactor;
        pitchGrp.rotation.set(cfg.tiltX + flutter, 0, cfg.rollZ + flutter * 0.45);
        pitchGrp.scale.setScalar(cfg.baseScale * (0.86 + leafUnfurl * 0.35));
      });
    }

    if (fallenMeshRef.current) {
      fallenMeshRef.current.visible = effectiveGrowth > 0.18;
    }

    // 3. Update Instanced Volumetric Oak Twig-and-Leaf Spray Clusters
    if (sprayMeshRef.current) {
      const sprays = treeData.sprayClusters;
      for (let i = 0; i < sprays.length; i++) {
        const sp = sprays[i];
        if (effectiveGrowth <= sp.birth) {
          dummy.position.set(0, -100, 0);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          sprayMeshRef.current.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const pruneFactor =
          sp.pruneStart !== undefined && sp.pruneEnd !== undefined
            ? 1.0 - THREE.MathUtils.smoothstep(effectiveGrowth, sp.pruneStart, sp.pruneEnd)
            : 1.0;

        if (pruneFactor <= 0.001) {
          dummy.position.set(0, -100, 0);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          sprayMeshRef.current.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const t = THREE.MathUtils.clamp(
          (effectiveGrowth - sp.birth) / Math.max(0.001, sp.mature - sp.birth),
          0,
          1
        );
        const easeScale = (1 - Math.pow(1 - t, 3)) * pruneFactor;

        // Subtle, natural breeze rustle on outer foliage clusters
        const breeze = Math.sin(elapsed * 1.45 + sp.phase) * 0.042 * windFactor;
        const heightRatio = THREE.MathUtils.clamp(sp.position.y / 6.5, 0, 1.2);
        const swayX =
          Math.sin(elapsed * 0.95 + sp.position.y * 0.55 + sp.position.x * 0.4) *
          0.022 *
          heightRatio *
          windFactor;
        const swayZ =
          Math.cos(elapsed * 0.82 + sp.position.z * 0.5 + sp.position.y * 0.45) *
          0.022 *
          heightRatio *
          windFactor;

        dummy.position.set(
          sp.position.x + swayX,
          sp.position.y,
          sp.position.z + swayZ
        );
        dummy.rotation.set(
          sp.rotation.x + breeze,
          sp.rotation.y + breeze * 0.5,
          sp.rotation.z + breeze * 0.7
        );
        dummy.scale.setScalar(sp.scale * easeScale);
        dummy.updateMatrix();
        sprayMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      sprayMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 4. Update Instanced Individual Sculpted Close-Up Oak Leaves
    if (leafMeshRef.current) {
      const leaves = treeData.individualLeaves;
      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        if (effectiveGrowth <= leaf.birth) {
          dummy.position.set(0, -100, 0);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          leafMeshRef.current.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const pruneFactor =
          leaf.pruneStart !== undefined && leaf.pruneEnd !== undefined
            ? 1.0 - THREE.MathUtils.smoothstep(effectiveGrowth, leaf.pruneStart, leaf.pruneEnd)
            : 1.0;

        if (pruneFactor <= 0.001) {
          dummy.position.set(0, -100, 0);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          leafMeshRef.current.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const t = THREE.MathUtils.clamp(
          (effectiveGrowth - leaf.birth) / Math.max(0.001, leaf.mature - leaf.birth),
          0,
          1
        );
        const easeScale = (1 - Math.pow(1 - t, 3)) * pruneFactor;
        const flutter = Math.sin(elapsed * 1.85 + leaf.phase) * 0.055 * windFactor;
        const heightRatio = THREE.MathUtils.clamp(leaf.position.y / 6.5, 0, 1.2);
        const swayX =
          Math.sin(elapsed * 0.95 + leaf.position.y * 0.55 + leaf.position.x * 0.4) *
          0.022 *
          heightRatio *
          windFactor;
        const swayZ =
          Math.cos(elapsed * 0.82 + leaf.position.z * 0.5 + leaf.position.y * 0.45) *
          0.022 *
          heightRatio *
          windFactor;

        dummy.position.set(
          leaf.position.x + swayX,
          leaf.position.y,
          leaf.position.z + swayZ
        );
        dummy.rotation.set(
          leaf.rotation.x + flutter,
          leaf.rotation.y + flutter * 0.5,
          leaf.rotation.z + flutter * 0.7,
          'YXZ'
        );
        dummy.scale.setScalar(leaf.scale * easeScale);
        dummy.updateMatrix();
        leafMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      leafMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group name="living-ancient-oak-world" key={isMobile ? 'oak-m' : 'oak-d'}>
      {/* =====================================================================
          STAGE 01 PHOTOREALISTIC BOTANICAL QUERCUS ROBUR SEEDLING & ACORN
          ===================================================================== */}
      <group ref={saplingGroupRef} position={[0, 0, 0]}>
        {/* Dedicated soft sunlit clearing illumination for macro seedling view */}
        <pointLight
          ref={saplingLightRef}
          position={[0.18, 0.58, 0.42]}
          color="#fff4d2"
          intensity={2.2}
          distance={2.4}
        />

        {/* Weathered Germinating Oak Acorn Nut partially embedded in damp forest humus */}
        <mesh
          position={[-0.016, 0.010, 0.010]}
          rotation={[0.18, 0.42, 0.28]}
          scale={[1.45, 0.82, 0.86]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[0.019, 20, 16]} />
          <meshStandardMaterial
            map={barkTexture}
            color="#6e4928"
            roughness={0.58}
            metalness={0.05}
          />
        </mesh>

        {/* Rough Scaly Acorn Cupule (Cap) resting beside the split acorn */}
        <mesh
          position={[-0.036, 0.011, 0.004]}
          rotation={[0.35, -0.5, 1.1]}
          scale={[1.0, 0.65, 1.0]}
          castShadow
        >
          <sphereGeometry args={[0.017, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
          <meshStandardMaterial
            map={barkTexture}
            color="#473320"
            roughness={0.90}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Emerging Primary Radicle & Lateral Micro-Roots anchoring into the soil */}
        <mesh geometry={radicleRootGeo}>
          <meshStandardMaterial
            map={barkTexture}
            color="#7a5b38"
            roughness={0.85}
          />
        </mesh>
        <mesh geometry={radicleRootGeo} rotation={[0, 2.2, 0]} scale={[0.8, 0.9, 0.8]}>
          <meshStandardMaterial
            map={barkTexture}
            color="#6b4e2f"
            roughness={0.85}
          />
        </mesh>

        {/* Slender Woody-to-Olive Botanical Seedling Stem */}
        <mesh geometry={saplingStemGeo} castShadow receiveShadow>
          <meshStandardMaterial
            map={barkTexture}
            color="#5c7538"
            roughness={0.68}
            metalness={0.02}
          />
        </mesh>

        {/* Terminal Apical Bud Scales at the very tip of the sapling */}
        <mesh position={[0, 0.286, 0]} scale={[0.65, 1.45, 0.65]}>
          <coneGeometry args={[0.0042, 0.014, 8]} />
          <meshStandardMaterial color="#6e7d38" roughness={0.62} />
        </mesh>

        {/* 7 Sculpted Veined Lobed Oak Leaves on Delicate Petioles (Nested Azimuth -> Pitch) */}
        {saplingLeafConfigs.map((cfg, idx) => (
          <group key={idx} position={[0, cfg.y, 0]} rotation={[0, cfg.rotY, 0]}>
            <group
              ref={(el) => {
                saplingLeavesRef.current[idx] = el;
              }}
              scale={[cfg.baseScale, cfg.baseScale, cfg.baseScale]}
            >
              {/* Slender Petiole Stalk connecting stem node to leaf base */}
              <mesh geometry={petioleGeo}>
                <meshStandardMaterial color="#6b873e" roughness={0.62} />
              </mesh>

              {/* Doubly-Curved Veined Lobed Oak Leaf Blade */}
              <mesh
                geometry={singleLeafGeo}
                position={[0, 0.22, 0.06]}
                rotation={[0.16, 0, 0]}
                castShadow
                receiveShadow
              >
                <meshStandardMaterial
                  map={botanicalTextures.leafColorMap}
                  normalMap={botanicalTextures.leafNormalMap}
                  normalScale={new THREE.Vector2(0.95, 0.95)}
                  alphaTest={0.38}
                  roughness={0.44}
                  metalness={0.04}
                  color={idx >= 4 ? '#d8f0b0' : '#c6e39d'}
                  emissive="#1e3812"
                  emissiveIntensity={0.28}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          </group>
        ))}
      </group>

      {/* Warm Golden-Hour Low-Angle Sunlight Revealing Deep Ancient Oak Bark Fissures & Root Flare */}
      <directionalLight
        position={[6.5, 2.2, 8.5]}
        color="#ffe4b8"
        intensity={2.35}
      />
      <directionalLight
        position={[-6.0, 2.0, 6.5]}
        color="#c8d9b8"
        intensity={1.15}
      />

      {/* =====================================================================
          UNIFIED GPU-GROWN ANCIENT OAK TRUNK, ROOT FLARE & HIERARCHICAL BOUGHS
          ===================================================================== */}
      <mesh
        geometry={treeData.barkGeometry}
        material={barkMaterial}
        customDepthMaterial={barkDepthMaterial}
        frustumCulled={false}
        castShadow
        receiveShadow
      />

      {/* =====================================================================
          DENSE 3D VOLUMETRIC OAK TWIG-AND-LEAF SPRAY CLUSTERS (FULL CANOPY)
          ===================================================================== */}
      <instancedMesh
        ref={sprayMeshRef}
        args={[sprayClusterGeo, undefined, treeData.sprayClusters.length]}
        frustumCulled={false}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          map={botanicalTextures.sprayColorMap}
          normalMap={botanicalTextures.sprayNormalMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          alphaTest={0.36}
          color="#d8f0bc"
          roughness={0.48}
          metalness={0.03}
          emissive="#1d3612"
          emissiveIntensity={0.34}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* =====================================================================
          INDIVIDUAL SCULPTED VEINED OAK LEAVES (CLOSE-UP BRANCHES & STEMS)
          ===================================================================== */}
      <instancedMesh
        ref={leafMeshRef}
        args={[singleLeafGeo, undefined, treeData.individualLeaves.length]}
        frustumCulled={false}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          map={botanicalTextures.leafColorMap}
          normalMap={botanicalTextures.leafNormalMap}
          normalScale={new THREE.Vector2(0.9, 0.9)}
          alphaTest={0.38}
          color="#d8f0bc"
          roughness={0.44}
          metalness={0.04}
          emissive="#1d3612"
          emissiveIntensity={0.32}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* =====================================================================
          FALLEN WEATHERED OAK LEAVES ON THE FOREST FLOOR
          ===================================================================== */}
      <instancedMesh
        ref={fallenMeshRef}
        args={[singleLeafGeo, undefined, treeData.fallenLeaves.length]}
        receiveShadow
      >
        <meshStandardMaterial
          map={botanicalTextures.leafColorMap}
          normalMap={botanicalTextures.leafNormalMap}
          alphaTest={0.38}
          roughness={0.78}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
}
