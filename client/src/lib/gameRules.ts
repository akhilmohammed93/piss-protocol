/**
 * gameRules.ts  ─  Piss Protocol v2
 * ═══════════════════════════════════════════════════════════════════════════
 * Level generation + checkSelection using the deterministic ruleEngine.
 *
 * MECHANIC INTRODUCTION SCHEDULE (Phase 1, levels 10–100)
 *   10  → Boss
 *   20  → Perv
 *   30  → Unclean urinals
 *   40  → Janitor  (wet floor ±1)
 *   50  → Phone Guy (distraction ±1)
 *   60  → Chatterbox (chat zone ±2)
 *   70  → Caution Cone (blocks urinal)
 *   80  → Mirror Guy  (gaze ±2 from wall)
 *   90  → Pattern Enforcer (checkerboard becomes PRIMARY)
 *  100+ → Full combinations
 *
 * Phase 0  (1–9)    Basic spacing only
 * Phase 1  (10–100) One new mechanic every 10 levels
 * Phase 2  (101–500) All mechanics, increasing complexity
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  type LevelState,
  type PrimaryViolation,
  evaluateChoice,
  evaluateHoldItIn,
  validateLevel,
  rankUrinals,
  getBestCandidates,
} from './ruleEngine';

// ── LEVEL DATA ───────────────────────────────────────────────────────────────

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
  difficulty:           number;       // 0–100 computed difficulty
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

// ── ANTI-REPETITION STORE ────────────────────────────────────────────────────

interface LevelRecord {
  urinalCount:       number;
  occupiedHash:      string;
  bossPosition:      number | null;
  pervHash:          string;
  uncleanHash:       string;
  extraCharsHash:    string;          // janitor+phone+chatter+cone+mirror
  characterCombo:    string;          // which character types appeared
}

const previousLevels = new Map<number, LevelRecord>();
const recentCombos: string[] = [];   // track last 3 character combos

function sortedHash(arr: number[]): string {
  return [...arr].sort((a, b) => a - b).join(',');
}

function isTooSimilar(
  level:    number,
  ld:       Omit<LevelData, 'forcedHoldLevel' | 'difficulty'>,
  combo:    string,
): boolean {
  // Reject same combo 3 times in a row
  if (recentCombos.length >= 3 && recentCombos.slice(-3).every(c => c === combo)) return true;

  for (let i = 1; i <= 5; i++) {
    const prev = previousLevels.get(level - i);
    if (!prev) continue;

    if (prev.urinalCount !== ld.urinalCount) continue;

    // Same boss and same occupied > 50% → too similar
    if (prev.bossPosition === ld.bossPosition && ld.bossPosition !== null) {
      const prevOcc = prev.occupiedHash.split(',').map(Number).filter(Boolean);
      const curOcc  = ld.occupiedPositions;
      const common  = curOcc.filter(p => prevOcc.includes(p)).length;
      if (common / Math.max(prevOcc.length, 1) > 0.5) return true;
    }

    // Same perv > 50%
    const prevPerv = prev.pervHash.split(',').map(Number).filter(Boolean);
    const curPerv  = ld.pervPositions;
    if (prevPerv.length > 0 && curPerv.length > 0) {
      const common = curPerv.filter(p => prevPerv.includes(p)).length;
      if (common / Math.max(prevPerv.length, 1) > 0.5) return true;
    }
  }
  return false;
}

// ── HELPER: pick a random position from a pool ───────────────────────────────

function pickRandom(pool: number[]): number | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickRandomN(pool: number[], n: number): number[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── DIFFICULTY ESTIMATOR ─────────────────────────────────────────────────────

function estimateDifficulty(state: LevelState): number {
  const ranked = rankUrinals(state);
  if (ranked.length === 0) return 100; // forced hold = max tension

  const anyPrimary = ranked.some(r => r.primaryPassing);
  if (!anyPrimary) return 85; // lesser evil situation

  const primaryPassing = ranked.filter(r => r.primaryPassing);
  const topScore = primaryPassing[0].rawScore;
  const bottomScore = primaryPassing[primaryPassing.length - 1].rawScore;
  const spread = topScore - bottomScore;

  // More spread = more ambiguity = harder
  const ambiguity = Math.min(spread / 200, 1); // 0–1

  // More characters = harder
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

  // Fewer valid choices = harder
  const validCount = primaryPassing.length;
  const validScore = validCount === 1 ? 20 : validCount === 2 ? 10 : 0;

  return Math.min(Math.round(ambiguity * 40 + charScore + validScore), 100);
}

// ── PHASE HELPERS ────────────────────────────────────────────────────────────

/** Phase 0: no special characters, 4–5 urinals, 1 edge-occupied
 *  Always places the occupied urinal at an edge so there is always
 *  a valid non-adjacent pick for the player. */
function buildPhase0Config(level: number): Omit<LevelData, 'forcedHoldLevel' | 'difficulty'> {
  // Use at least 4 urinals — 3-urinal with center occupied = forced hold
  const urinalCount = level <= 5 ? 4 : 5;

  // Alternate between left-edge and right-edge occupancy for variety.
  // Edge placement always leaves ≥2 non-adjacent valid picks.
  const edgePos = (level % 2 === 0) ? 0 : (urinalCount - 1);
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

/** Intro level: isolates a SINGLE mechanic clearly */
function buildIntroLevel(mechanic: number, urinalCount: number): Omit<LevelData, 'forcedHoldLevel' | 'difficulty'> {
  const base: Omit<LevelData, 'forcedHoldLevel' | 'difficulty'> = {
    urinalCount,
    occupiedPositions:    [Math.floor(urinalCount / 2)], // center occupied
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
    case 10: { // Boss — place next to the only non-edge option, forcing edge pick
      base.bossPosition = 1;
      break;
    }
    case 20: { // Perv — place in the middle, blocking ±2
      base.pervPositions = [Math.floor(urinalCount / 2)];
      base.occupiedPositions = []; // no regular occupied so perv is the obstacle
      break;
    }
    case 30: { // Unclean — make all but edge urinals dirty
      base.uncleanPositions = avail.filter(i => i !== 0 && i !== urinalCount - 1);
      break;
    }
    case 40: { // Janitor — wet floor forces edge
      base.janitorPositions = [Math.floor(urinalCount / 2)];
      base.occupiedPositions = [];
      break;
    }
    case 50: { // Phone Guy — ±1 distraction, one clear safe spot
      base.phoneGuyPositions = [Math.floor(urinalCount / 2)];
      base.occupiedPositions = [];
      break;
    }
    case 60: { // Chatterbox — ±2 zone, only edges are safe
      base.chatterboxPositions = [Math.floor(urinalCount / 2)];
      base.occupiedPositions   = [];
      break;
    }
    case 70: { // Caution cone — blocks middle, forces player to pick around it
      base.cautionConePositions = [Math.floor(urinalCount / 2)];
      base.occupiedPositions    = [];
      break;
    }
    case 80: { // Mirror Guy — like perv from one side
      base.mirrorGuyPositions = [urinalCount - 1]; // at the end
      base.occupiedPositions  = [0]; // other end occupied
      break;
    }
    case 90: { // Pattern Enforcer — checkerboard forced
      base.patternEnforced    = true;
      base.occupiedPositions  = [0, 2]; // force player to see the pattern
      break;
    }
    case 95: { // Kid — splash zone ±1, erratic — shows awkward proximity
      base.kidPositions       = [Math.floor(urinalCount / 2)];
      base.occupiedPositions  = [];
      break;
    }
    case 100: { // Combo intro — Boss + Perv together
      base.bossPosition       = 1;
      base.pervPositions      = [urinalCount - 2];
      base.occupiedPositions  = [];
      break;
    }
  }

  return base;
}

// ── MAIN LEVEL GENERATOR ─────────────────────────────────────────────────────

export function generateLevel(level: number): LevelData {
  const clampedLevel = Math.max(1, Math.min(level, 500));

  // ── Phase 0 (levels 1–9): simple spacing only ──
  if (clampedLevel < 10) {
    const config = buildPhase0Config(clampedLevel);
    const state  = levelDataToState({ ...config, forcedHoldLevel: false, difficulty: 0 });
    const val    = validateLevel(state);
    const diff   = estimateDifficulty(state);
    return { ...config, forcedHoldLevel: val.forcedHoldLevel, difficulty: diff };
  }

  // ── Intro levels (multiples of 10 in Phase 1, 10–100) ──
  if (clampedLevel <= 100 && clampedLevel % 10 === 0) {
    const urinalCount = Math.min(4 + Math.floor(clampedLevel / 10), 8);
    let config = buildIntroLevel(clampedLevel, urinalCount);
    let attempts = 0;

    while (attempts < 10) {
      attempts++;
      const state = levelDataToState({ ...config, forcedHoldLevel: false, difficulty: 0 });
      const val   = validateLevel(state);
      if (val.valid) {
        const diff = estimateDifficulty(state);
        return { ...config, forcedHoldLevel: val.forcedHoldLevel, difficulty: diff };
      }
      // Rebuild if invalid (shouldn't normally happen for intros)
      config = buildIntroLevel(clampedLevel, urinalCount);
    }
  }

  // ── Phase 1 (11–99) and Phase 2 (101–500): randomized generation ──
  let attempts = 0;

  while (attempts < 20) {
    attempts++;
    const config = buildRandomConfig(clampedLevel, attempts);
    const combo  = buildComboKey(config);

    if (isTooSimilar(clampedLevel, config, combo)) continue;

    const state = levelDataToState({ ...config, forcedHoldLevel: false, difficulty: 0 });
    const val   = validateLevel(state);

    if (!val.valid) continue;

    const diff = estimateDifficulty(state);

    // Store record
    previousLevels.set(clampedLevel, {
      urinalCount:    config.urinalCount,
      occupiedHash:   sortedHash(config.occupiedPositions),
      bossPosition:   config.bossPosition,
      pervHash:       sortedHash(config.pervPositions),
      uncleanHash:    sortedHash(config.uncleanPositions),
      extraCharsHash: sortedHash([
        ...config.janitorPositions,
        ...config.phoneGuyPositions,
        ...config.chatterboxPositions,
        ...config.cautionConePositions,
        ...config.mirrorGuyPositions,
        ...config.kidPositions,
      ]),
      characterCombo: combo,
    });

    recentCombos.push(combo);
    if (recentCombos.length > 10) recentCombos.shift();

    return { ...config, forcedHoldLevel: val.forcedHoldLevel, difficulty: diff };
  }

  // Fallback: simple valid level (should never be reached in practice)
  return buildFallback(clampedLevel);
}

// ── RANDOM CONFIG BUILDER ────────────────────────────────────────────────────

function buildRandomConfig(
  level:   number,
  attempt: number,
): Omit<LevelData, 'forcedHoldLevel' | 'difficulty'> {
  // ── Urinal count ──────────────────────────────────────────────────────────
  let urinalCount: number;
  if      (level <= 30)  urinalCount = 3  + (level % 3);             // 3–5
  else if (level <= 60)  urinalCount = 4  + (level % 4);             // 4–7
  else if (level <= 100) urinalCount = 5  + (level % 5);             // 5–9
  else if (level <= 200) urinalCount = 6  + (level % 6);             // 6–11
  else if (level <= 350) urinalCount = 8  + (level % 5);             // 8–12
  else                   urinalCount = 10 + (level % 6);             // 10–15
  urinalCount = Math.max(3, Math.min(urinalCount, 15));

  // ── Occupied count ────────────────────────────────────────────────────────
  const baseOccupied = Math.max(1, Math.floor(level / 25));
  const occupiedCount = Math.min(baseOccupied + (attempt % 2), Math.floor(urinalCount * 0.6));

  // ── Mechanic unlock flags ─────────────────────────────────────────────────
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

  // ── Base probability scales with level ───────────────────────────────────
  const p = (base: number) => Math.min(base + level * 0.003, 0.7);

  // ── Place occupied urinals ────────────────────────────────────────────────
  const occupiedPositions: number[] = [];
  const pool = Array.from({ length: urinalCount }, (_, i) => i);

  while (occupiedPositions.length < occupiedCount) {
    const pos = pickRandom(pool.filter(i => !occupiedPositions.includes(i)));
    if (pos !== null) occupiedPositions.push(pos);
  }

  let taken = new Set(occupiedPositions);

  // ── Boss ──────────────────────────────────────────────────────────────────
  let bossPosition: number | null = null;
  if (hasBoss && Math.random() < p(0.2)) {
    const avail = pool.filter(i => !taken.has(i));
    // Prefer non-edge positions so the adjacency rule can be felt
    const pref = avail.filter(i => i > 0 && i < urinalCount - 1);
    const pick = pickRandom(pref.length > 0 ? pref : avail);
    if (pick !== null) { bossPosition = pick; taken.add(pick); }
  }

  // ── Perv ──────────────────────────────────────────────────────────────────
  const pervPositions: number[] = [];
  if (hasPerv && Math.random() < p(0.15)) {
    const avail = pool.filter(i => !taken.has(i));
    const pick = pickRandom(avail);
    if (pick !== null) { pervPositions.push(pick); taken.add(pick); }
    // Second perv at higher levels
    if (level >= 130 && Math.random() < 0.25) {
      const avail2 = pool.filter(i => !taken.has(i));
      const pick2  = pickRandom(avail2);
      if (pick2 !== null) { pervPositions.push(pick2); taken.add(pick2); }
    }
  }

  // ── Unclean ───────────────────────────────────────────────────────────────
  const uncleanPositions: number[] = [];
  if (hasUnclean && Math.random() < p(0.2)) {
    const avail = pool.filter(i => !taken.has(i));
    const count = Math.min(1 + Math.floor(level / 60), Math.floor(avail.length * 0.4));
    uncleanPositions.push(...pickRandomN(avail, count));
    // NOTE: unclean doesn't "take" a slot — player can still stand there, it's just bad
  }

  // ── Janitor (takes a slot + makes ±1 unclean) ────────────────────────────
  const janitorPositions: number[] = [];
  if (hasJanitor && Math.random() < p(0.12)) {
    const avail = pool.filter(i => !taken.has(i));
    const pick  = pickRandom(avail);
    if (pick !== null) { janitorPositions.push(pick); taken.add(pick); }
  }

  // ── Phone Guy (takes slot + ±1 distraction) ───────────────────────────────
  const phoneGuyPositions: number[] = [];
  if (hasPhoneGuy && Math.random() < p(0.12)) {
    const avail = pool.filter(i => !taken.has(i));
    const pick  = pickRandom(avail);
    if (pick !== null) { phoneGuyPositions.push(pick); taken.add(pick); }
  }

  // ── Chatterbox (takes slot + ±2 chat zone) ───────────────────────────────
  const chatterboxPositions: number[] = [];
  if (hasChatterbox && Math.random() < p(0.10)) {
    const avail = pool.filter(i => !taken.has(i));
    // Prefer non-edge to maximise impact
    const pref  = avail.filter(i => i > 1 && i < urinalCount - 2);
    const pick  = pickRandom(pref.length > 0 ? pref : avail);
    if (pick !== null) { chatterboxPositions.push(pick); taken.add(pick); }
  }

  // ── Caution Cone (just blocks a slot) ────────────────────────────────────
  const cautionConePositions: number[] = [];
  if (hasCone && Math.random() < p(0.12)) {
    const avail = pool.filter(i => !taken.has(i));
    const pick  = pickRandom(avail);
    if (pick !== null) { cautionConePositions.push(pick); taken.add(pick); }
  }

  // ── Mirror Guy (±2 gaze from wall) ───────────────────────────────────────
  const mirrorGuyPositions: number[] = [];
  if (hasMirror && Math.random() < p(0.10)) {
    const avail = pool.filter(i => !taken.has(i));
    const pick  = pickRandom(avail);
    if (pick !== null) { mirrorGuyPositions.push(pick); taken.add(pick); }
  }

  // ── Kid (splash zone ±1 — purely awkward proximity) ───────────────────────
  const kidPositions: number[] = [];
  if (hasKid && Math.random() < p(0.10)) {
    const avail = pool.filter(i => !taken.has(i));
    // Place away from edges so the splash zone is felt
    const pref  = avail.filter(i => i > 1 && i < urinalCount - 2);
    const pick  = pickRandom(pref.length > 0 ? pref : avail);
    if (pick !== null) { kidPositions.push(pick); taken.add(pick); }
  }

  // ── Pattern Enforcer ─────────────────────────────────────────────────────
  const patternEnforced = hasPattern && Math.random() < p(0.08);

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

function buildComboKey(cfg: Omit<LevelData, 'forcedHoldLevel' | 'difficulty'>): string {
  return [
    cfg.bossPosition !== null          ? 'boss'    : '',
    cfg.pervPositions.length > 0       ? 'perv'    : '',
    cfg.uncleanPositions.length > 0    ? 'dirty'   : '',
    cfg.janitorPositions.length > 0    ? 'jan'     : '',
    cfg.phoneGuyPositions.length > 0   ? 'phone'   : '',
    cfg.chatterboxPositions.length > 0 ? 'chat'    : '',
    cfg.cautionConePositions.length > 0? 'cone'    : '',
    cfg.mirrorGuyPositions.length > 0  ? 'mirror'  : '',
    cfg.kidPositions.length > 0        ? 'kid'     : '',
    cfg.patternEnforced                ? 'pat'     : '',
  ].filter(Boolean).join('+') || 'basic';
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

// ── MESSAGE POOLS ────────────────────────────────────────────────────────────

const BLOCKED_MSGS = [
  "That urinal is already occupied! Are you trying to create a very awkward situation?",
  "Um, someone's already using that one. Personal space, please!",
  "That would be quite the social faux pas. Someone's already there!",
  "Are you trying to make a new friend? That urinal is taken!",
];

const VIOLATION_MSGS: Record<string, string[]> = {
  unclean: [
    "Eww! That urinal is visibly unclean. Have some standards!",
    "That urinal hasn't been cleaned since the Clinton administration!",
    "Health hazard alert! Choose a cleaner option or wait.",
    "Scientists have discovered new life forms in that urinal. Don't disturb their habitat!",
    "That's not a urinal, it's a crime scene!",
    "Your immune system just called. It said 'absolutely not'!",
  ],
  boss: [
    "That's next to the boss! Never choose a urinal adjacent to your boss.",
    "Office politics 101: Don't pee next to your boss if you can avoid it.",
    "Breaking the boss adjacency rule is a career-limiting move!",
    "Office hierarchy extends to the bathroom. Don't stand next to the boss.",
  ],
  perv: [
    "That position puts you in direct eye contact with The Perv. Avoid at all costs!",
    "The creepy guy always chooses that sight line. Pick another urinal!",
    "Eye contact alert! Choose a urinal away from prying eyes.",
    "Creep alert! That urinal puts you directly in his line of sight.",
  ],
  adjacent: [
    "That violates the buffer zone rule! Leave a gap when others are available.",
    "Urinal etiquette 101: Leave a buffer urinal when possible.",
    "Too close for comfort! Choose a urinal with more personal space.",
    "Respect the one-urinal buffer zone when possible.",
  ],
  phoneGuy: [
    "That puts you right next to Phone Guy. He'll show you cat memes while you pee.",
    "Phone Guy will have you on a group video call if you stand there. Move away!",
    "Nobody wants to be serenaded with TikTok audio at the urinal. Step back.",
  ],
  chatterbox: [
    "Chatterbox is within chat range! He'll give you a full life update. Move away.",
    "Standing there puts you in Chatterbox's talking zone. Nobody needs that.",
    "Chatterbox will ask how your weekend was — for 20 minutes. Avoid the zone!",
  ],
  pattern: [
    "Pattern Enforcer is watching! You must follow the checkerboard today.",
    "The Pattern Enforcer decrees: alternate urinals only. This one breaks the code.",
    "Odd/even alternation is MANDATORY today. Pick the correct parity.",
  ],
};

const LESSER_EVIL_MSGS: Record<string, string[]> = {
  unclean: [
    "They're all dirty... you reluctantly accept your fate. Mind your shoes.",
    "Every urinal is biohazard level 4. You have no choice. Stay strong.",
  ],
  boss: [
    "You reluctantly take the urinal next to the boss. Awkward, but there's nowhere else.",
    "The lesser evil: standing next to your boss when all options are limited.",
  ],
  perv: [
    "You're in perv sight lines, but there aren't better options. Keep your eyes forward!",
    "The creepy guy wins this round. Just stare at the wall and pretend he's not there.",
  ],
  adjacent: [
    "Breaking the buffer rule isn't ideal, but your options are limited.",
    "The one-urinal buffer rule has exceptions when options are limited.",
  ],
  phoneGuy: [
    "You brace for the TikTok onslaught. It's the only option.",
    "Prepare for an unsolicited phone screen. No better spots available.",
  ],
  chatterbox: [
    "Brace yourself for a full life story. It's your only option.",
    "You mentally prepare to nod along for five minutes. No other spots.",
  ],
  pattern: [
    "Pattern Enforcer glares. You break the code — but you had no choice.",
    "The checkerboard is violated through no fault of your own. Forgiven.",
  ],
};

const PERFECT_MSGS = [
  "Excellent choice! Perfect urinal etiquette.",
  "A true gentleman's selection. Well done!",
  "Flawless urinal selection. You know the code!",
  "Impeccable choice! You're a natural at this.",
  "A master class in urinal selection!",
  "The urinal gods smile upon your selection.",
  "Textbook perfect urinal choice!",
  "Bravo! Your urinal selection skills are unmatched.",
];

const STRONG_MSGS = [
  "Solid choice — all the major rules are satisfied.",
  "Good call! A seasoned bathroom veteran would approve.",
  "Respectable pick. You've navigated the urinal gauntlet successfully.",
  "Well played! There might be a slightly better option but no shame here.",
];

const ACCEPTABLE_MSGS = [
  "Acceptable pick. All the important rules are followed.",
  "Not the optimal spot, but certainly not a violation either.",
  "You've followed the primary rules. Secondary choices could be better.",
  "Satisfactory. Room for improvement in secondary positioning.",
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function violationMessage(type: PrimaryViolation, lesser: boolean): string {
  const pool = lesser
    ? (LESSER_EVIL_MSGS[type] ?? LESSER_EVIL_MSGS['adjacent'])
    : (VIOLATION_MSGS[type]   ?? VIOLATION_MSGS['adjacent']);
  return pick(pool);
}

// ── CHECK SELECTION (main game-logic entry point from UrinalGame) ────────────

export interface CheckResult {
  valid:         boolean;
  message:       string;
  score?:        number;
  needToWait?:   boolean;
  isUnclean?:    boolean;
  isBossFailure?: boolean;
  isPervFailure?: boolean;
}

export function checkSelection(
  selectedIndex:   number,
  occupiedIndexes: number[],
  totalUrinals:    number,
  bossPosition:    number | null    = null,
  pervPositions:   number[]         = [],
  uncleanPositions: number[]        = [],
  _waitingForTurn: boolean          = false,
  // Extended character positions (optional for backwards compat)
  janitorPositions:     number[]    = [],
  phoneGuyPositions:    number[]    = [],
  chatterboxPositions:  number[]    = [],
  cautionConePositions: number[]    = [],
  mirrorGuyPositions:   number[]    = [],
  patternEnforced:      boolean     = false,
  kidPositions:         number[]    = [],
): CheckResult {
  const state: LevelState = {
    totalUrinals,
    occupiedPositions:    occupiedIndexes,
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

  // Hard fail: blocked slot
  const result = evaluateChoice(selectedIndex, state);

  if (!result.valid && !result.isLesserEvil) {
    // Determine which specific message to show
    const violation = result.firstViolation;

    // Is it a hard block (occupied)?
    const eff = (() => {
      const b = bossPosition !== null ? [bossPosition] : [];
      const blocked = new Set([...occupiedIndexes, ...b, ...janitorPositions, ...phoneGuyPositions,
        ...chatterboxPositions, ...cautionConePositions, ...mirrorGuyPositions, ...kidPositions]);
      return blocked;
    })();

    if (eff.has(selectedIndex)) {
      return { valid: false, message: pick(BLOCKED_MSGS) };
    }

    if (!violation) {
      return { valid: false, message: pick(BLOCKED_MSGS) };
    }

    return {
      valid:          false,
      message:        violationMessage(violation, false),
      isUnclean:      violation === 'unclean',
      isBossFailure:  violation === 'boss',
      isPervFailure:  violation === 'perv',
    };
  }

  if (result.isLesserEvil) {
    const msg = violationMessage(result.firstViolation ?? 'adjacent', true);
    return { valid: true, message: msg, score: result.gameScore };
  }

  // Valid choice — pick message by tier
  let message: string;
  switch (result.tier) {
    case 'perfect':    message = pick(PERFECT_MSGS);    break;
    case 'strong':     message = pick(STRONG_MSGS);     break;
    case 'acceptable': message = pick(ACCEPTABLE_MSGS); break;
    default:           message = pick(ACCEPTABLE_MSGS);
  }

  return { valid: true, message, score: result.gameScore };
}
