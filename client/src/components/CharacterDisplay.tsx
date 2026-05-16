/**
 * CharacterDisplay.tsx
 * ──────────────────────────────────────────────────────────────────────────
 * Unified renderer for all 8 Piss Protocol characters.
 *
 * Animation rules (per spec):
 *   • Idle breathing: scale 1 → 1.02 → 1  every idleMin–idleMax ms  (±20%)
 *   • Idle drift:     random ±driftPx translate, never same timing as sibling
 *   • Hover:          subtle scale 1.02–1.04 + slight rotation / shift
 *   • HoverLong:      intensity increase + visible discomfort cues
 *   • Selected:       group reaction stagger (handled by parent, quip shown)
 *   • Failed:         stronger reaction, quip + shake
 *   • transform-only: no layout reflows
 * ──────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LegoMinifig from './LegoMinifig';
import {
  CHARACTER_DEFS,
  CharacterType,
  ReactionState,
} from '@/lib/characterSystem';

// ── Types ──────────────────────────────────────────────────────────────────

interface CharacterDisplayProps {
  type:                 CharacterType;
  position:             number;
  totalUrinals:         number;
  /** Which urinal index the player is hovering (null if none) */
  playerHoverPos:       number | null;
  /** Which urinal was selected (null before lock-in) */
  playerSelectedPos:    number | null;
  /** Did the player's pick fail a primary rule? */
  didFail:              boolean;
  /** External quip to show (from group reaction system) */
  forcedQuip?:          string | null;
  /** stagger delay for group reactions (ms) */
  reactionDelay?:       number;
}

// ── Appearance maps ────────────────────────────────────────────────────────

const MINIFIG_PROPS: Record<CharacterType, {
  bodyColor: string;
  legColor:  string;
  hairStyle: 'short' | 'spiky' | 'slick' | 'cap' | 'none' | 'mohawk';
  hairColor: string;
  faceStyle: 'stern' | 'happy' | 'creepy';
  accessory: 'glasses' | 'tie' | 'badge' | 'vest' | null;
  size:      string;
}> = {
  boss: {
    bodyColor: '#1A2F5A', legColor: '#14192B',
    hairStyle: 'slick',  hairColor: '#7A7A7A',
    faceStyle: 'stern',  accessory: 'tie',
    size: 'w-[44px] h-[97px] sm:w-[50px] sm:h-[110px] md:w-[56px] md:h-[123px]',
  },
  perv: {
    bodyColor: '#C91A09', legColor: '#14192B',
    hairStyle: 'short',  hairColor: '#5C3D11',
    faceStyle: 'creepy', accessory: null,
    size: 'w-[44px] h-[97px] sm:w-[50px] sm:h-[110px] md:w-[56px] md:h-[123px]',
  },
  janitor: {
    bodyColor: '#2E7D32', legColor: '#1B5E20',
    hairStyle: 'cap',    hairColor: '#4E342E',
    faceStyle: 'happy',  accessory: 'vest',
    size: 'w-[44px] h-[97px] sm:w-[50px] sm:h-[110px] md:w-[56px] md:h-[123px]',
  },
  phoneGuy: {
    bodyColor: '#455A64', legColor: '#263238',
    hairStyle: 'short',  hairColor: '#3E2723',
    faceStyle: 'happy',  accessory: 'glasses',
    size: 'w-[44px] h-[97px] sm:w-[50px] sm:h-[110px] md:w-[56px] md:h-[123px]',
  },
  chatterbox: {
    bodyColor: '#E65100', legColor: '#BF360C',
    hairStyle: 'mohawk', hairColor: '#F9A825',
    faceStyle: 'happy',  accessory: null,
    size: 'w-[44px] h-[97px] sm:w-[50px] sm:h-[110px] md:w-[56px] md:h-[123px]',
  },
  cone: {
    bodyColor: '#FF6F00', legColor: '#E65100',
    hairStyle: 'none',   hairColor: '#FF6F00',
    faceStyle: 'stern',  accessory: null,
    size: 'w-[44px] h-[97px] sm:w-[50px] sm:h-[110px] md:w-[56px] md:h-[123px]',
  },
  mirrorGuy: {
    bodyColor: '#90A4AE', legColor: '#546E7A',
    hairStyle: 'slick',  hairColor: '#B0BEC5',
    faceStyle: 'stern',  accessory: null,
    size: 'w-[44px] h-[97px] sm:w-[50px] sm:h-[110px] md:w-[56px] md:h-[123px]',
  },
  kid: {
    bodyColor: '#F48FB1', legColor: '#AD1457',
    hairStyle: 'spiky',  hairColor: '#F9A825',
    faceStyle: 'happy',  accessory: null,
    // Kid is slightly smaller
    size: 'w-[34px] h-[75px] sm:w-[38px] sm:h-[84px] md:w-[42px] md:h-[93px]',
  },
};

// Badge accent colours
const BADGE_COLORS: Record<CharacterType, { bg: string; border: string }> = {
  boss:       { bg: '#C91A09', border: '#900012' },
  perv:       { bg: '#8B0000', border: '#600000' },
  janitor:    { bg: '#2E7D32', border: '#1B5E20' },
  phoneGuy:   { bg: '#455A64', border: '#263238' },
  chatterbox: { bg: '#E65100', border: '#BF360C' },
  cone:       { bg: '#FF6F00', border: '#E65100' },
  mirrorGuy:  { bg: '#546E7A', border: '#37474F' },
  kid:        { bg: '#AD1457', border: '#880E4F' },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main Component ─────────────────────────────────────────────────────────

const CharacterDisplay: React.FC<CharacterDisplayProps> = ({
  type,
  position,
  totalUrinals,
  playerHoverPos,
  playerSelectedPos,
  didFail,
  forcedQuip     = null,
  reactionDelay  = 0,
}) => {
  const def     = CHARACTER_DEFS[type];
  const minifig = MINIFIG_PROPS[type];
  const badge   = BADGE_COLORS[type];
  const isCone  = type === 'cone';

  // ── Idle micro-animation state ──────────────────────────────────────────
  const [idleDx, setIdleDx]         = useState(0);
  const [idleDy, setIdleDy]         = useState(0);
  const [idleScale, setIdleScale]   = useState(1);
  const [idleRotate, setIdleRotate] = useState(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hover detection ─────────────────────────────────────────────────────
  const hoverLongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHoverLong, setIsHoverLong] = useState(false);

  // ── Quip state ──────────────────────────────────────────────────────────
  const [quip, setQuip]           = useState<string | null>(null);
  const quipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Idle quip loop ──────────────────────────────────────────────────────
  const idleQuipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute reaction state
  const dist = playerHoverPos !== null ? Math.abs(playerHoverPos - position) : 999;
  const isHovering = dist <= def.awareness.hoverRadius && playerHoverPos !== null;

  let reactionState: ReactionState = 'idle';
  if (didFail)                                           reactionState = 'failed';
  else if (playerSelectedPos !== null)                   reactionState = 'selected';
  else if (isHovering && isHoverLong)                    reactionState = 'hoverLong';
  else if (isHovering)                                   reactionState = 'hover';

  // ── Show quip ───────────────────────────────────────────────────────────
  const showQuip = useCallback((text: string, duration = 2200) => {
    if (quipTimer.current) clearTimeout(quipTimer.current);
    setQuip(text);
    quipTimer.current = setTimeout(() => setQuip(null), duration);
  }, []);

  // ── Forced external quip ────────────────────────────────────────────────
  useEffect(() => {
    if (!forcedQuip) return;
    const t = setTimeout(() => showQuip(forcedQuip, 2800), reactionDelay);
    return () => clearTimeout(t);
  }, [forcedQuip, reactionDelay, showQuip]);

  // ── Idle animation loop ─────────────────────────────────────────────────
  const scheduleIdle = useCallback(() => {
    const { idleMin, idleMax, driftPx, breathScale, idleRotate: rotAmp } = def.behavior;
    // ±20% jitter so characters never sync
    const interval = randomBetween(idleMin * 0.8, idleMax * 1.2);

    idleTimer.current = setTimeout(() => {
      if (!isCone) {
        setIdleDx(randomBetween(-driftPx, driftPx));
        setIdleDy(randomBetween(-driftPx * 0.5, driftPx * 0.5));
        setIdleScale(1 + randomBetween(0, breathScale * 2));
        setIdleRotate(randomBetween(-rotAmp, rotAmp));
      } else {
        // Cone just wobbles
        setIdleRotate(randomBetween(-1.5, 1.5));
      }
      scheduleIdle();
    }, interval);
  }, [def.behavior, isCone]);

  useEffect(() => {
    scheduleIdle();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [scheduleIdle]);

  // ── Idle quip loop (rare, character-specific) ──────────────────────────
  useEffect(() => {
    if (def.quips.idle.length === 0) return;
    const scheduleIdleQuip = () => {
      idleQuipTimer.current = setTimeout(() => {
        if (reactionState === 'idle') {
          showQuip(pickRandom(def.quips.idle), 1600);
        }
        scheduleIdleQuip();
      }, randomBetween(8000, 18000));
    };
    scheduleIdleQuip();
    return () => { if (idleQuipTimer.current) clearTimeout(idleQuipTimer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hover long timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (isHovering) {
      hoverLongTimer.current = setTimeout(
        () => setIsHoverLong(true),
        def.awareness.longHoverMs,
      );
    } else {
      if (hoverLongTimer.current) clearTimeout(hoverLongTimer.current);
      setIsHoverLong(false);
    }
    return () => { if (hoverLongTimer.current) clearTimeout(hoverLongTimer.current); };
  }, [isHovering, def.awareness.longHoverMs]);

  // ── Reaction quips ───────────────────────────────────────────────────────
  useEffect(() => {
    if (reactionState === 'hover' && def.quips.hover.length) {
      showQuip(pickRandom(def.quips.hover), 1800);
    }
  }, [reactionState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reactionState === 'hoverLong' && def.quips.hoverLong.length) {
      showQuip(pickRandom(def.quips.hoverLong), 2000);
    }
  }, [isHoverLong]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reactionState === 'failed' && def.quips.failed.length) {
      const t = setTimeout(() => showQuip(pickRandom(def.quips.failed), 3000), reactionDelay + 200);
      return () => clearTimeout(t);
    }
  }, [didFail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reactionState === 'selected' && playerSelectedPos !== null && def.quips.selected.length) {
      const t = setTimeout(() => showQuip(pickRandom(def.quips.selected), 2200), reactionDelay);
      return () => clearTimeout(t);
    }
  }, [playerSelectedPos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => {
    if (quipTimer.current)     clearTimeout(quipTimer.current);
    if (idleQuipTimer.current) clearTimeout(idleQuipTimer.current);
  }, []);

  // ── Motion variants ──────────────────────────────────────────────────────

  // Idle drift (always running, subtle)
  const idleStyle = {
    x:      idleDx,
    y:      idleDy,
    scaleX: idleScale,
    scaleY: idleScale,
    rotate: idleRotate,
  };

  // Reaction overlay on top of idle
  const reactionVariants = {
    idle: {
      rotate:   0,
      scale:    1,
      x:        0,
    },
    hover: {
      scale:    1.03,
      rotate:   type === 'boss' ? 0 : (type === 'perv' ? 2 : 1),
      x:        type === 'boss' ? 0 : 1,
    },
    hoverLong: {
      scale:    1.05,
      rotate:   type === 'boss' ? -1 : (type === 'perv' ? 4 : 2),
      x:        type === 'boss' ? -1 : 2,
    },
    selected: {
      scale:    type === 'boss' ? 1.02 : 1.04,
      rotate:   type === 'boss' ? 2 : (type === 'perv' ? 3 : 1),
      x:        0,
    },
    failed: {
      scale:    1.08,
      rotate:   [0, -3, 3, -2, 2, 0],
      x:        0,
    },
  };

  // ── Cone renders differently (no Lego minifig) ──────────────────────────
  if (isCone) {
    return (
      <div className="relative flex flex-col items-center justify-end w-full h-full">
        <motion.div
          animate={{ rotate: idleRotate }}
          transition={{ type: 'spring', stiffness: 80, damping: 12 }}
          className="text-5xl select-none"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
        >
          🚧
        </motion.div>
        <div className="text-[7px] font-black px-1 py-[1px] rounded mt-[-2px]"
          style={{ background: badge.bg, color: 'white', border: `1.5px solid ${badge.border}`, fontFamily: 'sans-serif' }}>
          OUT OF ORDER
        </div>
      </div>
    );
  }

  // ── Humanoid character ───────────────────────────────────────────────────
  const displayQuip = quip;

  return (
    <div className="relative flex flex-col items-center justify-end w-full h-full">

      {/* Speech bubble — anchored at top of character slot */}
      <AnimatePresence>
        {displayQuip && (
          <motion.div
            key={displayQuip + reactionState}
            initial={{ opacity: 0, scale: 0.6, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -4 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-[3px] rounded shadow-md z-30 pointer-events-none"
            style={{
              background: 'white',
              border: '2px solid #C0C0C0',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.18)',
              fontFamily: 'sans-serif',
              maxWidth: '110px',
              whiteSpace: 'normal',
              textAlign: 'center',
            }}
          >
            {displayQuip}
            {/* Bubble tail */}
            <div className="absolute bottom-[-9px] left-1/2 -translate-x-1/2 w-0 h-0
              border-l-[5px] border-l-transparent
              border-t-[7px] border-t-white
              border-r-[5px] border-r-transparent"/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character body — idle drift + reaction on top */}
      <motion.div
        animate={{
          x:     idleDx,
          y:     idleDy,
          scale: idleScale,
        }}
        transition={{ type: 'spring', stiffness: 60, damping: 14, mass: 0.6 }}
      >
        <motion.div
          variants={reactionVariants}
          animate={reactionState}
          transition={{
            duration:    reactionState === 'failed' ? 0.5 : 0.3,
            ease:        'easeOut',
            rotate:      reactionState === 'failed'
              ? { duration: 0.5, ease: 'easeInOut' }
              : undefined,
          }}
        >
          {/* Perv sweat drop */}
          {type === 'perv' && (reactionState === 'hover' || reactionState === 'hoverLong') && (
            <motion.div
              className="absolute right-[-6px] top-1 text-sm select-none pointer-events-none"
              animate={{ y: [0, 8, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              💧
            </motion.div>
          )}

          {/* Kid erratic fidget indicator */}
          {type === 'kid' && reactionState === 'selected' && (
            <motion.div
              className="absolute left-[-12px] top-2 text-sm select-none pointer-events-none"
              animate={{ x: [-2, 2, -2, 3, -1, 0], y: [0, -2, 1, -1, 0] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            >
              💦
            </motion.div>
          )}

          {/* Phone Guy phone glow */}
          {type === 'phoneGuy' && (
            <motion.div
              className="absolute right-[-10px] bottom-[20px] text-base select-none pointer-events-none"
              animate={{
                opacity: [0.6, 1, 0.6],
                rotate:  reactionState === 'hover' ? [0, -5, 0] : [0],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              📱
            </motion.div>
          )}

          {/* Mirror Guy gaze indicator */}
          {type === 'mirrorGuy' && reactionState !== 'idle' && (
            <motion.div
              className="absolute left-[-16px] top-0 text-base select-none pointer-events-none"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              👁️
            </motion.div>
          )}

          <LegoMinifig
            bodyColor={minifig.bodyColor}
            legColor={minifig.legColor}
            hairStyle={minifig.hairStyle}
            hairColor={minifig.hairColor}
            faceStyle={minifig.faceStyle}
            accessory={minifig.accessory}
            swayDelay={position * 0.07}
            isWalking={false}
            size={minifig.size}
          />
        </motion.div>
      </motion.div>

      {/* Name badge — below the character, always visible */}
      <div
        className="text-[7px] font-black px-1 py-[1px] rounded mt-[2px] text-center"
        style={{
          background:  badge.bg,
          color:       'white',
          border:      `1.5px solid ${badge.border}`,
          fontFamily:  'sans-serif',
          whiteSpace:  'nowrap',
          lineHeight:  '1.4',
        }}
      >
        {def.emoji} {def.label}
      </div>

      {/* Boss "watch check" idle indicator */}
      {type === 'boss' && reactionState === 'idle' && (
        <motion.div
          className="absolute top-[8px] left-[-18px] text-[10px] select-none pointer-events-none"
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ duration: 6, repeat: Infinity, repeatDelay: 8 }}
        >
          ⌚
        </motion.div>
      )}

      {/* Janitor mop swing */}
      {type === 'janitor' && (
        <motion.div
          className="absolute bottom-[2px] right-[-14px] text-base select-none pointer-events-none"
          animate={{ rotate: [-15, 15, -15] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          🧹
        </motion.div>
      )}

      {/* Chatterbox head-turn ring */}
      {type === 'chatterbox' && (
        <motion.div
          className="absolute top-[4px] left-[-12px] text-[10px] select-none pointer-events-none"
          animate={{ opacity: [0, 1, 0], x: [-2, 2, -2] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          🗣️
        </motion.div>
      )}
    </div>
  );
};

export default CharacterDisplay;
