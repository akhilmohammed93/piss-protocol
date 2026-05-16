/**
 * shared/ruleEngine.ts  ─  Piss Protocol v2
 * Pure logic – no browser dependencies. Shared between server and client.
 */

export interface LevelState {
  totalUrinals:           number;
  occupiedPositions:      number[];
  bossPosition:           number | null;
  pervPositions:          number[];
  uncleanPositions:       number[];
  janitorPositions:       number[];
  phoneGuyPositions:      number[];
  chatterboxPositions:    number[];
  cautionConePositions:   number[];
  mirrorGuyPositions:     number[];
  kidPositions:           number[];
  patternEnforced:        boolean;
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

interface EffectiveState {
  blockedSet:     Set<number>;
  uncleanSet:     Set<number>;
  bossZoneSet:    Set<number>;
  pervZoneSet:    Set<number>;
  phoneZoneSet:   Set<number>;
  chatterZoneSet: Set<number>;
  allOccupied:    number[];
}

function computeEffective(s: LevelState): EffectiveState {
  const boss = s.bossPosition !== null ? [s.bossPosition] : [];

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

  const uncleanSet = new Set(s.uncleanPositions);
  for (const j of s.janitorPositions) {
    if (j - 1 >= 0)               uncleanSet.add(j - 1);
    if (j + 1 < s.totalUrinals)   uncleanSet.add(j + 1);
  }

  const bossZoneSet = new Set<number>();
  if (s.bossPosition !== null) {
    const b = s.bossPosition;
    if (b - 1 >= 0)             bossZoneSet.add(b - 1);
    if (b + 1 < s.totalUrinals) bossZoneSet.add(b + 1);
  }

  const pervZoneSet = new Set<number>();
  for (const p of [...s.pervPositions, ...s.mirrorGuyPositions]) {
    for (let d = -2; d <= 2; d++) {
      const pos = p + d;
      if (pos >= 0 && pos < s.totalUrinals && pos !== p) pervZoneSet.add(pos);
    }
  }

  const phoneZoneSet = new Set<number>();
  for (const pg of s.phoneGuyPositions) {
    if (pg - 1 >= 0)             phoneZoneSet.add(pg - 1);
    if (pg + 1 < s.totalUrinals) phoneZoneSet.add(pg + 1);
  }

  const chatterZoneSet = new Set<number>();
  for (const cb of s.chatterboxPositions) {
    for (let d = -2; d <= 2; d++) {
      const pos = cb + d;
      if (pos >= 0 && pos < s.totalUrinals && pos !== cb) chatterZoneSet.add(pos);
    }
  }

  const allOccupied = Array.from(blockedSet);

  return { blockedSet, uncleanSet, bossZoneSet, pervZoneSet, phoneZoneSet, chatterZoneSet, allOccupied };
}

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

export interface RankedUrinal {
  position:         number;
  rawScore:         number;
  primaryPassing:   boolean;
  violations:       PrimaryViolation[];
  violationCount:   number;
}

export function rankUrinals(s: LevelState): RankedUrinal[] {
  const eff = computeEffective(s);
  const all = Array.from({ length: s.totalUrinals }, (_, i) => i);
  const available = all.filter(i => !eff.blockedSet.has(i));

  const even = s.occupiedPositions.filter(o => o % 2 === 0).length;
  const odd  = s.occupiedPositions.filter(o => o % 2 === 1).length;

  const ranked = available.map(pos => {
    const violations: PrimaryViolation[] = [];
    let raw = 0;

    if (!eff.uncleanSet.has(pos)) raw += 1000;
    else violations.push('unclean');

    if (!eff.bossZoneSet.has(pos)) raw += 800;
    else violations.push('boss');

    if (!eff.pervZoneSet.has(pos)) raw += 600;
    else violations.push('perv');

    const adj = eff.allOccupied.some(o => Math.abs(o - pos) === 1);
    if (!adj) raw += 400;
    else violations.push('adjacent');

    if (!eff.phoneZoneSet.has(pos)) raw += 300;
    else violations.push('phoneGuy');

    if (!eff.chatterZoneSet.has(pos)) raw += 200;
    else violations.push('chatterbox');

    const followsPattern =
      s.occupiedPositions.length === 0 ||
      (even > odd && pos % 2 === 0) ||
      (odd > even && pos % 2 === 1) ||
      even === odd;
    if (s.patternEnforced) {
      if (followsPattern) raw += 100;
      else violations.push('pattern');
    }

    if (pos === 0 || pos === s.totalUrinals - 1) raw += 30;

    if (eff.allOccupied.length > 0) {
      const minDist = Math.min(...eff.allOccupied.map(o => Math.abs(o - pos)));
      raw += Math.min(minDist, 5) * 10;
    } else {
      raw += 50;
    }

    if (!s.patternEnforced && followsPattern) raw += 5;

    return {
      position:       pos,
      rawScore:       raw,
      primaryPassing: violations.length === 0,
      violations,
      violationCount: violations.length,
    };
  });

  ranked.sort((a, b) => b.rawScore - a.rawScore || a.position - b.position);

  return ranked;
}

export type ScoreTier = 'perfect' | 'strong' | 'acceptable' | 'reduced' | 'fail';

export interface ChoiceResult {
  valid:          boolean;
  tier:           ScoreTier;
  gameScore:      number;
  primaryPassing: boolean;
  isLesserEvil:   boolean;
  firstViolation: PrimaryViolation | null;
  betterExists:   boolean;
}

export function evaluateChoice(pos: number, s: LevelState): ChoiceResult {
  const eff = computeEffective(s);

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

export function getBestCandidates(s: LevelState): number[] {
  const ranked = rankUrinals(s);
  if (ranked.length === 0) return [];

  const topScore = ranked[0].rawScore;
  return ranked.filter(r => r.rawScore === topScore).map(r => r.position);
}

export interface HoldItInResult {
  valid:  boolean;
  reason: string;
}

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

export interface LevelValidation {
  valid:            boolean;
  forcedHoldLevel:  boolean;
}

export function validateLevel(s: LevelState): LevelValidation {
  const ranked  = rankUrinals(s);
  const holdRes = evaluateHoldItIn(s);

  if (ranked.length === 0 && holdRes.valid) {
    return { valid: true, forcedHoldLevel: true };
  }

  if (ranked.length === 0) {
    return { valid: false, forcedHoldLevel: false };
  }

  const anyPrimary = ranked.some(r => r.primaryPassing);

  if (anyPrimary) {
    return { valid: true, forcedHoldLevel: false };
  }

  if (holdRes.valid) {
    return { valid: true, forcedHoldLevel: true };
  }

  return { valid: false, forcedHoldLevel: false };
}
