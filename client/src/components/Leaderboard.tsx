import React from 'react';
import { motion } from 'framer-motion';
import { Highscore } from "@shared/schema";

interface LeaderboardProps {
  scores: Highscore[];
  currentScore?: number;
  currentPlayerName?: string;
  onPlayAgain: () => void;
  onSaveScore?: () => void;
  isGameOver: boolean;
  isPissmaster?: boolean;
}

const MEDALS = ['🥇','🥈','🥉'];

const Leaderboard: React.FC<LeaderboardProps> = ({
  scores,
  currentScore,
  currentPlayerName,
  onPlayAgain,
  onSaveScore,
  isGameOver,
  isPissmaster,
}) => {
  const showCurrentResult = isGameOver && currentScore !== undefined && currentPlayerName;
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full"
    >
      <div className="pp-card p-6 max-w-md mx-auto">
        {/* Title */}
        <h2
          className="text-2xl font-black text-center mb-5"
          style={{ color: 'var(--pp-text)', letterSpacing: '0.02em' }}
        >
          {isGameOver ? '💀 Game Over' : '🏅 Leaderboard'}
        </h2>

        {/* Current result panel */}
        {showCurrentResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-5 p-4 rounded-xl text-center"
            style={{ background: 'var(--pp-surface-2)', border: '1px solid var(--pp-border-md)' }}
          >
            <p className="pp-stat-label mb-1">Your Score</p>
            <p
              className="text-4xl font-black mb-1"
              style={{ color: 'var(--pp-yellow)' }}
            >
              {currentScore}
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--pp-text-dim)' }}>
              {currentPlayerName}
            </p>

            {isPissmaster && (
              <div
                className="mt-3 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(245,200,66,0.12)', border: '1px solid rgba(245,200,66,0.35)' }}
              >
                <p className="font-black text-sm" style={{ color: 'var(--pp-yellow)' }}>
                  🏆 PISSMASTER — All levels conquered!
                </p>
              </div>
            )}

            {onSaveScore && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onSaveScore}
                className="mt-3 pp-btn-primary pp-btn-success w-full"
              >
                Save to Leaderboard
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Top scores */}
        <div className="mb-5">
          <p className="pp-stat-label mb-3">Top Scores</p>
          {sortedScores.length === 0 ? (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--pp-text-muted)' }}>
              No scores yet. Be the first!
            </p>
          ) : (
            <div>
              {sortedScores.slice(0, 10).map((score, index) => (
                <div key={score.id} className="pp-lb-row">
                  <div className="pp-lb-rank">
                    {index < 3 ? MEDALS[index] : `${index + 1}.`}
                  </div>
                  <div className="pp-lb-name">{score.playerName}</div>
                  <div className="pp-lb-score">{score.score}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onPlayAgain}
          className="pp-btn-primary w-full"
        >
          {isGameOver ? 'Play Again' : '← Back to Game'}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default Leaderboard;
