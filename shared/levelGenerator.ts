/**
 * shared/levelGenerator.ts  ─  Piss Protocol v2
 * Pure level generation logic. No browser dependencies.
 * Shared between server (seeder) and client (legacy compat).
 */

import {
  type LevelState,
  validateLevel,
  rankUrinals,
} from './ruleEngine';

export interface LevelData {
  urinalCount:          number;
  occupiedPositions:    number[];
  bossPosition:         number | null;
  pervPositions:        number[];
  uncleanPositions:     number[];
  janitorPositions:     number[];
  phoneGuyPositions:    number[];
  chatterboxPositions:  number[];
  cautionConePositions: number[];
  mirrorGuyPositions:   number[];
  kidPositions:         number[];
  patternEnforced:      boolean;
  forcedHoldLevel:      boolean;
  difficulty:           number;
}

function levelDataToState(ld: LevelData): LevelState {
  return {
    totalUrinals:         ld.urinalCount,
    occupiedPositions:    ld.occupiedPositions,
    bossPosition:         ld.bossPosition,
    pervPositions:        ld.pervPositions,
    uncleanPositions:     ld.uncleanPositions,
    janitorPositions:     ld.janitorPositions,
    phoneGuyPositions:    ld.phoneGuyPositions,
    chatterboxPositions:  ld.chatterboxPositions,
    cautionConePositions: ld.cautionConePositions,
    mirrorGuyPositions:   ld.mirrorGuyPositions,
    kidPositions:         ld.kidPositions,
    patternEnforced:      ld.patternEnforced,
  };
}

function estimateDifficulty(state: LevelState): number {
  const ranked = rankUrinals(state);
  if (ranked.length === 0) return 100;

  const anyPrimary = ranked.some(r => r.primaryPassing);
  if (!anyPrimary) return 85;

  const primaryPassing = ranked.filter(r => r.primaryPassing);
  const topScore = primaryPassing[0].rawScore;
  const bottomScore = primaryPassing[primaryPassing.length - 1].rawScore;
  const spread = topScore - bottomScore;

  const ambiguity = Math.min(spread / 200, 1);

  const charCount = [
    state.bossPosition !== null ? 1 : 0,
    state.pervPositions.length,
    state.janitorPositions.length,
    state.phoneGuyPositions.length,
    state.chatterboxPositions.length,
    state.mirrorGuyPositions.length,
    state.patternEnforced ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const charScore = Math.min(charCount * 8, 40);

  const validCount = primaryPassing.length;
  const validScore = validCount === 1 ? 20 : validCount === 2 ? 10 : 0;

  return Math.min(Math.round(ambiguity * 40 + charScore + validScore), 100);
}

function pickRandom(pool: number[], rng: () => number): number | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

function pickRandomN(pool: number[], n: number, rng: () => number): number[] {
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

function buildPhase0Config(level: number, rng: () => number): Omit<LevelData, 'forcedHoldLevel' | 'difficulty'> {
  // Vary urinal count and occupied positions for variety across all 9 phase-0 levels
  const urinalCount = 3 + (level % 3); // 3, 4, 5 cycling

  // Pick a random valid edge position (avoid center to keep level solvable)
  const edges = [0, urinalCount - 1];
  const edgePos = edges[Math.floor(rng() * edges.length)];
  const occupiedPositions = [edgePos];

  return {
    urinalCount,
    occupiedPositions,
    bossPosition:         null,
    pervPositions:        [],
    uncleanPositions:     [],
    janitorPositions:     [],
    phoneGuyPositions:    [],
    chatterboxPositions:  [],
    cautionConePositions: [],
    mirrorGuyPositions:   [],
    kidPositions:         [],
    patternEnforced:      false,
  };
}

function buildIntroLevel(mechanic: number, urinalCount: number, rng: () => number): Omit<LevelData, 'forcedHoldLevel' | 'difficulty'> {
  const base: Omit<LevelData, 'forcedHoldLevel' | 'difficulty'> = {
    urinalCount,
    occupiedPositions:    [Math.floor(urinalCount / 2)],
    bossPosition:         null,
    pervPositions:        [],
    uncleanPositions:     [],
    janitorPositions:     [],
    phoneGuyPositions:    [],
    chatterboxPositions:  [],
    cautionConePositions: [],
    mirrorGuyPositions:   [],
    kidPositions:         [],
    patternEnforced:      false,
  };

  const avail = Array.from({ length: urinalCount }, (_, i) => i)
    .filter(i => !base.occupiedPositions.includes(i));

  switch (mechanic) {
    case 10: {
      base.bossPosition = 1;
      break;
    }
    case 20: {
      base.pervPositions = [Math.floor(urinalCount / 2)];
      base.occupiedPositions = [];
      break;
    }
    case 30: {
      base.uncleanPositions = avail.filter(i => i !== 0 && i !== urinalCount - 1);
      break;
    }
    case 40: {
      base.janitorPositions = [Math.floor(urinalCount / 2)];
      base.occupiedPositions = [];
      break;
    }
    case 50: {
      base.phoneGuyPositions = [Math.floor(urinalCount / 2)];
      base.occupiedPositions = [];
      break;
    }
    case 60: {
      base.chatterboxPositions = [Math.floor(urinalCount / 2)];
      base.occupiedPositions   = [];
      break;
    }
    case 70: {
      base.cautionConePositions = [Math.floor(urinalCount / 2)];
      base.occupiedPositions    = [];
      break;
    }
    case 80: {
      base.mirrorGuyPositions = [urinalCount - 1];
      base.occupiedPositions  = [0];
      break;
    }
    case 90: {
      base.patternEnforced    = true;
      base.occupiedPositions  = [0, 2];
      break;
    }
    case 95: {
      base.kidPositions       = [Math.floor(urinalCount / 2)];
      base.occupiedPositions  = [];
      break;
    }
    case 100: {
      base.bossPosition       = 1;
      base.pervPositions      = [urinalCount - 2];
      base.occupiedPositions  = [];
      break;
    }
  }

  return base;
}

function buildRandomConfig(
  level:   number,
  attempt: number,
  rng: () => number,
): Omit<LevelData, 'forcedHoldLevel' | 'difficulty'> {
  let urinalCount: number;
  if      (level <= 30)  urinalCount = 3  + (level % 3);
  else if (level <= 60)  urinalCount = 4  + (level % 4);
  else if (level <= 100) urinalCount = 5  + (level % 5);
  else if (level <= 200) urinalCount = 6  + (level % 6);
  else if (level <= 350) urinalCount = 8  + (level % 5);
  else                   urinalCount = 10 + (level % 6);
  urinalCount = Math.max(3, Math.min(urinalCount, 15));

  const baseOccupied = Math.max(1, Math.floor(level / 25));
  const occupiedCount = Math.min(baseOccupied + (attempt % 2), Math.floor(urinalCount * 0.6));

  const hasBoss       = level >= 10;
  const hasPerv       = level >= 20;
  const hasUnclean    = level >= 30;
  const hasJanitor    = level >= 40;
  const hasPhoneGuy   = level >= 50;
  const hasChatterbox = level >= 60;
  const hasCone       = level >= 70;
  const hasMirror     = level >= 80;
  const hasPattern    = level >= 90;
  const hasKid        = level >= 95;

  const p = (base: number) => Math.min(base + level * 0.003, 0.7);

  const occupiedPositions: number[] = [];
  const pool = Array.from({ length: urinalCount }, (_, i) => i);

  while (occupiedPositions.length < occupiedCount) {
    const pos = pickRandom(pool.filter(i => !occupiedPositions.includes(i)), rng);
    if (pos !== null) occupiedPositions.push(pos);
  }

  let taken = new Set(occupiedPositions);

  let bossPosition: number | null = null;
  if (hasBoss && rng() < p(0.2)) {
    const avail = pool.filter(i => !taken.has(i));
    const pref = avail.filter(i => i > 0 && i < urinalCount - 1);
    const pick = pickRandom(pref.length > 0 ? pref : avail, rng);
    if (pick !== null) { bossPosition = pick; taken.add(pick); }
  }

  const pervPositions: number[] = [];
  if (hasPerv && rng() < p(0.15)) {
    const avail = pool.filter(i => !taken.has(i));
    const pick = pickRandom(avail, rng);
    if (pick !== null) { pervPositions.push(pick); taken.add(pick); }
    if (level >= 130 && rng() < 0.25) {
      const avail2 = pool.filter(i => !taken.has(i));
      const pick2  = pickRandom(avail2, rng);
      if (pick2 !== null) { pervPositions.push(pick2); taken.add(pick2); }
    }
  }

  const uncleanPositions: number[] = [];
  if (hasUnclean && rng() < p(0.2)) {
    const avail = pool.filter(i => !taken.has(i));
    const count = Math.min(1 + Math.floor(level / 60), Math.floor(avail.length * 0.4));
    uncleanPositions.push(...pickRandomN(avail, count, rng));
  }

  const janitorPositions: number[] = [];
  if (hasJanitor && rng() < p(0.12)) {
    const avail = pool.filter(i => !taken.has(i));
    const pick  = pickRandom(avail, rng);
    if (pick !== null) { janitorPositions.push(pick); taken.add(pick); }
  }

  const phoneGuyPositions: number[] = [];
  if (hasPhoneGuy && rng() < p(0.12)) {
    const avail = pool.filter(i => !taken.has(i));
    const pick  = pickRandom(avail, rng);
    if (pick !== null) { phoneGuyPositions.push(pick); taken.add(pick); }
  }

  const chatterboxPositions: number[] = [];
  if (hasChatterbox && rng() < p(0.10)) {
    const avail = pool.filter(i => !taken.has(i));
    const pref  = avail.filter(i => i > 1 && i < urinalCount - 2);
    const pick  = pickRandom(pref.length > 0 ? pref : avail, rng);
    if (pick !== null) { chatterboxPositions.push(pick); taken.add(pick); }
  }

  const cautionConePositions: number[] = [];
  if (hasCone && rng() < p(0.12)) {
    const avail = pool.filter(i => !taken.has(i));
    const pick  = pickRandom(avail, rng);
    if (pick !== null) { cautionConePositions.push(pick); taken.add(pick); }
  }

  const mirrorGuyPositions: number[] = [];
  if (hasMirror && rng() < p(0.10)) {
    const avail = pool.filter(i => !taken.has(i));
    const pick  = pickRandom(avail, rng);
    if (pick !== null) { mirrorGuyPositions.push(pick); taken.add(pick); }
  }

  const kidPositions: number[] = [];
  if (hasKid && rng() < p(0.10)) {
    const avail = pool.filter(i => !taken.has(i));
    const pref  = avail.filter(i => i > 1 && i < urinalCount - 2);
    const pick  = pickRandom(pref.length > 0 ? pref : avail, rng);
    if (pick !== null) { kidPositions.push(pick); taken.add(pick); }
  }

  const patternEnforced = hasPattern && rng() < p(0.08);

  return {
    urinalCount,
    occupiedPositions,
    bossPosition,
    pervPositions,
    uncleanPositions,
    janitorPositions,
    phoneGuyPositions,
    chatterboxPositions,
    cautionConePositions,
    mirrorGuyPositions,
    kidPositions,
    patternEnforced,
  };
}

function buildFallback(_level: number): LevelData {
  return {
    urinalCount:          5,
    occupiedPositions:    [2],
    bossPosition:         null,
    pervPositions:        [],
    uncleanPositions:     [],
    janitorPositions:     [],
    phoneGuyPositions:    [],
    chatterboxPositions:  [],
    cautionConePositions: [],
    mirrorGuyPositions:   [],
    kidPositions:         [],
    patternEnforced:      false,
    forcedHoldLevel:      false,
    difficulty:           10,
  };
}

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Deterministic given the same seed — used for server-side generation.
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * generateLevel(level, seed?)
 *
 * When a seed is provided the generation is fully deterministic (server use).
 * When called without a seed it uses Math.random (client legacy use).
 */
export function generateLevel(level: number, seed?: number): LevelData {
  const clampedLevel = Math.max(1, Math.min(level, 500));
  const rng = seed !== undefined ? mulberry32(seed) : Math.random;

  if (clampedLevel < 10) {
    const config = buildPhase0Config(clampedLevel, rng);
    const state  = levelDataToState({ ...config, forcedHoldLevel: false, difficulty: 0 });
    const val    = validateLevel(state);
    const diff   = estimateDifficulty(state);
    return { ...config, forcedHoldLevel: val.forcedHoldLevel, difficulty: diff };
  }

  if (clampedLevel <= 100 && clampedLevel % 10 === 0) {
    const urinalCount = Math.min(4 + Math.floor(clampedLevel / 10), 8);
    let config = buildIntroLevel(clampedLevel, urinalCount, rng);
    let attempts = 0;

    while (attempts < 10) {
      attempts++;
      const state = levelDataToState({ ...config, forcedHoldLevel: false, difficulty: 0 });
      const val   = validateLevel(state);
      if (val.valid) {
        const diff = estimateDifficulty(state);
        return { ...config, forcedHoldLevel: val.forcedHoldLevel, difficulty: diff };
      }
      config = buildIntroLevel(clampedLevel, urinalCount, rng);
    }
  }

  let attempts = 0;

  while (attempts < 20) {
    attempts++;
    const config = buildRandomConfig(clampedLevel, attempts, rng);
    const state = levelDataToState({ ...config, forcedHoldLevel: false, difficulty: 0 });
    const val   = validateLevel(state);

    if (!val.valid) continue;

    const diff = estimateDifficulty(state);
    return { ...config, forcedHoldLevel: val.forcedHoldLevel, difficulty: diff };
  }

  return buildFallback(clampedLevel);
}
