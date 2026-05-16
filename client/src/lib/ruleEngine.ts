/**
 * ruleEngine.ts  ─  Piss Protocol v2
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * RULE HIERARCHY
 * ──────────────
 *  HARD FAIL   Always invalid, no recovery
 *   HF-1  Selecting a blocked/occupied position
 *   HF-2  Selecting a primary-violating urinal when a primary-passing one exists
 *
 *  PRIMARY RULES  (P)  — mandatory when avoidable
 *   P1  avoid unclean urinal   (includes Janitor wet-floor ±1)
 *   P2  avoid boss adjacency   (±1)
 *   P3  avoid perv gaze range  (±2)
 *   P4  avoid occupied adjacency (±1)  — counts all blocking chars
 *   P5  avoid Phone Guy distraction zone (±1)
 *   P6  avoid Chatterbox chat zone (±2)
 *   P7  checkerboard pattern — PRIMARY when patternEnforced flag is set
 *
 *  SECONDARY RULES  (S)  — tie-breakers, NEVER cause failure
 *   S1  prefer edge urinals
 *   S2  maximise minimum distance from all blocked positions
 *   S3  follow checkerboard pattern (when NOT patternEnforced)
 *
 * SCORING TIERS
 * ─────────────
 *  100  perfect   — top-ranked choice (all primary + top secondary)
 *   80  strong    — primary-passing, minor secondary gap
 *   60  acceptable— primary-passing, noticeable secondary gap
 *  10–20 reduced  — forced compromise (no primary-passing option)
 *    0  fail
 *   50  hold-it-in bonus
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── LEVEL STATE ─────────────────────────────────────────────────────────────

export interface LevelState {
  totalUrinals:           number;
  occupiedPositions:      number[];   // Regular anonymous occupants
  bossPosition:           number | null;
  pervPositions:          number[];   // Perv — gaze range ±2   (level 20+)
  uncleanPositions:       number[];   // Dirty urinals           (level 30+)
  janitorPositions:       number[];   // Janitor — wet floor ±1  (level 40+)
  phoneGuyPositions:      number[];   // Phone Guy — ±1 zone     (level 50+)
  chatterboxPositions:    number[];   // Chatterbox — ±2 zone    (level 60+)
  cautionConePositions:   number[];   // Caution cone — just blocks (level 70+)
  mirrorGuyPositions:     number[];   // Mirror Guy — gaze ±2    (level 80+)
  kidPositions:           number[];   // Kid — splash zone ±1    (level 95+)
  patternEnforced:        boolean;    // Pattern = PRIMARY rule  (level 90+)
}

export function emptyLevelState(totalUrinals: number): LevelState {
  return {
    totalUrinals,
    occupiedPositions:    [],
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

// ── EFFECTIVE STATE (derives zone sets from all character positions) ─────────

interface EffectiveState {
  blockedSet:     Set<number>;   // positions a player cannot stand in
  uncleanSet:     Set<number>;   // effective dirty positions (incl. janitor wet-floor)
  bossZoneSet:    Set<number>;   // ±1 from boss (P2)
  pervZoneSet:    Set<number>;   // ±2 from perv + mirror guy (P3)
  phoneZoneSet:   Set<number>;   // ±1 from phone guy (P5)
  chatterZoneSet: Set<number>;   // ±2 from chatterbox (P6)
  allOccupied:    number[];      // all positions that count for adjacency checks
}

function computeEffective(s: LevelState): EffectiveState {
  const boss = s.bossPosition !== null ? [s.bossPosition] : [];

  // Everything that physically blocks a slot
  const blockedArr = [
    ...s.occupiedPositions,
    ...boss,
    ...s.janitorPositions,
    ...s.phoneGuyPositions,
    ...s.chatterboxPositions,
    ...s.cautionConePositions,
    ...s.mirrorGuyPositions,
    ...s.kidPositions,
  ];
  const blockedSet = new Set(blockedArr);

  // Effective unclean: declared + janitor wet floor (±1 around janitor)
  const uncleanSet = new Set(s.uncleanPositions);
  for (const j of s.janitorPositions) {
    if (j - 1 >= 0)               uncleanSet.add(j - 1);
    if (j + 1 < s.totalUrinals)   uncleanSet.add(j + 1);
  }

  // Boss zone: ±1 around boss
  const bossZoneSet = new Set<number>();
  if (s.bossPosition !== null) {
    const b = s.bossPosition;
    if (b - 1 >= 0)             bossZoneSet.add(b - 1);
    if (b + 1 < s.totalUrinals) bossZoneSet.add(b + 1);
  }

  // Perv zone: ±2 around each perv + mirror guy
  const pervZoneSet = new Set<number>();
  for (const p of [...s.pervPositions, ...s.mirrorGuyPositions]) {
    for (let d = -2; d <= 2; d++) {
      const pos = p + d;
      if (pos >= 0 && pos < s.totalUrinals && pos !== p) pervZoneSet.add(pos);
    }
  }

  // Phone Guy zone: ±1
  const phoneZoneSet = new Set<number>();
  for (const pg of s.phoneGuyPositions) {
    if (pg - 1 >= 0)             phoneZoneSet.add(pg - 1);
    if (pg + 1 < s.totalUrinals) phoneZoneSet.add(pg + 1);
  }

  // Chatterbox zone: ±2
  const chatterZoneSet = new Set<number>();
  for (const cb of s.chatterboxPositions) {
    for (let d = -2; d <= 2; d++) {
      const pos = cb + d;
      if (pos >= 0 && pos < s.totalUrinals && pos !== cb) chatterZoneSet.add(pos);
    }
  }

  // All positions that count for adjacency (P4) — everything physically blocked
  const allOccupied = Array.from(blockedSet);

  return { blockedSet, uncleanSet, bossZoneSet, pervZoneSet, phoneZoneSet, chatterZoneSet, allOccupied };
}

// ── PRIMARY VIOLATION TYPES ──────────────────────────────────────────────────

export type PrimaryViolation =
  | 'unclean'
  | 'boss'
  | 'perv'
  | 'adjacent'
  | 'phoneGuy'
  | 'chatterbox'
  | 'pattern';

export interface PrimaryViolationDetail {
  type: PrimaryViolation;
  label: string;
}

// ── RANK URINALS ─────────────────────────────────────────────────────────────

export interface RankedUrinal {
  position:         number;
  rawScore:         number;   // Composite score used for ranking
  primaryPassing:   boolean;
  violations:       PrimaryViolation[];
  violationCount:   number;
}

/**
 * rankUrinals(state)
 *
 * Deterministically ranks ALL available positions (not blocked) from best → worst.
 * Returns a sorted array of RankedUrinal objects.
 *
 * Scoring weights:
 *   Primary layer (dominate ranking):
 *     P1 clean           = +1000
 *     P2 boss-safe       = +800
 *     P3 perv-safe       = +600
 *     P4 not adjacent    = +400
 *     P5 phone-safe      = +300
 *     P6 chatter-safe    = +200
 *     P7 pattern match   = +100  (only if patternEnforced)
 *
 *   Secondary layer (tie-break within same primary tier):
 *     S1 edge            = +30
 *     S2 min distance    = min(dist,5)*10  (0–50)
 *     S3 pattern match   = +5  (when NOT patternEnforced)
 */
export function rankUrinals(s: LevelState): RankedUrinal[] {
  const eff = computeEffective(s);
  const all = Array.from({ length: s.totalUrinals }, (_, i) => i);
  const available = all.filter(i => !eff.blockedSet.has(i));

  const even = s.occupiedPositions.filter(o => o % 2 === 0).length;
  const odd  = s.occupiedPositions.filter(o => o % 2 === 1).length;

  const ranked = available.map(pos => {
    const violations: PrimaryViolation[] = [];
    let raw = 0;

    // P1 – clean
    if (!eff.uncleanSet.has(pos)) raw += 1000;
    else violations.push('unclean');

    // P2 – boss-safe
    if (!eff.bossZoneSet.has(pos)) raw += 800;
    else violations.push('boss');

    // P3 – perv-safe
    if (!eff.pervZoneSet.has(pos)) raw += 600;
    else violations.push('perv');

    // P4 – not adjacent to any blocked position
    const adj = eff.allOccupied.some(o => Math.abs(o - pos) === 1);
    if (!adj) raw += 400;
    else violations.push('adjacent');

    // P5 – phone-safe
    if (!eff.phoneZoneSet.has(pos)) raw += 300;
    else violations.push('phoneGuy');

    // P6 – chatter-safe
    if (!eff.chatterZoneSet.has(pos)) raw += 200;
    else violations.push('chatterbox');

    // P7 – pattern (PRIMARY only when patternEnforced)
    const followsPattern =
      s.occupiedPositions.length === 0 ||
      (even > odd && pos % 2 === 0) ||
      (odd > even && pos % 2 === 1) ||
      even === odd;
    if (s.patternEnforced) {
      if (followsPattern) raw += 100;
      else violations.push('pattern');
    }

    // ── Secondary tie-breakers ──────────────────────────────────────
    // S1 – edge
    if (pos === 0 || pos === s.totalUrinals - 1) raw += 30;

    // S2 – minimum distance from all blocked
    if (eff.allOccupied.length > 0) {
      const minDist = Math.min(...eff.allOccupied.map(o => Math.abs(o - pos)));
      raw += Math.min(minDist, 5) * 10;
    } else {
      raw += 50; // nobody around → max distance score
    }

    // S3 – pattern (SECONDARY only when NOT patternEnforced)
    if (!s.patternEnforced && followsPattern) raw += 5;

    return {
      position:       pos,
      rawScore:       raw,
      primaryPassing: violations.length === 0,
      violations,
      violationCount: violations.length,
    };
  });

  // Sort: highest score first; tie-break by position (lower index first = deterministic)
  ranked.sort((a, b) => b.rawScore - a.rawScore || a.position - b.position);

  return ranked;
}

// ── EVALUATE CHOICE ──────────────────────────────────────────────────────────

export type ScoreTier = 'perfect' | 'strong' | 'acceptable' | 'reduced' | 'fail';

export interface ChoiceResult {
  valid:          boolean;
  tier:           ScoreTier;
  gameScore:      number;          // Points to award: 100/80/60/10-20/0
  primaryPassing: boolean;
  isLesserEvil:   boolean;         // forced compromise — no primary-passing option existed
  firstViolation: PrimaryViolation | null;
  betterExists:   boolean;         // a primary-passing option was available
}

/**
 * evaluateChoice(pos, state)
 *
 * Deterministically evaluates a single urinal choice.
 *
 * Logic:
 *   1. Blocked → fail immediately
 *   2. Run rankUrinals to know the full landscape
 *   3. If chosen pos violates a primary rule AND a primary-passing urinal exists → FAIL
 *   4. If chosen pos violates but NO primary-passing exists → lesser-evil success
 *   5. If chosen pos is primary-passing → score by secondary tier
 */
export function evaluateChoice(pos: number, s: LevelState): ChoiceResult {
  const eff = computeEffective(s);

  // Hard fail: blocked
  if (eff.blockedSet.has(pos)) {
    return { valid: false, tier: 'fail', gameScore: 0, primaryPassing: false, isLesserEvil: false, firstViolation: null, betterExists: false };
  }

  const ranked = rankUrinals(s);
  const me = ranked.find(r => r.position === pos);
  if (!me) {
    return { valid: false, tier: 'fail', gameScore: 0, primaryPassing: false, isLesserEvil: false, firstViolation: null, betterExists: false };
  }

  const anyPrimaryPassing = ranked.some(r => r.primaryPassing);
  const betterExists = anyPrimaryPassing;

  // Hard fail: violates primary AND primary-passing option exists
  if (!me.primaryPassing && anyPrimaryPassing) {
    return {
      valid:          false,
      tier:           'fail',
      gameScore:      0,
      primaryPassing: false,
      isLesserEvil:   false,
      firstViolation: me.violations[0] ?? null,
      betterExists:   true,
    };
  }

  // Lesser evil: no primary-passing option — forced compromise
  if (!me.primaryPassing && !anyPrimaryPassing) {
    const penalty = me.violationCount;
    const score   = penalty === 1 ? 20 : penalty === 2 ? 15 : 10;
    return {
      valid:          true,
      tier:           'reduced',
      gameScore:      score,
      primaryPassing: false,
      isLesserEvil:   true,
      firstViolation: me.violations[0] ?? null,
      betterExists:   false,
    };
  }

  // Primary-passing — determine tier based on secondary rank
  const primaryPassing = ranked.filter(r => r.primaryPassing);
  const topScore       = primaryPassing[0].rawScore;
  const ratio          = me.rawScore / topScore;

  let tier:      ScoreTier;
  let gameScore: number;

  if (ratio >= 0.97) { tier = 'perfect';    gameScore = 100; }
  else if (ratio >= 0.90) { tier = 'strong'; gameScore = 80;  }
  else                 { tier = 'acceptable'; gameScore = 60; }

  return {
    valid:          true,
    tier,
    gameScore,
    primaryPassing: true,
    isLesserEvil:   false,
    firstViolation: null,
    betterExists,
  };
}

// ── GET BEST CANDIDATES ──────────────────────────────────────────────────────

/**
 * Returns all positions with the top raw score (may be multiple).
 * These are the "perfect" choices the player SHOULD pick.
 */
export function getBestCandidates(s: LevelState): number[] {
  const ranked = rankUrinals(s);
  if (ranked.length === 0) return [];

  const topScore = ranked[0].rawScore;
  return ranked.filter(r => r.rawScore === topScore).map(r => r.position);
}

// ── EVALUATE HOLD IT IN ──────────────────────────────────────────────────────

export interface HoldItInResult {
  valid:  boolean;
  reason: string;
}

/**
 * Hold It In is valid ONLY when NO available urinal satisfies all primary rules.
 */
export function evaluateHoldItIn(s: LevelState): HoldItInResult {
  const eff    = computeEffective(s);
  const all    = Array.from({ length: s.totalUrinals }, (_, i) => i);
  const avail  = all.filter(i => !eff.blockedSet.has(i));

  if (avail.length === 0) {
    return { valid: true, reason: 'All urinals are occupied. No choice but to wait.' };
  }

  const ranked         = rankUrinals(s);
  const hasPrimaryPass = ranked.some(r => r.primaryPassing);

  if (hasPrimaryPass) {
    return { valid: false, reason: 'There are still acceptable urinals available. Be a man and pick one!' };
  }

  return { valid: true, reason: 'Every available urinal violates at least one rule. Honourable hold!' };
}

// ── VALIDATE LEVEL ────────────────────────────────────────────────────────────

export interface LevelValidation {
  valid:            boolean;
  forcedHoldLevel:  boolean;   // true when ONLY hold-it-in is the correct move
}

/**
 * validateLevel(state)
 *
 * A level is valid if:
 *   a) at least one available urinal exists (can pick)
 *   OR
 *   b) hold-it-in is valid (all options violate primary rules, or all blocked)
 *
 * forcedHoldLevel is true when ALL available urinals violate primary rules
 * and hold-it-in IS valid — the intended answer IS "hold it in".
 */
export function validateLevel(s: LevelState): LevelValidation {
  const ranked  = rankUrinals(s);
  const holdRes = evaluateHoldItIn(s);

  if (ranked.length === 0 && holdRes.valid) {
    // All occupied — hold is valid
    return { valid: true, forcedHoldLevel: true };
  }

  if (ranked.length === 0) {
    return { valid: false, forcedHoldLevel: false };
  }

  const anyPrimary = ranked.some(r => r.primaryPassing);

  if (anyPrimary) {
    return { valid: true, forcedHoldLevel: false };
  }

  // No primary-passing option, but hold is valid — forced hold level
  if (holdRes.valid) {
    return { valid: true, forcedHoldLevel: true };
  }

  // No primary-passing and hold is also invalid — deadend, regenerate
  return { valid: false, forcedHoldLevel: false };
}

// ── PANTS INCIDENT TRACKER ───────────────────────────────────────────────────

let _holdItInStreak = 0;

export function getHoldItInStreak(): number  { return _holdItInStreak; }

/**
 * Call after a successful Hold It In.
 * Returns true when a PANTS INCIDENT fires (2 consecutive holds).
 */
export function recordHoldItIn(): boolean {
  _holdItInStreak++;
  if (_holdItInStreak >= 2) {
    _holdItInStreak = 0;
    return true;
  }
  return false;
}

/** Call after any urinal selection to break the hold-it-in streak. */
export function resetHoldItInStreak(): void {
  _holdItInStreak = 0;
}
