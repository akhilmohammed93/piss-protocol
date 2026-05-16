import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface BatchIntroInfo {
  batchNumber: number;
  characterName: string;
  characterEmoji: string;
  description: string;
}

const BATCH_INTROS: Record<number, Omit<BatchIntroInfo, 'batchNumber'>> = {
  2: {
    characterName: "The Boss",
    characterEmoji: "👔",
    description: "Never stand next to your boss at the urinal. Career suicide.",
  },
  3: {
    characterName: "The Perv",
    characterEmoji: "👀",
    description: "Avoid his gaze range (±2 urinals). Eyes forward, gentleman.",
  },
  4: {
    characterName: "The Unclean",
    characterEmoji: "🤢",
    description: "Some urinals are biohazards. Pick clean ones when available.",
  },
  5: {
    characterName: "The Janitor",
    characterEmoji: "🧹",
    description: "Wet floor ±1 around the janitor. Mind your shoes.",
  },
  6: {
    characterName: "Phone Guy",
    characterEmoji: "📱",
    description: "His distraction zone (±1) ruins concentration. Stay clear.",
  },
  7: {
    characterName: "The Chatterbox",
    characterEmoji: "🗣️",
    description: "Chat zone ±2. Nobody wants a life story at the urinal.",
  },
  8: {
    characterName: "Caution Cone",
    characterEmoji: "🚧",
    description: "Out of order. That urinal is simply unavailable. Move on.",
  },
  9: {
    characterName: "Mirror Guy",
    characterEmoji: "🪞",
    description: "He sees all via the mirror. Stay outside his ±2 gaze zone.",
  },
  10: {
    characterName: "The Kid",
    characterEmoji: "🧒",
    description: "Unpredictable splash zone ±1. Nobody wants that on their shoes.",
  },
};

const COUNTDOWN_SECONDS = 3;

interface BatchIntroScreenProps {
  batchNumber: number;
  onDone: () => void;
}

export default function BatchIntroScreen({ batchNumber, onDone }: BatchIntroScreenProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const intro = BATCH_INTROS[batchNumber];

  // Auto-dismiss immediately if no intro is defined for this batch number
  useEffect(() => {
    if (!intro) {
      onDone();
    }
  }, [intro, onDone]);

  useEffect(() => {
    if (!intro) return;
    if (countdown <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onDone, intro]);

  if (!intro) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="rounded-2xl px-8 py-8 text-center max-w-xs w-full mx-4"
          style={{
            background: 'var(--pp-surface)',
            border: '2px solid var(--pp-border-md)',
            boxShadow: '0 0 60px rgba(0,0,0,0.6)',
          }}
        >
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--pp-text-muted)' }}>
            Batch {batchNumber} Unlocked
          </div>

          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            className="text-8xl mb-4 select-none"
          >
            {intro.characterEmoji}
          </motion.div>

          <div
            className="text-2xl font-black uppercase tracking-wide mb-2"
            style={{ color: 'var(--pp-text)' }}
          >
            {intro.characterName}
          </div>

          <div
            className="text-sm font-medium mb-6"
            style={{ color: 'var(--pp-text-dim)' }}
          >
            {intro.description}
          </div>

          <motion.div
            key={countdown}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-black"
            style={{ color: 'var(--pp-yellow)' }}
          >
            {countdown > 0 ? countdown : "Go!"}
          </motion.div>

          <div className="text-xs mt-2" style={{ color: 'var(--pp-text-muted)' }}>
            Get ready…
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
