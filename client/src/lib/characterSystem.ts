/**
 * characterSystem.ts  ─  Piss Protocol Character System
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Each character defines:
 *   getZones()   → { invalid, risky, discomfort } arrays of positions
 *   behavior     → timing constants for idle micro-animations
 *   awareness    → hover detection radius + long-hover threshold
 *   quips        → speech lines per reaction state
 *
 * ZONE SEMANTICS (matches rule engine)
 *   invalid    → PRIMARY rule violation — player MUST avoid
 *   risky      → Allowed but reduces score (reduced score tier)
 *   discomfort → Visual/behavioural feedback only, no rule impact
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type CharacterType =
  | 'boss'
  | 'perv'
  | 'janitor'
  | 'phoneGuy'
  | 'chatterbox'
  | 'cone'
  | 'mirrorGuy'
  | 'kid';

export interface CharacterZones {
  invalid:    number[];   // PRIMARY rule — must avoid if alternative exists
  risky:      number[];   // Allowed but score penalty
  discomfort: number[];   // Visual only, zero rule impact
}

export type ReactionState = 'idle' | 'hover' | 'hoverLong' | 'selected' | 'failed';

export interface CharacterBehavior {
  /** Idle drift cycle range (ms) */
  idleMin:      number;
  idleMax:      number;
  /** How far to drift in px */
  driftPx:      number;
  /** Scale sway amplitude  (1 + breathScale for max) */
  breathScale:  number;
  /** Rotation sway (deg) applied during idle */
  idleRotate:   number;
}

export interface CharacterAwareness {
  /** Tile radius that triggers 'hover' state */
  hoverRadius:  number;
  /** ms of sustained hover to trigger 'hoverLong' state */
  longHoverMs:  number;
}

export interface CharacterQuips {
  hover:     string[];
  hoverLong: string[];
  selected:  string[];
  failed:    string[];
  idle:      string[];   // shown occasionally in idle bubbles
}

export interface CharacterDef {
  type:      CharacterType;
  emoji:     string;
  label:     string;
  /** Zone computation — pure function, no randomness */
  getZones:  (pos: number, total: number) => CharacterZones;
  behavior:  CharacterBehavior;
  awareness: CharacterAwareness;
  quips:     CharacterQuips;
}

// ── Utility ─────────────────────────────────────────────────────────────────

function neighbours(pos: number, total: number, radius: number): number[] {
  const out: number[] = [];
  for (let d = -radius; d <= radius; d++) {
    if (d === 0) continue;
    const n = pos + d;
    if (n >= 0 && n < total) out.push(n);
  }
  return out;
}

// ── CHARACTER DEFINITIONS ────────────────────────────────────────────────────

export const CHARACTER_DEFS: Record<CharacterType, CharacterDef> = {

  // ── 👔 BOSS ────────────────────────────────────────────────────────────────
  boss: {
    type:  'boss',
    emoji: '👔',
    label: 'BOSS',
    getZones: (pos, total) => ({
      invalid:    neighbours(pos, total, 1),      // ±1 is off-limits
      risky:      [],
      discomfort: neighbours(pos, total, 2),      // ±2 makes you uneasy
    }),
    behavior: {
      idleMin: 3000, idleMax: 5500,
      driftPx: 1.5, breathScale: 0.012,
      idleRotate: 1,
    },
    awareness: { hoverRadius: 2, longHoverMs: 600 },
    quips: {
      hover:     ['*glances sideways*', '...'],
      hoverLong: ['*checks watch*', 'I see you.'],
      selected:  ['Back off.', '*slow head turn*'],
      failed:    ['Son… this is not a good look.', '*full stare*'],
      idle:      ['*checks watch*', '...', '*straightens tie*'],
    },
  },

  // ── 👀 PERV ────────────────────────────────────────────────────────────────
  perv: {
    type:  'perv',
    emoji: '👀',
    label: 'PERV',
    getZones: (pos, total) => ({
      invalid:    neighbours(pos, total, 2),      // ±2 = eye contact
      risky:      [],
      discomfort: neighbours(pos, total, 3),
    }),
    behavior: {
      idleMin: 900, idleMax: 2000,
      driftPx: 2.5, breathScale: 0.008,
      idleRotate: 2,
    },
    awareness: { hoverRadius: 3, longHoverMs: 400 },
    quips: {
      hover:     ['👀', '*eyes snap*'],
      hoverLong: ['*small smile*', 'Hi there...'],
      selected:  ['*direct stare*'],
      failed:    ['...interesting choice.'],
      idle:      ['👀', '...', '*leans slightly*'],
    },
  },

  // ── 🧹 JANITOR ─────────────────────────────────────────────────────────────
  janitor: {
    type:  'janitor',
    emoji: '🧹',
    label: 'JANITOR',
    getZones: (pos, total) => ({
      invalid:    [],                              // No static invalid (dynamic — rule engine handles wet floor)
      risky:      [],
      discomfort: neighbours(pos, total, 1),      // Wet floor discomfort
    }),
    behavior: {
      idleMin: 1500, idleMax: 3000,
      driftPx: 3, breathScale: 0.015,
      idleRotate: 3,                              // Mopping motion
    },
    awareness: { hoverRadius: 1, longHoverMs: 800 },
    quips: {
      hover:     ['*ignores you*'],
      hoverLong: ['*mops harder*'],
      selected:  ['*pauses*', '*looks up briefly*'],
      failed:    ['...I just mopped that.'],
      idle:      ['*mop mop*', '*whistles*', '*scrubs*'],
    },
  },

  // ── 📱 PHONE GUY ───────────────────────────────────────────────────────────
  phoneGuy: {
    type:  'phoneGuy',
    emoji: '📱',
    label: 'PHONE GUY',
    getZones: (pos, total) => ({
      invalid:    [],                              // No true failure — just awkward
      risky:      neighbours(pos, total, 1),      // Adjacent = distraction penalty
      discomfort: neighbours(pos, total, 2),
    }),
    behavior: {
      idleMin: 1000, idleMax: 2000,
      driftPx: 1, breathScale: 0.005,
      idleRotate: 0.5,
    },
    awareness: { hoverRadius: 1, longHoverMs: 500 },
    quips: {
      hover:     ['*tilts phone*'],
      hoverLong: ['*smirks at screen*'],
      selected:  ['*scrolls faster*'],
      failed:    ['lol'],
      idle:      ['*scrolling*', '*double-tap*', '*smirk*'],
    },
  },

  // ── 🗣️ CHATTERBOX ──────────────────────────────────────────────────────────
  chatterbox: {
    type:  'chatterbox',
    emoji: '🗣️',
    label: 'CHATTER',
    getZones: (pos, total) => ({
      invalid:    [],
      risky:      neighbours(pos, total, 2),      // ±2 = chatter zone, score penalty
      discomfort: neighbours(pos, total, 3),
    }),
    behavior: {
      idleMin: 800, idleMax: 1800,
      driftPx: 2, breathScale: 0.018,
      idleRotate: 4,                              // Head turning while talking
    },
    awareness: { hoverRadius: 2, longHoverMs: 500 },
    quips: {
      hover:     ['Hey!', 'So anyway—'],
      hoverLong: ['So I was saying—', 'Did I tell you about—'],
      selected:  ['Great spot! So—', '—and THEN he said—'],
      failed:    ['You should hear this story!'],
      idle:      ['blah blah', '—and then—', 'so basically—', '*gestures*'],
    },
  },

  // ── 🚧 CAUTION CONE ────────────────────────────────────────────────────────
  cone: {
    type:  'cone',
    emoji: '🚧',
    label: 'OUT OF ORDER',
    getZones: (pos, total) => ({
      invalid:    [pos],                          // The cone tile itself is blocked
      risky:      [],
      discomfort: [],
    }),
    behavior: {
      idleMin: 4000, idleMax: 7000,
      driftPx: 0.5, breathScale: 0.004,
      idleRotate: 1.5,                            // Slight wobble
    },
    awareness: { hoverRadius: 0, longHoverMs: 9999 },
    quips: {
      hover:     [],
      hoverLong: [],
      selected:  ['🚧'],
      failed:    ['🚧 OUT OF ORDER 🚧'],
      idle:      [],
    },
  },

  // ── 🪞 MIRROR GUY ──────────────────────────────────────────────────────────
  mirrorGuy: {
    type:  'mirrorGuy',
    emoji: '🪞',
    label: 'MIRROR GUY',
    getZones: (pos, total) => ({
      invalid:    [],                              // No hard rule — psychological only
      risky:      neighbours(pos, total, 2),      // Close enough to make eye contact via mirror
      discomfort: neighbours(pos, total, 4),
    }),
    behavior: {
      idleMin: 2000, idleMax: 4000,
      driftPx: 0.8, breathScale: 0.006,
      idleRotate: 0,                              // Completely still (eerie)
    },
    awareness: { hoverRadius: 3, longHoverMs: 700 },
    quips: {
      hover:     ['*tracks in mirror*'],
      hoverLong: ['...', '*still staring*'],
      selected:  ['*maintains eye contact*'],
      failed:    ['...you know I can see you, right?'],
      idle:      ['...', '*stares into the void*'],
    },
  },

  // ── 🧒 KID ─────────────────────────────────────────────────────────────────
  // Purely awkward proximity humour — zero inappropriate content.
  // A small child creates unpredictable movement and splash-zone anxiety.
  kid: {
    type:  'kid',
    emoji: '🧒',
    label: 'KID',
    getZones: (pos, total) => ({
      invalid:    [],                              // Never absolute invalid — conditional (handled by rule engine)
      risky:      neighbours(pos, total, 1),      // Splash zone — reduced score but allowed
      discomfort: neighbours(pos, total, 2),
    }),
    behavior: {
      idleMin: 600, idleMax: 1500,               // Very fidgety
      driftPx: 5, breathScale: 0.025,
      idleRotate: 8,                              // Erratic
    },
    awareness: { hoverRadius: 1, longHoverMs: 300 },
    quips: {
      hover:     ['*fidgets*', '*shuffles*'],
      hoverLong: ['*moves unpredictably*'],
      selected:  ['*splash risk*'],
      failed:    ['*splash!*'],
      idle:      ['*fidget*', '*look around*', '*shuffle shuffle*'],
    },
  },
};

// ── ZONE AGGREGATION ─────────────────────────────────────────────────────────

export interface AggregatedZones {
  invalid:    Set<number>;
  risky:      Set<number>;
  discomfort: Set<number>;
}

/**
 * Compute merged zones from all characters placed on the board.
 * Used by the rule engine for scoring and by the UI for zone overlays.
 */
export function computeAllZones(
  totalUrinals: number,
  placements: Array<{ type: CharacterType; pos: number }>,
): AggregatedZones {
  const invalid    = new Set<number>();
  const risky      = new Set<number>();
  const discomfort = new Set<number>();

  for (const { type, pos } of placements) {
    const def   = CHARACTER_DEFS[type];
    const zones = def.getZones(pos, totalUrinals);

    zones.invalid.forEach(i    => invalid.add(i));
    zones.risky.forEach(i      => risky.add(i));
    zones.discomfort.forEach(i => discomfort.add(i));
  }

  // invalid overrides risky/discomfort
  invalid.forEach(i => { risky.delete(i); discomfort.delete(i); });
  risky.forEach(i   => discomfort.delete(i));

  return { invalid, risky, discomfort };
}

// ── GROUP REACTION HELPER ────────────────────────────────────────────────────

/**
 * Returns staggered reaction payloads for a group of characters.
 * Each character reacts with an 80ms offset from the previous.
 */
export interface GroupReaction {
  type:      CharacterType;
  pos:       number;
  state:     ReactionState;
  delay:     number;
  quip:      string | null;
}

export function buildGroupReactions(
  characters:    Array<{ type: CharacterType; pos: number }>,
  state:         ReactionState,
  selectedPos?:  number,
): GroupReaction[] {
  // Sort by proximity to selected position (closest reacts first)
  const sorted = selectedPos !== undefined
    ? [...characters].sort((a, b) =>
        Math.abs(a.pos - selectedPos) - Math.abs(b.pos - selectedPos))
    : characters;

  return sorted.map((char, i) => {
    const def    = CHARACTER_DEFS[char.type];
    const quips  = def.quips[state];
    const quip   = quips.length > 0
      ? quips[Math.floor(Math.random() * quips.length)]
      : null;

    return {
      type:  char.type,
      pos:   char.pos,
      state,
      delay: i * 80,
      quip,
    };
  });
}

// ── RISKY ZONE SCORE MULTIPLIER ───────────────────────────────────────────────

/**
 * Returns a score multiplier (0–1) for a position based on zone membership.
 * Used by the rule engine to reduce score for risky-zone picks.
 */
export function riskyZoneMultiplier(
  pos:      number,
  zones:    AggregatedZones,
): number {
  if (zones.invalid.has(pos))    return 0;   // Should never be picked
  if (zones.risky.has(pos))      return 0.6; // 40% penalty
  if (zones.discomfort.has(pos)) return 0.9; // 10% penalty
  return 1;
}
