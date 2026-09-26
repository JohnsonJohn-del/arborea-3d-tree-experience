import * as THREE from 'three';
import { branches } from '@/data/branches';

export interface FoliageInstanceData {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  birth: number;
  mature: number;
  pruneStart?: number;
  pruneEnd?: number;
  color: THREE.Color;
  phase: number;
}

export interface GeneratedTreeData {
  barkGeometry: THREE.BufferGeometry;
  sprayClusters: FoliageInstanceData[];
  individualLeaves: FoliageInstanceData[];
  fallenLeaves: FoliageInstanceData[];
}

function createSeededRandom(seed = 7919) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface TubeBranchSpec {
  points: THREE.Vector3[];
  radiusStart: number;
  radiusEnd: number;
  birthStart: number;
  birthEnd: number;
  matureDuration: number;
  pruneAt?: number;
  level: number;
  radialSegments: number;
  tubularSegments: number;
  tuckOrigin?: boolean;
  hasKnots?: boolean;
}

export function generateProceduralTree(isMobile = false): GeneratedTreeData {
  const rand = createSeededRandom(7919);
  const specs: TubeBranchSpec[] = [];
  const sprayClusters: FoliageInstanceData[] = [];
  const individualLeaves: FoliageInstanceData[] = [];
  const fallenLeaves: FoliageInstanceData[] = [];

  // Rich, sunlit Quercus robur (Ancient Oak) chlorophyll palette
  const innerCanopyColors = [
    new THREE.Color('#2f5723'), // Shaded interior oak green
    new THREE.Color('#39692b'), // Deep forest chlorophyll
    new THREE.Color('#437833'), // Mid-crown oak leaf
  ];
  const outerCanopyColors = [
    new THREE.Color('#4f873b'), // Mature sunlit oak green
    new THREE.Color('#5d9944'), // Vibrant upper canopy green
    new THREE.Color('#6ca84e'), // Sun-drenched olive-emerald
    new THREE.Color('#7db858'), // Warm golden-hour sunlit leaf tip
  ];

  const pickLeafColor = (height: number, radialDist: number): THREE.Color => {
    const sunExposure = THREE.MathUtils.clamp((height - 2.4) / 4.2 + (radialDist - 1.4) / 4.5, 0, 1);
    if (sunExposure > 0.36 || rand() > 0.40) {
      const idx = Math.floor(rand() * outerCanopyColors.length);
      return outerCanopyColors[idx].clone();
    }
    const idx = Math.floor(rand() * innerCanopyColors.length);
    return innerCanopyColors[idx].clone();
  };

  // Helper to populate dense 3D oak twig-spray clusters + individual close-up leaves along branches
  const populateBranchFoliage = (
    curve: THREE.CatmullRomCurve3,
    birthStart: number,
    birthEnd: number,
    matureDuration: number,
    sprayCount: number,
    leafCount: number,
    spreadRadius: number,
    sprayScaleBase = 0.54,
    tStart = 0.25,
    pruneStart?: number,
    pruneEnd?: number
  ) => {
    const actualSprays = isMobile ? Math.max(3, Math.floor(sprayCount * 0.48)) : sprayCount;
    for (let i = 0; i < actualSprays; i++) {
      const t = tStart + (i / actualSprays) * (1.0 - tStart);
      const pt = curve.getPoint(t);

      const angle = rand() * Math.PI * 2;
      const dist = (0.08 + rand() * spreadRadius) * (0.45 + 0.65 * Math.sin(t * Math.PI));
      const offset = new THREE.Vector3(
        Math.cos(angle) * dist,
        (rand() - 0.15) * spreadRadius * 0.68,
        Math.sin(angle) * dist
      );

      const pos = pt.clone().add(offset);
      // Keep the massive lower trunk zone (y < 2.65m and radialDist < 1.55m) clear of permanent adult canopy blobs
      if (!pruneStart && pos.y < 2.65 && Math.hypot(pos.x, pos.z) < 1.55) {
        pos.y = Math.max(2.65, pos.y + 0.55);
      }

      const radialDist = Math.hypot(pos.x, pos.z);
      const birth = Math.min(0.92, birthStart + (birthEnd - birthStart) * t + 0.02 + rand() * 0.04);
      const mature = Math.min(0.99, birth + matureDuration);

      sprayClusters.push({
        position: pos,
        rotation: new THREE.Euler(
          (rand() - 0.5) * 0.85,
          rand() * Math.PI * 2,
          (rand() - 0.5) * 0.85
        ),
        scale: sprayScaleBase * (0.74 + rand() * 0.52),
        birth,
        mature,
        pruneStart,
        pruneEnd,
        color: pickLeafColor(pos.y, radialDist),
        phase: rand() * Math.PI * 2,
      });
    }

    const actualLeaves = isMobile ? Math.max(2, Math.floor(leafCount * 0.45)) : leafCount;
    for (let i = 0; i < actualLeaves; i++) {
      const t = tStart * 0.85 + (i / actualLeaves) * (1.0 - tStart * 0.85);
      const pt = curve.getPoint(t);
      const angle = rand() * Math.PI * 2;
      const dist = 0.04 + rand() * (spreadRadius * 0.72);
      const pos = pt.clone().add(
        new THREE.Vector3(
          Math.cos(angle) * dist,
          (rand() - 0.18) * spreadRadius * 0.52,
          Math.sin(angle) * dist
        )
      );
      if (!pruneStart && pos.y < 2.55 && Math.hypot(pos.x, pos.z) < 1.45) {
        pos.y = Math.max(2.55, pos.y + 0.45);
      }

      const radialDist = Math.hypot(pos.x, pos.z);
      const birth = Math.min(0.92, birthStart + (birthEnd - birthStart) * t + 0.015 + rand() * 0.03);
      const mature = Math.min(0.99, birth + matureDuration * 0.85);

      individualLeaves.push({
        position: pos,
        rotation: new THREE.Euler(
          0.45 + (rand() - 0.5) * 0.9,
          angle + (rand() - 0.5) * 0.8,
          (rand() - 0.5) * 0.8,
          'YXZ'
        ),
        scale: 0.15 + rand() * 0.16,
        birth,
        mature,
        pruneStart,
        pruneEnd,
        color: pickLeafColor(pos.y, radialDist),
        phase: rand() * Math.PI * 2,
      });
    }
  };

  // ============================================================================
  // 1. MASSIVE ANCIENT OAK MAIN BOLE (Thick, gnarled, deeply fluted trunk base)
  // ============================================================================
  const mainBolePoints = [
    new THREE.Vector3(0.0, -0.18, 0.0),
    new THREE.Vector3(0.03, 0.55, 0.02),
    new THREE.Vector3(-0.06, 1.35, 0.04),
    new THREE.Vector3(0.05, 2.20, -0.04),
    new THREE.Vector3(0.03, 3.05, 0.03),
    new THREE.Vector3(-0.04, 3.85, -0.03),
    new THREE.Vector3(0.02, 4.55, 0.02),
    new THREE.Vector3(0.0, 5.15, 0.0),
  ];

  specs.push({
    points: mainBolePoints,
    radiusStart: 1.06, // Massive old-growth oak trunk base (~2.12m diameter + root flare!)
    radiusEnd: 0.22,
    birthStart: 0.05,
    birthEnd: 0.45,
    matureDuration: 0.34,
    level: 0,
    radialSegments: isMobile ? 20 : 28,
    tubularSegments: isMobile ? 34 : 52,
    tuckOrigin: false,
    hasKnots: true,
  });

  const mainTrunkCurve = new THREE.CatmullRomCurve3(mainBolePoints);

  // Heavy Co-Dominant Forking Upper Crown Trunks (forking at y=2.6m into a wide dome like ancient oaks)
  const crownTrunks = [
    {
      pts: [
        mainTrunkCurve.getPoint(0.46),
        mainTrunkCurve.getPoint(0.52),
        new THREE.Vector3(-0.95, 3.65, 0.35),
        new THREE.Vector3(-2.05, 4.55, 0.65),
        new THREE.Vector3(-2.95, 5.25, 0.85),
      ],
      rStart: 0.56,
      rEnd: 0.10,
    },
    {
      pts: [
        mainTrunkCurve.getPoint(0.48),
        mainTrunkCurve.getPoint(0.54),
        new THREE.Vector3(1.02, 3.75, -0.32),
        new THREE.Vector3(2.15, 4.65, -0.68),
        new THREE.Vector3(3.05, 5.35, -0.92),
      ],
      rStart: 0.54,
      rEnd: 0.10,
    },
    {
      pts: [
        mainTrunkCurve.getPoint(0.52),
        mainTrunkCurve.getPoint(0.58),
        new THREE.Vector3(0.18, 3.95, 0.85),
        new THREE.Vector3(0.35, 4.85, 1.75),
        new THREE.Vector3(0.48, 5.45, 2.45),
      ],
      rStart: 0.48,
      rEnd: 0.09,
    },
  ];

  crownTrunks.forEach((ct) => {
    specs.push({
      points: ct.pts,
      radiusStart: ct.rStart,
      radiusEnd: ct.rEnd,
      birthStart: 0.29,
      birthEnd: 0.52,
      matureDuration: 0.24,
      level: 0.4,
      radialSegments: isMobile ? 10 : 16,
      tubularSegments: isMobile ? 18 : 28,
      tuckOrigin: true,
      hasKnots: true,
    });
    const ctCurve = new THREE.CatmullRomCurve3(ct.pts);
    populateBranchFoliage(ctCurve, 0.30, 0.54, 0.20, 42, 30, 0.92, 0.60, 0.45);
  });

  // ============================================================================
  // 2. GROUND-HUGGING SURFACE ROOTS (Emerge smoothly from basal root flare into soil)
  // ============================================================================
  const surfaceRootCount = 9;
  for (let r = 0; r < surfaceRootCount; r++) {
    const angle = (r / surfaceRootCount) * Math.PI * 2 + (rand() - 0.5) * 0.22;
    const reach = 1.95 + rand() * 1.25;

    const rootPts = [
      new THREE.Vector3(0.0, 0.16, 0.0),
      new THREE.Vector3(Math.cos(angle) * 0.58, 0.10, Math.sin(angle) * 0.58),
      new THREE.Vector3(
        Math.cos(angle + 0.10) * (reach * 0.58),
        0.01,
        Math.sin(angle + 0.10) * (reach * 0.58)
      ),
      new THREE.Vector3(
        Math.cos(angle + 0.18) * (reach * 0.84),
        -0.07,
        Math.sin(angle + 0.18) * (reach * 0.84)
      ),
      new THREE.Vector3(
        Math.cos(angle + 0.24) * reach,
        -0.20,
        Math.sin(angle + 0.24) * reach
      ),
    ];

    specs.push({
      points: rootPts,
      radiusStart: 0.40 + (r % 3) * 0.06,
      radiusEnd: 0.028,
      birthStart: 0.26 + (r % 4) * 0.03,
      birthEnd: 0.50 + (r % 4) * 0.03,
      matureDuration: 0.28,
      level: 0.3,
      radialSegments: isMobile ? 8 : 12,
      tubularSegments: 16,
      tuckOrigin: false,
      hasKnots: true,
    });
  }

  // ============================================================================
  // 3. STAGE 02 YOUNG STEM LATERAL SHOOTS (Natural juvenile growth y=0.55..2.8m)
  // Both twigs and leaves self-prune as the massive ancient trunk swells (0.46 -> 0.60)
  // ============================================================================
  for (let s = 0; s < 9; s++) {
    const t = 0.10 + s * 0.052;
    const stemTuck = mainTrunkCurve.getPoint(Math.max(0.02, t - 0.04));
    const stemOrigin = mainTrunkCurve.getPoint(t);
    const angle = s * 2.39996 + 0.5;
    const reach = 0.42 + (1.0 - Math.abs(s - 4) * 0.12) * 0.45;

    const shootMid = stemOrigin.clone().add(
      new THREE.Vector3(
        Math.cos(angle) * reach * 0.55,
        0.18 + s * 0.035,
        Math.sin(angle) * reach * 0.55
      )
    );
    const shootTip = stemOrigin.clone().add(
      new THREE.Vector3(
        Math.cos(angle + 0.15) * reach,
        0.38 + s * 0.05,
        Math.sin(angle + 0.15) * reach
      )
    );

    const shootPts = [stemTuck, stemOrigin, shootMid, shootTip];
    const shootBirthStart = 0.07 + s * 0.022;
    const shootBirthEnd = shootBirthStart + 0.13;

    specs.push({
      points: shootPts,
      radiusStart: 0.048,
      radiusEnd: 0.008,
      birthStart: shootBirthStart,
      birthEnd: shootBirthEnd,
      matureDuration: 0.15,
      pruneAt: 0.46,
      level: 1.8,
      radialSegments: 6,
      tubularSegments: 10,
      tuckOrigin: true,
    });

    const shootCurve = new THREE.CatmullRomCurve3(shootPts);
    populateBranchFoliage(
      shootCurve,
      shootBirthStart + 0.01,
      shootBirthEnd,
      0.13,
      12,
      24,
      0.36,
      0.42,
      0.15,
      0.46,
      0.60
    );
  }

  // ============================================================================
  // 4. FIVE HERO STORY BOUGHS (Guaranteed to pass through each HangingCard knot)
  // ============================================================================
  branches.forEach((branchData, idx) => {
    const attach = new THREE.Vector3(
      branchData.branchAttachment.x,
      branchData.branchAttachment.y,
      branchData.branchAttachment.z
    );

    const trunkT = Math.max(0.42, Math.min(0.85, (attach.y - 0.4) / 5.9));
    const originTuck = mainTrunkCurve.getPoint(Math.max(0.34, trunkT - 0.05));
    const origin = mainTrunkCurve.getPoint(trunkT);

    const dir = attach.clone().sub(origin);
    const mid1 = origin
      .clone()
      .lerp(attach, 0.36)
      .add(new THREE.Vector3((rand() - 0.5) * 0.38, 0.18 + (rand() - 0.3) * 0.22, (rand() - 0.5) * 0.38));
    const mid2 = origin
      .clone()
      .lerp(attach, 0.72)
      .add(new THREE.Vector3((rand() - 0.5) * 0.22, 0.22, (rand() - 0.5) * 0.22));

    const tip = attach
      .clone()
      .add(dir.clone().normalize().multiplyScalar(1.45))
      .add(new THREE.Vector3(0, 0.38, 0));

    const heroPoints = [originTuck, origin, mid1, mid2, attach, tip];
    const heroBirthStart = 0.27 + idx * 0.04;
    const heroBirthEnd = heroBirthStart + 0.22;

    specs.push({
      points: heroPoints,
      radiusStart: 0.30 - idx * 0.018,
      radiusEnd: 0.032,
      birthStart: heroBirthStart,
      birthEnd: heroBirthEnd,
      matureDuration: 0.24,
      level: 1.0,
      radialSegments: isMobile ? 8 : 12,
      tubularSegments: isMobile ? 22 : 30,
      tuckOrigin: true,
      hasKnots: true,
    });

    const heroCurve = new THREE.CatmullRomCurve3(heroPoints);
    populateBranchFoliage(heroCurve, heroBirthStart + 0.02, heroBirthEnd, 0.18, 46, 58, 0.78, 0.56, 0.42);

    // Secondary & Tertiary branches off each Hero Bough
    for (let s = 0; s < 4; s++) {
      const subT = 0.38 + s * 0.17;
      const subTuck = heroCurve.getPoint(subT - 0.05);
      const subOrigin = heroCurve.getPoint(subT);
      const subDir = dir
        .clone()
        .normalize()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), (s % 2 === 0 ? 1 : -1) * (0.48 + rand() * 0.35));

      const subMid = subOrigin
        .clone()
        .add(subDir.clone().multiplyScalar(0.75))
        .add(new THREE.Vector3(0, 0.26 + (rand() - 0.3) * 0.2, 0));
      const subTip = subMid
        .clone()
        .add(subDir.clone().multiplyScalar(0.88))
        .add(new THREE.Vector3(0, 0.42, 0));

      const subPts = [subTuck, subOrigin, subMid, subTip];
      const subBirthStart = heroBirthStart + 0.06 + s * 0.03;
      const subBirthEnd = Math.min(0.64, subBirthStart + 0.16);

      specs.push({
        points: subPts,
        radiusStart: 0.105,
        radiusEnd: 0.015,
        birthStart: subBirthStart,
        birthEnd: subBirthEnd,
        matureDuration: 0.18,
        level: 2.0,
        radialSegments: 6,
        tubularSegments: 14,
        tuckOrigin: true,
      });

      const subCurve = new THREE.CatmullRomCurve3(subPts);
      populateBranchFoliage(subCurve, subBirthStart + 0.015, subBirthEnd, 0.16, 34, 28, 0.68, 0.54, 0.25);
    }
  });

  // ============================================================================
  // 5. DENSE MULTI-TIERED ANCIENT OAK CROWN (Primary -> Secondary -> Tertiary -> Twigs)
  // ============================================================================
  const primaryBoughCount = isMobile ? 14 : 20;
  for (let b = 0; b < primaryBoughCount; b++) {
    // Start major crown boughs at heightRatio = 0.48 (y ≈ 2.55m) so the massive lower trunk is clearly visible
    const heightRatio = 0.48 + (b / primaryBoughCount) * 0.50;
    const originTuck = mainTrunkCurve.getPoint(Math.max(0.38, heightRatio - 0.05));
    const origin = mainTrunkCurve.getPoint(heightRatio);

    // Natural asymmetry: broad rounded dome silhouette like a centuries-old pasture oak
    const azimuth = b * 2.39996 + (rand() - 0.5) * 0.30;
    const asymmetryFactor = 1.0 + Math.cos(azimuth - 2.2) * 0.18;
    const crownNorm = (heightRatio - 0.48) / 0.50; // 0 at bottom of crown, 1 at top
    const domeWidthProfile = Math.sin(THREE.MathUtils.clamp(0.22 + crownNorm * 0.68, 0.15, 0.95) * Math.PI);
    const reach = (3.2 + domeWidthProfile * 2.5) * asymmetryFactor * (0.88 + rand() * 0.22);
    const lift = 0.45 + (1.0 - crownNorm * 0.35) * 0.95;

    // Characteristic gnarled oak bend: dips or spreads horizontally at p1, rises into sub-crowns at p2 & p3
    const p1 = origin.clone().add(
      new THREE.Vector3(
        Math.cos(azimuth) * reach * 0.36,
        lift * 0.20 + (rand() - 0.48) * 0.28,
        Math.sin(azimuth) * reach * 0.36
      )
    );
    const p2 = origin.clone().add(
      new THREE.Vector3(
        Math.cos(azimuth + (rand() - 0.5) * 0.24) * reach * 0.68,
        lift * 0.62 + (rand() - 0.4) * 0.30,
        Math.sin(azimuth + (rand() - 0.5) * 0.24) * reach * 0.68
      )
    );
    const p3 = origin.clone().add(
      new THREE.Vector3(
        Math.cos(azimuth + (rand() - 0.5) * 0.28) * reach,
        lift + (rand() - 0.35) * 0.35,
        Math.sin(azimuth + (rand() - 0.5) * 0.28) * reach
      )
    );

    const bPts = [originTuck, origin, p1, p2, p3];
    const bBirthStart = 0.28 + (heightRatio - 0.48) * 0.26;
    const bBirthEnd = Math.min(0.60, bBirthStart + 0.20);

    specs.push({
      points: bPts,
      radiusStart: 0.32 * (1.22 - heightRatio * 0.52),
      radiusEnd: 0.026,
      birthStart: bBirthStart,
      birthEnd: bBirthEnd,
      matureDuration: 0.24,
      level: 1.1,
      radialSegments: isMobile ? 7 : 10,
      tubularSegments: isMobile ? 16 : 24,
      tuckOrigin: true,
      hasKnots: true,
    });

    const bCurve = new THREE.CatmullRomCurve3(bPts);
    populateBranchFoliage(bCurve, bBirthStart + 0.04, bBirthEnd, 0.2, 58, 38, 0.85, 0.58, 0.44);

    // Secondary Branches off each Primary Bough
    const secondaryCount = isMobile ? 3 : 4;
    for (let f = 0; f < secondaryCount; f++) {
      const ft = 0.36 + f * 0.19;
      const fTuck = bCurve.getPoint(ft - 0.05);
      const fOrigin = bCurve.getPoint(ft);
      const forkAngle = azimuth + (f % 2 === 0 ? 0.58 : -0.58) + (rand() - 0.5) * 0.32;
      const forkLen = 1.2 + rand() * 0.95;

      const fMid = fOrigin.clone().add(
        new THREE.Vector3(
          Math.cos(forkAngle) * forkLen * 0.52,
          0.26 + (rand() - 0.35) * 0.30,
          Math.sin(forkAngle) * forkLen * 0.52
        )
      );
      const fTip = fOrigin.clone().add(
        new THREE.Vector3(
          Math.cos(forkAngle + (rand() - 0.5) * 0.25) * forkLen,
          0.58 + rand() * 0.45,
          Math.sin(forkAngle + (rand() - 0.5) * 0.25) * forkLen
        )
      );

      const fPts = [fTuck, fOrigin, fMid, fTip];
      const fBirthStart = bBirthStart + 0.07 + f * 0.035;
      const fBirthEnd = Math.min(0.64, fBirthStart + 0.16);

      specs.push({
        points: fPts,
        radiusStart: 0.105 * (1.1 - ft * 0.4),
        radiusEnd: 0.014,
        birthStart: fBirthStart,
        birthEnd: fBirthEnd,
        matureDuration: 0.18,
        level: 2.1,
        radialSegments: 6,
        tubularSegments: 12,
        tuckOrigin: true,
      });

      const fCurve = new THREE.CatmullRomCurve3(fPts);
      populateBranchFoliage(fCurve, fBirthStart + 0.02, fBirthEnd, 0.16, 44, 26, 0.74, 0.56, 0.22);

      // Tertiary Small Branches & Crooked Twigs off Secondary Branches
      const twigCount = isMobile ? 1 : 2;
      for (let tw = 0; tw < twigCount; tw++) {
        const twT = 0.45 + tw * 0.35;
        const twTuck = fCurve.getPoint(twT - 0.08);
        const twOrigin = fCurve.getPoint(twT);
        const twAngle = forkAngle + (tw % 2 === 0 ? 0.65 : -0.65) + (rand() - 0.5) * 0.4;
        const twLen = 0.58 + rand() * 0.52;

        const twMid = twOrigin.clone().add(
          new THREE.Vector3(
            Math.cos(twAngle) * twLen * 0.5,
            0.18 + (rand() - 0.3) * 0.2,
            Math.sin(twAngle) * twLen * 0.5
          )
        );
        const twTip = twOrigin.clone().add(
          new THREE.Vector3(
            Math.cos(twAngle) * twLen,
            0.38 + rand() * 0.28,
            Math.sin(twAngle) * twLen
          )
        );

        const twPts = [twTuck, twOrigin, twMid, twTip];
        const twBirthStart = Math.min(0.58, fBirthStart + 0.05 + tw * 0.03);
        const twBirthEnd = Math.min(0.66, twBirthStart + 0.12);

        specs.push({
          points: twPts,
          radiusStart: 0.038,
          radiusEnd: 0.007,
          birthStart: twBirthStart,
          birthEnd: twBirthEnd,
          matureDuration: 0.14,
          level: 3.0,
          radialSegments: 5,
          tubularSegments: 8,
          tuckOrigin: true,
        });

        const twCurve = new THREE.CatmullRomCurve3(twPts);
        populateBranchFoliage(twCurve, twBirthStart + 0.01, twBirthEnd, 0.14, 26, 16, 0.60, 0.54, 0.18);
      }
    }
  }

  // ============================================================================
  // 6. FALLEN OAK LEAVES ON THE FOREST FLOOR AROUND THE ROOT FLARE
  // ============================================================================
  const fallenCount = isMobile ? 90 : 180;
  const fallenPalette = [
    new THREE.Color('#4a3a22'),
    new THREE.Color('#5c4728'),
    new THREE.Color('#394a24'),
    new THREE.Color('#6e552c'),
  ];
  for (let i = 0; i < fallenCount; i++) {
    const r = 0.55 + Math.pow(rand(), 1.3) * 4.2;
    const theta = rand() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const rootMound = Math.exp(-r * r * 0.28) * 0.045;
    const radialSlope = -Math.pow(Math.min(r / 12.0, 1.0), 1.7) * 0.62;
    const y = rootMound + radialSlope - 0.030;

    fallenLeaves.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(
        -Math.PI / 2 + (rand() - 0.5) * 0.24,
        rand() * Math.PI * 2,
        (rand() - 0.5) * 0.24,
        'YXZ'
      ),
      scale: 0.11 + rand() * 0.09,
      birth: 0.25 + rand() * 0.35,
      mature: 0.65,
      color: fallenPalette[i % fallenPalette.length].clone(),
      phase: rand() * Math.PI * 2,
    });
  }

  // ============================================================================
  // 7. MERGE ALL HIERARCHICAL BARK TUBES INTO UNIFIED GPU BUFFER GEOMETRY WITH UVs & VERTEX COLORS
  // ============================================================================
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const spinePositions: number[] = [];
  const births: number[] = [];
  const matures: number[] = [];
  const prunes: number[] = [];
  const levels: number[] = [];
  const indices: number[] = [];

  const creviceCol = new THREE.Color('#47382b');
  const ridgeCol = new THREE.Color('#f0e2d0');
  const mossCol = new THREE.Color('#5c7d42');
  const tmpCol = new THREE.Color();

  let vertexOffset = 0;

  for (const spec of specs) {
    const curve = new THREE.CatmullRomCurve3(spec.points);
    const curveLength = curve.getLength();
    const frames = curve.computeFrenetFrames(spec.tubularSegments, false);

    // Circumferential & longitudinal UV repeats proportional to physical branch dimensions
    const uRepeat = Math.max(1, Math.round(spec.radiusStart * 5.0));
    const vRepeat = Math.max(1, curveLength * 0.85);

    for (let i = 0; i <= spec.tubularSegments; i++) {
      const u = i / spec.tubularSegments;
      const spinePt = curve.getPointAt(u);
      const N = frames.normals[i];
      const B = frames.binormals[i];

      const originPinch = spec.tuckOrigin
        ? THREE.MathUtils.smoothstep(u, 0.0, 0.14)
        : 1.0;

      // Dramatic basal root flare on primary trunk (level === 0)
      const basalZone = spec.level === 0 ? Math.max(0, 1.0 - u * 2.8) : 0.0;
      const rootFlareMultiplier =
        spec.level === 0
          ? 1.0 + Math.pow(basalZone, 2.1) * 0.78
          : 1.0;

      const baseRadius =
        THREE.MathUtils.lerp(spec.radiusStart, spec.radiusEnd, Math.pow(u, 0.76)) *
        originPinch *
        rootFlareMultiplier;

      const ringBirth = THREE.MathUtils.lerp(spec.birthStart, spec.birthEnd, u);
      const ringMature = Math.min(0.99, ringBirth + spec.matureDuration * (1.0 - u * 0.3));

      for (let j = 0; j <= spec.radialSegments; j++) {
        const vRatio = j / spec.radialSegments;
        const v = vRatio * Math.PI * 2;
        const cosV = Math.cos(v);
        const sinV = Math.sin(v);

        // Multi-octave organic bark ridges, deep fissures, and heavy basal root buttress flutes
        const furrowFreq = spec.level < 0.5 ? 8.0 : 4.0;
        const twistAngle = v * furrowFreq + u * 5.5 + spec.level * 1.9;
        let barkWave =
          Math.sin(twistAngle) * 0.52 +
          Math.cos(v * (furrowFreq + 3.0) - u * 10.0) * 0.34 +
          Math.sin(u * 18.0 + j * 1.3) * 0.14;

        // Heavy 6-lobed root-buttress fluting integrated directly into the lower trunk base
        if (spec.level === 0 && basalZone > 0.01) {
          const buttressFlute =
            (Math.cos(v * 6.0 + u * 2.2) * 0.65 + Math.sin(v * 5.0 - u * 1.8) * 0.35) *
            Math.pow(basalZone, 1.5) *
            1.35;
          barkWave += buttressFlute;
        }

        // Add organic burls/knots on trunk and primary boughs
        if (spec.hasKnots) {
          const knot1 = Math.exp(-Math.pow((u - 0.34) * 9.0, 2) - Math.pow(Math.sin(v - 1.2) * 2.5, 2)) * 0.38;
          const knot2 = Math.exp(-Math.pow((u - 0.62) * 10.0, 2) - Math.pow(Math.sin(v - 3.8) * 2.5, 2)) * 0.32;
          barkWave += knot1 + knot2;
        }

        const displacementScale = spec.level < 0.6 ? 0.21 : 0.14;
        const r = baseRadius * (1.0 + barkWave * displacementScale);

        const normalVec = new THREE.Vector3()
          .addScaledVector(N, cosV)
          .addScaledVector(B, sinV)
          .normalize();

        const vx = spinePt.x + r * normalVec.x;
        const vy = spinePt.y + r * normalVec.y;
        const vz = spinePt.z + r * normalVec.z;

        // Vertex color shading: dark deep crevices, warm oak ridges, and subtle basal/collar moss
        const ridgeFactor = THREE.MathUtils.clamp(barkWave * 0.45 + 0.52, 0, 1);
        tmpCol.copy(creviceCol).lerp(ridgeCol, ridgeFactor);
        const mossWeight =
          spec.level <= 0.4 && vy < 1.35
            ? THREE.MathUtils.clamp((1.0 - vy / 1.35) * (1.0 - ridgeFactor * 0.7) * 0.55, 0, 0.5)
            : 0.0;
        if (mossWeight > 0.01) {
          tmpCol.lerp(mossCol, mossWeight);
        }

        positions.push(vx, vy, vz);
        normals.push(normalVec.x, normalVec.y, normalVec.z);
        uvs.push(vRatio * uRepeat, u * vRepeat);
        colors.push(tmpCol.r, tmpCol.g, tmpCol.b);
        spinePositions.push(spinePt.x, spinePt.y, spinePt.z);
        births.push(ringBirth);
        matures.push(ringMature);
        prunes.push(spec.pruneAt ?? -1.0);
        levels.push(spec.level);
      }
    }

    const ringStride = spec.radialSegments + 1;
    for (let i = 0; i < spec.tubularSegments; i++) {
      for (let j = 0; j < spec.radialSegments; j++) {
        const a = vertexOffset + i * ringStride + j;
        const b = vertexOffset + (i + 1) * ringStride + j;
        const c = vertexOffset + (i + 1) * ringStride + (j + 1);
        const d = vertexOffset + i * ringStride + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    vertexOffset += (spec.tubularSegments + 1) * ringStride;
  }

  const barkGeometry = new THREE.BufferGeometry();
  barkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  barkGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  barkGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  barkGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  barkGeometry.setAttribute('aSpinePos', new THREE.Float32BufferAttribute(spinePositions, 3));
  barkGeometry.setAttribute('aBirth', new THREE.Float32BufferAttribute(births, 1));
  barkGeometry.setAttribute('aMature', new THREE.Float32BufferAttribute(matures, 1));
  barkGeometry.setAttribute('aPrune', new THREE.Float32BufferAttribute(prunes, 1));
  barkGeometry.setAttribute('aLevel', new THREE.Float32BufferAttribute(levels, 1));
  barkGeometry.setIndex(indices);
  barkGeometry.computeVertexNormals();

  return {
    barkGeometry,
    sprayClusters,
    individualLeaves,
    fallenLeaves,
  };
}
