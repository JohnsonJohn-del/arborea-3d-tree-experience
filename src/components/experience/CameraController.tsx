'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { branches } from '@/data/branches';
import { ScrollStateRef } from '@/hooks/useScrollProgress';

interface CameraControllerProps {
  scrollRef: React.MutableRefObject<ScrollStateRef>;
  isMobile: boolean;
  reducedMotion: boolean;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function CameraController({
  scrollRef,
  isMobile,
  reducedMotion,
}: CameraControllerProps) {
  const { camera } = useThree();

  const currentPosRef = useRef(new THREE.Vector3(0, 0.32, 0.68));
  const currentLookAtRef = useRef(new THREE.Vector3(0, 0.16, 0));

  // Primary growth camera spline (0% -> 71% scroll: Microscopic -> Macro -> Close -> Medium -> Wide -> Ultra-Wide)
  const { growthPosCurve, growthTargetCurve } = useMemo(() => {
    const mobileZScale = isMobile ? 1.28 : 1.0;

    const posCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 0.32, 0.68 * mobileZScale),      // 0.00: Microscopic soil & sapling shoot
      new THREE.Vector3(0.18, 0.42, 1.22 * mobileZScale),     // 0.14: Macro complete sapling
      new THREE.Vector3(-0.65, 1.35, 3.1 * mobileZScale),     // 0.28: Close developing stem
      new THREE.Vector3(1.25, 2.85, 7.6 * mobileZScale),      // 0.42: Medium young tree
      new THREE.Vector3(-0.4, 3.85, 17.5 * mobileZScale),     // 0.56: Wide emerging crown
      new THREE.Vector3(0.0, 3.95, 20.8 * mobileZScale),      // 0.71: Ultra-Wide Full Tree reveal (100% of crown visible)
    ]);

    const targetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 0.16, 0.0),
      new THREE.Vector3(0.0, 0.28, 0.0),
      new THREE.Vector3(0.0, 1.25, 0.0),
      new THREE.Vector3(0.0, 2.75, 0.0),
      new THREE.Vector3(0.0, 3.65, 0.0),
      new THREE.Vector3(0.0, 3.70, 0.0),
    ]);

    return { growthPosCurve: posCurve, growthTargetCurve: targetCurve };
  }, [isMobile]);

  const desiredPos = useMemo(() => new THREE.Vector3(), []);
  const desiredTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    const s = scrollRef.current;
    const p = THREE.MathUtils.clamp(s.smoothProgress, 0, 1);
    const mobileCardZOffset = isMobile ? 0.65 : 0.0;
    const mobileCardXShift = isMobile ? 0.0 : -0.22;

    if (p <= 0.71) {
      // PHASE 1: Continuous Growth Journey (Microscopic -> Ultra-Wide Full Tree)
      const curveT = THREE.MathUtils.clamp(p / 0.71, 0, 1);
      growthPosCurve.getPointAt(curveT, desiredPos);
      growthTargetCurve.getPointAt(curveT, desiredTarget);
    } else if (p < 0.948) {
      // PHASE 2: Intentional Branch-to-Branch Exploration (0.71 -> 0.948)
      const bIdx = branches.findIndex(
        (b) => p >= b.scrollRange[0] && p <= b.scrollRange[1]
      );
      const activeIdx = bIdx !== -1 ? bIdx : branches.length - 1;
      const branch = branches[activeIdx];
      const [start, end] = branch.scrollRange;
      const localT = THREE.MathUtils.clamp((p - start) / Math.max(0.0001, end - start), 0, 1);

      const prevApproach =
        activeIdx === 0
          ? new THREE.Vector3(0.0, 3.95, isMobile ? 25.5 : 20.8)
          : new THREE.Vector3(
              branches[activeIdx - 1].cameraApproach.x,
              branches[activeIdx - 1].cameraApproach.y,
              branches[activeIdx - 1].cameraApproach.z
            );

      const prevTarget =
        activeIdx === 0
          ? new THREE.Vector3(0.0, 3.70, 0.0)
          : new THREE.Vector3(
              branches[activeIdx - 1].cameraTarget.x,
              branches[activeIdx - 1].cameraTarget.y,
              branches[activeIdx - 1].cameraTarget.z
            );

      const approachPos = new THREE.Vector3(
        branch.cameraApproach.x,
        branch.cameraApproach.y,
        branch.cameraApproach.z + mobileCardZOffset
      );

      const cardCamPos = new THREE.Vector3(
        branch.cameraPosition.x,
        branch.cameraPosition.y,
        branch.cameraPosition.z + mobileCardZOffset
      );

      const cardTarget = new THREE.Vector3(
        branch.cameraTarget.x + mobileCardXShift,
        branch.cameraTarget.y,
        branch.cameraTarget.z
      );

      const nextApproach =
        activeIdx < branches.length - 1
          ? new THREE.Vector3(
              branches[activeIdx + 1].cameraApproach.x,
              branches[activeIdx + 1].cameraApproach.y,
              branches[activeIdx + 1].cameraApproach.z + mobileCardZOffset
            )
          : new THREE.Vector3(0.0, 4.2, isMobile ? 12.5 : 10.2);

      const nextTarget =
        activeIdx < branches.length - 1
          ? new THREE.Vector3(0, 3.6, 0)
          : new THREE.Vector3(0, 3.3, 0);

      if (localT < 0.28) {
        const t = smoothstep(0.0, 0.28, localT);
        const midArc = prevApproach.clone().lerp(approachPos, 0.65);
        if (t < 0.45) {
          desiredPos.lerpVectors(prevApproach, midArc, t / 0.45);
          desiredTarget.lerpVectors(prevTarget, new THREE.Vector3(0, 3.5, 0), t / 0.45);
        } else {
          desiredPos.lerpVectors(midArc, cardCamPos, (t - 0.45) / 0.55);
          desiredTarget.lerpVectors(new THREE.Vector3(0, 3.5, 0), cardTarget, (t - 0.45) / 0.55);
        }
      } else if (localT <= 0.8) {
        const holdT = (localT - 0.28) / 0.52;
        desiredPos.copy(cardCamPos);
        desiredPos.x += (holdT - 0.5) * 0.14;
        desiredTarget.copy(cardTarget);
      } else {
        const exitT = smoothstep(0.8, 1.0, localT);
        desiredPos.lerpVectors(cardCamPos, nextApproach, exitT);
        desiredTarget.lerpVectors(cardTarget, nextTarget, exitT * 0.65);
      }
    } else {
      // PHASE 3: Final Pullback to Monumental Full-Tree Finale (0.948 -> 1.00)
      const finaleT = smoothstep(0.948, 0.992, p);
      const b5 = branches[branches.length - 1];
      const startPos = new THREE.Vector3(0.0, 4.2, isMobile ? 12.5 : 10.2);
      const endPos = new THREE.Vector3(0.0, 3.95, isMobile ? 26.2 : 21.2);

      const startTarget = new THREE.Vector3(
        b5.cameraTarget.x * 0.3,
        3.35,
        b5.cameraTarget.z * 0.3
      );
      const endTarget = new THREE.Vector3(0.0, 3.70, 0.0);

      desiredPos.lerpVectors(startPos, endPos, finaleT);
      desiredTarget.lerpVectors(startTarget, endTarget, finaleT);
    }

    if (!reducedMotion) {
      const distScale = THREE.MathUtils.clamp(desiredPos.length() * 0.028, 0.02, 0.26);
      desiredPos.x +=
        s.pointerX * distScale + Math.sin(elapsed * 0.45) * distScale * 0.18;
      desiredPos.y +=
        s.pointerY * distScale * 0.65 + Math.cos(elapsed * 0.38) * distScale * 0.14;
    }

    const lerpFactor = reducedMotion ? 0.28 : 0.09;
    currentPosRef.current.lerp(desiredPos, lerpFactor);
    currentLookAtRef.current.lerp(desiredTarget, lerpFactor);

    camera.position.copy(currentPosRef.current);
    camera.lookAt(currentLookAtRef.current);
  });

  return null;
}
