import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from "lucide-react";

interface LevelIndicatorProps {
  currentLevel: number;
  score: number;
  onInfoClick: () => void;
}

const LevelIndicator: React.FC<LevelIndicatorProps> = ({ currentLevel, score, onInfoClick }) => {
  return (
    <div className="flex items-center gap-5">
      <div className="flex flex-col">
        <span className="pp-stat-label">Level</span>
        <motion.div
          key={currentLevel}
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          className="pp-stat-value"
        >
          {currentLevel}
        </motion.div>
      </div>

      <div className="flex flex-col">
        <span className="pp-stat-label">Score</span>
        <motion.div
          key={score}
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          className="pp-stat-value"
          style={{ color: 'var(--pp-yellow)' }}
        >
          {score}
        </motion.div>
      </div>

      <button
        onClick={onInfoClick}
        className="ml-1 p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--pp-text-muted)' }}
        title="How to play"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    </div>
  );
};

export default LevelIndicator;
