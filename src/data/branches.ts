export interface Vector3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface BranchStoryData {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  image: string;
  description: string;
  extendedStory: string;
  ctaLabel: string;
  metadata: {
    elevation: string;
    epoch: string;
    specimen: string;
    coordinates: string;
  };
  /** Exact 3D point on the tree branch where the brass cord attaches */
  branchAttachment: Vector3Tuple;
  /** Center of the hanging 3D photo card below the attachment point */
  cardPosition: Vector3Tuple;
  /** Natural resting rotation (Euler radians) of the hanging frame */
  rotation: Vector3Tuple;
  /** Intermediate pull-back camera waypoint before diving into this branch */
  cameraApproach: Vector3Tuple;
  /** Close-up camera position framing the hanging card and branch in 3D space */
  cameraPosition: Vector3Tuple;
  /** Camera focus target when inspecting this branch card */
  cameraTarget: Vector3Tuple;
  /** Scroll range [start, end] within the global [0, 1] scroll timeline */
  scrollRange: [number, number];
  /** Accent light color for this branch story */
  accentColor: string;
}

export const branches: BranchStoryData[] = [
  {
    id: 'branch-01',
    index: '01',
    title: 'The Silent Genesis',
    subtitle: 'Dormancy Broken by Light',
    category: 'ORIGIN — 01',
    year: 'EPOCH I · GERMINATION',
    image: '/images/branches/branch-01.jpg',
    description:
      'Beneath obsidian mineral soil, a single microscopic impulse fractures the seed coat and reaches toward unseen light.',
    extendedStory:
      'Every monumental architecture begins in total darkness. Before a single leaf catches the wind, the embryonic root anchors itself into volcanic earth—converting stillness and pressure into upward biological momentum.',
    ctaLabel: 'INSPECT SPECIMEN',
    metadata: {
      elevation: '2.65m Above Root Crown',
      epoch: 'Year 01 · First Vernal Equinox',
      specimen: 'Quercus Aeterna · Cotyledon Phase',
      coordinates: '34°N · Lower East Bough',
    },
    branchAttachment: { x: 2.35, y: 3.15, z: 1.65 },
    cardPosition: { x: 2.35, y: 2.45, z: 1.65 },
    rotation: { x: 0.02, y: -0.32, z: 0.01 },
    cameraApproach: { x: 5.8, y: 3.6, z: 6.8 },
    cameraPosition: { x: 1.98, y: 2.42, z: 3.45 },
    cameraTarget: { x: 2.35, y: 2.48, z: 1.65 },
    scrollRange: [0.71, 0.758],
    accentColor: '#78c88a',
  },
  {
    id: 'branch-02',
    index: '02',
    title: 'Rings of Patience',
    subtitle: 'Vascular Memory in Living Timber',
    category: 'ARCHITECTURE — 02',
    year: 'EPOCH II · HEARTWOOD',
    image: '/images/branches/branch-02.jpg',
    description:
      'Concentric vessels of lignin and golden resin record seasons of drought, tempest, and quiet endurance.',
    extendedStory:
      'Growth is never hurried. Each winter compresses the cambium into dense structural rings capable of supporting tons of cantilevered canopy. Strength is accumulated in silence, ring by patient ring.',
    ctaLabel: 'READ RING CHRONICLE',
    metadata: {
      elevation: '3.85m Above Root Crown',
      epoch: 'Year 24 · Heartwood Consolidation',
      specimen: 'Xylem & Amber Resin Conduit',
      coordinates: '112°W · Primary Western Limb',
    },
    branchAttachment: { x: -2.65, y: 4.1, z: 1.4 },
    cardPosition: { x: -2.65, y: 3.4, z: 1.4 },
    rotation: { x: -0.01, y: 0.38, z: -0.01 },
    cameraApproach: { x: -5.4, y: 4.4, z: 6.2 },
    cameraPosition: { x: -2.2, y: 3.38, z: 3.18 },
    cameraTarget: { x: -2.65, y: 3.42, z: 1.4 },
    scrollRange: [0.758, 0.806],
    accentColor: '#e5b869',
  },
  {
    id: 'branch-03',
    index: '03',
    title: 'The Unseen Network',
    subtitle: 'Mycelial Intelligence & Symbiosis',
    category: 'SYMBIOSIS — 03',
    year: 'EPOCH III · CONVERGENCE',
    image: '/images/branches/branch-03.jpg',
    description:
      'Luminous subterranean filaments bind root to stone, exchanging carbon, memory, and warning across the forest floor.',
    extendedStory:
      'No tree stands in isolation. Beneath the moss lies an ancient biological neural web—billions of golden fungal threads translating chemistry into collective survival and mutual nourishment.',
    ctaLabel: 'TRACE MYCELIUM',
    metadata: {
      elevation: '4.55m Above Root Crown',
      epoch: 'Year 68 · Symbiotic Equilibrium',
      specimen: 'Mycorrhizal Gold Filament',
      coordinates: '215°SW · Deep Canopy Fork',
    },
    branchAttachment: { x: -1.85, y: 5.15, z: -2.15 },
    cardPosition: { x: -1.85, y: 4.45, z: -2.15 },
    rotation: { x: 0.01, y: 0.72, z: 0.01 },
    cameraApproach: { x: -5.2, y: 5.2, z: 1.2 },
    cameraPosition: { x: -0.65, y: 4.42, z: -0.72 },
    cameraTarget: { x: -1.85, y: 4.48, z: -2.15 },
    scrollRange: [0.806, 0.854],
    accentColor: '#d49b4b',
  },
  {
    id: 'branch-04',
    index: '04',
    title: 'Crown of Alchemy',
    subtitle: 'Where Photons Become Living Matter',
    category: 'CANOPY — 04',
    year: 'EPOCH IV · SOVEREIGNTY',
    image: '/images/branches/branch-04.jpg',
    description:
      'Ten thousand translucent leaves tilt in unison toward the zenith, weaving raw sunlight into breath and shelter.',
    extendedStory:
      'At the upper canopy, architecture dissolves into pure light. Every branch bifurcation follows fractal geometry to ensure no leaf shadows its neighbor too deeply—a cathedral of green and gold.',
    ctaLabel: 'EXPLORE CANOPY',
    metadata: {
      elevation: '5.65m Above Root Crown',
      epoch: 'Year 140 · Full Canopy Sovereign',
      specimen: 'Chlorophyll & Gold Venation',
      coordinates: '68°NE · Upper Sunward Bough',
    },
    branchAttachment: { x: 2.55, y: 5.65, z: -1.45 },
    cardPosition: { x: 2.55, y: 4.95, z: -1.45 },
    rotation: { x: -0.02, y: -0.55, z: 0.01 },
    cameraApproach: { x: 5.8, y: 5.6, z: 2.4 },
    cameraPosition: { x: 1.62, y: 4.92, z: 0.12 },
    cameraTarget: { x: 2.55, y: 4.98, z: -1.45 },
    scrollRange: [0.854, 0.902],
    accentColor: '#c9d876',
  },
  {
    id: 'branch-05',
    index: '05',
    title: 'Seeds of Tomorrow',
    subtitle: 'Dispersal into the Infinite Wind',
    category: 'LEGACY — 05',
    year: 'EPOCH V · CONTINUITY',
    image: '/images/branches/branch-05.jpg',
    description:
      'At the highest bough, a sculpted pod opens to the autumn gale—releasing winged vessels to begin the cycle anew.',
    extendedStory:
      'Completion is never an ending. The mature tree surrenders its highest creation to the wind, trusting that what took a century to build can be carried forward inside a single weightless seed.',
    ctaLabel: 'WITNESS DISPERSAL',
    metadata: {
      elevation: '6.35m Above Root Crown',
      epoch: 'Year 250 · Eternal Return',
      specimen: 'Samara Alata · Golden Seed Pod',
      coordinates: '04°N · Apex Crown Bough',
    },
    branchAttachment: { x: 0.25, y: 6.25, z: 2.25 },
    cardPosition: { x: 0.25, y: 5.55, z: 2.25 },
    rotation: { x: 0.01, y: -0.08, z: 0.0 },
    cameraApproach: { x: 2.8, y: 6.2, z: 6.4 },
    cameraPosition: { x: 0.12, y: 5.52, z: 4.08 },
    cameraTarget: { x: 0.25, y: 5.58, z: 2.25 },
    scrollRange: [0.902, 0.948],
    accentColor: '#f0cf85',
  },
];
