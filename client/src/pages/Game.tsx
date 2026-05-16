import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LandingPage, { AvatarId } from "./LandingPage";
import UrinalGame from "@/components/UrinalGame";
import GitHubPush from "@/components/GitHubPush";

const Game = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('bro');
  const [showGitHub, setShowGitHub] = useState(false);

  const handleStart = (name: string, avatar: AvatarId) => {
    setPlayerName(name);
    setAvatarId(avatar);
    setGameStarted(true);
  };

  return (
    <AnimatePresence mode="wait">
      {!gameStarted ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.3 }}
        >
          <LandingPage onStart={handleStart} />
        </motion.div>
      ) : (
        <motion.div
          key="game"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen pp-page"
        >
          {/* ── Top header bar ── */}
          <div className="pp-header px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setGameStarted(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--pp-text-dim)',
              }}
            >
              ← Menu
            </motion.button>

            <div
              className="text-base sm:text-lg font-black tracking-wide select-none"
              style={{ color: 'var(--pp-text)', letterSpacing: '0.04em' }}
            >
              🚽 Piss Protocol
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowGitHub(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--pp-text-dim)',
              }}
            >
              🐙 GitHub
            </motion.button>
          </div>

          {/* ── Game content ── */}
          <div className="container mx-auto px-3 sm:px-4 pb-8 max-w-2xl pt-4">
            <UrinalGame initialPlayerName={playerName} initialAvatarId={avatarId} />
          </div>
        </motion.div>
      )}

      {showGitHub && <GitHubPush onClose={() => setShowGitHub(false)} />}
    </AnimatePresence>
  );
};

export default Game;
